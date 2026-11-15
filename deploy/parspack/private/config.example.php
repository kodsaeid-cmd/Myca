<?php
declare(strict_types=1);

// Copy this file to the private directory beside public/, as private/config.php.
// The private/ directory must remain OUTSIDE the subdomain document root.
return [
    'db_host' => 'localhost',
    'db_name' => 'mycabl_myca_orders',
    'db_user' => 'mycabl_myca_orders_user',
    'db_password' => 'SET_A_STRONG_UNIQUE_DATABASE_PASSWORD',
    'setup_token' => 'SET_A_RANDOM_ONE_TIME_SETUP_TOKEN_AT_LEAST_48_CHARS',
    'session_secret' => 'SET_ANOTHER_INDEPENDENT_RANDOM_SECRET_AT_LEAST_64_CHARS',
    'site_url' => 'https://myca-test.dandoonii.ir',
];
