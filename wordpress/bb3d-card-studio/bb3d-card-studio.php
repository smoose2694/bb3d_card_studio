<?php
/**
 * Plugin Name: BB3D Card Studio
 * Description: Personliga sport- och Pokémonliknande kort med privat utskriftskö, Swish och kontrollerade AI-försök.
 * Version: 0.2.1
 * Requires at least: 6.5
 * Requires PHP: 8.2
 * Author: BB3D
 * License: GPL-2.0-or-later
 */
namespace BB3D\Cards;
if (!defined('ABSPATH')) exit;
require_once __DIR__.'/includes/storage.php';
require_once __DIR__.'/includes/validation.php';
require_once __DIR__.'/includes/service.php';
require_once __DIR__.'/includes/ai.php';
function storage() { global $wpdb; static $s; return $s??($s=new Storage($wpdb)); }
function service() { static $s; return $s??($s=new Service(storage())); }
function operator() { return current_user_can('manage_options')||current_user_can('manage_woocommerce'); }
function page_url($page='studio') { return add_query_arg('bb3d_cards',$page,home_url('/')); }
function activate() {
    storage()->install();
    if(!wp_next_scheduled('bb3d_cards_cleanup')) wp_schedule_event(time()+3600,'daily','bb3d_cards_cleanup');
}
register_activation_hook(__FILE__,__NAMESPACE__.'\\activate');
register_deactivation_hook(__FILE__,function(){wp_clear_scheduled_hook('bb3d_cards_cleanup');});
add_action('bb3d_cards_cleanup',function(){try{service()->cleanup();}catch(\Throwable $e){error_log('BB3D Card Studio: scheduled cleanup could not complete.');}});
function session_cookie() { return 'bb3d_cards_customer'; }
function customer($create=false) {
    $raw=$_COOKIE[session_cookie()]??''; $parts=explode('.',$raw);
    if(count($parts)===3&&preg_match('/^[a-f0-9]{48}$/D',$parts[0])&&ctype_digit($parts[1])&&(int)$parts[1]>time()&&hash_equals(hash_hmac('sha256',$parts[0].'.'.$parts[1],wp_salt('auth')),$parts[2])) return hash('sha256',$parts[0]);
    demand($create,401,'Öppna kortstudion igen för att starta beställningen.');
    demand(is_ssl(),503,'Kortstudion kräver HTTPS.');
    $id=bin2hex(random_bytes(24)); $data=$id.'.'.(time()+30*86400);$value=$data.'.'.hash_hmac('sha256',$data,wp_salt('auth'));
    setcookie(session_cookie(),$value,['expires'=>time()+30*86400,'path'=>wp_parse_url(home_url('/'),PHP_URL_PATH)?:'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);$_COOKIE[session_cookie()]=$value;
    return hash('sha256',$id);
}
function csrf($actor) { return hash_hmac('sha256','cards:'.$actor,wp_salt('nonce')); }
function rate_limit($area,$max=60) {
    $ip=$_SERVER['REMOTE_ADDR']??'unknown'; $period=(int)floor(time()/600);
    $key='limits/'.$area.'/'.hash_hmac('sha256',$ip,wp_salt('auth')).'/'.$period;
    storage()->change($key,function(&$data) use($max) { demand(($data['count']??0)<$max,429,'För många försök. Vänta tio minuter.');$data=['count'=>($data['count']??0)+1,'expires'=>time()+1200];return true; });
}
function permission($request) {
    try {
        demand(is_ssl(),503,'Kortstudion kräver HTTPS.');
        $route=$request['route'];$action=$request->get_param('action')??'';$method=$request->get_method();
        $admin=in_array($route,['orders','order','card','stats'],true)||($route==='ai'&&in_array($action,['admin','settings','bonus'],true));
        if($admin) demand(operator(),403,'Logga in i WordPress för att öppna produktionskön.');
        else demand(operator()||get_option('bb3d_cards_public',false),403,'Kortstudion är i testläge.');
        $actor=customer();
        if(!in_array($method,['GET','HEAD'],true)) {
            $origin=$request->get_header('origin'); $home=wp_parse_url(home_url('/'));$expected=$home['scheme'].'://'.$home['host'].(isset($home['port'])?':'.$home['port']:'');
            demand($origin===$expected,403,'Anropet måste komma från kortstudion.');
            demand(hash_equals(csrf($actor),$request->get_header('x-bb3d-csrf')),403,'Kundsessionen har gått ut. Ladda om kortstudion.');
        }
        return true;
    } catch(Failure $e) { return new \WP_Error('bb3d_permission',$e->getMessage(),['status'=>$e->status]); }
}
add_action('rest_api_init',function(){register_rest_route('bb3d-cards/v1','/(?P<route>config|session|purchase|upload|orders|order|card|stats|ai)',['methods'=>['GET','POST','PATCH','DELETE'],'permission_callback'=>__NAMESPACE__.'\\permission','callback'=>__NAMESPACE__.'\\endpoint']);});
function response($data,$status=200) { $r=new \WP_REST_Response($data,$status);$r->header('Cache-Control','private, no-store, max-age=0');$r->header('X-Content-Type-Options','nosniff');return $r; }
function binary_response($bytes,$filename,$download=false) {
    nocache_headers();header('Content-Type: image/png');header('X-Content-Type-Options: nosniff');header('Content-Length: '.strlen($bytes));header('Content-Disposition: '.($download?'attachment':'inline').'; filename="'.$filename.'"');echo $bytes;exit;
}
function endpoint($q) {
    $jobId=null;
    try {
        $route=$q['route'];$method=$q->get_method();$action=$q->get_param('action')??'';$actor=customer();$s=service();$ai=new AI($s);
        if($route==='config'&&$method==='GET') {
            $ready=true;$reason=null;try{storage()->privateDir();}catch(Failure $e){$ready=false;$reason=$e->getMessage();}
            return response(['orders'=>$ready,'admin'=>operator(),'uploadPrefix'=>'incoming/'.substr($actor,0,24).'/','setup'=>$ready?null:['message'=>$reason]]);
        }
        if($route==='session'&&$method==='GET') return response(['admin'=>operator()]);
        if($route==='purchase') {
            if($method==='GET'&&($action===''||$action==='list')) {
                $rows=[];foreach(storage()->rows('orders/',$actor) as $row) if(strtotime($row['data']['expiresAt'])>time()) $rows[]=$s->view($row['data']);usort($rows,function($a,$b){return strcmp($b['createdAt'],$a['createdAt']);});return response(['purchases'=>$rows]);
            }
            if($method==='GET'&&$action==='status') return response(['purchase'=>$s->view($s->own($q->get_param('id')??'',$actor)['data'])]);
            if($method==='POST') {
                rate_limit($action==='presence'?'presence':'purchase',$action==='presence'?120:60);$b=body($q,15000);
                if($action==='create') return response(['purchase'=>$s->create($b,$actor)],201);
                if($action==='submit') return response(['purchase'=>$s->submit($b,$actor)]);
                if($action==='presence') return response($s->presence($b['purchaseId']??'',$b['slotId']??null,$actor));
            }
        }
        if($route==='upload'&&$method==='POST') {
            rate_limit('upload',20);$key=$q->get_param('pathname')??'';$prefix='incoming/'.substr($actor,0,24).'/';$id=substr($key,strlen($prefix),-4);
            demand(strpos($key,$prefix)===0&&substr($key,-4)==='.png'&&uuid($id)&&$key===$prefix.$id.'.png',403,'Ogiltig bildsökväg.');
            $bytes=$q->get_body();png($bytes,true);storage()->putImage($key,$bytes,$actor,time()+30*86400);return response(['ok'=>true]);
        }
        if($route==='orders'&&$method==='GET') {
            $rows=[];$control=$s->control();foreach(storage()->rows('orders/') as $row) if(strtotime($row['data']['expiresAt'])>time()) $rows[]=$s->summary($row['data'],$control);usort($rows,function($a,$b){return strcmp($a['createdAt'],$b['createdAt']);});return response(['orders'=>$rows]);
        }
        if($route==='order'&&$method==='PATCH') return response(['order'=>$s->updateOrder($q->get_param('id')??'',body($q,15000))]);
        if($route==='stats'&&$method==='GET') return response($s->stats($q->get_param('from')??'',$q->get_param('to')??''));
        if($route==='card'&&$method==='GET') {
            $id=$q->get_param('id')??'';demand(uuid($id),404,'Ogiltigt köp.');$r=storage()->read('orders/'.$id)['data']??null;demand($r&&strtotime($r['expiresAt'])>time(),404,'Köpet finns inte.');$key=null;
            foreach($r['slots'] as $slot) if($slot['id']===$q->get_param('slot')) $key=$slot['imagePath']??null;
            demand($key,404,'Motivet är inte klart.');binary_response(storage()->image($key),'BB3D-'.substr($id,0,8).'-63x88.png',$q->has_param('download'));
        }
        if($route==='ai') {
            if($action==='admin'&&$method==='GET') return response($ai->summary($s->control()));
            if($action==='config'&&$method==='GET') return response(array_intersect_key($ai->summary($s->control()),array_flip(['available','maxImages'])));
            if($action==='settings'&&$method==='POST') {
                $b=body($q,1000);demand(is_bool($b['enabled']??null)&&is_int($b['dailyLimit']??null)&&$b['dailyLimit']>=0&&$b['dailyLimit']<=5000,400,'Välj 0–5000 API-försök per dygn.');demand(!$b['enabled']||$ai->ready(),400,'AI-nyckeln saknas.');
                return response($s->changeControl(function(&$c) use($b,$ai){$c['settings']=['enabled'=>$b['enabled'],'dailyLimit'=>$b['dailyLimit']];if($b['enabled'])$c['lastError']=null;return $ai->summary($c);}));
            }
            if($action==='bonus'&&$method==='POST') {
                $b=body($q,1500);demand(uuid($b['requestId']??null),400,'Ogiltig tilldelning.');$r=storage()->read('orders/'.($b['purchaseId']??''))['data']??null;demand($r,404,'Köpet finns inte.');
                [$row,$i]=$s->slot($r['id'],$b['slotId']??'',$r['customer']);$slot=$row['data']['slots'][$i];$s->ensure($r,$slot);$key=$s->grantKey($r,$slot);
                return response($s->changeControl(function(&$c) use($b,$key,$s){$g=&$c['grants'][$key];if(!in_array($b['requestId'],$g['bonusRequests'],true)){demand($g['maxAttempts']<100,400,'Säkerhetstaket är nått.');$g['maxAttempts']+=2;$g['maxImages']+=2;$g['bonusRequests'][]=$b['requestId'];}return $s->info($g)+['dailyCapReached'=>($c['usage'][day()]??0)>=$c['settings']['dailyLimit']];}));
            }
            if($action==='generate'&&$method==='POST') { rate_limit('generate',40);$b=body($q,3600000);return response($ai->generate($b,$actor)); }
            if(in_array($action,['claim','quota','status','result'],true)) {
                demand(($action==='claim'&&$method==='POST')||($action!=='claim'&&$method==='GET'),405,'Metoden stöds inte.');
                $b=$action==='claim'?body($q,1500):[];
                $purchase=in_array($action,['status','result'],true)?$q->get_header('x-bb3d-purchase'):($b['purchaseId']??$q->get_param('purchaseId')??'');
                $slotId=in_array($action,['status','result'],true)?$q->get_header('x-bb3d-slot'):($b['slotId']??$q->get_param('slotId')??'');
                [$row,$i]=$s->slot($purchase,$slotId,$actor,$action==='claim');$r=$row['data'];$slot=$r['slots'][$i];
                if($action==='claim') return response($s->ensure($r,$slot));
                if($action==='quota') { $c=$s->control();return response($s->info($c['grants'][$s->grantKey($r,$slot)]??null)+['available'=>$ai->summary($c)['available']]); }
                $id=$q->get_param('id')??'';$job=$ai->job($id,$r,$slot);
                if($action==='status') return response($job);
                demand($job['status']==='done',409,'Bilden är inte klar.');binary_response(storage()->image('ai/'.$id),'BB3D-AI.png');
            }
        }
        throw new Failure(405,'Metoden stöds inte.');
    } catch(Failure $e) { $jobId=isset($ai)?$ai->startedId:null;return response(['error'=>$e->getMessage()]+($jobId?['jobId'=>$jobId]:[]),$e->status); }
    catch(\Throwable $e) { $jobId=isset($ai)?$ai->startedId:null;error_log('BB3D Card Studio: request failed ('.get_class($e).').');return response(['error'=>'Kortstudion kunde inte slutföra åtgärden. Kontakta BB3D.']+($jobId?['jobId'=>$jobId]:[]),503); }
}
function body($q,$max) { demand(strlen($q->get_body())<=$max,413,'Anropet är för stort.');$b=$q->get_json_params();demand(is_array($b),400,'Anropet kunde inte läsas.');return $b; }
add_action('template_redirect',function(){
    $page=$_GET['bb3d_cards']??null;if(!in_array($page,['studio','fantasy','admin'],true))return;
    if($page==='admin'&&!operator()) { auth_redirect();wp_die('Ditt WordPress-konto saknar behörighet till kortkön.',403); }
    if(!operator()&&!get_option('bb3d_cards_public',false)) { status_header(403);wp_die('Kortstudion är i testläge.'); }
    try { $actor=customer(true); } catch(Failure $e){wp_die(esc_html($e->getMessage()),'BB3D',['response'=>$e->status]);}
    nocache_headers();header('X-Content-Type-Options: nosniff');header('Referrer-Policy: same-origin');header('X-Frame-Options: SAMEORIGIN');
    if(!defined('DONOTCACHEPAGE'))define('DONOTCACHEPAGE',true);
    $base=plugin_dir_url(__FILE__).'assets/';$nonce=wp_create_nonce('wp_rest');
    $config=['page'=>$page,'base'=>$base,'api'=>rest_url('bb3d-cards/v1/'),'nonce'=>$nonce,'csrf'=>csrf($actor),'studio'=>page_url(),'fantasy'=>page_url('fantasy'),'admin'=>page_url('admin'),'cardURL'=>add_query_arg('_wpnonce',$nonce,rest_url('bb3d-cards/v1/card')).'&id=','logout'=>wp_logout_url(page_url())];
    $html=file_get_contents(__DIR__.'/assets/'.($page==='admin'?'admin.html':'studio.html'));
    $html=str_replace(['__BB3D_ASSETS__','__BB3D_STUDIO__','__BB3D_FANTASY__','__BB3D_ADMIN__'],[esc_url($base),esc_url(page_url()),esc_url(page_url('fantasy')),esc_url(page_url('admin'))],$html);
    $boot='<script>window.BB3D_WP='.wp_json_encode($config,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT).';</script><script src="'.esc_url($base.'runtime.js').'"></script>';
    echo str_replace('<head>','<head>'.$boot,$html);exit;
});
add_action('admin_menu',function(){add_menu_page('BB3D Card Studio','BB3D kort','manage_woocommerce','bb3d-card-studio',__NAMESPACE__.'\\settings_page','dashicons-id-alt',56);if(current_user_can('manage_options')&&!current_user_can('manage_woocommerce')) add_menu_page('BB3D Card Studio','BB3D kort','manage_options','bb3d-card-studio',__NAMESPACE__.'\\settings_page','dashicons-id-alt',56);});
function settings_page() {
    demand(operator(),403,'Behörighet saknas.');
    if(isset($_POST['bb3d_public'])&&current_user_can('manage_options')) { check_admin_referer('bb3d_public');update_option('bb3d_cards_public',$_POST['bb3d_public']==='yes',false); }
    $key_notice='';
    if(isset($_POST['bb3d_save_ai_key'])&&current_user_can('manage_options')) {
        check_admin_referer('bb3d_save_ai_key');
        try { $key=trim(wp_unslash($_POST['bb3d_openai_key']??''));update_option('bb3d_cards_openai_key',seal_api_key($key),false);$key_notice='API-nyckeln är sparad krypterat. Gör ett test innan du öppnar AI för kunder.'; }
        catch(Failure $e){$key_notice=$e->getMessage();}
    }
    $private=true;$message='Privat bildlagring är tillgänglig.';try{storage()->privateDir();}catch(Failure $e){$private=false;$message=$e->getMessage();}
    echo '<div class="wrap"><h1>BB3D Card Studio · testversion 0.2.1</h1><p>Kortstudio och utskriftskö på ditt befintliga webbhotell. Swish kontrolleras manuellt. Befintliga WooCommerce-beställningar ändras inte.</p><p><a class="button button-primary" href="'.esc_url(page_url()).'">Öppna kortstudion</a> <a class="button" href="'.esc_url(page_url('fantasy')).'">Öppna Pokémonkort</a> <a class="button" href="'.esc_url(page_url('admin')).'">Öppna produktionskön</a></p><h2>Kontroll före öppning</h2><ul><li>'.esc_html($message).'</li><li>AI-nyckel: '.((new AI(service()))->ready()?'ansluten':'saknas – anslut den i fältet nedan').'</li><li>PHP-körtid: '.esc_html(ini_get('max_execution_time')).' sekunder. Ett riktigt AI-test på Loopia återstår.</li><li>Daglig rensning: '.(wp_next_scheduled('bb3d_cards_cleanup')?'schemalagd':'saknas').'. Kundbilder och kontaktuppgifter sparas i högst 30 dagar, AI-resultat i 24 timmar.</li></ul><p>Nuvarande läge: <strong>'.(get_option('bb3d_cards_public',false)?'Öppen för kunder':'Testläge – endast behöriga WordPress-användare').'</strong>.</p>';
    if(current_user_can('manage_options')) { echo '<form method="post">';wp_nonce_field('bb3d_public');echo '<button class="button" name="bb3d_public" value="'.(get_option('bb3d_cards_public',false)?'no':'yes').'" '.(!$private?'disabled':'').'>'.(get_option('bb3d_cards_public',false)?'Återgå till testläge':'Öppna för kunder efter godkänt test').'</button></form>'; }
    if(current_user_can('manage_options')) {
        echo '<h2>Anslut OpenAI</h2><p>'.esc_html($key_notice).'</p><p>Nyckeln sparas krypterat och visas inte igen. Att spara den startar ingen bildgenerering. AI aktiveras separat i produktionskön.</p><form method="post">';wp_nonce_field('bb3d_save_ai_key');
        echo '<label for="bb3d_openai_key">OpenAI API-nyckel</label><br><input id="bb3d_openai_key" name="bb3d_openai_key" type="password" autocomplete="off" maxlength="512" required style="width:min(100%,560px);margin:10px 0" placeholder="Klistra in din API-nyckel"><p><button class="button button-primary" name="bb3d_save_ai_key" value="1">Spara API-nyckel</button></p></form>';
        if(defined('BB3D_OPENAI_API_KEY'))echo '<p>En nyckel i serverns konfiguration har företräde framför fältet ovan.</p>';
    }
    echo '<p>Testorder markeras i produktionskön innan Swish markeras som kontrollerad. Då räknas de bort från försäljningen. Ingen automatisk debitering eller omgenerering.</p></div>';
}
