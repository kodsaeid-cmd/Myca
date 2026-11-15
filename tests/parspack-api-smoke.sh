#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://127.0.0.1:8080/api/index.php"
COOKIE_JAR="/tmp/myca-admin-cookies.txt"
SERVER_LOG="/tmp/myca-php-server.log"
START_AT="$(date -u -d '+1 day' '+%Y-%m-%dT%H:%M:%SZ')"

cleanup() {
  if [[ -n "\${SERVER_PID:-}" ]]; then kill "$SERVER_PID" 2>/dev/null || true; fi
  rm -f private/config.php "$COOKIE_JAR"
}
trap cleanup EXIT

mkdir -p private
cat > private/config.php <<'PHP'
<?php
return [
  'db_host' => '127.0.0.1',
  'db_name' => 'myca_test',
  'db_user' => 'root',
  'db_password' => 'testroot',
  'setup_token' => 'ci_test_setup_token_0123456789_abcdefgh',
  'session_secret' => 'ci_test_session_secret_0123456789_abcdefgh_ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'site_url' => 'http://127.0.0.1:8080',
];
PHP

php -r '
$pdo = new PDO(
  "mysql:host=127.0.0.1;dbname=myca_test;charset=utf8mb4",
  "root",
  "testroot",
  [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::MYSQL_ATTR_MULTI_STATEMENTS => true]
);
$pdo->exec(file_get_contents("deploy/parspack/database/schema.sql"));
echo "MySQL schema imported.\n";
'

php -S 127.0.0.1:8080 -t public >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

for attempt in $(seq 1 30); do
  if curl -fsS "$BASE_URL?route=health" | jq -e '.status == "ok" and .backend == "PHP/MySQL"' >/dev/null; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    cat "$SERVER_LOG"
    echo "PHP/MySQL health check did not become ready."
    exit 1
  fi
  sleep 1
done

ORIGIN="http://127.0.0.1:8080"
SETUP_BODY="$(jq -n \
  --arg setupToken 'ci_test_setup_token_0123456789_abcdefgh' \
  --arg displayName 'CI Admin' \
  --arg username 'ci-admin' \
  --arg password 'Ci-Admin-Password-2026-Strong!' \
  '{setupToken:$setupToken,displayName:$displayName,username:$username,password:$password}')"
SETUP_RESULT="$(curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -H "Origin: $ORIGIN" -H 'Content-Type: application/json' \
  -d "$SETUP_BODY" "$BASE_URL?route=admin/setup")"
echo "$SETUP_RESULT" | jq -e '.ok == true and (.csrfToken | length) > 20' >/dev/null

DASHBOARD="$(curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE_URL?route=admin/dashboard")"
CSRF="$(echo "$DASHBOARD" | jq -r '.csrfToken')"
echo "$DASHBOARD" | jq -e '.stats.orders_total == 0 and (.orders | length) == 0' >/dev/null

ORDER_BODY="$(jq -n \
  --arg startAt "$START_AT" \
  '{
    categoryId:"11",
    serviceSlug:"independent",
    packageId:"hamdam",
    shift:"روزانه",
    startAt:$startAt,
    durationMonths:3,
    fridayRequired:false,
    childrenCount:1,
    recipientName:"مشتری آزمایشی",
    recipientAge:80,
    dependency:"dependent",
    notes:"CI integration test",
    requesterName:"MYCA CI Customer",
    phone:"09123456789",
    city:"تهران",
    province:"تهران",
    address:"نشانی آزمایشی برای تست",
    postalCode:"1234567890",
    urgent:false
  }')"
ORDER_RESULT="$(curl -fsS -H "Origin: $ORIGIN" -H 'Content-Type: application/json' \
  -d "$ORDER_BODY" "$BASE_URL?route=requests")"
REFERENCE="$(echo "$ORDER_RESULT" | jq -r '.request.reference')"
echo "$ORDER_RESULT" | jq -e '.ok == true and (.request.reference | startswith("MYCA-"))' >/dev/null

TRACK_BODY="$(jq -n --arg reference "$REFERENCE" '{reference:$reference,phone:"۰۹۱۲۳۴۵۶۷۸۹"}')"
TRACK_RESULT="$(curl -fsS -H "Origin: $ORIGIN" -H 'Content-Type: application/json' \
  -d "$TRACK_BODY" "$BASE_URL?route=orders/track")"
echo "$TRACK_RESULT" | jq -e '.order.status == "submitted" and .order.paymentStatus == "awaiting_contact" and .order.pricing.package_id == "hamdam"' >/dev/null

PATCH_BODY="$(jq -n --arg id "$(echo "$ORDER_RESULT" | jq -r '.request.id')" \
  '{id:$id,status:"triage",paymentStatus:"awaiting_payment",paidAmountRial:null,note:"CI: تماس اولیه انجام شد"}')"
curl -fsS -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X PATCH \
  -H "Origin: $ORIGIN" -H "x-csrf-token: $CSRF" -H 'Content-Type: application/json' \
  -d "$PATCH_BODY" "$BASE_URL?route=admin/dashboard" | jq -e '.ok == true' >/dev/null

PAID_BODY="$(jq -n --arg id "$(echo "$ORDER_RESULT" | jq -r '.request.id')" \
  '{id:$id,status:"triage",paymentStatus:"paid",paidAmountRial:50000000,note:"CI: پرداخت تلفنی تأیید شد"}')"
curl -fsS -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X PATCH \
  -H "Origin: $ORIGIN" -H "x-csrf-token: $CSRF" -H 'Content-Type: application/json' \
  -d "$PAID_BODY" "$BASE_URL?route=admin/dashboard" | jq -e '.ok == true and .order.payment_status == "paid"' >/dev/null

TRACK_PAID="$(curl -fsS -H "Origin: $ORIGIN" -H 'Content-Type: application/json' \
  -d "$TRACK_BODY" "$BASE_URL?route=orders/track")"
echo "$TRACK_PAID" | jq -e '.order.status == "triage" and .order.paymentStatus == "paid" and .order.paidAmountRial == 50000000' >/dev/null

ANALYTICS_BODY="$(jq -n \
  '{visitorId:"visitor-ci-123456",sessionId:"session-ci-123456",eventType:"page_view",eventName:"CI page view",path:"/",referrer:"",utmSource:"ci"}')"
curl -fsS -o /dev/null -w '%{http_code}' -H "Origin: $ORIGIN" -H 'Content-Type: application/json' \
  -d "$ANALYTICS_BODY" "$BASE_URL?route=analytics/events" | grep -qx '204'

FINAL_DASHBOARD="$(curl -fsS -b "$COOKIE_JAR" "$BASE_URL?route=admin/dashboard")"
echo "$FINAL_DASHBOARD" | jq -e '.stats.orders_total == 1 and .stats.customers_total == 1 and .stats.page_views_total == 1 and .stats.paid_revenue_rial == 50000000 and (.stats.package_orders | length) == 1' >/dev/null

LOGOUT_CODE="$(curl -sS -o /dev/null -w '%{http_code}' -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Origin: $ORIGIN" -H "x-csrf-token: $(echo "$FINAL_DASHBOARD" | jq -r '.csrfToken')" \
  -X POST "$BASE_URL?route=admin/logout")"
[[ "$LOGOUT_CODE" == "200" ]]

LOGIN_BODY="$(jq -n --arg username 'ci-admin' --arg password 'Ci-Admin-Password-2026-Strong!' '{username:$username,password:$password}')"
curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -H "Origin: $ORIGIN" -H 'Content-Type: application/json' \
  -d "$LOGIN_BODY" "$BASE_URL?route=admin/login" | jq -e '.ok == true' >/dev/null
curl -fsS -b "$COOKIE_JAR" "$BASE_URL?route=admin/dashboard" | jq -e '.stats.orders_total == 1' >/dev/null

echo "MYCA ParsPack PHP/MySQL integration test passed: order, customer profile, tracking, admin, phone payment and analytics."
