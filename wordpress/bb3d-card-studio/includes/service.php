<?php
namespace BB3D\Cards;
if (!defined('ABSPATH')) exit;
class Service {
    public $store;
    public function __construct($store) { $this->store=$store; }
    public function own($id,$actor,$paid=false,$open=false) {
        demand(uuid($id),404,'Köpet finns inte.'); $row=$this->store->read('orders/'.$id); $r=$row['data']??null;
        demand($r&&$r['customer']===$actor,404,'Köpet finns inte i denna kundsession.');
        demand(strtotime($r['expiresAt'])>time(),410,'Köpet har gått ut.');
        demand(!$paid||$r['paid'],403,'BB3D behöver kontrollera din Swish först.');
        demand(!$open||$r['status']==='new',409,'Köpet är redan under produktion.'); return $row;
    }
    public function view($r) {
        $out=array_intersect_key($r,array_flip(['id','createdAt','expiresAt','status','paid','details']));
        $message='BB3D '.strtoupper(substr($r['id'],0,8)); $amount=$r['details']['amountSEK'];
        $out['payment']=['amountSEK'=>$amount,'recipient'=>'1233661089','message'=>$message,'url'=>'https://app.swish.nu/1/p/sw/?'.http_build_query(['sw'=>'1233661089','amt'=>number_format($amount,2,'.',''),'msg'=>$message],'','&',PHP_QUERY_RFC3986)];
        $out['slots']=[]; $out['complete']=true;
        foreach($r['slots'] as $i=>$s) { $ready=isset($s['imagePath']); $out['complete']=$out['complete']&&$ready; $out['slots'][]=['id'=>$s['id'],'index'=>$i,'ready'=>$ready,'player'=>$s['details']['player']??null,'profileId'=>$s['card']['profileId']??null,'editor'=>$s['editor']??null]; }
        return $out;
    }
    public function create($b,$actor) {
        demand(uuid($b['id']??null),400,'Ogiltigt köp.'); $d=$b['details']??[];
        demand(is_int($d['packs']??null)&&$d['packs']>=1&&$d['packs']<=25,400,'Välj 1–25 4-pack.');
        $details=['customerName'=>text($d['customerName']??null,100,true),'contact'=>text($d['contact']??'',180),'packs'=>$d['packs'],'quantity'=>$d['packs']*4,'amountSEK'=>$d['packs']*100,'player'=>'Motiv väljs efter betalning','club'=>'Ej valt','clubName'=>'Ej valt'];
        $old=$this->store->read('orders/'.$b['id']);
        if($old) { $r=$this->own($b['id'],$actor)['data']; demand($r['details']===$details,409,'Köpet har ändrats.'); return $this->view($r); }
        $r=['id'=>$b['id'],'kind'=>'purchase','customer'=>$actor,'details'=>$details,'paid'=>false,'testOrder'=>false,'paidAt'=>null,'status'=>'new','createdAt'=>iso(),'expiresAt'=>iso(time()+30*86400),'slots'=>[]];
        for($i=0;$i<$d['packs'];$i++) $r['slots'][]=['id'=>wp_generate_uuid4()];
        try { $this->store->write('orders/'.$r['id'],$r,null,$actor); }
        catch(Failure $e) { if($e->status!==409) throw $e; return $this->create($b,$actor); }
        $this->statistics($r); return $this->view($r);
    }
    public function slot($purchaseId,$slotId,$actor,$generation=true) {
        $row=$this->own($purchaseId,$actor,true,$generation);
        foreach($row['data']['slots'] as $i=>$s) if($s['id']===$slotId) { demand(!$generation||!isset($s['imagePath']),409,'Motivet är redan godkänt.'); return [$row,$i]; }
        throw new Failure(404,'Motivplatsen finns inte.');
    }
    public function grantKey($r,$s) { return hash('sha256','pack:'.$r['id'].':'.$s['id'].':'.$r['customer']); }
    public function initialControl() { return ['settings'=>['enabled'=>false,'dailyLimit'=>2],'usage'=>[],'grants'=>[],'jobs'=>[],'active'=>null,'lastError'=>null]; }
    public function control() { return $this->tidy(($this->store->read('ai/control')['data']??$this->initialControl())); }
    public function tidy($s) {
        if($s['active']&&$s['active']['until']<=time()) { $id=$s['active']['id']; if(($s['jobs'][$id]['status']??null)==='running') { $s['jobs'][$id]['status']='uncertain'; $s['jobs'][$id]['message']='Försöket kunde inte bekräftas. Kontakta BB3D innan du försöker igen.'; } $s['active']=null; }
        foreach($s['jobs'] as $id=>$j) if($j['expiresAt']<=time()) unset($s['jobs'][$id]);
        foreach($s['grants'] as $id=>$g) if($g['expiresAt']<time()-86400) unset($s['grants'][$id]);
        foreach($s['usage'] as $d=>$n) if($d<day(iso(time()-3*86400))) unset($s['usage'][$d]);
        return $s;
    }
    public function changeControl($fn) { return $this->store->change('ai/control',function(&$s) use($fn){$s=$this->tidy($s); return $fn($s);},$this->initialControl()); }
    public function info($g=null) { $g=$g??['successes'=>0,'attempts'=>0,'maxImages'=>2,'maxAttempts'=>2,'expiresAt'=>0]; return ['remaining'=>max(0,$g['maxImages']-$g['successes']),'attemptsRemaining'=>max(0,$g['maxAttempts']-$g['attempts']),'maxAttempts'=>$g['maxAttempts'],'expiresAt'=>$g['expiresAt']*1000,'cooldownUntil'=>($g['lastAttemptAt']??0)?($g['lastAttemptAt']+30)*1000:0]; }
    public function ensure($r,$s) {
        $key=$this->grantKey($r,$s); $existing=$this->control(); if(isset($existing['grants'][$key])) return $this->info($existing['grants'][$key]);
        return $this->changeControl(function(&$c) use($key,$r) { if(!isset($c['grants'][$key])) $c['grants'][$key]=['actor'=>$r['customer'],'expiresAt'=>strtotime($r['expiresAt']),'successes'=>0,'attempts'=>0,'maxImages'=>2,'maxAttempts'=>2,'bonusRequests'=>[]]; return $this->info($c['grants'][$key]); });
    }
    public function submit($b,$actor) {
        demand(uuid($b['requestId']??null)&&is_string($b['imageHash']??null)&&preg_match('/^[a-f0-9]{64}$/D',$b['imageHash']),400,'Motivet har fel format.');
        $initial=$this->own($b['purchaseId']??'',$actor,true)['data'];
        $d=details(array_merge($b['details']??[],['customerName'=>$initial['details']['customerName'],'contact'=>$initial['details']['contact']]));
        $fingerprint=hash('sha256',wp_json_encode($d).$b['imageHash']); $path='incoming/'.substr($actor,0,24).'/'.$b['requestId'].'.png';
        $bytes=$this->store->image($path); demand(png($bytes,true)===$b['imageHash'],400,'Tryckfilen stämmer inte med godkännandet.');
        for($n=0;$n<8;$n++) {
            $row=$this->own($b['purchaseId'],$actor,true); $r=$row['data']; $index=null;
            foreach($r['slots'] as $i=>$s) if($s['id']===($b['slotId']??'')) $index=$i;
            demand($index!==null,404,'Motivplatsen finns inte.'); $s=$r['slots'][$index];
            if(isset($s['imagePath'])) { demand($s['fingerprint']===$fingerprint,409,'Motivet är redan godkänt med andra uppgifter.'); $this->statistics($r); return $this->view($r); }
            demand($r['status']==='new',409,'Köpet är redan under produktion.');
            $editor=[]; foreach(['primary','accent'] as $k) if(preg_match('/^#[a-f0-9]{6}$/iD',$b['editor'][$k]??'')) $editor[$k]=$b['editor'][$k];
            $r['slots'][$index]=array_merge($s,['details'=>$d,'card'=>identity($d),'imagePath'=>$path,'fingerprint'=>$fingerprint,'approvedAt'=>iso(),'editor'=>$editor?:null]);
            $r['updatedAt']=$this->nextVersion($r);
            try { $this->store->write('orders/'.$r['id'],$r,$row['etag']); $this->statistics($r); return $this->view($r); } catch(Failure $e) { if($e->status!==409) throw $e; }
        }
        throw new Failure(409,'Motivet ändrades samtidigt. Uppdatera sidan.');
    }
    public function nextVersion($r) { return sprintf('%.6F',max(microtime(true),(float)($r['updatedAt']??0)+0.000001)); }
    public function summary($r,$control=null) {
        $view=$this->view($r); $out=array_merge($r['details'],array_intersect_key($r,array_flip(['id','kind','createdAt','expiresAt','status','paid','paidAt','testOrder'])));
        $out['updatedAt']=$r['updatedAt']??$r['createdAt']; $out['complete']=$view['complete']; $out['slots']=[];
        foreach($r['slots'] as $s) $out['slots'][]=['id'=>$s['id'],'ready'=>isset($s['imagePath']),'player'=>$s['details']['player']??null,'sport'=>$s['card']['sport']??null,'variant'=>$s['card']['variant']??null,'ai'=>$this->info($control['grants'][$this->grantKey($r,$s)]??null)];
        $presence=$this->store->read('presence/'.$r['id'])['data']??[]; $out['activeAt']=isset($presence['seenAt'])?$presence['seenAt']*1000:null; $out['activeSlot']=$presence['slotId']??null;
        return $out;
    }
    public function updateOrder($id,$b) {
        demand(uuid($id),400,'Ogiltig beställning.'); $row=$this->store->read('orders/'.$id); demand($row,404,'Beställningen finns inte.'); $r=$row['data'];
        demand(strtotime($r['expiresAt'])>time(),410,'Beställningen har gått ut.');
        demand(($b['updatedAt']??null)===($r['updatedAt']??$r['createdAt']),409,'Beställningen har ändrats. Uppdatera listan.');
        demand(isset($b['paid'])||isset($b['testOrder'])||isset($b['status']),400,'Ingen ändring angiven.');
        foreach(['paid','testOrder'] as $k) if(isset($b[$k])) { demand(is_bool($b[$k]),400,'Ogiltig markering.'); $r[$k]=$b[$k]; }
        if(isset($b['status'])) { demand(in_array($b['status'],['new','production','done'],true),400,'Ogiltig status.'); $r['status']=$b['status']; }
        demand($r['status']==='new'||($r['paid']&&$this->view($r)['complete']),409,'Betalning och alla motiv måste vara klara före produktion.');
        $r['paidAt']=$r['paid']?($r['paidAt']??iso()):null; $r['updatedAt']=$this->nextVersion($r);
        $this->store->write('orders/'.$id,$r,$row['etag']); $this->statistics($r); return $this->summary($r,$this->control());
    }
    public function statistics($r) {
        // Always reread the latest order during a retry so an older writer cannot
        // overwrite a payment correction with a stale anonymous sales record.
        $this->store->change('statistics/'.$r['id'],function(&$data) use($r) {
            $r=$this->store->read('orders/'.$r['id'])['data']??$r; $d=$r['details'];
            $data=['day'=>day($r['createdAt']),'paidDay'=>$r['paidAt']?day($r['paidAt']):null,'paid'=>$r['paid'],'testOrder'=>$r['testOrder'],'status'=>$r['status'],'packs'=>$d['packs'],'quantity'=>$d['quantity'],'amountSEK'=>$d['amountSEK'],'lines'=>[]];
            foreach($r['slots'] as $s) $data['lines'][]=['product'=>isset($s['card'])?$s['card']['product'].(isset($s['card']['variant'])?' · '.$s['card']['variant']:''):'4-pack · motiv väntar','sport'=>$s['card']['sport']??'Ej valt','club'=>isset($s['details'])?(in_array($s['details']['club'],['Egen klubb','Egen hockeyklubb'],true)?$s['details']['clubName']:$s['details']['club']):'Ej valt','packs'=>1,'quantity'=>4,'amountSEK'=>100];
            return true;
        });
    }
    public function stats($from='',$to='') {
        foreach([$from,$to] as $d) demand($d===''||(preg_match('/^\d{4}-\d{2}-\d{2}$/D',$d)&&date('Y-m-d',strtotime($d))===$d),400,'Välj en giltig datumperiod.'); demand(!$from||!$to||$from<=$to,400,'Ogiltig datumperiod.');
        $out=['orders'=>0,'cards'=>0,'done'=>0,'paidOrders'=>0,'paidCards'=>0,'paidPacks'=>0,'paidSEK'=>0,'unpaidOrders'=>0,'unpaidSEK'=>0,'unpricedOrders'=>0,'excludedTests'=>0,'from'=>$from,'to'=>$to,'clubs'=>[]]; $products=[];$clubs=[];$days=[];
        $add=function(&$map,$name,$r,$count=true) { $map[$name]=$map[$name]??['name'=>$name,'orders'=>0,'packs'=>0,'cards'=>0,'amountSEK'=>0]; $map[$name]['orders']+=$count?1:0; $map[$name]['packs']+=$r['packs'];$map[$name]['cards']+=$r['quantity'];$map[$name]['amountSEK']+=$r['amountSEK']; };
        foreach($this->store->rows('statistics/') as $row) {
            $r=$row['data']; if($r['testOrder']) { $out['excludedTests']++; continue; } $d=$r['paid']?$r['paidDay']:$r['day']; if(($from&&$d<$from)||($to&&$d>$to)) continue;
            $out['orders']++;$out['cards']+=$r['quantity']; if($r['status']==='done') $out['done']++;
            if($r['paid']) { $out['paidOrders']++;$out['paidCards']+=$r['quantity'];$out['paidPacks']+=$r['packs'];$out['paidSEK']+=$r['amountSEK']; $seenP=[];$seenC=[];
                foreach($r['lines'] as $l) { $product=$l['product'].' · '.$l['sport']; $club=$l['club']; $add($products,$product,$l,!isset($seenP[$product])); $add($clubs,$club,$l,!isset($seenC[$club]));$seenP[$product]=true;$seenC[$club]=true; } $add($days,$d,$r);
            } else { $out['unpaidOrders']++;$out['unpaidSEK']+=$r['amountSEK']; }
        }
        $rank=function($map){$rows=array_values($map);usort($rows,function($a,$b){return $b['amountSEK']<=>$a['amountSEK']?:strcmp($a['name'],$b['name']);});return $rows;};
        krsort($days); return $out+['products'=>$rank($products),'salesByClub'=>$rank($clubs),'days'=>array_values($days)];
    }
    public function presence($id,$slot,$actor) {
        $r=$this->own($id,$actor)['data']; demand($slot===null||in_array($slot,array_column($r['slots'],'id'),true),400,'Ogiltig motivplats.');
        $key='presence/'.$id; $old=$this->store->read($key); if($old&&$old['data']['slotId']===$slot&&$old['data']['seenAt']>time()-45) return ['ok'=>true];
        $this->store->change($key,function(&$d) use($slot){$d=['slotId'=>$slot,'seenAt'=>time()];return true;}); return ['ok'=>true];
    }
    public function cleanup() {
        foreach($this->store->rows('orders/') as $r) if(strtotime($r['data']['expiresAt'])<=time()) { $this->statistics($r['data']); $this->store->remove($r['key'],$r['etag']); }
        foreach(['presence/','limits/'] as $prefix) foreach($this->store->rows($prefix) as $r) if(($r['data']['expires']??($r['data']['seenAt']??0)+86400)<=time()) $this->store->remove($r['key'],$r['etag']);
        $this->changeControl(function(&$s){return true;}); $this->store->expireFiles();
    }
}
