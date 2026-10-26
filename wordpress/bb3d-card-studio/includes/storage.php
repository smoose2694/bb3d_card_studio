<?php
namespace BB3D\Cards;
if (!defined('ABSPATH')) exit;
class Failure extends \RuntimeException {
    public $status;
    public function __construct($status, $message) { parent::__construct($message); $this->status=$status; }
}
function demand($condition, $status, $message) { if (!$condition) throw new Failure($status,$message); }
class Storage {
    private $db;
    private $table;
    public function __construct($db) { $this->db=$db; $this->table=$db->prefix.'bb3d_cards'; }
    public function install() {
        require_once ABSPATH.'wp-admin/includes/upgrade.php';
        $charset=$this->db->get_charset_collate();
        dbDelta("CREATE TABLE {$this->table} (
            record_key varchar(191) NOT NULL,
            owner varchar(64) NOT NULL DEFAULT '',
            payload longtext NOT NULL,
            revision bigint unsigned NOT NULL DEFAULT 1,
            modified bigint unsigned NOT NULL,
            PRIMARY KEY  (record_key),
            KEY owner (owner)
        ) $charset;");
        demand($this->db->get_var($this->db->prepare('SHOW TABLES LIKE %s',$this->table))===$this->table,503,'Kortdatabasen kunde inte skapas.');
    }
    public function read($key) {
        $row=$this->db->get_row($this->db->prepare("SELECT payload,revision FROM {$this->table} WHERE record_key=%s",$key),ARRAY_A);
        demand(!$this->db->last_error,503,'Databasen kunde inte svara.');
        return $row ? ['data'=>json_decode($row['payload'],true,512,JSON_THROW_ON_ERROR),'etag'=>(int)$row['revision']] : null;
    }
    public function write($key,$data,$etag=null,$owner='') {
        $json=wp_json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        demand(is_string($json),503,'Data kunde inte sparas.');
        if ($etag===null) $ok=$this->db->query($this->db->prepare("INSERT IGNORE INTO {$this->table} (record_key,owner,payload,revision,modified) VALUES (%s,%s,%s,1,%d)",$key,$owner,$json,time()));
        else $ok=$this->db->query($this->db->prepare("UPDATE {$this->table} SET payload=%s,revision=revision+1,modified=%d WHERE record_key=%s AND revision=%d",$json,time(),$key,$etag));
        demand($ok!==false,503,'Databasen kunde inte svara.');
        demand($ok===1,409,'Uppgifterna ändrades samtidigt. Uppdatera sidan.');
    }
    public function change($key,$fn,$initial=[]) {
        for($i=0;$i<8;$i++) {
            $old=$this->read($key); $data=$old['data']??$initial; $result=$fn($data);
            try { $this->write($key,$data,$old['etag']??null); return $result; }
            catch(Failure $e) { if($e->status!==409) throw $e; }
        }
        throw new Failure(409,'Många samtidiga ändringar. Uppdatera sidan.');
    }
    public function rows($prefix,$owner=null) {
        $like=$this->db->esc_like($prefix).'%';
        $sql=$owner===null ? $this->db->prepare("SELECT record_key,payload,revision FROM {$this->table} WHERE record_key LIKE %s",$like) : $this->db->prepare("SELECT record_key,payload,revision FROM {$this->table} WHERE record_key LIKE %s AND owner=%s",$like,$owner);
        $rows=$this->db->get_results($sql,ARRAY_A);
        demand(is_array($rows),503,'Databasen kunde inte svara.');
        return array_map(function($r){return ['key'=>$r['record_key'],'data'=>json_decode($r['payload'],true,512,JSON_THROW_ON_ERROR),'etag'=>(int)$r['revision']];},$rows);
    }
    public function remove($key,$etag) { $this->db->query($this->db->prepare("DELETE FROM {$this->table} WHERE record_key=%s AND revision=%d",$key,$etag)); }
    public function privateDir() {
        $document=!empty($_SERVER['DOCUMENT_ROOT'])?realpath($_SERVER['DOCUMENT_ROOT']):null;
        $wp=realpath(ABSPATH);
        demand($wp,503,'Serverns privata lagringsplats måste konfigureras.');
        $path=defined('BB3D_CARD_PRIVATE_DIR')?BB3D_CARD_PRIVATE_DIR:get_option('bb3d_cards_private_dir','');
        if(!$path) { demand($document,503,'Öppna BB3D kort i WordPress för att konfigurera privat lagring.'); $path=dirname($document).'/bb3d-cards-'.substr(hash('sha256',home_url('/')),0,12); }
        if (!is_dir($path)) @mkdir($path,0700,true);
        $real=realpath($path);
        demand($real&&is_writable($real),503,'Privat bildlagring saknas. Ange BB3D_CARD_PRIVATE_DIR utanför webbplatsens publika katalog.');
        foreach(array_unique(array_filter([$document,$wp])) as $root) demand($real!==$root&&strpos($real,$root.DIRECTORY_SEPARATOR)!==0,503,'Bildlagringen måste ligga utanför webbplatsens publika katalog.');
        if(!defined('BB3D_CARD_PRIVATE_DIR')) update_option('bb3d_cards_private_dir',$real,false);
        return $real;
    }
    private function file($key) { return $this->privateDir().'/'.hash('sha256',$key).'.png'; }
    public function putImage($key,$bytes,$owner,$expires) {
        $hash=hash('sha256',$bytes); $record='files/'.$key; $old=$this->read($record);
        if($old) { demand($old['data']['owner']===$owner&&$old['data']['hash']===$hash,409,'Bildfilen har ändrats.'); return; }
        $path=$this->file($key); $handle=@fopen($path,'x+b');
        if(!$handle) {
            // A prior upload may have written bytes before its metadata failed.
            demand(is_file($path)&&hash_file('sha256',$path)===$hash,409,'Bildfilen håller på att sparas. Försök igen.');
        } else {
            @chmod($path,0600); $written=0;
            try { while($written<strlen($bytes)) { $n=fwrite($handle,substr($bytes,$written)); demand($n!==false&&$n>0,503,'Bildfilen kunde inte sparas.'); $written+=$n; } fflush($handle); }
            finally { fclose($handle); }
        }
        try { $this->write($record,['hash'=>$hash,'owner'=>$owner,'expires'=>$expires,'bytes'=>strlen($bytes)],null,$owner); }
        catch(Failure $e) { $saved=$this->read($record); if(!$saved||$saved['data']['owner']!==$owner||$saved['data']['hash']!==$hash) throw $e; }
    }
    public function image($key) {
        $record=$this->read('files/'.$key);
        demand($record&&$record['data']['expires']>time(),410,'Bildfilen finns inte längre.');
        $bytes=@file_get_contents($this->file($key));
        demand(is_string($bytes)&&hash('sha256',$bytes)===$record['data']['hash'],404,'Bildfilen saknas eller är skadad.');
        return $bytes;
    }
    public function expireFiles() {
        foreach($this->rows('files/') as $r) if($r['data']['expires']<=time()) { @unlink($this->file(substr($r['key'],6))); $this->remove($r['key'],$r['etag']); }
        // Remove uncommitted uploads after a day; never touch recent writers.
        foreach(glob($this->privateDir().'/*.png')?:[] as $path) {
            if(filemtime($path)>time()-86400) continue;
            $exists=false; foreach($this->rows('files/') as $r) if($this->file(substr($r['key'],6))===$path) { $exists=true; break; }
            if(!$exists) @unlink($path);
        }
    }
}
