<?php
namespace BB3D\Cards;
if (!defined('ABSPATH')) exit;
function seal_api_key($key) {
    demand(is_string($key)&&preg_match('/^sk-[A-Za-z0-9_-]{16,509}$/D',$key),400,'Ange en giltig OpenAI API-nyckel.');
    demand(function_exists('openssl_encrypt'),503,'Webbhotellets krypteringsstöd saknas.');
    $iv=random_bytes(12);$tag='';$cipher=openssl_encrypt($key,'aes-256-gcm',hash('sha256',wp_salt('auth'),true),OPENSSL_RAW_DATA,$iv,$tag,'BB3D Card Studio');
    demand(is_string($cipher),503,'Nyckeln kunde inte sparas.');return base64_encode($iv.$tag.$cipher);
}
function unseal_api_key($encoded) {
    if(!is_string($encoded)||!function_exists('openssl_decrypt'))return null;
    $raw=base64_decode($encoded,true);if(!is_string($raw)||strlen($raw)<29)return null;
    $key=openssl_decrypt(substr($raw,28),'aes-256-gcm',hash('sha256',wp_salt('auth'),true),OPENSSL_RAW_DATA,substr($raw,0,12),substr($raw,12,16),'BB3D Card Studio');
    return is_string($key)?$key:null;
}
function openai_key() {
    if(defined('BB3D_OPENAI_API_KEY')&&is_string(BB3D_OPENAI_API_KEY)&&strlen(trim(BB3D_OPENAI_API_KEY))>10)return trim(BB3D_OPENAI_API_KEY);
    return unseal_api_key(get_option('bb3d_cards_openai_key',null));
}
class AI {
    private $service;
    private $edit;
    public $startedId=null;
    public function __construct($service,$edit=null) { $this->service=$service; $this->edit=$edit??[$this,'provider']; }
    public function ready() { return openai_key()!==null; }
    public function summary($s) { return ['enabled'=>$s['settings']['enabled'],'available'=>$s['settings']['enabled']&&$this->ready(),'providerReady'=>$this->ready(),'dailyLimit'=>$s['settings']['dailyLimit'],'used'=>$s['usage'][day()]??0,'active'=>(bool)$s['active'],'activeUntil'=>$s['active']?($s['active']['until']*1000):null,'maxImages'=>2,'maxAttempts'=>2,'lastError'=>$s['lastError'],'activeCodes'=>count($s['grants'])]; }
    public function spec($b) {
        $profile=$b['profileId']??'';
        if($profile==='bb3d-fantasy') { demand(in_array($b['mode']??null,['trainer','monster'],true)&&(($b['mode']??null)==='trainer'||(is_string($b['element']??null)&&array_key_exists($b['element'],profiles()['elements']))),400,'Välj motivtyp och element.');return $b['mode']==='trainer'?['profileId'=>$profile,'mode'=>'trainer']:['profileId'=>$profile,'mode'=>$b['mode'],'element'=>$b['element']]; }
        $sport=null;foreach(profiles()['profiles'] as $p)if($p['id']===$profile&&$p['id']!=='bb3d-fantasy')$sport=$p;demand($sport,400,'Välj korttyp.');
        $club=$b['club']??''; $catalogue=profiles();
        if($profile==='future-star-football'&&isset($catalogue['clubs'][$club])) return ['profileId'=>$profile,'club'=>$club];
        demand($club===$sport['clubs'][0],400,'Välj klubb.');
        foreach(['primary','accent'] as $color) demand(is_string($b[$color]??null)&&preg_match('/^#[a-f0-9]{6}$/iD',$b[$color]),400,'Ogiltig klubbfärg.');
        return ['profileId'=>$profile,'club'=>$club,'primary'=>strtolower($b['primary']),'accent'=>strtolower($b['accent'])];
    }
    public function start($id,$r,$slot,$fingerprint) {
        demand(uuid($id),400,'Ogiltigt AI-försök.'); $key=$this->service->grantKey($r,$slot);
        return $this->service->changeControl(function(&$s) use($id,$r,$key,$fingerprint) {
            if(isset($s['jobs'][$id])) { $j=$s['jobs'][$id]; demand($j['actor']===$r['customer']&&$j['grant']===$key&&$j['fingerprint']===$fingerprint,409,'AI-försöket har ändrats.');return ['start'=>false,'job'=>$j]; }
            demand($s['settings']['enabled'],503,'AI-foton är avstängda.'); demand(!$s['active'],409,'AI arbetar redan med en bild. Vänta en stund.'); $g=&$s['grants'][$key];
            demand($g&&$g['expiresAt']>time()&&$g['actor']===$r['customer'],403,'AI-behörigheten är ogiltig.');
            demand($g['attempts']<$g['maxAttempts']&&$g['successes']<$g['maxImages'],429,'Detta 4-packs AI-försök är använda. Kontakta BB3D.');
            demand(!isset($g['lastAttemptAt'])||$g['lastAttemptAt']<=time()-30,429,'Vänta 30 sekunder mellan bildförsöken.'); $day=day();
            demand(($s['usage'][$day]??0)<$s['settings']['dailyLimit'],429,'Dagens AI-tak är nått. Kontakta BB3D.');
            $g['attempts']++;$g['lastAttemptAt']=time();$s['usage'][$day]=($s['usage'][$day]??0)+1;
            $j=['id'=>$id,'actor'=>$r['customer'],'grant'=>$key,'fingerprint'=>$fingerprint,'status'=>'running','expiresAt'=>time()+86400];$s['jobs'][$id]=$j;$s['active']=['id'=>$id,'until'=>time()+360]; return ['start'=>true,'job'=>$j];
        });
    }
    public function finish($id,$ok,$message=null,$uncertain=false,$disable=false) {
        return $this->service->changeControl(function(&$s) use($id,$ok,$message,$uncertain,$disable) {
            demand(isset($s['jobs'][$id]),410,'AI-försöket har gått ut.');$j=&$s['jobs'][$id]; if($j['status']!=='running') return $j;
            $j['status']=$ok?'done':($uncertain?'uncertain':'failed');
            if($ok) { $j['imagePath']='ai/'.$id; $s['grants'][$j['grant']]['successes']++; }
            else { $j['message']=$message; $s['lastError']=$message; }
            if($disable) $s['settings']['enabled']=false;
            if(($s['active']['id']??null)===$id&&!$uncertain) $s['active']=null;
            return $j;
        });
    }
    public function job($id,$r,$slot) {
        demand(uuid($id),404,'AI-bilden finns inte.'); $s=$this->service->control();$j=$s['jobs'][$id]??null;
        demand($j&&$j['expiresAt']>time(),410,'AI-bilden har gått ut.');
        demand($j['actor']===$r['customer']&&$j['grant']===$this->service->grantKey($r,$slot),403,'AI-bilden tillhör en annan kundsession.');
        return array_merge(['id'=>$j['id'],'status'=>$j['status'],'message'=>$j['message']??null],$this->service->info($s['grants'][$j['grant']]??null));
    }
    public function generate($b,$actor) {
        demand($this->ready(),503,'AI-nyckeln är inte ansluten.'); demand(($b['consent']??false)===true,400,'Godkänn att fotot skickas till OpenAI först.');
        $spec=$this->spec($b); $photo=inputPhoto($b['photo']??null);
        [$row,$i]=$this->service->slot($b['purchaseId']??'',$b['slotId']??'',$actor);$r=$row['data'];$slot=$r['slots'][$i];
        $this->service->ensure($r,$slot); $reservation=$this->start($b['id']??'',$r,$slot,hash('sha256',$photo.wp_json_encode($spec)));
        if(!$reservation['start']) return $this->job($b['id'],$r,$slot);
        $this->startedId=$b['id'];
        // A hard host timeout leaves the durable running job in place. Status
        // becomes uncertain after the lease; no background or paid retry occurs.
        @set_time_limit(300);
        try {
            $output=call_user_func($this->edit,$spec,$photo,$actor); png($output,false,true);
        } catch(Failure $e) {
            $this->finish($b['id'],false,$e->getMessage(),in_array($e->status,[502,504],true),in_array($e->status,[401,402,403],true)); return $this->job($b['id'],$r,$slot);
        } catch(\Throwable $e) {
            $this->finish($b['id'],false,'AI-svaret kunde inte bekräftas. Kontakta BB3D.',true); return $this->job($b['id'],$r,$slot);
        }
        try { $this->service->store->putImage('ai/'.$b['id'],$output,$actor,time()+86400); $this->finish($b['id'],true); }
        catch(\Throwable $e) { $this->finish($b['id'],false,'AI-bilden skapades men kunde inte sparas. Kontakta BB3D.'); }
        return $this->job($b['id'],$r,$slot);
    }
    public function provider($spec,$photo,$actor) {
        $catalogue=profiles(); $images=[['image_url'=>$photo]];
        if($spec['profileId']==='bb3d-fantasy') $prompt=$spec['mode']==='trainer'?$catalogue['prompts']['fantasy']['trainer']:$catalogue['prompts']['fantasy']['monster'][$spec['element']];
        elseif(isset($catalogue['clubs'][$spec['club']])) { $club=$catalogue['clubs'][$spec['club']]; $prompt=$club['prompt'];$images[]=['image_url'=>$club['logo']]; }
        else $prompt=str_replace(['__PRIMARY__','__ACCENT__'],[$spec['primary'],$spec['accent']],$catalogue['prompts'][$spec['profileId']]);
        $response=wp_remote_post('https://api.openai.com/v1/images/edits',['timeout'=>240,'redirection'=>0,'sslverify'=>true,'headers'=>['Authorization'=>'Bearer '.openai_key(),'Content-Type'=>'application/json'],'body'=>wp_json_encode(['model'=>$catalogue['model'],'images'=>$images,'prompt'=>$prompt,'n'=>1,'quality'=>'medium','size'=>'1536x1024','background'=>'opaque','output_format'=>'png','safety_identifier'=>$actor]),'limit_response_size'=>18*1024*1024]);
        demand(!is_wp_error($response),504,'AI-anropet kunde inte bekräftas. Kontakta BB3D innan du försöker igen.');
        $code=wp_remote_retrieve_response_code($response);
        if(in_array($code,[401,402,403],true)) throw new Failure($code,'AI-anslutningen behöver kontrolleras av BB3D.');
        demand($code<500,502,'AI-tjänsten kunde inte bekräfta bilden.'); demand($code!==429,429,'AI-tjänsten är full just nu.'); demand($code>=200&&$code<300,400,'AI kunde inte bearbeta fotot.');
        $data=json_decode(wp_remote_retrieve_body($response),true); $raw=$data['data'][0]['b64_json']??null;
        demand(is_string($raw)&&strlen($raw)<=17*1024*1024,502,'AI-bilden kunde inte läsas.'); $bytes=base64_decode($raw,true);
        demand(is_string($bytes),502,'AI-bilden kunde inte läsas.'); return $bytes;
    }
}
