<?php
namespace BB3D\Cards;
if (!defined('ABSPATH')) exit;
function uuid($value) { return is_string($value)&&preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iD',$value); }
function text($v,$max,$required=false) { demand(is_string($v)&&mb_strlen($v)<=$max&&(!$required||trim($v)!==''),400,'Kontrollera textfälten.'); return trim($v); }
function iso($time=null) { return gmdate('Y-m-d\TH:i:s\Z',$time??time()); }
function day($value=null) { return (new \DateTimeImmutable($value??'now'))->setTimezone(new \DateTimeZone('Europe/Stockholm'))->format('Y-m-d'); }
function png($b,$print=false,$result=false) {
    $max=($print||$result)?12*1024*1024:2500000;
    demand(is_string($b)&&strlen($b)>=60&&strlen($b)<=$max&&substr($b,0,8)==="\x89PNG\r\n\x1a\n",400,'Välj en giltig PNG-bild.');
    $p=8; $w=0; $h=0; $channels=0; $density=false; $ended=false; $idat='';
    while($p+12<=strlen($b)) {
        $n=unpack('N',substr($b,$p,4))[1]; demand($n<=strlen($b)-$p-12,400,'PNG-filen är skadad.');
        $type=substr($b,$p+4,4); $data=substr($b,$p+8,$n);
        demand(hash('crc32b',$type.$data,true)===substr($b,$p+8+$n,4),400,'PNG-kontrollsumman är felaktig.');
        if($type==='IHDR') {
            demand($p===8&&$n===13,400,'PNG-huvudet är felaktigt.'); $sizes=unpack('Nw/Nh',$data); $w=$sizes['w']; $h=$sizes['h']; $color=ord($data[9]);
            demand(ord($data[8])===8&&in_array($color,[2,6],true)&&substr($data,10,3)==="\0\0\0",400,'PNG-formatet stöds inte.'); $channels=$color===6?4:3;
            demand($print?($w===1488&&$h===2079):($result?($w===1536&&$h===1024):($w>0&&$h>0&&$w<=768&&$h<=768)),400,'Bildens pixelmått är felaktiga.');
        }
        if($type==='pHYs') $density=$n===9&&$data===pack('NNC',23619,23625,1);
        if($type==='IDAT') $idat.=$data;
        $p+=$n+12;
        if($type==='IEND') { $ended=$n===0&&$p===strlen($b); break; }
    }
    demand($channels&&$ended&&$idat!==''&&(!$print||$density),400,'PNG-filen saknar bilddata eller utskriftsmått.');
    $stride=$w*$channels+1; $raw=@zlib_decode($idat,$stride*$h);
    demand(is_string($raw)&&strlen($raw)===$stride*$h,400,'PNG-bilddata kunde inte läsas.');
    for($y=0;$y<$h;$y++) demand(ord($raw[$y*$stride])<=4,400,'PNG-filtret är felaktigt.');
    return hash('sha256',$b);
}
function inputPhoto($value) {
    demand(is_string($value)&&strlen($value)<=3400000&&preg_match('#^data:image/png;base64,([A-Za-z0-9+/]+={0,2})$#D',$value,$m),400,'Ladda upp ett giltigt foto.');
    $b=base64_decode($m[1],true); demand($b!==false&&base64_encode($b)===$m[1],400,'Fotot är skadat.'); png($b); return $value;
}
function profiles() { static $p; if(!$p) $p=json_decode(file_get_contents(__DIR__.'/../catalogue.json'),true,512,JSON_THROW_ON_ERROR); return $p; }
function details($raw) {
    demand(is_array($raw)&&($raw['approved']??false)===true,400,'Godkänn förhandsvisningen först.');
    $profile=null; foreach(profiles()['profiles'] as $p) if($p['id']===($raw['profileId']??'')) $profile=$p;
    demand($profile,400,'Välj en giltig korttyp.');
    $out=['profileId'=>$profile['id'],'approved'=>true,'player'=>text($raw['player']??null,$profile['id']==='bb3d-fantasy'?28:60,true),'customerName'=>text($raw['customerName']??null,100,true),'contact'=>text($raw['contact']??'',180),'quantity'=>4,'packs'=>1,'amountSEK'=>100];
    demand(!in_array(mb_strtoupper($out['player']),['SPELARNAMN','DITT NAMN'],true),400,'Ange namnet på kortet.');
    if($profile['id']==='bb3d-fantasy') {
        demand(in_array($raw['mode']??null,['trainer','monster'],true)&&(($raw['mode']??null)==='trainer'||(is_string($raw['element']??null)&&array_key_exists($raw['element'],profiles()['elements']))),400,'Välj motivtyp och element.');
        foreach(['hp'=>[10,300],'damage'=>[0,200]] as $k=>$range) demand(is_int($raw[$k]??null)&&$raw[$k]>=$range[0]&&$raw[$k]<=$range[1],400,'Kontrollera kortets värden.');
        $out+=['club'=>'BB3D Fantasy','clubName'=>'BB3D Fantasy','position'=>$raw['mode']==='trainer'?'TRÄNARE':'MONSTER','mode'=>$raw['mode'],'element'=>$raw['mode']==='trainer'?null:$raw['element'],'hp'=>$raw['hp'],'damage'=>$raw['damage'],'attack'=>text($raw['attack']??null,26,true),'ability'=>text($raw['ability']??null,26,true),'note'=>text($raw['note']??'',100)];
    } else {
        demand(in_array($raw['club']??null,$profile['clubs'],true)&&in_array($raw['position']??null,$profile['positions'],true),400,'Kontrollera klubb och position.');
        demand(is_array($raw['stats']??null)&&count($raw['stats'])===6,400,'Ange sex spelarvärden.');
        foreach(array_merge($raw['stats'],[$raw['total']??null]) as $v) demand(is_int($v)&&$v>=1&&$v<=99,400,'Spelarvärden måste vara 1–99.');
        $out+=['club'=>$raw['club'],'clubName'=>text($raw['clubName']??null,50,true),'position'=>$raw['position'],'stats'=>array_values($raw['stats']),'total'=>$raw['total']];
    }
    return $out;
}
function identity($d) {
    foreach(profiles()['profiles'] as $p) if($p['id']===$d['profileId']) {
        $out=array_intersect_key($p,array_flip(['id','productId','product','sportId','sport'])); unset($out['id']); $out['profileId']=$p['id'];
        if($p['id']==='bb3d-fantasy') $out+=['variantId'=>$d['mode'],'variant'=>$d['mode']==='trainer'?'Tränare':'Monster'];
        return $out;
    }
    throw new Failure(400,'Okänd korttyp.');
}
