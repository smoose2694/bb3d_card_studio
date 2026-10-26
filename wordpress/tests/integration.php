<?php
// Run only against a disposable local WordPress fixture, never a live site:
// BB3D_WP_TEST_ROOT=/path/to/fixture/wordpress php integration.php
$root=getenv('BB3D_WP_TEST_ROOT');if(!$root||!is_file($root.'/wp-load.php'))throw new RuntimeException('Provide an isolated WordPress fixture.');
$_SERVER['HTTP_HOST']='fixture.test';$_SERVER['HTTPS']='on';$_SERVER['REQUEST_URI']='/';$_SERVER['DOCUMENT_ROOT']=$root;$_SERVER['REMOTE_ADDR']='127.0.0.1';
require $root.'/wp-load.php';
if(home_url('/')!=='https://fixture.test/')throw new RuntimeException('Refusing to test a non-fixture site.');
require dirname(__DIR__).'/bb3d-card-studio/bb3d-card-studio.php';
use BB3D\Cards\Failure;
use BB3D\Cards\AI;
use function BB3D\Cards\{activate,storage,service,customer,csrf,png,inputPhoto,permission,endpoint,iso,day,operator};
$checks=0;function check($c,$message){global $checks;if(!$c)throw new RuntimeException($message);$checks++;}
function fails($fn,$status){try{$fn();throw new RuntimeException('Expected rejection '.$status);}catch(Failure $e){check($e->status===$status,'Unexpected status '.$e->status.': '.$e->getMessage());}}
function actorCookie($id){$data=str_repeat($id,48).'.'.(time()+86400);$_COOKIE['bb3d_cards_customer']=$data.'.'.hash_hmac('sha256',$data,wp_salt('auth'));return customer();}
function request($route,$action='',$method='GET',$b=null,$query=[]){$q=new WP_REST_Request($method,'/bb3d-cards/v1/'.$route);$q->set_url_params(['route'=>$route]);$q->set_query_params(array_merge(['action'=>$action],$query));$q->set_header('origin','https://fixture.test');$q->set_header('x-bb3d-csrf',csrf(customer()));if($b!==null){$q->set_header('content-type','application/json');$q->set_body(wp_json_encode($b));}return $q;}
activate();global $wpdb;$wpdb->query('DELETE FROM '.$wpdb->prefix.'bb3d_cards');
$store=storage();$s=service();$alice=actorCookie('a');$bob=hash('sha256',str_repeat('b',48));wp_set_current_user(0);update_option('bb3d_cards_public',false);
check(!operator(),'Guest is not operator');check(is_wp_error(permission(request('purchase','list'))),'Test mode rejects guests');
update_option('bb3d_cards_public',true);check(permission(request('purchase','list'))===true,'Open storefront permits own list');
check(is_wp_error(permission(request('orders'))),'Guest cannot list orders');check(is_wp_error(permission(request('ai','bonus','POST',[]))),'Guest cannot give attempts');
$q=request('purchase','create','POST',[]);$q->set_header('origin','https://evil.invalid');check(is_wp_error(permission($q)),'Cross-origin write rejected');
$q=request('purchase','create','POST',[]);$q->set_header('x-bb3d-csrf','wrong');check(is_wp_error(permission($q)),'Wrong CSRF rejected');
$_COOKIE['bb3d_cards_customer']='tampered';fails(fn()=>customer(),401);actorCookie('a');
$id=wp_generate_uuid4();$body=['id'=>$id,'details'=>['customerName'=>'SYNTHETIC CUSTOMER','contact'=>'fixture@example.invalid','packs'=>2,'amountSEK'=>1,'paid'=>true]];
$p=$s->create($body,$alice);check($p['payment']['amountSEK']===200&&!$p['paid'],'Server owns payment and price');check(count($p['slots'])===2,'Separate motif slots');check($s->create($body,$alice)===$p,'Create is idempotent');
fails(fn()=>$s->own($id,$bob),404);fails(fn()=>$s->slot($id,$p['slots'][0]['id'],$alice),403);
$old=$store->read('orders/'.$id);$store->write('orders/'.$id,$old['data'],$old['etag']);fails(fn()=>$store->write('orders/'.$id,$old['data'],$old['etag']),409);
check(count($store->rows('orders/',$bob))===0,'Indexed customer listing excludes other actors');
$admin=get_user_by('login','fixture_admin');wp_set_current_user($admin->ID);check(operator(),'WordPress administrator is operator');check(permission(request('orders'))===true,'Operator can view queue');
$version=$store->read('orders/'.$id)['data']['createdAt'];$r=$s->updateOrder($id,['testOrder'=>true,'updatedAt'=>$version]);$r=$s->updateOrder($id,['paid'=>true,'updatedAt'=>$r['updatedAt']]);check($r['paid'],'Manual payment unlocks');check($s->stats()['paidSEK']===0&&$s->stats()['excludedTests']===1,'Test sales excluded');
fails(fn()=>$s->updateOrder($id,['status'=>'production','updatedAt'=>$r['updatedAt']]),409);
check(count($s->view($store->read('orders/'.$id)['data'])['slots'])===2,'Order survives blocked production');
$print=file_get_contents(__DIR__.'/fixtures/print.png');$hash=png($print,true);fails(fn()=>png(substr($print,0,-1),true),400);
$source=file_get_contents(__DIR__.'/fixtures/source.png');$photo='data:image/png;base64,'.base64_encode($source);check(inputPhoto($photo)===$photo,'Source validated');fails(fn()=>inputPhoto('data:image/png;base64,broken'),400);
$path='incoming/'.substr($alice,0,24).'/'.wp_generate_uuid4().'.png';$store->putImage($path,$print,$alice,time()+86400);check($store->image($path)===$print,'Private image roundtrip');$store->putImage($path,$print,$alice,time()+86400);fails(fn()=>$store->putImage($path,$print,$bob,time()+86400),409);
$original=$store->read('orders/'.$id)['data'];$s->presence($id,$p['slots'][0]['id'],$alice);check($store->read('orders/'.$id)['data']===$original,'Presence does not change sales/version');fails(fn()=>$s->presence($id,'not-a-slot',$alice),400);
$d=['profileId'=>'bb3d-fantasy','approved'=>true,'player'=>'ÄVENTYRAREN','mode'=>'trainer','element'=>'skog','hp'=>90,'damage'=>30,'attack'=>'Mod','ability'=>'Vänskap','note'=>'Syntetiskt test'];
$submit=['purchaseId'=>$id,'slotId'=>$p['slots'][0]['id'],'requestId'=>basename($path,'.png'),'imageHash'=>$hash,'details'=>$d];
$approved=$s->submit($submit,$alice);check($approved['slots'][0]['ready']&&!$approved['complete'],'Each pack has own print');check($s->submit($submit,$alice)===$approved,'Submit is idempotent');
$changed=$submit;$changed['details']['player']='ANNAN';fails(fn()=>$s->submit($changed,$alice),409);fails(fn()=>$s->submit($submit,$bob),404);
[$row,$index]=$s->slot($id,$p['slots'][1]['id'],$alice);$order=$row['data'];$slot=$order['slots'][$index];$key=$s->grantKey($order,$slot);$s->ensure($order,$slot);$revision=$store->read('ai/control')['etag'];$s->ensure($order,$slot);check($store->read('ai/control')['etag']===$revision,'Existing grant is read only');
$calls=0;$result=file_get_contents(__DIR__.'/fixtures/result.png');$ai=new AI($s,function($spec,$photo,$actor)use(&$calls,$result){$calls++;return $result;});
$gen=['id'=>wp_generate_uuid4(),'purchaseId'=>$id,'slotId'=>$slot['id'],'profileId'=>'bb3d-fantasy','mode'=>'trainer','element'=>'skog','photo'=>$photo,'consent'=>true];
fails(fn()=>$ai->generate($gen,$alice),503);check($calls===0,'Disabled AI never reaches provider');
$s->changeControl(function(&$c){$c['settings']=['enabled'=>true,'dailyLimit'=>2];return true;});
$noConsent=$gen;$noConsent['consent']=false;fails(fn()=>$ai->generate($noConsent,$alice),400);check($calls===0,'No consent never reaches provider');
$done=$ai->generate($gen,$alice);check($done['status']==='done'&&$calls===1,'Paid generation completes');check($done['attemptsRemaining']===1,'Attempt counted');
$again=$ai->generate($gen,$alice);check($again['status']==='done'&&$calls===1,'Job replay never calls provider again');
$foreign=$order;$foreign['customer']=$bob;fails(fn()=>$ai->job($gen['id'],$foreign,$slot),403);fails(fn()=>$s->slot($id,$p['slots'][0]['id'],$alice),409);
$s->changeControl(function(&$c)use($key){$c['grants'][$key]['lastAttemptAt']=time()-31;return true;});$second=$gen;$second['id']=wp_generate_uuid4();$ai->generate($second,$alice);check($calls===2,'Second attempt allowed');
$third=$gen;$third['id']=wp_generate_uuid4();fails(fn()=>$ai->generate($third,$alice),429);check($calls===2,'Third attempt rejected');
$s->changeControl(function(&$c)use($key){$c['grants'][$key]['maxAttempts']+=2;$c['grants'][$key]['maxImages']+=2;$c['grants'][$key]['lastAttemptAt']=time()-31;return true;});fails(fn()=>$ai->generate($third,$alice),429);check($calls===2,'Bonus does not bypass daily cap');
$s->changeControl(function(&$c){$c['settings']['dailyLimit']=4;return true;});$uncertain=new AI($s,function(){throw new Failure(504,'Synthetic uncertain result');});$failed=$uncertain->generate($third,$alice);check($failed['status']==='uncertain'&&$s->control()['active'],'Unknown provider result keeps lease');
$fourth=$gen;$fourth['id']=wp_generate_uuid4();fails(fn()=>$ai->generate($fourth,$alice),409);
// Verify the real provider adapter without a network call or a live key.
$providerCalls=0;$captured=null;$filter=function($pre,$args,$url)use(&$providerCalls,&$captured,$result){$providerCalls++;$captured=json_decode($args['body'],true);check($url==='https://api.openai.com/v1/images/edits','Fixed provider destination');return ['headers'=>[],'body'=>wp_json_encode(['data'=>[['b64_json'=>base64_encode($result)]]]),'response'=>['code'=>200,'message'=>'OK'],'cookies'=>[]];};
add_filter('pre_http_request',$filter,10,3);check($ai->provider(['profileId'=>'bb3d-fantasy','mode'=>'trainer','element'=>'skog'],$photo,$alice)===$result,'Provider response decoded');remove_filter('pre_http_request',$filter,10);
check($providerCalls===1&&$captured['n']===1&&$captured['quality']==='medium'&&$captured['size']==='1536x1024','Single fixed-quality provider call');check(strpos($captured['prompt'],'woodland adventure jacket')!==false,'Approved clothing/environment prompt retained');check(!isset($captured['code']),'No user-defined prompt override');
// Finish the second pack and exercise the complete operator production/payment flow.
$path2='incoming/'.substr($alice,0,24).'/'.wp_generate_uuid4().'.png';$store->putImage($path2,$print,$alice,time()+86400);
$sport=['profileId'=>'future-star-football','approved'=>true,'player'=>'SPELARE TEST','club'=>'FBK Karlstad','clubName'=>'FBK Karlstad','position'=>'BACK','stats'=>[90,90,90,90,90,90],'total'=>90];
$all=$s->submit(['purchaseId'=>$id,'slotId'=>$slot['id'],'requestId'=>basename($path2,'.png'),'imageHash'=>$hash,'details'=>$sport],$alice);check($all['complete'],'All motifs required and completed');
$v=$store->read('orders/'.$id)['data']['updatedAt'];$r=$s->updateOrder($id,['status'=>'production','updatedAt'=>$v]);check($r['status']==='production','Production unlocked only after payment and both prints');
fails(fn()=>$s->updateOrder($id,['paid'=>false,'updatedAt'=>$r['updatedAt']]),409);
$r=$s->updateOrder($id,['status'=>'new','testOrder'=>false,'updatedAt'=>$r['updatedAt']]);$sales=$s->stats();check($sales['paidSEK']===200&&$sales['paidPacks']===2&&$sales['paidCards']===8,'Real sales count server price/packs/cards');check(count($sales['products'])===2,'Sport and trainer sales stay separate');
$r=$s->updateOrder($id,['paid'=>false,'updatedAt'=>$r['updatedAt']]);check($s->stats()['paidSEK']===0&&$s->stats()['unpaidSEK']===200,'Payment correction reverses sales');
$r=$s->updateOrder($id,['paid'=>true,'testOrder'=>true,'updatedAt'=>$r['updatedAt']]);check($s->stats()['paidSEK']===0,'Marking test again excludes all sales');
// REST routing uses WordPress permissions, not just direct domain calls.
$rest=request('stats');$res=rest_do_request($rest);check($res->get_status()===200,'WordPress REST dispatcher reaches authenticated stats');
wp_set_current_user(0);$res=rest_do_request(request('orders'));check($res->get_status()===403,'WordPress REST dispatcher denies guest order listing');wp_set_current_user($admin->ID);
$private=$store->privateDir();unset($_SERVER['DOCUMENT_ROOT']);check($store->privateDir()===$private,'Scheduled cleanup uses the same validated private directory');$_SERVER['DOCUMENT_ROOT']=$root;
$anon=$store->read('statistics/'.$id)['data'];check(strpos(wp_json_encode($anon),'SYNTHETIC CUSTOMER')===false&&strpos(wp_json_encode($anon),'fixture@example.invalid')===false,'Sales omit names/contact');
$latest=$store->read('orders/'.$id);$latest['data']['expiresAt']=iso(time()-1);$store->write('orders/'.$id,$latest['data'],$latest['etag']);fails(fn()=>$s->own($id,$alice),410);$s->cleanup();check(!$store->read('orders/'.$id)&&$store->read('statistics/'.$id),'Expired customers removed, anonymous sales retained');
$files=$store->rows('files/');$f=$files[0];$f['data']['expires']=time()-1;$store->write($f['key'],$f['data'],$f['etag']);$store->expireFiles();fails(fn()=>$store->image(substr($f['key'],6)),410);
check(strpos($store->privateDir(),realpath(ABSPATH).'/')!==0,'Files stay outside webroot');
echo "WordPress ".get_bloginfo('version').": $checks integration assertions passed (isolated SQLite-backed wpdb; Loopia MariaDB test remains).\n";
