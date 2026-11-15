-- MYCA Phase One: orders, customer profiles, manual phone-coordinated payments and analytics.
-- Import once into a NEW dedicated MySQL database from ParsPack phpMyAdmin.
-- All timestamps are UTC. Engine: InnoDB. Charset: utf8mb4.

CREATE TABLE IF NOT EXISTS myca_customers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  city VARCHAR(100) NULL,
  province VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_myca_customer_name (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS myca_reference_sequences (
  month_key CHAR(6) NOT NULL PRIMARY KEY,
  last_number INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS myca_admin_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','operator','support_office') NOT NULL DEFAULT 'admin',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL,
  INDEX idx_myca_admin_active (active, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS myca_admin_login_attempts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ip_hash CHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_myca_admin_login_attempts (ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS myca_services (
  category_id VARCHAR(8) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  title VARCHAR(160) NOT NULL,
  delivery_class ENUM('non_medical','home_service','corporate_service','licensed_healthcare') NOT NULL,
  requires_professional_license TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (category_id, slug),
  INDEX idx_myca_service_active (active, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO myca_services (category_id,slug,title,delivery_class,requires_professional_license) VALUES
('11','independent','سالمند مستقل','non_medical',0),
('11','semi-dependent','سالمند نیمه‌وابسته','non_medical',0),
('11','dependent','سالمند وابسته','non_medical',0),
('12','infant-nurse','پرستار نوزاد','non_medical',0),
('12','mother-companion','مادریار','non_medical',0),
('12','child-care','کودکیار','non_medical',0),
('12','psychologist','روانشناس','licensed_healthcare',1),
('12','child-care-package','پکیج مراقبت کودک','non_medical',0),
('13','nursing-assistant','کمک‌بهیار','licensed_healthcare',1),
('13','hourly-nurse','نرس ساعتی','licensed_healthcare',1),
('13','one-time-nurse','نرس موردی','licensed_healthcare',1),
('13','hospital-companion','همراه بیمار در بیمارستان','non_medical',0),
('14','home-cleaning','نظافت منزل','home_service',0),
('14','cooking-home','آشپزی و امور منزل','home_service',0),
('14','home-cook','آشپزی در منزل','home_service',0),
('17','pantry','آبدارچی','corporate_service',0),
('17','office-cleaning','نظافت شرکت','corporate_service',0),
('32','laboratory','آزمایشگاه','licensed_healthcare',1),
('32','physiotherapy','فیزیوتراپی','licensed_healthcare',1),
('32','specialist-doctor','پزشک متخصص','licensed_healthcare',1),
('22','daily','سالمند مستقل روزانه','non_medical',0),
('22','night','سالمند مستقل شبانه','non_medical',0),
('22','24h','سالمند مستقل شبانه‌روزی','non_medical',0),
('27','daily','پرستار نوزاد روزانه','non_medical',0),
('27','night','پرستار نوزاد شبانه','non_medical',0),
('27','24h','پرستار نوزاد شبانه‌روزی','non_medical',0)
ON DUPLICATE KEY UPDATE title=VALUES(title),delivery_class=VALUES(delivery_class),requires_professional_license=VALUES(requires_professional_license),active=1;

CREATE TABLE IF NOT EXISTS myca_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(32) NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NOT NULL,
  requester_name VARCHAR(120) NOT NULL,
  requester_phone VARCHAR(20) NOT NULL,
  recipient_name VARCHAR(120) NULL,
  recipient_age SMALLINT UNSIGNED NULL,
  dependency_level ENUM('independent','semi_dependent','dependent') NULL,
  children_count TINYINT UNSIGNED NOT NULL DEFAULT 1,
  category_id VARCHAR(8) NOT NULL,
  service_slug VARCHAR(80) NOT NULL,
  package_id VARCHAR(80) NULL,
  package_title VARCHAR(160) NULL,
  requested_shift VARCHAR(40) NOT NULL,
  requested_start_at DATETIME NOT NULL,
  duration_months SMALLINT UNSIGNED NULL,
  friday_required TINYINT(1) NOT NULL DEFAULT 0,
  is_urgent TINYINT(1) NOT NULL DEFAULT 0,
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NULL,
  address_line VARCHAR(500) NOT NULL,
  postal_code VARCHAR(20) NULL,
  notes VARCHAR(1200) NULL,
  status ENUM('submitted','triage','matching','offered','accepted','quoted','contract_pending','confirmed','in_service','completed','cancelled','rejected') NOT NULL DEFAULT 'submitted',
  payment_method ENUM('phone_coordination') NOT NULL DEFAULT 'phone_coordination',
  payment_status ENUM('awaiting_contact','awaiting_payment','paid','failed','refunded','not_required') NOT NULL DEFAULT 'awaiting_contact',
  paid_amount_rial BIGINT UNSIGNED NULL,
  paid_at DATETIME NULL,
  payment_confirmed_by BIGINT UNSIGNED NULL,
  pricing_snapshot LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_myca_orders_customer (customer_id, created_at),
  INDEX idx_myca_orders_status (status, created_at),
  INDEX idx_myca_orders_payment (payment_status, created_at),
  INDEX idx_myca_orders_package (package_id, created_at),
  INDEX idx_myca_orders_phone_reference (requester_phone, reference),
  CONSTRAINT fk_myca_order_customer FOREIGN KEY (customer_id) REFERENCES myca_customers(id),
  CONSTRAINT fk_myca_order_payment_admin FOREIGN KEY (payment_confirmed_by) REFERENCES myca_admin_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS myca_order_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(32) NULL,
  to_status VARCHAR(32) NULL,
  event_type VARCHAR(48) NOT NULL,
  actor_id BIGINT UNSIGNED NULL,
  note VARCHAR(1000) NULL,
  metadata LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_myca_order_events (order_id, created_at),
  CONSTRAINT fk_myca_order_event_order FOREIGN KEY (order_id) REFERENCES myca_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_myca_order_event_actor FOREIGN KEY (actor_id) REFERENCES myca_admin_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS myca_site_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visitor_id VARCHAR(80) NOT NULL,
  session_id VARCHAR(80) NOT NULL,
  event_type ENUM('page_view','phone_click','cta_click','button_click','link_click') NOT NULL,
  event_name VARCHAR(120) NULL,
  path VARCHAR(300) NOT NULL,
  referrer VARCHAR(500) NULL,
  utm_source VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_myca_site_event_type (event_type, created_at),
  INDEX idx_myca_site_event_path (path, created_at),
  INDEX idx_myca_site_event_visitor (visitor_id, created_at),
  INDEX idx_myca_site_event_session (session_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS myca_audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  metadata LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_myca_audit_recent (created_at),
  CONSTRAINT fk_myca_audit_admin FOREIGN KEY (admin_id) REFERENCES myca_admin_users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
