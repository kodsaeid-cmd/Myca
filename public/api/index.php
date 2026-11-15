<?php
declare(strict_types=1);

/**
 * MYCA phase-one API for ParsPack shared hosting.
 * Document root: static Next.js export.
 * Private credentials: ../private/config.php (outside the document root).
 */

const ACCESS_COOKIE = 'myca_access_token';
const REFRESH_COOKIE = 'myca_refresh_token';

function config(): array {
    static $value = null;
    if ($value !== null) return $value;
    $path = dirname(__DIR__, 2) . '/private/config.php';
    if (!is_file($path)) {
        throw new RuntimeException('MYCA_CONFIG_MISSING');
    }
    $loaded = require $path;
    if (!is_array($loaded)) throw new RuntimeException('MYCA_CONFIG_INVALID');
    $url = rtrim(trim((string)($loaded['supabase_url'] ?? '')), '/');
    $anon = trim((string)($loaded['anon_key'] ?? ''));
    $service = trim((string)($loaded['service_role_key'] ?? ''));
    if ($url === '' || $anon === '' || $service === '') throw new RuntimeException('MYCA_CONFIG_INCOMPLETE');
    return $value = ['url' => $url, 'anon' => $anon, 'service' => $service];
}

function respond(int $status, array|null $payload = null): never {
    http_response_code($status);
    if ($status !== 204) {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, private');
        echo json_encode($payload ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    exit;
}

function body_json(): array {
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || trim($raw) === '') return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function same_origin(): bool {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') return true;
    $host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? '';
    $originHost = parse_url($origin, PHP_URL_HOST);
    $originPort = parse_url($origin, PHP_URL_PORT);
    if (!$originHost || !$host) return false;
    $expected = strtolower($originHost . ($originPort ? ':' . $originPort : ''));
    return hash_equals(strtolower($host), $expected);
}

function require_same_origin(): void {
    if (!same_origin()) respond(403, ['error' => 'درخواست نامعتبر است.']);
}

function is_https(): bool {
    return (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function set_auth_cookies(array $session): void {
    $secure = is_https();
    $access = (string)($session['access_token'] ?? '');
    $refresh = (string)($session['refresh_token'] ?? '');
    if ($access !== '') {
        setcookie(ACCESS_COOKIE, $access, [
            'expires' => time() + max(60, min((int)($session['expires_in'] ?? 3600), 86400)),
            'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax'
        ]);
    }
    if ($refresh !== '') {
        setcookie(REFRESH_COOKIE, $refresh, [
            'expires' => time() + 2592000,
            'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax'
        ]);
    }
}

function clear_auth_cookies(): void {
    foreach ([ACCESS_COOKIE, REFRESH_COOKIE] as $name) {
        setcookie($name, '', [
            'expires' => time() - 3600, 'path' => '/',
            'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax'
        ]);
    }
}

function upstream(string $url, string $method = 'GET', ?array $payload = null, array $headers = []): array {
    if (!function_exists('curl_init')) throw new RuntimeException('PHP_CURL_REQUIRED');
    $ch = curl_init($url);
    $defaultHeaders = ['Accept: application/json'];
    if ($payload !== null) $defaultHeaders[] = 'Content-Type: application/json';
    $allHeaders = array_merge($defaultHeaders, $headers);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $allHeaders,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_FOLLOWLOCATION => false,
    ]);
    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
    $raw = curl_exec($ch);
    $error = curl_error($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false) throw new RuntimeException('UPSTREAM_NETWORK_ERROR:' . $error);
    $decoded = json_decode((string)$raw, true);
    return ['status' => $status, 'raw' => (string)$raw, 'data' => $decoded];
}

function supabase_auth(string $path, string $method = 'GET', ?array $payload = null, ?string $accessToken = null): array {
    $cfg = config();
    $headers = ['apikey: ' . $cfg['anon']];
    if ($accessToken) $headers[] = 'Authorization: Bearer ' . $accessToken;
    return upstream($cfg['url'] . '/auth/v1' . $path, $method, $payload, $headers);
}

function supabase_admin(string $path, string $method = 'GET', ?array $payload = null, array $extraHeaders = []): array {
    $cfg = config();
    $headers = array_merge([
        'apikey: ' . $cfg['service'],
        'Authorization: Bearer ' . $cfg['service'],
    ], $extraHeaders);
    return upstream($cfg['url'] . '/rest/v1/' . ltrim($path, '/'), $method, $payload, $headers);
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

function api_query(array $params): string {
    return http_build_query($params, '', '&', PHP_QUERY_RFC3986);
}

function auth_identity(string $accessToken): ?array {
    $userResponse = supabase_auth('/user', 'GET', null, $accessToken);
    if ($userResponse['status'] < 200 || $userResponse['status'] >= 300 || !is_array($userResponse['data'])) return null;
    $user = $userResponse['data'];
    if (empty($user['id'])) return null;
    $rolesResponse = supabase_admin('user_roles?' . api_query([
        'select' => 'role',
        'user_id' => 'eq.' . $user['id']
    ]));
    if ($rolesResponse['status'] < 200 || $rolesResponse['status'] >= 300) throw new RuntimeException('ROLE_LOOKUP_FAILED');
    $roles = [];
    foreach (($rolesResponse['data'] ?? []) as $row) {
        if (!empty($row['role'])) $roles[] = (string)$row['role'];
    }
    return [
        'user' => [
            'id' => (string)$user['id'],
            'phone' => $user['phone'] ?? null,
            'email' => $user['email'] ?? null
        ],
        'roles' => $roles
    ];
}

function auth_context(): ?array {
    $token = $_COOKIE[ACCESS_COOKIE] ?? '';
    if (!is_string($token) || $token === '') return null;
    $identity = auth_identity($token);
    if (!$identity) return null;
    $identity['accessToken'] = $token;
    return $identity;
}

function require_family(): array {
    $auth = auth_context();
    if (!$auth) respond(401, ['error' => 'برای ادامه ابتدا وارد حساب خود شوید.']);
    if (!in_array('family', $auth['roles'], true)) respond(403, ['error' => 'این حساب مجوز استفاده از بخش مشتریان را ندارد.']);
    if (empty($auth['user']['phone'])) respond(422, ['error' => 'شماره تماس تأییدشده‌ای برای حساب شما ثبت نشده است.']);
    return $auth;
}

function require_staff(): array {
    $auth = auth_context();
    if (!$auth) respond(401, ['error' => 'برای ورود به پنل مدیریت وارد شوید.']);
    if (!array_intersect($auth['roles'], ['admin', 'operator', 'support_office'])) {
        respond(403, ['error' => 'این حساب دسترسی مدیریت سفارش‌ها را ندارد.']);
    }
    return $auth;
}

function clean_text(mixed $value, int $max, bool $required = false): ?string {
    if (!is_string($value)) return $required ? null : '';
    $value = trim($value);
    if ($required && $value === '') return null;
    return mb_substr($value, 0, $max, 'UTF-8');
}

function numeric_value(mixed $value): ?float {
    if ($value === null || $value === '') return null;
    return is_numeric($value) ? (float)$value : null;
}

function package_catalog(string $categoryId, string $serviceSlug): ?array {
    if (in_array($categoryId, ['11', '22'], true)) {
        return [
            'slug' => 'elders-pricing', 'kind' => 'elderly',
            'packages' => [
                'hamdam' => ['title'=>'همدم','monthly'=>33],
                'hamrah' => ['title'=>'همراه','monthly'=>41],
                'hami' => ['title'=>'حامی','monthly'=>26],
                'aramyar' => ['title'=>'آرامیار','monthly'=>50],
                'tavanyar' => ['title'=>'توانیار','monthly'=>48],
                'custom' => ['title'=>'خدمت اختصاصی','monthly'=>null],
            ]
        ];
    }
    $childAllowed = $categoryId === '27'
        || ($categoryId === '12' && in_array($serviceSlug, ['infant-nurse','mother-companion','child-care','child-care-package'], true));
    if (!$childAllowed) return null;
    return [
        'slug' => 'pedia', 'kind' => 'child',
        'packages' => [
            'infant' => ['title'=>'مراقبت از نوزاد','monthly'=>39],
            'toddler' => ['title'=>'مراقبت از کودک','monthly'=>40],
            'preschool' => ['title'=>'مراقبت از کودک','monthly'=>44],
            'school-age' => ['title'=>'مراقبت کودک همراه آموزش','monthly'=>50],
            'pregnancy' => ['title'=>'همراهی دوران بارداری','monthly'=>37],
            'custom' => ['title'=>'خدمت اختصاصی','monthly'=>null],
        ]
    ];
}

function package_allowed(string $categoryId, string $serviceSlug, string $packageId): bool {
    if (in_array($categoryId, ['11','22'], true)) return in_array($packageId, ['hamdam','hamrah','hami','aramyar','tavanyar','custom'], true);
    if ($categoryId === '27' || $serviceSlug === 'infant-nurse') return in_array($packageId, ['infant','custom'], true);
    if ($serviceSlug === 'mother-companion') return in_array($packageId, ['pregnancy','custom'], true);
    if ($serviceSlug === 'child-care') return in_array($packageId, ['toddler','preschool','school-age','custom'], true);
    if ($serviceSlug === 'child-care-package') return in_array($packageId, ['infant','toddler','preschool','school-age','pregnancy','custom'], true);
    return false;
}

function pricing_snapshot(string $categoryId, string $serviceSlug, ?string $packageId, string $shift, ?int $months, int $children, bool $friday): ?array {
    $catalog = package_catalog($categoryId, $serviceSlug);
    if (!$catalog || !$packageId) {
        return [
            'estimate_status'=>'quote_required',
            'reason'=>'package_or_catalog_not_selected',
            'payment_method'=>'phone_coordination',
            'payment_status'=>'awaiting_contact',
            'friday_required'=>$friday
        ];
    }
    $selected = $catalog['packages'][$packageId] ?? null;
    if (!$selected) return null;
    if ($selected['monthly'] === null || !$months) {
        return [
            'estimate_status'=>'quote_required',
            'catalog'=>$catalog['slug'],
            'package_id'=>$packageId,
            'package_title'=>$selected['title'],
            'payment_method'=>'phone_coordination',
            'payment_status'=>'awaiting_contact',
            'friday_required'=>$friday
        ];
    }
    $isChildCare = $catalog['kind'] === 'child' && $serviceSlug !== 'mother-companion';
    $additionalChild = $isChildCare ? max(0, $children - 1) * 25 : 0;
    $roundTheClock = $shift === 'شبانه‌روزی' ? 35 : 0;
    $base = (int)round($selected['monthly'] * 10000000);
    $adjusted = (int)round($base * (1 + ($additionalChild + $roundTheClock) / 100));
    $commissionRates = [1=>25, 2=>30, 3=>35, 4=>45, 5=>48, 6=>65, 12=>120];
    $commission = $commissionRates[$months] ?? 0;
    $subtotal = $adjusted * $months;
    $oneTime = (int)round($adjusted * $commission / 100);
    return [
        'estimate_status'=>$friday ? 'provisional_excluding_friday' : 'provisional',
        'payment_method'=>'phone_coordination',
        'payment_status'=>'awaiting_contact',
        'source_catalog'=>$catalog['slug'],
        'package_id'=>$packageId,
        'package_title'=>$selected['title'],
        'currency'=>'IRR',
        'display_unit'=>'TOMAN',
        'base_monthly_wage_rial'=>$base,
        'adjusted_monthly_wage_rial'=>$adjusted,
        'duration_months'=>$months,
        'additional_child_percent'=>$additionalChild,
        'round_the_clock_percent'=>$roundTheClock,
        'wage_subtotal_rial'=>$subtotal,
        'commission_percent'=>$commission,
        'one_time_commission_rial'=>$oneTime,
        'total_estimate_rial'=>$subtotal + $oneTime,
        'friday_required'=>$friday,
        'friday_included'=>false,
        'exclusions'=>$friday ? ['هزینه حضور روز جمعه در این برآورد وارد نشده و نیازمند پیش‌فاکتور تکمیلی است.'] : []
    ];
}

function handle_auth_otp_request(): never {
    require_same_origin();
    $body = body_json();
    $phone = normalize_phone($body['phone'] ?? null);
    if (!$phone) respond(422, ['error'=>'شماره موبایل معتبر وارد کنید.']);
    $result = supabase_auth('/otp', 'POST', ['phone'=>$phone, 'create_user'=>true]);
    if ($result['status'] < 200 || $result['status'] >= 300) {
        respond($result['status'] === 429 ? 429 : 400, [
            'error'=>$result['status'] === 429
                ? 'درخواست کد بیش از حد تکرار شده است. کمی بعد دوباره تلاش کنید.'
                : 'ارسال کد ممکن نشد. شماره را بررسی کنید یا بعداً تلاش کنید.'
        ]);
    }
    respond(200, ['ok'=>true,'phone'=>$phone,'message'=>'اگر شماره قابل تأیید باشد، کد ورود برای آن ارسال می‌شود.']);
}

function handle_auth_otp_verify(): never {
    require_same_origin();
    $body = body_json();
    $phone = normalize_phone($body['phone'] ?? null);
    $token = preg_replace('/\D/', '', (string)($body['token'] ?? '')) ?? '';
    if (!$phone || !preg_match('/^\d{6,8}$/', $token)) respond(422, ['error'=>'شماره موبایل یا کد تأیید معتبر نیست.']);
    $verify = supabase_auth('/verify', 'POST', ['phone'=>$phone,'token'=>$token,'type'=>'sms']);
    if ($verify['status'] < 200 || $verify['status'] >= 300 || !is_array($verify['data'])) {
        respond(400, ['error'=>'کد تأیید نادرست یا منقضی شده است.']);
    }
    $session = $verify['data'];
    if (empty($session['access_token']) || empty($session['refresh_token'])) respond(502, ['error'=>'پاسخ سرویس احراز هویت کامل نیست.']);
    $identity = auth_identity((string)$session['access_token']);
    if (!$identity) respond(502, ['error'=>'تأیید حساب انجام نشد. دوباره وارد شوید.']);
    set_auth_cookies($session);
    respond(200, ['ok'=>true,'user'=>$identity['user'],'roles'=>$identity['roles']]);
}

function handle_auth_session(): never {
    $access = (string)($_COOKIE[ACCESS_COOKIE] ?? '');
    $refresh = (string)($_COOKIE[REFRESH_COOKIE] ?? '');
    $identity = $access !== '' ? auth_identity($access) : null;
    $newSession = null;
    if (!$identity && $refresh !== '') {
        $refreshed = supabase_auth('/token?grant_type=refresh_token', 'POST', ['refresh_token'=>$refresh]);
        if ($refreshed['status'] >= 200 && $refreshed['status'] < 300 && is_array($refreshed['data'])) {
            $newSession = $refreshed['data'];
            if (!empty($newSession['access_token']) && !empty($newSession['refresh_token'])) {
                $identity = auth_identity((string)$newSession['access_token']);
            }
        }
    }
    if ($newSession && !empty($newSession['access_token'])) set_auth_cookies($newSession);
    if (!$identity && $access !== '' && !$newSession) clear_auth_cookies();
    respond(200, $identity
        ? ['authenticated'=>true,'user'=>$identity['user'],'roles'=>$identity['roles']]
        : ['authenticated'=>false,'user'=>null,'roles'=>[]]);
}

function handle_auth_logout(): never {
    $access = (string)($_COOKIE[ACCESS_COOKIE] ?? '');
    if ($access !== '') {
        try { supabase_auth('/logout', 'POST', [], $access); } catch (Throwable $ignored) {}
    }
    clear_auth_cookies();
    respond(200, ['ok'=>true]);
}

function handle_requests_get(): never {
    $auth = require_family();
    $result = supabase_admin('care_requests?' . api_query([
        'select'=>'id,reference,requester_name,requester_phone,recipient_name,category_id,service_slug,delivery_class,requested_shift,requested_start_at,duration_months,friday_required,is_urgent,city,province,status,payment_method,payment_status,paid_amount_rial,paid_at,pricing_snapshot,created_at,updated_at',
        'requester_id'=>'eq.' . $auth['user']['id'],
        'order'=>'created_at.desc',
        'limit'=>'50'
    ]));
    if ($result['status'] < 200 || $result['status'] >= 300) respond(502, ['error'=>'خواندن سفارش‌ها ممکن نشد.']);
    respond(200, ['requests'=>is_array($result['data']) ? $result['data'] : []]);
}

function handle_requests_post(): never {
    require_same_origin();
    $auth = require_family();
    $accountPhone = normalize_phone($auth['user']['phone'] ?? null);
    if (!$accountPhone) respond(422, ['error'=>'شماره تماس تأییدشده‌ای برای حساب شما ثبت نشده است.']);
    $body = body_json();
    $categoryId = clean_text($body['categoryId'] ?? null, 8, true);
    $serviceSlug = clean_text($body['serviceSlug'] ?? null, 80, true);
    $requesterName = clean_text($body['requesterName'] ?? null, 120, true);
    $contactPhone = clean_text($body['phone'] ?? null, 32, true);
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
    $recipientAge = numeric_value($body['recipientAge'] ?? null);
    $childrenCount = numeric_value($body['childrenCount'] ?? null) ?? 1;
    $duration = numeric_value($body['durationMonths'] ?? null);
    $friday = ($body['fridayRequired'] ?? false) === true;
    $urgent = ($body['urgent'] ?? false) === true;
    $allowedShifts = ['روزانه','شبانه','شبانه‌روزی','ساعتی','موردی','جلسه‌ای','نیاز به هماهنگی'];
    $allowedDurations = [1,2,3,4,5,6,12];
    $dependencyMap = [
        'مستقل'=>'independent','نیمه‌وابسته'=>'semi_dependent','وابسته'=>'dependent',
        'independent'=>'independent','semi_dependent'=>'semi_dependent','dependent'=>'dependent'
    ];
    if (!$categoryId || !preg_match('/^\d{1,3}$/', $categoryId) || !$serviceSlug || !preg_match('/^[a-z0-9-]+$/', $serviceSlug)) {
        respond(422, ['error'=>'دسته خدمت یا نوع خدمت معتبر نیست.']);
    }
    if (!$requesterName || !$contactPhone || !$city || !$address || !$shift || !in_array($shift, $allowedShifts, true) || !$startAt) {
        respond(422, ['error'=>'اطلاعات ضروری سفارش را کامل کنید.']);
    }
    if (normalize_phone($contactPhone) !== $accountPhone) respond(422, ['error'=>'شماره تماس باید با شماره تأییدشده حساب شما یکسان باشد.']);
    if ($recipientAge !== null && (floor($recipientAge) !== $recipientAge || $recipientAge < 0 || $recipientAge > 120)) respond(422, ['error'=>'سن خدمت‌گیرنده معتبر نیست.']);
    if (floor($childrenCount) !== $childrenCount || $childrenCount < 1 || $childrenCount > 4) respond(422, ['error'=>'تعداد کودک باید بین ۱ تا ۴ باشد.']);
    if ($duration !== null && (floor($duration) !== $duration || !in_array((int)$duration, $allowedDurations, true))) respond(422, ['error'=>'مدت قرارداد انتخاب‌شده معتبر نیست.']);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}T/', $startAt) || !preg_match('/(Z|[+-]\d{2}:\d{2})$/', $startAt)) respond(422, ['error'=>'زمان شروع باید با منطقه زمانی معتبر ارسال شود.']);
    try {
        $startDate = new DateTimeImmutable($startAt);
        if ($startDate->getTimestamp() <= time()) respond(422, ['error'=>'زمان شروع خدمت باید در آینده باشد.']);
    } catch (Throwable $ignored) {
        respond(422, ['error'=>'زمان شروع معتبر نیست.']);
    }
    if ($dependencyRaw && !isset($dependencyMap[$dependencyRaw])) respond(422, ['error'=>'وضعیت استقلال خدمت‌گیرنده معتبر نیست.']);

    $serviceResult = supabase_admin('services?' . api_query([
        'select'=>'category_id,slug,title,delivery_class,requires_professional_license',
        'category_id'=>'eq.' . $categoryId,
        'slug'=>'eq.' . $serviceSlug,
        'active'=>'eq.true',
        'limit'=>'1'
    ]));
    if ($serviceResult['status'] < 200 || $serviceResult['status'] >= 300) respond(502, ['error'=>'بررسی کاتالوگ خدمات ممکن نشد.']);
    $services = is_array($serviceResult['data']) ? $serviceResult['data'] : [];
    if (empty($services[0])) respond(422, ['error'=>'این خدمت در کاتالوگ فعال مایکا موجود نیست.']);

    $catalog = package_catalog($categoryId, $serviceSlug);
    if ($catalog && !$packageId) respond(422, ['error'=>'برای ثبت سفارش، ابتدا یکی از پکیج‌های این کاتالوگ را انتخاب کنید.']);
    if ($packageId && !$catalog) respond(422, ['error'=>'پکیج انتخاب‌شده با این خدمت سازگار نیست.']);
    if ($packageId && !package_allowed($categoryId, $serviceSlug, $packageId)) respond(422, ['error'=>'پکیج انتخاب‌شده با نوع خدمت سازگار نیست.']);
    $pricing = pricing_snapshot($categoryId, $serviceSlug, $packageId, $shift, $duration === null ? null : (int)$duration, (int)$childrenCount, $friday);
    if ($pricing === null) respond(422, ['error'=>'پکیج انتخاب‌شده قابل قیمت‌گذاری نیست.']);

    $rpcPayload = [
        'p_actor'=>$auth['user']['id'],
        'p_request'=>[
            'requester_name'=>$requesterName,
            'requester_phone'=>$auth['user']['phone'],
            'recipient_name'=>$recipientName,
            'recipient_age'=>$recipientAge === null ? null : (int)$recipientAge,
            'dependency_level'=>$dependencyRaw ? $dependencyMap[$dependencyRaw] : null,
            'children_count'=>(int)$childrenCount,
            'category_id'=>$categoryId,
            'service_slug'=>$serviceSlug,
            'requested_shift'=>$shift,
            'requested_start_at'=>$startDate->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z'),
            'duration_months'=>$duration === null ? null : (int)$duration,
            'friday_required'=>$friday,
            'is_urgent'=>$urgent,
            'city'=>$city,
            'province'=>$province,
            'address_line'=>$address,
            'postal_code'=>$postalCode,
            'notes'=>$notes,
            'pricing_snapshot'=>$pricing,
            'source'=>'web'
        ]
    ];
    $createdResponse = supabase_admin('rpc/create_care_request', 'POST', $rpcPayload);
    $created = $createdResponse['data'];
    if ($createdResponse['status'] < 200 || $createdResponse['status'] >= 300 || !is_array($created) || empty($created['id']) || empty($created['reference'])) {
        respond(422, ['error'=>'ثبت سفارش در سامانه انجام نشد. اطلاعات را بررسی و دوباره تلاش کنید.']);
    }
    respond(201, ['ok'=>true,'request'=>[
        'id'=>$created['id'],
        'reference'=>$created['reference'],
        'status'=>$created['status'] ?? 'submitted',
        'createdAt'=>$created['created_at'] ?? null,
        'deliveryClass'=>$created['delivery_class'] ?? null,
        'pricing'=>$created['pricing_snapshot'] ?? null
    ]]);
}

function handle_account(): never {
    $auth = require_family();
    $profile = supabase_admin('profiles?' . api_query([
        'select'=>'id,phone,full_name,created_at','id'=>'eq.' . $auth['user']['id'],'limit'=>'1'
    ]));
    if ($profile['status'] < 200 || $profile['status'] >= 300) respond(502, ['error'=>'خواندن پروفایل ممکن نشد.']);
    $orders = supabase_admin('care_requests?' . api_query([
        'select'=>'id,reference,requester_name,category_id,service_slug,status,payment_status,payment_method,paid_amount_rial,pricing_snapshot,created_at,updated_at',
        'requester_id'=>'eq.' . $auth['user']['id'],'order'=>'created_at.desc','limit'=>'50'
    ]));
    if ($orders['status'] < 200 || $orders['status'] >= 300) respond(502, ['error'=>'خواندن سفارش‌ها ممکن نشد.']);
    respond(200, [
        'profile'=>($profile['data'][0] ?? ['id'=>$auth['user']['id'],'phone'=>$auth['user']['phone'],'full_name'=>null]),
        'orders'=>is_array($orders['data']) ? $orders['data'] : []
    ]);
}

function handle_tracking(): never {
    require_same_origin();
    $body = body_json();
    $reference = strtoupper(trim((string)($body['reference'] ?? '')));
    $phone = normalize_phone($body['phone'] ?? null);
    if (!preg_match('/^MYCA-\d{6}-\d{6}$/', $reference) || !$phone) respond(422, ['error'=>'کد پیگیری یا شماره موبایل معتبر نیست.']);
    $query = supabase_admin('care_requests?' . api_query([
        'select'=>'id,reference,requester_name,requester_phone,recipient_name,category_id,service_slug,requested_shift,requested_start_at,duration_months,city,status,payment_status,payment_method,paid_amount_rial,pricing_snapshot,created_at,updated_at',
        'reference'=>'eq.' . $reference,
        'requester_phone'=>'eq.' . $phone,
        'limit'=>'1'
    ]));
    if ($query['status'] < 200 || $query['status'] >= 300) respond(502, ['error'=>'امکان بررسی کد پیگیری وجود ندارد.']);
    $rows = is_array($query['data']) ? $query['data'] : [];
    $order = $rows[0] ?? null;
    if (!$order) respond(404, ['error'=>'کد پیگیری یا شماره موبایل صحیح نیست.']);
    $eventsResult = supabase_admin('care_request_events?' . api_query([
        'select'=>'from_status,to_status,event_type,created_at',
        'request_id'=>'eq.' . $order['id'],
        'order'=>'created_at.asc','limit'=>'50'
    ]));
    $events = ($eventsResult['status'] >= 200 && $eventsResult['status'] < 300 && is_array($eventsResult['data'])) ? $eventsResult['data'] : [];
    respond(200, ['order'=>[
        'reference'=>$order['reference'],
        'requesterName'=>$order['requester_name'],
        'recipientName'=>$order['recipient_name'],
        'categoryId'=>$order['category_id'],
        'serviceSlug'=>$order['service_slug'],
        'shift'=>$order['requested_shift'],
        'startAt'=>$order['requested_start_at'],
        'durationMonths'=>$order['duration_months'],
        'city'=>$order['city'],
        'status'=>$order['status'],
        'paymentStatus'=>$order['payment_status'],
        'paymentMethod'=>$order['payment_method'],
        'paidAmountRial'=>$order['paid_amount_rial'],
        'pricing'=>$order['pricing_snapshot'],
        'createdAt'=>$order['created_at'],
        'updatedAt'=>$order['updated_at'],
        'events'=>$events
    ]]);
}

function handle_admin_dashboard(string $method): never {
    $auth = require_staff();
    if ($method === 'GET') {
        $stats = supabase_admin('rpc/myca_admin_dashboard_stats', 'POST', ['p_actor'=>$auth['user']['id']]);
        $orders = supabase_admin('care_requests?' . api_query([
            'select'=>'id,reference,requester_name,requester_phone,recipient_name,category_id,service_slug,requested_shift,requested_start_at,duration_months,city,status,payment_status,payment_method,paid_amount_rial,pricing_snapshot,created_at,updated_at',
            'order'=>'created_at.desc','limit'=>'100'
        ]));
        if ($stats['status'] < 200 || $stats['status'] >= 300 || $orders['status'] < 200 || $orders['status'] >= 300) respond(502, ['error'=>'دریافت اطلاعات داشبورد ممکن نشد.']);
        respond(200, ['stats'=>$stats['data'] ?? [],'orders'=>is_array($orders['data']) ? $orders['data'] : []]);
    }
    if ($method === 'PATCH') {
        require_same_origin();
        $body = body_json();
        $id = (string)($body['id'] ?? '');
        $status = is_string($body['status'] ?? null) ? $body['status'] : null;
        $paymentStatus = is_string($body['paymentStatus'] ?? null) ? $body['paymentStatus'] : null;
        $paidAmount = array_key_exists('paidAmountRial', $body) && $body['paidAmountRial'] !== null ? (int)$body['paidAmountRial'] : null;
        $note = clean_text($body['note'] ?? '', 1000) ?? '';
        if (!preg_match('/^[0-9a-f-]{36}$/i', $id) || ($paidAmount !== null && $paidAmount < 0)) respond(422, ['error'=>'اطلاعات تغییر سفارش معتبر نیست.']);
        $updated = supabase_admin('rpc/myca_admin_update_order', 'POST', [
            'p_actor'=>$auth['user']['id'],
            'p_request_id'=>$id,
            'p_status'=>$status,
            'p_payment_status'=>$paymentStatus,
            'p_paid_amount_rial'=>$paidAmount,
            'p_note'=>$note
        ]);
        if ($updated['status'] < 200 || $updated['status'] >= 300) {
            $message = str_contains($updated['raw'], 'paid_amount_required') ? 'برای ثبت پرداخت، مبلغ پرداخت‌شده را وارد کنید.' : 'ذخیره تغییرات سفارش انجام نشد.';
            respond(422, ['error'=>$message]);
        }
        respond(200, ['ok'=>true,'order'=>$updated['data']]);
    }
    respond(405, ['error'=>'روش درخواست پشتیبانی نمی‌شود.']);
}

function handle_analytics(): never {
    require_same_origin();
    $body = body_json();
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
        respond(422, ['error'=>'ساختار رویداد معتبر نیست.']);
    }
    $insert = supabase_admin('site_events', 'POST', [
        'visitor_id'=>$visitor,'session_id'=>$session,'event_type'=>$eventType,
        'event_name'=>$eventName ?: null,'path'=>$path,'referrer'=>$referrer ?: null,'utm_source'=>$utm ?: null
    ], ['Prefer: return=minimal']);
    if ($insert['status'] < 200 || $insert['status'] >= 300) respond(502, ['error'=>'ثبت رویداد ممکن نشد.']);
    respond(204);
}

function handle_caregiver_application(string $method): never {
    $auth = auth_context();
    if (!$auth) respond(401, ['error'=>'برای مشاهده پرونده همکاری وارد حساب خود شوید.']);
    if ($method === 'GET') {
        $profile = supabase_admin('caregiver_profiles?' . api_query([
            'select'=>'id,display_name,bio,city,province,experience_years,review_status,created_at',
            'user_id'=>'eq.' . $auth['user']['id'],'limit'=>'1'
        ]));
        if ($profile['status'] < 200 || $profile['status'] >= 300) respond(502, ['error'=>'خواندن پرونده همکاری ممکن نشد.']);
        $row = $profile['data'][0] ?? null;
        if (!$row) respond(200, ['application'=>null]);
        $skills = supabase_admin('caregiver_service_qualifications?' . api_query([
            'select'=>'category_id,service_slug,qualification_type,review_status',
            'caregiver_profile_id'=>'eq.' . $row['id']
        ]));
        if ($skills['status'] < 200 || $skills['status'] >= 300) respond(502, ['error'=>'خواندن مهارت‌های پرونده همکاری ممکن نشد.']);
        $row['services'] = is_array($skills['data']) ? $skills['data'] : [];
        respond(200, ['application'=>$row]);
    }
    if ($method === 'POST') {
        require_same_origin();
        if (!in_array('family', $auth['roles'], true)) respond(403, ['error'=>'این حساب مجوز ثبت درخواست همکاری مراقب را ندارد.']);
        $body = body_json();
        $displayName = clean_text($body['displayName'] ?? null, 100, true);
        $city = clean_text($body['city'] ?? null, 100, true);
        $province = clean_text($body['province'] ?? null, 100);
        $bio = clean_text($body['bio'] ?? null, 1000);
        $experience = ($body['experienceYears'] ?? '') === '' || ($body['experienceYears'] ?? null) === null ? null : numeric_value($body['experienceYears']);
        if (!$displayName || mb_strlen($displayName, 'UTF-8') < 2 || !$city || mb_strlen($city, 'UTF-8') < 2) respond(422, ['error'=>'نام نمایشی و شهر محل فعالیت را کامل کنید.']);
        if ($experience !== null && ($experience < 0 || $experience > 70)) respond(422, ['error'=>'سابقه فعالیت باید عددی بین صفر تا ۷۰ سال باشد.']);
        if (!is_array($body['services'] ?? null) || count($body['services']) < 1 || count($body['services']) > 10) respond(422, ['error'=>'حداقل یک و حداکثر ده حوزه خدمت انتخاب کنید.']);
        $seen = [];
        $services = [];
        foreach ($body['services'] as $item) {
            if (!is_array($item)) respond(422, ['error'=>'یکی از حوزه‌های انتخاب‌شده معتبر نیست.']);
            $category = clean_text($item['categoryId'] ?? null, 8, true);
            $slug = clean_text($item['serviceSlug'] ?? null, 80, true);
            if (!$category || !preg_match('/^\d{1,3}$/', $category) || !$slug || !preg_match('/^[a-z0-9-]+$/', $slug)) respond(422, ['error'=>'یکی از حوزه‌های انتخاب‌شده معتبر نیست.']);
            $key = $category . ':' . $slug;
            if (!isset($seen[$key])) {
                $seen[$key] = true;
                $services[] = ['category_id'=>$category,'service_slug'=>$slug];
            }
        }
        $result = supabase_admin('rpc/submit_caregiver_application', 'POST', [
            'p_actor'=>$auth['user']['id'],
            'p_application'=>[
                'display_name'=>$displayName,'city'=>$city,'province'=>$province,'bio'=>$bio,
                'experience_years'=>$experience,'services'=>$services
            ]
        ]);
        if ($result['status'] < 200 || $result['status'] >= 300) {
            $status = $result['status'] === 403 ? 403 : 422;
            respond($status, ['error'=>$status === 403
                ? 'درخواست شامل خدمتی است که به مجوز حرفه‌ای نیاز دارد یا این حساب واجد شرایط نیست.'
                : 'ثبت درخواست همکاری انجام نشد. حوزه‌های انتخابی را بررسی کنید.']);
        }
        $application = $result['data'];
        if (!is_array($application) || empty($application['id'])) respond(502, ['error'=>'پاسخ ثبت درخواست همکاری کامل نیست.']);
        respond(201, ['ok'=>true,'application'=>[
            'id'=>$application['id'],'reviewStatus'=>$application['review_status'] ?? null,'skillsCount'=>$application['skills_count'] ?? 0
        ]]);
    }
    respond(405, ['error'=>'روش درخواست پشتیبانی نمی‌شود.']);
}

function dispatch(): never {
    $route = trim((string)($_GET['route'] ?? ''), '/');
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($method === 'OPTIONS') respond(204);
    try {
        switch ($route) {
            case 'health':
                $cfg = config();
                $health = supabase_admin('service_categories?select=id&limit=1');
                if ($health['status'] < 200 || $health['status'] >= 300) respond(503, ['status'=>'degraded','backend'=>'unavailable']);
                respond(200, ['status'=>'ok','backend'=>'connected']);
            case 'auth/otp/request':
                if ($method !== 'POST') respond(405, ['error'=>'روش درخواست پشتیبانی نمی‌شود.']);
                handle_auth_otp_request();
            case 'auth/otp/verify':
                if ($method !== 'POST') respond(405, ['error'=>'روش درخواست پشتیبانی نمی‌شود.']);
                handle_auth_otp_verify();
            case 'auth/session':
                if ($method !== 'GET') respond(405, ['error'=>'روش درخواست پشتیبانی نمی‌شود.']);
                handle_auth_session();
            case 'auth/logout':
                if ($method !== 'POST') respond(405, ['error'=>'روش درخواست پشتیبانی نمی‌شود.']);
                handle_auth_logout();
            case 'requests':
                if ($method === 'GET') handle_requests_get();
                if ($method === 'POST') handle_requests_post();
                respond(405, ['error'=>'روش درخواست پشتیبانی نمی‌شود.']);
            case 'account':
                if ($method !== 'GET') respond(405, ['error'=>'روش درخواست پشتیبانی نمی‌شود.']);
                handle_account();
            case 'orders/track':
                if ($method !== 'POST') respond(405, ['error'=>'روش درخواست پشتیبانی نمی‌شود.']);
                handle_tracking();
            case 'admin/dashboard':
                handle_admin_dashboard($method);
            case 'analytics/events':
                if ($method !== 'POST') respond(405, ['error'=>'روش درخواست پشتیبانی نمی‌شود.']);
                handle_analytics();
            case 'caregiver/application':
                handle_caregiver_application($method);
            default:
                respond(404, ['error'=>'مسیر API پیدا نشد.']);
        }
    } catch (Throwable $error) {
        error_log('[MYCA API] ' . $error->getMessage());
        $message = $error->getMessage();
        if (in_array($message, ['MYCA_CONFIG_MISSING','MYCA_CONFIG_INVALID','MYCA_CONFIG_INCOMPLETE','PHP_CURL_REQUIRED'], true)) {
            respond(503, ['error'=>'اتصال امن پایگاه داده مایکا هنوز پیکربندی نشده است.']);
        }
        respond(500, ['error'=>'خطای داخلی سرویس مایکا. لطفاً کمی بعد دوباره تلاش کنید.']);
    }
}

dispatch();
