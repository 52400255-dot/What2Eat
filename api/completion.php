<?php
declare(strict_types=1);

function catalog_place(array $r): array {
    $p=json_decode($r['payload'],true); $p['address']=$r['address'];
    foreach(['phone','opening_hours','website','price_range'] as $key) if($r[$key]) $p['tags'][$key]=$r[$key];
    $p['verification_status']=$r['verification_status']??'unverified';
    $p['verification_source']=$r['verification_source']??null;
    $p['verification_note']=$r['verification_note']??null;
    $p['verified_at']=$r['verified_at']??null;
    return $p;
}
function catalog_store(array $places): void {
    $q=db()->prepare('INSERT INTO place_catalog(source_id,name,address,phone,website,opening_hours,price_range,payload) VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),name=VALUES(name),address=IF(VALUES(address)<>\'\',VALUES(address),address),phone=COALESCE(NULLIF(VALUES(phone),\'\'),phone),website=COALESCE(NULLIF(VALUES(website),\'\'),website),opening_hours=COALESCE(NULLIF(VALUES(opening_hours),\'\'),opening_hours)');
    foreach($places as $p){$t=$p['tags']??[];if(empty($t['name'])||!isset($p['type'],$p['id']))continue;
        $address=$p['address']??$t['addr:full']??implode(', ',array_filter([$t['addr:housenumber']??null,$t['addr:street']??null,$t['addr:suburb']??null,$t['addr:city']??null]));
        $q->execute([$p['type'].':'.$p['id'],mb_substr($t['name'],0,180),mb_substr($address,0,500),mb_substr($t['phone']??$t['contact:phone']??'',0,40),mb_substr($t['website']??$t['contact:website']??'',0,500),mb_substr($t['opening_hours']??'',0,255),null,json_encode($p,JSON_UNESCAPED_UNICODE)]);
    }
}
function catalog_enrich(array $p): array {
    $q=db()->prepare('SELECT * FROM place_catalog WHERE source_id=?');$q->execute([$p['type'].':'.$p['id']]);
    if($r=$q->fetch()) { $saved=catalog_place($r); $p['tags']=array_merge($saved['tags']??[],$p['tags']??[]); if(empty($p['address']))$p['address']=$saved['address']; foreach(['verification_status','verification_source','verification_note','verified_at'] as $key) $p[$key]=$saved[$key]??null; }
    if(empty($p['verification_status']))$p['verification_status']='unverified';
    $q=db()->prepare('SELECT fields FROM place_corrections WHERE source_id=? AND status=\'approved\' ORDER BY id');$q->execute([$p['type'].':'.$p['id']]);
    foreach($q as $r)foreach(json_decode($r['fields'],true) as $key=>$value){if($key==='address')$p['address']=$value;else $p['tags'][$key]=$value;}
    return $p;
}
function catalog_enrich_many(array $places): array {
    if(!$places)return [];
    $sources=[];
    foreach($places as $place)if(isset($place['type'],$place['id']))$sources[]=$place['type'].':'.$place['id'];
    $sources=array_values(array_unique($sources));
    if(!$sources)return $places;
    $marks=implode(',',array_fill(0,count($sources),'?'));
    $q=db()->prepare("SELECT * FROM place_catalog WHERE source_id IN ({$marks})");$q->execute($sources);
    $saved=[];foreach($q as $row)$saved[$row['source_id']]=$row;
    $q=db()->prepare("SELECT source_id,fields FROM place_corrections WHERE status='approved' AND source_id IN ({$marks}) ORDER BY id");$q->execute($sources);
    $corrections=[];foreach($q as $row){$fields=json_decode($row['fields'],true);if(is_array($fields))$corrections[$row['source_id']][]=$fields;}
    foreach($places as &$place){
        if(!isset($place['type'],$place['id']))continue;
        $source=$place['type'].':'.$place['id'];
        if(isset($saved[$source])){
            $catalog=catalog_place($saved[$source]);
            $place['tags']=array_merge($catalog['tags']??[],$place['tags']??[]);
            if(empty($place['address']))$place['address']=$catalog['address'];
            foreach(['verification_status','verification_source','verification_note','verified_at'] as $key)$place[$key]=$catalog[$key]??null;
        }elseif(empty($place['verification_status']))$place['verification_status']='unverified';
        foreach($corrections[$source]??[] as $fields)foreach($fields as $key=>$value){if($key==='address')$place['address']=$value;else $place['tags'][$key]=$value;}
    }
    unset($place);
    return $places;
}
function reverse_address(array $p): array {
    if(!empty($p['address'])||!empty($p['tags']['addr:street'])||!empty($p['tags']['addr:full']))return $p;
    $lat=$p['lat']??$p['center']['lat']??null;$lon=$p['lon']??$p['center']['lon']??null;
    if(!is_numeric($lat)||!is_numeric($lon))return $p;
    $key=hash('sha256','reverse:'.$lat.':'.$lon);
    $read=db()->prepare('SELECT body FROM api_cache WHERE cache_key=? AND expires_at>UTC_TIMESTAMP()');$read->execute([$key]);$cached=$read->fetchColumn();
    if($cached!==false){$p['address']=json_decode($cached,true);$p['address_source']='Địa chỉ gần tọa độ · Nominatim';return $p;}
    $lock=db()->query("SELECT GET_LOCK('w2e_nominatim_rate_limit',15)");if((int)$lock->fetchColumn()!==1)return $p;
    try{
        $clockKey=hash('sha256','nominatim:global-last-request');$q=db()->prepare('SELECT body FROM api_cache WHERE cache_key=?');$q->execute([$clockKey]);$last=(float)json_decode((string)$q->fetchColumn(),true);$wait=1100000-(int)((microtime(true)-$last)*1000000);if($wait>0)usleep($wait);
        $save=db()->prepare('INSERT INTO api_cache(cache_key,body,cached_at,expires_at) VALUES(?,?,UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 DAY)) ON DUPLICATE KEY UPDATE body=VALUES(body),cached_at=VALUES(cached_at),expires_at=VALUES(expires_at)');$save->execute([$clockKey,json_encode(microtime(true))]);
        $url=env_value('W2E_NOMINATIM_REVERSE_URL','https://nominatim.openstreetmap.org/reverse');if(!str_starts_with($url,'https://'))return $p;
        $ch=curl_init($url.'?'.http_build_query(['format'=>'jsonv2','lat'=>$lat,'lon'=>$lon,'zoom'=>18]));curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>12,CURLOPT_HTTPHEADER=>['User-Agent: What2Eat/1.0 ('.env_value('W2E_BASE_URL').')','Accept: application/json']]);$raw=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);
        if($status!==200)return $p;$data=json_decode((string)$raw,true);$a=$data['address']??[];
        // Reverse geocoding identifies the surrounding street, not a verified house number.
        $address=implode(', ',array_unique(array_filter([$a['road']??null,$a['suburb']??$a['quarter']??null,$a['city_district']??null,$a['city']??$a['town']??$a['state']??null])));
        $save->execute([$key,json_encode($address,JSON_UNESCAPED_UNICODE)]);
        if($address){$p['address']=$address;$p['address_source']='Địa chỉ gần tọa độ · Nominatim';db()->prepare("UPDATE place_catalog SET address=? WHERE source_id=? AND address=''")->execute([$address,$p['type'].':'.$p['id']]);}
    }catch(Throwable $e){error_log('[What2Eat] Reverse geocoding unavailable');}finally{db()->query("SELECT RELEASE_LOCK('w2e_nominatim_rate_limit')");}
    return $p;
}
function notify_plan(int $planId, int $actor, string $message): void {
    $q=db()->prepare('INSERT INTO notifications(user_id,message,url) SELECT user_id,?,? FROM food_plan_members WHERE food_plan_id=? AND user_id<>?');
    $q->execute([$message,'/pages/food-plans.php?plan='.$planId,$planId,$actor]);
}
function completion_routes(string $path,string $method,array $body): void {
    if($path==='/admin/osm-verifications' && $method==='GET'){
        $admin=require_admin();$status=(string)($_GET['status']??'unverified');
        if(!in_array($status,['unverified','verified_active','reported_closed','all'],true))throw new ApiError(422,'Trạng thái xác minh không hợp lệ.');
        $where=$status==='all'?'':'WHERE c.verification_status=?';$params=$status==='all'?[]:[$status];
        $q=db()->prepare("SELECT c.source_id,c.name,c.address,c.verification_status,c.verification_source,c.verification_note,c.verified_at FROM place_catalog c {$where} ORDER BY c.verification_status='unverified' DESC,c.name LIMIT 200");$q->execute($params);
        json_response(['data'=>$q->fetchAll()]);
    }
    if($path==='/admin/osm-verifications' && $method==='POST'){
        $admin=require_admin();$source=required_string($body,'source_id',80);
        if(!preg_match('/^(node|way|relation):[1-9]\d{0,17}$/',$source))throw new ApiError(422,'Mã OSM không hợp lệ.');
        $status=(string)($body['status']??'');if(!in_array($status,['verified_active','reported_closed'],true))throw new ApiError(422,'Trạng thái xác minh không hợp lệ.');
        $evidence=required_string($body,'verification_source',255,5);$note=required_string($body,'verification_note',1000,10);
        $q=db()->prepare('SELECT source_id FROM place_catalog WHERE source_id=?');$q->execute([$source]);if(!$q->fetchColumn()){$place=function_exists('public_snapshot_place_by_id')?public_snapshot_place_by_id($source):null;if(!$place)throw new ApiError(404,'Chưa có bản ghi OSM này trong danh mục. Hãy tải khu vực đó trước.');catalog_store([$place]);}
        db()->prepare('UPDATE place_catalog SET verification_status=?,verification_source=?,verification_note=?,verified_by=?,verified_at=UTC_TIMESTAMP() WHERE source_id=?')->execute([$status,$evidence,$note,$admin['id'],$source]);
        audit($admin['id'],'osm_place.activity_verified','osm_place',$source,['status'=>$status,'source'=>$evidence]);
        json_response(['message'=>$status==='verified_active'?'Đã ghi nhận quán đang hoạt động.':'Đã ghi nhận quán được báo đóng cửa.','verification_status'=>$status,'verified_at'=>gmdate('Y-m-d H:i:s').' UTC']);
    }
    if($path==='/notifications' && $method==='GET'){
        $u=current_user();$q=db()->prepare('SELECT id,message,url,read_at,created_at FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 100');$q->execute([$u['id']]);
        $count=db()->prepare('SELECT COUNT(*) FROM notifications WHERE user_id=? AND read_at IS NULL');$count->execute([$u['id']]);json_response(['data'=>$q->fetchAll(),'unread'=>(int)$count->fetchColumn()]);
    }
    if($path==='/notifications/read' && $method==='POST'){
        $u=current_user();$q=db()->prepare('UPDATE notifications SET read_at=UTC_TIMESTAMP() WHERE user_id=? AND (?=0 OR id=?)');$id=(int)($body['id']??0);$q->execute([$u['id'],$id,$id]);json_response(['ok'=>true]);
    }
    if($path==='/restaurants/search' && $method==='GET'){
        $term=trim((string)($_GET['q']??''));if(mb_strlen($term)<2)json_response(['data'=>[]]);
        $u=current_user(false);$q=db()->prepare("SELECT * FROM restaurants WHERE (status='published' OR (created_by=? AND status='pending')) AND name LIKE ? ORDER BY name LIMIT 25");$q->execute([$u['id']??0,'%'.$term.'%']);$rows=[];
        foreach($q as $r)$rows[]=['managed_record'=>true,'source'=>$r['source'],'id'=>(int)$r['id'],'lat'=>(float)$r['latitude'],'lon'=>(float)$r['longitude'],'tags'=>['name'=>$r['name']],'restaurant'=>public_restaurant($r)];
        $q=db()->prepare('SELECT c.* FROM place_catalog c LEFT JOIN osm_place_blocks b ON b.source_id=c.source_id WHERE c.name LIKE ? AND b.source_id IS NULL ORDER BY c.name LIMIT 25');$q->execute(['%'.$term.'%']);$knownSourceIds=[];foreach($q as $r){$knownSourceIds[]=$r['source_id'];$rows[]=catalog_enrich(catalog_place($r));}
        if(count($rows)<50){
            $blocked=db()->query('SELECT source_id FROM osm_place_blocks')->fetchAll(PDO::FETCH_COLUMN);
            $remaining=max(0,50-count($rows));
            foreach(public_snapshot_search($term,array_merge($knownSourceIds,$blocked),$remaining) as $place)$rows[]=$place;
        }
        json_response(['data'=>array_slice($rows,0,50)]);
    }
    if($path==='/restaurants/dishes' && $method==='GET'){
        $u=current_user();$id=(string)($_GET['id']??'');$managed=($_GET['source']??'')==='managed';
        $q=db()->prepare('SELECT food_name,MAX(price) AS price FROM food_notes WHERE '.($managed?'restaurant_id=?':"restaurant_source='osm' AND restaurant_source_id=?")." AND (user_id=? OR (privacy='public' AND status='published')) GROUP BY food_name ORDER BY food_name LIMIT 50");$q->execute([$id,$u['id']]);json_response(['data'=>$q->fetchAll()]);
    }
    if($path==='/place-corrections' && $method==='POST'){
        $u=current_user();rate_limit('corrections',10,3600);$id=required_string($body,'source_id',80);
        if(!preg_match('/^(node|way|relation):[1-9]\d{0,17}$/',$id))throw new ApiError(422,'Mã quán không hợp lệ.');
        $fields=[];foreach(['address'=>500,'phone'=>40,'opening_hours'=>255,'price_range'=>80] as $k=>$max){$v=optional_string($body,$k,$max);if($v!==null)$fields[$k]=$v;}
        if(!$fields)throw new ApiError(422,'Hãy nhập thông tin cần bổ sung.');
        db()->prepare('INSERT INTO place_corrections(user_id,source_id,fields) VALUES(?,?,?)')->execute([$u['id'],$id,json_encode($fields,JSON_UNESCAPED_UNICODE)]);json_response(['message'=>'Đã gửi thông tin để quản trị viên duyệt.'],201);
    }
    if($path==='/admin/place-corrections' && $method==='GET'){require_admin();json_response(['data'=>db()->query("SELECT c.*,p.name FROM place_corrections c LEFT JOIN place_catalog p ON p.source_id=c.source_id WHERE c.status='pending' ORDER BY c.id")->fetchAll()]);}
    if(preg_match('#^/admin/place-corrections/(\d+)$#',$path,$m) && $method==='PATCH'){
        $u=require_admin();$status=$body['status']??'';if(!in_array($status,['approved','rejected'],true))throw new ApiError(422,'Trạng thái không hợp lệ.');
        db()->prepare("UPDATE place_corrections SET status=? WHERE id=? AND status='pending'")->execute([$status,$m[1]]);audit($u['id'],'place.corrected','place_correction',$m[1]);json_response(['ok'=>true]);
    }
}
