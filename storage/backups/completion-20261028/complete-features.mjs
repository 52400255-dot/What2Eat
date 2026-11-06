import fs from 'node:fs';
const root='D:/WEB_VER CODEX/what2eat/';
function edit(file,fn){let s=fs.readFileSync(root+file,'utf8');fs.writeFileSync(root+file,fn(s));}
edit('api/schema.sql',s=>s+`
CREATE TABLE IF NOT EXISTS place_catalog (
 source_id VARCHAR(80) PRIMARY KEY,name VARCHAR(180) NOT NULL,address VARCHAR(500) NOT NULL DEFAULT '',
 phone VARCHAR(40) NULL,opening_hours VARCHAR(255) NULL,website VARCHAR(500) NULL,price_range VARCHAR(80) NULL,
 payload JSON NOT NULL, KEY ix_catalog_name(name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS place_corrections (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id BIGINT UNSIGNED NOT NULL,source_id VARCHAR(80) NOT NULL,
 fields JSON NOT NULL,status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 KEY ix_correction_place(source_id,status),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS notifications (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id BIGINT UNSIGNED NOT NULL,message VARCHAR(500) NOT NULL,url VARCHAR(500) NOT NULL,
 read_at DATETIME NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,KEY ix_notification_user(user_id,read_at),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`);
edit('api/index.php',s=>{
 s=s.replace("require_once __DIR__ . '/google-auth.php';","require_once __DIR__ . '/google-auth.php';\nrequire_once __DIR__ . '/completion.php';");
 s=s.replace("if ($method !== 'GET') require_csrf();","if ($method !== 'GET') require_csrf();\n    completion_routes($path,$method,$body);");
 s=s.replace("if (!empty($properties['cuisine']))", "foreach (['phone','website','opening_hours'] as $field) if(!empty($properties[$field])) $tags[$field]=$properties[$field];\n        if (!empty($properties['cuisine']))");
 s=s.replace("$data['elements'] = $elements;","$data['elements'] = array_map('catalog_enrich',$elements);");
 s=s.replace("json_response(['data'=>$place,'nearby'", "$place=catalog_enrich($place);\n        json_response(['data'=>$place,'nearby'");
 s=s.replace("$devMailCapture = is_local_development_origin($baseUrl);","$devMailCapture = env_value('W2E_MAIL_TRANSPORT','smtp') === 'log' && is_local_development_origin($baseUrl);");
 s=s.replace("$token = make_token();\n    $stmt = db()->prepare('INSERT INTO email_tokens", "$token = make_token();\n    db()->prepare('UPDATE email_tokens SET used_at=UTC_TIMESTAMP() WHERE user_id=? AND purpose=? AND used_at IS NULL')->execute([$userId,$purpose]);\n    $stmt = db()->prepare('INSERT INTO email_tokens");
 s=s.replace("Tiếp tục trên What2Eat</a>","Xác nhận email</a>");
 let start=s.indexOf("        rate_limit('resend_verify'");let end=s.indexOf('\n    }',start);
 s=s.slice(0,start)+`        rate_limit('resend_verify',3,3600);rate_limit('resend_verify_minute',1,60);
        $email=clean_email($body['email']??'');$stmt=db()->prepare("SELECT id FROM users WHERE email=? AND status='pending'");$stmt->execute([$email]);$id=$stmt->fetchColumn();
        if($id){db()->beginTransaction();try{$token=issue_email_token((int)$id,'verify',1440);if(!token_mail($email,'Xác nhận email What2Eat','Xác nhận địa chỉ email',$token,'/api/v1/auth/verify?token=','Liên kết có hiệu lực trong 24 giờ.'))throw new ApiError(503,'Không gửi được email. Vui lòng kiểm tra cấu hình SMTP.');db()->commit();}catch(Throwable $e){db()->rollBack();error_log('[What2Eat] resend delivery failed');throw $e;}}
        json_response(['message'=>'Đã xử lý yêu cầu. Nếu tài khoản đang chờ xác nhận, vui lòng kiểm tra hộp thư.']);`+s.slice(end);
 s=s.replaceAll("'invite_url'=>'/pages/food-plans.php?join='","'invite_url'=>rtrim((string)env_value('W2E_BASE_URL'),'/').'/pages/food-plans.php?join='");
 s=s.replace("json_response(['id'=>$planId,'message'=>'Bạn đã tham gia Food Plan.']);", "notify_plan($planId,(int)$user['id'],$user['name'].' đã tham gia Food Plan.');json_response(['id'=>$planId,'message'=>'Bạn đã tham gia Food Plan.']);");
 s=s.replaceAll('SELECT id FROM restaurants WHERE id=? AND status=\'published\'\");$chk->execute([$restaurantId])','SELECT id FROM restaurants WHERE id=? AND (status=\'published\' OR (created_by=? AND status=\'pending\'))\");$chk->execute([$restaurantId,$user[\'id\']])');
 return s;
});
edit('api/bootstrap.php',s=>{
 s=s.replace('if (is_local_development_origin()) {',"if (env_value('W2E_MAIL_TRANSPORT','smtp') === 'log' && is_local_development_origin()) {");
 s=s.replace("return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $html, $headers);",`$host=env_value('W2E_SMTP_HOST');$username=env_value('W2E_SMTP_USERNAME');$password=env_value('W2E_SMTP_PASSWORD');
    if(!$host||!$username||!$password||!preg_match('/^[a-zA-Z0-9.-]+$/',$host)){error_log('[What2Eat] SMTP configuration missing');return false;}
    $sender=preg_match('/<([^>]+)>/',$from,$match)?$match[1]:$from;
    if(!filter_var($sender,FILTER_VALIDATE_EMAIL))return false;
    $secure=env_value('W2E_SMTP_SECURITY','tls');$port=(int)env_value('W2E_SMTP_PORT',$secure==='ssl'?'465':'587');
    $stream=fopen('php://temp','r+');$message=$headers.'To: '.$to."\\r\\nSubject: =?UTF-8?B?".base64_encode($subject)."?=\\r\\nDate: ".gmdate('r')."\\r\\n\\r\\n".$html;
    fwrite($stream,$message);rewind($stream);$ch=curl_init(($secure==='ssl'?'smtps':'smtp').'://'.$host.':'.$port);
    curl_setopt_array($ch,[CURLOPT_USERNAME=>$username,CURLOPT_PASSWORD=>$password,CURLOPT_USE_SSL=>CURLUSESSL_ALL,CURLOPT_MAIL_FROM=>$sender,CURLOPT_MAIL_RCPT=>[$to],CURLOPT_UPLOAD=>true,CURLOPT_INFILE=>$stream,CURLOPT_INFILESIZE=>strlen($message),CURLOPT_TIMEOUT=>25,CURLOPT_RETURNTRANSFER=>true]);
    $ok=curl_exec($ch)!==false;if(!$ok)error_log('[What2Eat] SMTP transport failed, code '.curl_errno($ch));curl_close($ch);fclose($stream);return $ok;`);
 return s;
});
edit('.env.example',s=>s+`\n# smtp sends real email. log is only for explicit local tests.\nW2E_MAIL_TRANSPORT=smtp\nW2E_SMTP_HOST=smtp.gmail.com\nW2E_SMTP_PORT=587\nW2E_SMTP_SECURITY=tls\nW2E_SMTP_USERNAME=\nW2E_SMTP_PASSWORD=\n`);
edit('tests/integration.mjs',s=>s.replace("...process.env, W2E_ENV:","...process.env, W2E_MAIL_TRANSPORT: 'log', W2E_ENV:"));
edit('assets/js/site.js',s=>s.replace("if(confirmed)confirmed.textContent=email;","if(confirmed)confirmed.textContent=email;const copy=success.querySelector('.w2e-success-copy');if(copy)copy.textContent=result.message;"));
