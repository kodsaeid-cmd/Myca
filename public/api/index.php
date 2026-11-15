<?php
declare(strict_types=1);

/**
 * MYCA Phase One — PHP 8.3 + MySQL API for ParsPack cPanel.
 * Public document root is the sibling "public/" directory.
 * Private config lives at ../private/config.php, outside the document root.
 */

const MYCA_ADMIN_SESSION = 'myca_admin_session';

function myca_config(): array {
    static $config = null;
    if ($config !== null) return $config;
    $path = dirname(__DIR__, 2) . '/private/config.php';
    if (getenv('MYCA_CONFIG_PATH')) $path = (string)getenv('MYCA_CONFIG_PATH');
    if (!is_file($path)) throw new RuntimeException('MYCA_CONFIG_MISSING');
    $loaded = require $path;
    if (!is_array($loaded)) throw new RuntimeException('MYCA_CONFIG_INVALID');
    foreach (['db_host','db_name','db_user','db_password','setup_token','session_secret','site_url'] as $key) {
        if (!array_key_exists($key, $loaded) || trim((string)$loaded[$key]) === '' || str_contains((string)$loaded[$key], 'REPLACE_WITH') || str_starts_with((string)$loaded[$key], 'SET_')) {
            throw new RuntimeException('MYCA_CONFIG_INCOMPLETE');
        }
    }
    if (PHP_SAPI !== 'cli') {
        $configuredHost = strtolower((string)(parse_url((string)$loaded['site_url'], PHP_URL_HOST) ?: ''));
        $requestHost = strtolower(preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? '')) ?? '');
        if (!$configuredHost || ($requestHost !== '' && !hash_equals($configuredHost, $requestHost))) {
            throw new RuntimeException('MYCA_HOST_MISMATCH');
        }
    }
    return $config = $loaded;
}

function myca_db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $cfg = myca_config();
    $pdo = new PDO(
        'mysql:host=' . $cfg['db_host'] . ';dbname=' . $cfg['db_name'] . ';charset=utf8mb4',
        (string)$cfg['db_user'],
        (string)$cfg['db_password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    return $pdo;
}

function json_response(int $status, array|null $data = null): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    header('X-Content-Type-Options: nosniff');
    if ($status !== 204) {
        echo json_encode($data ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    }
    exit;
}

function api_error(string $message, int $status = 400): never {
    json_response($status, ['error' => $message]);
}

function request_body(): array {
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || strlen($raw) > 1500000) api_error('حجم اطلاعات ارسالی بیش از حد مجاز است.', 413);
    if (trim($raw) === '') return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) api_error('ساختار اطلاعات ارسالی معتبر نیست.', 400);
    return $data;
}

function clean_text(mixed $value, int $max, bool $required = false): ?string {
    if (!is_string($value)) return $required ? null : '';
    $value = trim($value);
    if ($required && $value === '') return null;
    return mb_substr($value, 0, $max, 'UTF-8');
}

function number_value(mixed $value): ?float {
    if ($value === null || $value === '' || !is_numeric($value)) return null;
    return (float)$value;
}

function normalize_phone(mixed $value): ?string {
    if (!is_string($value)) return null;
    $digits = strtr(trim($value), [
        '۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
        '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9'
    ]);
    $compact = preg_replace('/[\s().-]/u', '', $digits) ?? '';
    if (preg_match('/^09\d{9}$/', $compact)) return '+98' . substr($compact, 1);
    if (preg_match('/^9\d{9}$/', $compact)) return '+98' . $compact;
    if (preg_match('/^989\d{9}$/', $compact)) return '+' . $compact;
    if (preg_match('/^00989\d{9}$/', $compact)) return '+' . substr($compact, 2);
    if (preg_match('/^\+[1-9]\d{7,14}$/', $compact)) return $compact;
    return null;
}

function is_https(): bool {
    return (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function same_origin(): bool {
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin === '') return true;
    $originHost = strtolower((string)(parse_url($origin, PHP_URL_HOST) ?: ''));
    $host = strtolower(preg_replace('/:\d+$/', '', (string)($_SERVER['HTTP_HOST'] ?? '')) ?? '');
    return $originHost !== '' && $host !== '' && hash_equals($host, $originHost);
}

function require_same_origin(): void {
    if (!same_origin()) api_error('مبدأ درخواست مجاز نیست.', 403);
}

function start_admin_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name(MYCA_ADMIN_SESSION);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
    if (!isset($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

function admin_csrf(): string {
    start_admin_session();
    return (string)$_SESSION['csrf'];
}

function require_admin_csrf(): void {
    require_same_origin();
    start_admin_session();
    $sent = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($sent === '' || !hash_equals((string)$_SESSION['csrf'], $sent)) {
        api_error('توکن امنیتی منقضی یا نامعتبر است. صفحه را تازه‌سازی کنید.', 419);
    }
}

function admin_user(): array {
    start_admin_session();
    $id = (int)($_SESSION['admin_id'] ?? 0);
    if ($id < 1) api_error('برای ورود به پنل مدیریت وارد شوید.', 401);
    $query = myca_db()->prepare('SELECT id, username, display_name, role, password_hash, active FROM myca_admin_users WHERE id = ? LIMIT 1');
    $query->execute([$id]);
    $user = $query->fetch();
    if (!$user || (int)$user['active'] !== 1) {
        $_SESSION = [];
        api_error('نشست مدیریت معتبر نیست. دوباره وارد شوید.', 401);
    }
    $signature = hash_hmac('sha256', (string)$user['password_hash'], (string)myca_config()['session_secret']);
    if (!isset($_SESSION['auth_signature']) || !hash_equals($signature, (string)$_SESSION['auth_signature'])) {
        $_SESSION = [];
        api_error('رمز عبور حساب تغییر کرده است؛ دوباره وارد شوید.', 401);
    }
    unset($user['password_hash'], $user['active']);
    return $user;
}

function admin_setup(): never {
    require_same_origin();
    $body = request_body();
    $cfg = myca_config();
    $pdo = myca_db();
    $count = (int)$pdo->query('SELECT COUNT(*) FROM myca_admin_users')->fetchColumn();
    if ($count > 0) api_error('مدیر اولیه قبلاً ساخته شده است. از صفحه ورود استفاده کنید.', 409);
    $token = is_string($body['setupToken'] ?? null) ? $body['setupToken'] : '';
    if ($token === '' || !hash_equals((string)$cfg['setup_token'], $token)) api_error('کلید راه‌اندازی معتبر نیست.', 403);
    $username = clean_text($body['username'] ?? null, 80, true);
    $displayName = clean_text($body['displayName'] ?? null, 120, true);
    $password = is_string($body['password'] ?? null) ? $body['password'] : '';
    if (!$username || !preg_match('/^[a-zA-Z0-9._-]{3,80}$/', $username)) api_error('نام کاربری باید حداقل ۳ کاراکتر و فقط شامل حروف انگلیسی، عدد، نقطه، خط تیره یا زیرخط باشد.', 422);
    if (!$displayName || mb_strlen($displayName, 'UTF-8') < 2) api_error('نام مدیر را کامل وارد کنید.', 422);
    if (strlen($password) < 12) api_error('رمز عبور باید حداقل ۱۲ کاراکتر باشد.', 422);
    $hash = password_hash($password, PASSWORD_DEFAULT);
    try {
        $insert = $pdo->prepare("INSERT INTO myca_admin_users (username, display_name, password_hash, role, active) VALUES (?, ?, ?, 'admin', 1)");
        $insert->execute([$username, $displayName, $hash]);
    } catch (PDOException $error) {
        if ((string)$error->getCode() === '23000') api_error('این نام کاربری قبلاً استفاده شده است.', 409);
        throw $error;
    }
    start_admin_session();
    session_regenerate_id(true);
    $_SESSION['admin_id'] = (int)$pdo->lastInsertId();
    $_SESSION['auth_signature'] = hash_hmac('sha256', $hash, (string)$cfg['session_secret']);
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    json_response(201, ['ok'=>true,'user'=>['username'=>$username,'displayName'=>$displayName],'csrfToken'=>$_SESSION['csrf']]);
}

function admin_login(): never {
    require_same_origin();
    $body = request_body();
    $username = clean_text($body['username'] ?? null, 80, true) ?? '';
    $password = is_string($body['password'] ?? null) ? $body['password'] : '';
    if ($username === '' || $password === '') api_error('نام کاربری و رمز عبور را وارد کنید.', 422);
    $pdo = myca_db();
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $ipHash = hash_hmac('sha256', $ip, (string)myca_config()['session_secret']);
    $limit = $pdo->prepare('SELECT COUNT(*) FROM myca_admin_login_attempts WHERE ip_hash = ? AND created_at >= UTC_TIMESTAMP() - INTERVAL 15 MINUTE');
    $limit->execute([$ipHash]);
    if ((int)$limit->fetchColumn() >= 10) api_error('تعداد تلاش‌های ورود زیاد است. ۱۵ دقیقه بعد دوباره تلاش کنید.', 429);
    $query = $pdo->prepare('SELECT id, username, display_name, role, password_hash FROM myca_admin_users WHERE username = ? AND active = 1 LIMIT 1');
    $query->execute([$username]);
    $user = $query->fetch();
    if (!$user || !password_verify($password, (string)$user['password_hash'])) {
        $insertAttempt = $pdo->prepare('INSERT INTO myca_admin_login_attempts (ip_hash) VALUES (?)');
        $insertAttempt->execute([$ipHash]);
        api_error('نام کاربری یا رمز عبور صحیح نیست.', 401);
    }
    $pdo->prepare('DELETE FROM myca_admin_login_attempts WHERE ip_hash = ?')->execute([$ipHash]);
    $pdo->prepare('UPDATE myca_admin_users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?')->execute([(int)$user['id']]);
    start_admin_session();
    session_regenerate_id(true);
    $_SESSION['admin_id'] = (int)$user['id'];
    $_SESSION['auth_signature'] = hash_hmac('sha256', (string)$user['password_hash'], (string)myca_config()['session_secret']);
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    json_response(200, [
        'ok'=>true,
        'user'=>['id'=>(int)$user['id'],'username'=>$user['username'],'displayName'=>$user['display_name'],'role'=>$user['role']],
        'csrfToken'=>$_SESSION['csrf']
    ]);
}

function admin_logout(): never {
    require_admin_csrf();
    start_admin_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires'=>time()-42000,'path'=>$params['path'] ?: '/',
            'domain'=>$params['domain'] ?? '',
            'secure'=>$params['secure'] ?? is_https(),
            'httponly'=>true,'samesite'=>'Lax'
        ]);
    }
    session_destroy();
    json_response(200, ['ok'=>true]);
}

function package_catalog(string $categoryId, string $serviceSlug): ?array {
    if (in_array($categoryId, ['11','22'], true)) {
        return ['slug'=>'elders-pricing','kind'=>'elderly','packages'=>[
            'hamdam'=>['title'=>'همدم','monthly'=>33],
            'hamrah'=>['title'=>'همراه','monthly'=>41],
            'hami'=>['title'=>'حامی','monthly'=>26],
            'aramyar'=>['title'=>'آرامیار','monthly'=>50],
            'tavanyar'=>['title'=>'توانیار','monthly'=>48],
            'custom'=>['title'=>'خدمت اختصاصی','monthly'=>null]
        ]];
    }
    $childAllowed = $categoryId === '27'
        || ($categoryId === '12' && in_array($serviceSlug, ['infant-nurse','mother-companion','child-care','child-care-package'], true));
    if (!$childAllowed) return null;
    return ['slug'=>'pedia','kind'=>'child','packages'=>[
        'infant'=>['title'=>'مراقبت از نوزاد','monthly'=>39],
        'toddler'=>['title'=>'مراقبت از کودک','monthly'=>40],
        'preschool'=>['title'=>'مراقبت از کودک','monthly'=>44],
        'school-age'=>['title'=>'مراقبت کودک همراه آموزش','monthly'=>50],
        'pregnancy'=>['title'=>'همراهی دوران بارداری','monthly'=>37],
        'custom'=>['title'=>'خدمت اختصاصی','monthly'=>null]
    ]];
}

function package_allowed(string $categoryId, string $serviceSlug, string $packageId): bool {
    if (in_array($categoryId, ['11','22'], true)) return in_array($packageId, ['hamdam','hamrah','hami','aramyar','tavanyar','custom'], true);
    if ($categoryId === '27' || $serviceSlug === 'infant-nurse') return in_array($packageId, ['infant','custom'], true);
    if ($serviceSlug === 'mother-companion') return in_array($packageId, ['pregnancy','custom'], true);
    if ($serviceSlug === 'child-care') return in_array($packageId, ['toddler','preschool','school-age','custom'], true);
    if ($serviceSlug === 'child-care-package') return in_array($packageId, ['infant','toddler','preschool','school-age','pregnancy','custom'], true);
    return false;
}

function build_pricing_snapshot(string $categoryId, string $serviceSlug, ?string $packageId, string $shift, ?int $months, int $children, bool $friday): ?array {
    $catalog = package_catalog($categoryId, $serviceSlug);
    if (!$catalog || !$packageId) {
        return ['estimate_status'=>'quote_required','reason'=>'package_or_catalog_not_selected','payment_method'=>'phone_coordination','payment_status'=>'awaiting_contact','friday_required'=>$friday];
    }
    $selected = $catalog['packages'][$packageId] ?? null;
    if (!$selected) return null;
    if ($selected['monthly'] === null || !$months) {
        return ['estimate_status'=>'quote_required','catalog'=>$catalog['slug'],'package_id'=>$packageId,'package_title'=>$selected['title'],'payment_method'=>'phone_coordination','payment_status'=>'awaiting_contact','friday_required'=>$friday];
    }
    $additionalChild = ($catalog['kind'] === 'child' && $serviceSlug !== 'mother-companion') ? max(0, $children - 1) * 25 : 0;
    $roundClock = $shift === 'شبانه‌روزی' ? 35 : 0;
    $base = (int)round($selected['monthly'] * 10000000);
    $adjusted = (int)round($base * (1 + ($additionalChild + $roundClock) / 100));
    $rates = [1=>25,2=>30,3=>35,4=>45,5=>48,6=>65,12=>120];
    $commission = $rates[$months] ?? 0;
    $subtotal = $adjusted * $months;
    $oneTime = (int)round($adjusted * $commission / 100);
    return [
        'estimate_status'=>$friday ? 'provisional_excluding_friday' : 'provisional',
        'payment_method'=>'phone_coordination','payment_status'=>'awaiting_contact',
        'source_catalog'=>$catalog['slug'],'package_id'=>$packageId,'package_title'=>$selected['title'],
        'currency'=>'IRR','display_unit'=>'TOMAN','base_monthly_wage_rial'=>$base,
        'adjusted_monthly_wage_rial'=>$adjusted,'duration_months'=>$months,
        'additional_child_percent'=>$additionalChild,'round_the_clock_percent'=>$roundClock,
        'wage_subtotal_rial'=>$subtotal,'commission_percent'=>$commission,
        'one_time_commission_rial'=>$oneTime,'total_estimate_rial'=>$subtotal + $oneTime,
        'friday_required'=>$friday,'friday_included'=>false,
        'exclusions'=>$friday ? ['هزینه حضور روز جمعه در این برآورد وارد نشده و نیازمند پیش‌فاکتور تکمیلی است.'] : []
    ];
}

function create_reference(PDO $pdo): string {
    $month = gmdate('Ym');
    $query = $pdo->prepare(
        'INSERT INTO myca_reference_sequences (month_key, last_number) VALUES (?, LAST_INSERT_ID(1))
         ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)'
    );
    $query->execute([$month]);
    $number = (int)$pdo->lastInsertId();
    return 'MYCA-' . $month . '-' . str_pad((string)$number, 6, '0', STR_PAD_LEFT);
}

function create_order(): never {
    require_same_origin();
    $body = request_body();
    $categoryId = clean_text($body['categoryId'] ?? null, 8, true);
    $serviceSlug = clean_text($body['serviceSlug'] ?? null, 80, true);
    $requesterName = clean_text($body['requesterName'] ?? null, 120, true);
    $phone = normalize_phone($body['phone'] ?? null);
    $recipientName = clean_text($body['recipientName'] ?? null, 120);
    $city = clean_text($body['city'] ?? null, 100, true);
    $province = clean_text($body['province'] ?? null, 100);
    $address = clean_text($body['address'] ?? null, 500, true);
    $postalCode = clean_text($body['postalCode'] ?? null, 20);
    $notes = clean_text($body['notes'] ?? null, 1200);
    $shift = clean_text($body['shift'] ?? null, 40, true);
    $packageId = clean_text($body['packageId'] ?? null, 80);
    $startAt = clean_text($body['startAt'] ?? null, 80, true);
    $dependencyRaw = clean_text($body['dependency'] ?? null, 40);
    $recipientAge = number_value($body['recipientAge'] ?? null);
    $childrenCount = number_value($body['childrenCount'] ?? null) ?? 1;
    $duration = number_value($body['durationMonths'] ?? null);
    $friday = ($body['fridayRequired'] ?? false) === true;
    $urgent = ($body['urgent'] ?? false) === true;
    $allowedShifts = ['روزانه','شبانه','شبانه‌روزی','ساعتی','موردی','جلسه‌ای','نیاز به هماهنگی'];
    $allowedMonths = [1,2,3,4,5,6,12];
    $dependencyMap = ['مستقل'=>'independent','نیمه‌وابسته'=>'semi_dependent','وابسته'=>'dependent','independent'=>'independent','semi_dependent'=>'semi_dependent','dependent'=>'dependent'];

    if (!$categoryId || !preg_match('/^\d{1,3}$/', $categoryId) || !$serviceSlug || !preg_match('/^[a-z0-9-]+$/', $serviceSlug)) api_error('دسته خدمت یا نوع خدمت معتبر نیست.', 422);
    if (!$requesterName || !$phone || !$city || !$address || !$shift || !in_array($shift, $allowedShifts, true) || !$startAt) api_error('اطلاعات ضروری سفارش را کامل کنید.', 422);
    if ($recipientAge !== null && (floor($recipientAge) !== $recipientAge || $recipientAge < 0 || $recipientAge > 120)) api_error('سن خدمت‌گیرنده معتبر نیست.', 422);
    if (floor($childrenCount) !== $childrenCount || $childrenCount < 1 || $childrenCount > 4) api_error('تعداد کودک باید بین ۱ تا ۴ باشد.', 422);
    if ($duration !== null && (floor($duration) !== $duration || !in_array((int)$duration, $allowedMonths, true))) api_error('مدت قرارداد انتخاب‌شده معتبر نیست.', 422);
    if (!$startAt || !preg_match('/^\d{4}-\d{2}-\d{2}T/', $startAt) || !preg_match('/(Z|[+-]\d{2}:\d{2})$/', $startAt)) api_error('زمان شروع باید با منطقه زمانی معتبر ارسال شود.', 422);
    try {
        $startDate = new DateTimeImmutable($startAt);
        if ($startDate->getTimestamp() <= time()) api_error('زمان شروع خدمت باید در آینده باشد.', 422);
    } catch (Throwable $ignored) {
        api_error('زمان شروع معتبر نیست.', 422);
    }
    if ($dependencyRaw && !isset($dependencyMap[$dependencyRaw])) api_error('وضعیت استقلال خدمت‌گیرنده معتبر نیست.', 422);

    $pdo = myca_db();
    $serviceQuery = $pdo->prepare('SELECT category_id, slug, title, delivery_class, requires_professional_license FROM myca_services WHERE category_id = ? AND slug = ? AND active = 1 LIMIT 1');
    $serviceQuery->execute([$categoryId, $serviceSlug]);
    $service = $serviceQuery->fetch();
    if (!$service) api_error('این خدمت در کاتالوگ فعال مایکا موجود نیست.', 422);

    $catalog = package_catalog($categoryId, $serviceSlug);
    if ($catalog && !$packageId) api_error('برای ثبت سفارش، ابتدا یکی از پکیج‌های این کاتالوگ را انتخاب کنید.', 422);
    if ($packageId && !$catalog) api_error('پکیج انتخاب‌شده با این خدمت سازگار نیست.', 422);
    if ($packageId && !package_allowed($categoryId, $serviceSlug, $packageId)) api_error('پکیج انتخاب‌شده با نوع خدمت سازگار نیست.', 422);
    $pricing = build_pricing_snapshot($categoryId, $serviceSlug, $packageId, $shift, $duration === null ? null : (int)$duration, (int)$childrenCount, $friday);
    if ($pricing === null) api_error('پکیج انتخاب‌شده قابل قیمت‌گذاری نیست.', 422);

    $pdo->beginTransaction();
    try {
        $customer = $pdo->prepare(
            'INSERT INTO myca_customers (phone, full_name, city, province)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), city = VALUES(city), province = VALUES(province), updated_at = UTC_TIMESTAMP()'
        );
        $customer->execute([$phone, $requesterName, $city, $province]);
        $customerQuery = $pdo->prepare('SELECT id FROM myca_customers WHERE phone = ? LIMIT 1 FOR UPDATE');
        $customerQuery->execute([$phone]);
        $customerId = (int)$customerQuery->fetchColumn();
        if ($customerId < 1) throw new RuntimeException('CUSTOMER_PROFILE_CREATE_FAILED');

        $reference = create_reference($pdo);
        $startUtc = $startDate->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        $insert = $pdo->prepare(
            'INSERT INTO myca_orders (
                reference, customer_id, requester_name, requester_phone, recipient_name, recipient_age,
                dependency_level, children_count, category_id, service_slug, package_id, package_title,
                requested_shift, requested_start_at, duration_months, friday_required, is_urgent,
                city, province, address_line, postal_code, notes, status, payment_method,
                payment_status, pricing_snapshot
             ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                "submitted", "phone_coordination", "awaiting_contact", ?
             )'
        );
        $insert->execute([
            $reference, $customerId, $requesterName, $phone, $recipientName, $recipientAge === null ? null : (int)$recipientAge,
            $dependencyRaw ? $dependencyMap[$dependencyRaw] : null, (int)$childrenCount, $categoryId, $serviceSlug,
            $packageId ?: null, $pricing['package_title'] ?? null, $shift, $startUtc,
            $duration === null ? null : (int)$duration, $friday ? 1 : 0, $urgent ? 1 : 0,
            $city, $province, $address, $postalCode, $notes,
            json_encode($pricing, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        ]);
        $orderId = (int)$pdo->lastInsertId();
        $event = $pdo->prepare('INSERT INTO myca_order_events (order_id, from_status, to_status, event_type, note) VALUES (?, NULL, "submitted", "order_submitted", NULL)');
        $event->execute([$orderId]);
        $pdo->commit();
        json_response(201, ['ok'=>true,'request'=>[
            'id'=>(string)$orderId,'reference'=>$reference,'status'=>'submitted',
            'createdAt'=>gmdate('c'),'deliveryClass'=>$service['delivery_class'],'pricing'=>$pricing
        ]]);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
}

function track_order(): never {
    require_same_origin();
    $body = request_body();
    $reference = strtoupper(trim((string)($body['reference'] ?? '')));
    $phone = normalize_phone($body['phone'] ?? null);
    if (!preg_match('/^MYCA-\d{6}-\d{6}$/', $reference) || !$phone) api_error('کد پیگیری یا شماره موبایل معتبر نیست.', 422);
    $query = myca_db()->prepare(
        'SELECT id, reference, requester_name, requester_phone, recipient_name, category_id, service_slug,
                requested_shift, requested_start_at, duration_months, city, status, payment_status,
                payment_method, paid_amount_rial, pricing_snapshot, created_at, updated_at
         FROM myca_orders WHERE reference = ? AND requester_phone = ? LIMIT 1'
    );
    $query->execute([$reference, $phone]);
    $order = $query->fetch();
    if (!$order) api_error('کد پیگیری یا شماره موبایل صحیح نیست.', 404);
    $eventsQuery = myca_db()->prepare(
        'SELECT from_status, to_status, event_type, created_at
         FROM myca_order_events WHERE order_id = ? ORDER BY created_at ASC LIMIT 50'
    );
    $eventsQuery->execute([(int)$order['id']]);
    $events = $eventsQuery->fetchAll();
    $pricing = json_decode((string)$order['pricing_snapshot'], true);
    json_response(200, ['order'=>[
        'reference'=>$order['reference'],
        'requesterName'=>$order['requester_name'],
        'recipientName'=>$order['recipient_name'],
        'categoryId'=>$order['category_id'],
        'serviceSlug'=>$order['service_slug'],
        'shift'=>$order['requested_shift'],
        'startAt'=>$order['requested_start_at'],
        'durationMonths'=>$order['duration_months'] === null ? null : (int)$order['duration_months'],
        'city'=>$order['city'],
        'status'=>$order['status'],
        'paymentStatus'=>$order['payment_status'],
        'paymentMethod'=>$order['payment_method'],
        'paidAmountRial'=>$order['paid_amount_rial'] === null ? null : (int)$order['paid_amount_rial'],
        'pricing'=>is_array($pricing) ? $pricing : [],
        'createdAt'=>$order['created_at'],
        'updatedAt'=>$order['updated_at'],
        'events'=>$events
    ]]);
}

function dashboard_stats(PDO $pdo): array {
    $tehran = new DateTimeImmutable('today', new DateTimeZone('Asia/Tehran'));
    $todayUtc = $tehran->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    $scalar = static function (string $sql, array $params = []) use ($pdo): int {
        $q = $pdo->prepare($sql);
        $q->execute($params);
        return (int)$q->fetchColumn();
    };
    $paidRevenue = $pdo->query("SELECT COALESCE(SUM(paid_amount_rial),0) FROM myca_orders WHERE payment_status='paid'")->fetchColumn();
    $packageOrders = $pdo->query(
        "SELECT package_id, COALESCE(MAX(package_title), package_id) AS package_title, COUNT(*) AS orders
         FROM myca_orders WHERE package_id IS NOT NULL AND package_id <> ''
         GROUP BY package_id ORDER BY orders DESC"
    )->fetchAll();
    $topPages = $pdo->query(
        "SELECT path, COUNT(*) AS views FROM myca_site_events
         WHERE event_type='page_view' GROUP BY path ORDER BY views DESC LIMIT 8"
    )->fetchAll();
    return [
        'orders_total'=>$scalar('SELECT COUNT(*) FROM myca_orders'),
        'orders_today'=>$scalar('SELECT COUNT(*) FROM myca_orders WHERE created_at >= ?', [$todayUtc]),
        'customers_total'=>$scalar('SELECT COUNT(*) FROM myca_customers'),
        'pending_contact'=>$scalar("SELECT COUNT(*) FROM myca_orders WHERE payment_status='awaiting_contact'"),
        'awaiting_payment'=>$scalar("SELECT COUNT(*) FROM myca_orders WHERE payment_status='awaiting_payment'"),
        'paid_orders'=>$scalar("SELECT COUNT(*) FROM myca_orders WHERE payment_status='paid'"),
        'paid_revenue_rial'=>(int)$paidRevenue,
        'page_views_total'=>$scalar("SELECT COUNT(*) FROM myca_site_events WHERE event_type='page_view'"),
        'page_views_today'=>$scalar("SELECT COUNT(*) FROM myca_site_events WHERE event_type='page_view' AND created_at >= ?", [$todayUtc]),
        'phone_clicks_total'=>$scalar("SELECT COUNT(*) FROM myca_site_events WHERE event_type='phone_click'"),
        'phone_clicks_today'=>$scalar("SELECT COUNT(*) FROM myca_site_events WHERE event_type='phone_click' AND created_at >= ?", [$todayUtc]),
        'cta_clicks_total'=>$scalar("SELECT COUNT(*) FROM myca_site_events WHERE event_type='cta_click'"),
        'button_clicks_total'=>$scalar("SELECT COUNT(*) FROM myca_site_events WHERE event_type='button_click'"),
        'link_clicks_total'=>$scalar("SELECT COUNT(*) FROM myca_site_events WHERE event_type='link_click'"),
        'unique_visitors_total'=>$scalar('SELECT COUNT(DISTINCT visitor_id) FROM myca_site_events'),
        'sessions_total'=>$scalar('SELECT COUNT(DISTINCT session_id) FROM myca_site_events'),
        'package_orders'=>$packageOrders,
        'top_pages'=>$topPages
    ];
}

function admin_dashboard(string $method): never {
    $admin = admin_user();
    $pdo = myca_db();
    if ($method === 'GET') {
        $orders = $pdo->query(
            'SELECT id, reference, requester_name, requester_phone, recipient_name, category_id, service_slug,
                    requested_shift, requested_start_at, duration_months, city, status, payment_status,
                    payment_method, paid_amount_rial, pricing_snapshot, created_at, updated_at
             FROM myca_orders ORDER BY created_at DESC LIMIT 100'
        )->fetchAll();
        foreach ($orders as &$order) {
            $decoded = json_decode((string)$order['pricing_snapshot'], true);
            $order['pricing_snapshot'] = is_array($decoded) ? $decoded : [];
            $order['id'] = (string)$order['id'];
            $order['paid_amount_rial'] = $order['paid_amount_rial'] === null ? null : (int)$order['paid_amount_rial'];
        }
        unset($order);
        json_response(200, ['stats'=>dashboard_stats($pdo),'orders'=>$orders,'csrfToken'=>admin_csrf(),'admin'=>['displayName'=>$admin['display_name'],'role'=>$admin['role']]]);
    }
    if ($method === 'PATCH') {
        require_admin_csrf();
        $body = request_body();
        $id = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
        $status = is_string($body['status'] ?? null) ? $body['status'] : null;
        $paymentStatus = is_string($body['paymentStatus'] ?? null) ? $body['paymentStatus'] : null;
        $paidAmount = array_key_exists('paidAmountRial', $body) && $body['paidAmountRial'] !== null ? filter_var($body['paidAmountRial'], FILTER_VALIDATE_INT) : null;
        $note = clean_text($body['note'] ?? '', 1000) ?? '';
        $allowedStatuses = ['submitted','triage','matching','offered','accepted','quoted','contract_pending','confirmed','in_service','completed','cancelled','rejected'];
        $allowedPayments = ['awaiting_contact','awaiting_payment','paid','failed','refunded','not_required'];
        if (!$id || $id < 1 || ($status !== null && !in_array($status, $allowedStatuses, true)) || ($paymentStatus !== null && !in_array($paymentStatus, $allowedPayments, true)) || ($paidAmount !== null && $paidAmount < 0)) {
            api_error('اطلاعات تغییر سفارش معتبر نیست.', 422);
        }
        $pdo->beginTransaction();
        try {
            $q = $pdo->prepare('SELECT * FROM myca_orders WHERE id = ? FOR UPDATE');
            $q->execute([$id]);
            $before = $q->fetch();
            if (!$before) api_error('سفارش پیدا نشد.', 404);
            if ($paymentStatus === 'paid' && ($paidAmount ?? (int)($before['paid_amount_rial'] ?? 0)) <= 0) {
                api_error('برای تأیید پرداخت، مبلغ پرداخت‌شده را وارد کنید.', 422);
            }
            $newStatus = $status ?? $before['status'];
            $newPayment = $paymentStatus ?? $before['payment_status'];
            $newPaidAmount = ($paymentStatus === 'paid') ? ($paidAmount ?? $before['paid_amount_rial']) : $before['paid_amount_rial'];
            $paidAt = ($paymentStatus === 'paid' && $before['payment_status'] !== 'paid') ? gmdate('Y-m-d H:i:s') : $before['paid_at'];
            $update = $pdo->prepare(
                'UPDATE myca_orders SET status=?, payment_status=?, paid_amount_rial=?, paid_at=?, payment_confirmed_by=?, updated_at=UTC_TIMESTAMP() WHERE id=?'
            );
            $update->execute([$newStatus,$newPayment,$newPaidAmount,$paidAt,$newPayment === 'paid' ? (int)$admin['id'] : $before['payment_confirmed_by'],$id]);
            if ($before['status'] !== $newStatus) {
                $event = $pdo->prepare('INSERT INTO myca_order_events (order_id,from_status,to_status,event_type,actor_id,note,metadata) VALUES (?,?,?,?,?,?,?)');
                $event->execute([$id,$before['status'],$newStatus,'admin_status_changed',(int)$admin['id'],$note,json_encode(['source'=>'admin_panel'])]);
            }
            if ($before['payment_status'] !== $newPayment || (string)$before['paid_amount_rial'] !== (string)$newPaidAmount) {
                $event = $pdo->prepare('INSERT INTO myca_order_events (order_id,from_status,to_status,event_type,actor_id,note,metadata) VALUES (?,?,?,?,?,?,?)');
                $event->execute([$id,$newStatus,$newStatus,'payment_status_changed',(int)$admin['id'],$note,json_encode(['from_payment_status'=>$before['payment_status'],'to_payment_status'=>$newPayment,'paid_amount_rial'=>$newPaidAmount])]);
            }
            $audit = $pdo->prepare('INSERT INTO myca_audit_log (admin_id,action,entity_type,entity_id,metadata) VALUES (?,?,?,?,?)');
            $audit->execute([(int)$admin['id'],'care_request.admin_updated','myca_order',$id,json_encode(['status'=>$newStatus,'payment_status'=>$newPayment,'paid_amount_rial'=>$newPaidAmount])]);
            $pdo->commit();
            json_response(200, ['ok'=>true,'order'=>['id'=>(string)$id,'status'=>$newStatus,'payment_status'=>$newPayment,'paid_amount_rial'=>$newPaidAmount,'updated_at'=>gmdate('Y-m-d H:i:s')]]);
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
    }
    api_error('روش درخواست پشتیبانی نمی‌شود.', 405);
}

function analytics_event(): never {
    require_same_origin();
    $body = request_body();
    $visitor = clean_text($body['visitorId'] ?? '', 80) ?? '';
    $session = clean_text($body['sessionId'] ?? '', 80) ?? '';
    $eventType = clean_text($body['eventType'] ?? '', 32) ?? '';
    $path = clean_text($body['path'] ?? '', 300) ?? '';
    $eventName = clean_text($body['eventName'] ?? '', 120);
    $referrer = clean_text($body['referrer'] ?? '', 500);
    $utm = clean_text($body['utmSource'] ?? '', 120);
    $allowed = ['page_view','phone_click','cta_click','button_click','link_click'];
    if (!preg_match('/^[a-zA-Z0-9_-]{8,80}$/', $visitor)
        || !preg_match('/^[a-zA-Z0-9_-]{8,80}$/', $session)
        || !in_array($eventType, $allowed, true)
        || !str_starts_with($path, '/') || str_starts_with($path, '//')) {
        api_error('ساختار رویداد معتبر نیست.', 422);
    }
    $insert = myca_db()->prepare('INSERT INTO myca_site_events (visitor_id,session_id,event_type,event_name,path,referrer,utm_source) VALUES (?,?,?,?,?,?,?)');
    $insert->execute([$visitor,$session,$eventType,$eventName ?: null,$path,$referrer ?: null,$utm ?: null]);
    json_response(204);
}

function dispatch(): never {
    $route = trim((string)($_GET['route'] ?? ''), '/');
    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method === 'OPTIONS') json_response(204);
    try {
        switch ($route) {
            case 'health':
                myca_db()->query('SELECT 1')->fetchColumn();
                json_response(200, ['status'=>'ok','backend'=>'PHP/MySQL']);
            case 'requests':
                if ($method === 'POST') create_order();
                api_error('برای پیگیری سفارش، کد پیگیری و شماره موبایل را در صفحه پیگیری وارد کنید.', 410);
            case 'orders/track':
                if ($method !== 'POST') api_error('روش درخواست پشتیبانی نمی‌شود.', 405);
                track_order();
            case 'admin/setup':
                if ($method !== 'POST') api_error('روش درخواست پشتیبانی نمی‌شود.', 405);
                admin_setup();
            case 'admin/login':
                if ($method !== 'POST') api_error('روش درخواست پشتیبانی نمی‌شود.', 405);
                admin_login();
            case 'admin/logout':
                if ($method !== 'POST') api_error('روش درخواست پشتیبانی نمی‌شود.', 405);
                admin_logout();
            case 'admin/dashboard':
                admin_dashboard($method);
            case 'analytics/events':
                if ($method !== 'POST') api_error('روش درخواست پشتیبانی نمی‌شود.', 405);
                analytics_event();
            case 'account':
                api_error('برای حفظ حریم خصوصی، هر سفارش با کد پیگیری و شماره موبایل خودش مشاهده می‌شود.', 410);
            case 'caregiver/application':
                api_error('ثبت‌نام خدمت‌دهنده در فاز فعلی فعال نیست. برای اطلاعات بیشتر با مایکا تماس بگیرید.', 410);
            case 'auth/session':
                json_response(200, ['authenticated'=>false,'user'=>null,'roles'=>[]]);
            case 'auth/otp/request':
            case 'auth/otp/verify':
                api_error('ورود پیامکی در نسخه آزمایشی فعال نیست. ثبت سفارش بدون ساخت حساب و با شماره تماس انجام می‌شود.', 410);
            case 'auth/logout':
                json_response(200, ['ok'=>true]);
            default:
                api_error('مسیر API پیدا نشد.', 404);
        }
    } catch (Throwable $error) {
        error_log('[MYCA API] ' . $error->getMessage());
        if (in_array($error->getMessage(), ['MYCA_CONFIG_MISSING','MYCA_CONFIG_INVALID','MYCA_CONFIG_INCOMPLETE','MYCA_HOST_MISMATCH'], true)) {
            api_error('تنظیمات خصوصی مایکا هنوز کامل نشده است.', 503);
        }
        if ($error instanceof PDOException) api_error('ارتباط با پایگاه داده برقرار نشد. تنظیمات دیتابیس را بررسی کنید.', 503);
        api_error('خطای داخلی سرویس مایکا. لطفاً کمی بعد دوباره تلاش کنید.', 500);
    }
}

dispatch();
