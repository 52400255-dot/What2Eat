<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
if(PHP_SAPI!=='cli')exit;
$features=json_decode(file_get_contents(dirname(__DIR__,2).'/storage/datasets/hcm-osm-food/hcm_food_places.geojson'),true)['features'];
$q=db()->prepare('INSERT INTO place_catalog(source_id,name,address,phone,website,opening_hours,price_range,payload) VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),phone=VALUES(phone),website=VALUES(website),opening_hours=VALUES(opening_hours)');
$counts=['total'=>count($features),'address'=>0,'phone'=>0,'opening_hours'=>0,'price'=>0];
db()->beginTransaction();
foreach($features as $f){$p=$f['properties'];[$type,$id]=explode('/',$p['source_id']);
 $place=['type'=>$type,'id'=>(int)$id,'lat'=>$f['geometry']['coordinates'][1],'lon'=>$f['geometry']['coordinates'][0],'address'=>$p['address'],'tags'=>['name'=>$p['name'],'cuisine'=>$p['cuisine'],'amenity'=>$p['category'],'phone'=>$p['phone'],'website'=>$p['website'],'opening_hours'=>$p['opening_hours']]];
 $q->execute([$type.':'.$id,$p['name'],$p['address'],$p['phone'],$p['website'],$p['opening_hours'],null,json_encode($place,JSON_UNESCAPED_UNICODE)]);
 foreach(['address','phone','opening_hours'] as $k)if(!empty($p[$k]))$counts[$k]++;
}
db()->commit();echo json_encode($counts,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE).PHP_EOL;
