<?php
declare(strict_types=1);
require dirname(__DIR__).'/bootstrap.php';
require dirname(__DIR__).'/completion.php';
if(PHP_SAPI!=='cli')exit;
// Small, explicitly invoked batch, one worker, shared rate limiter and persistent cache.
$limit=max(1,min(50,(int)($argv[1]??10)));
$q=db()->query("SELECT * FROM place_catalog WHERE address='' ORDER BY source_id LIMIT ".$limit);
$before=db()->query("SELECT COUNT(*) FROM place_catalog WHERE address<>''")->fetchColumn();$improved=0;
foreach($q->fetchAll() as $r){$p=reverse_address(catalog_place($r));if(!empty($p['address']))$improved++;echo $r['source_id'].': '.(!empty($p['address'])?'address found':'unavailable').PHP_EOL;}
$after=db()->query("SELECT COUNT(*) FROM place_catalog WHERE address<>''")->fetchColumn();
echo json_encode(['sample'=>$limit,'improved'=>$improved,'addresses_before'=>(int)$before,'addresses_after'=>(int)$after],JSON_PRETTY_PRINT).PHP_EOL;
