-- =============================================================================
-- SpendWise — Corporate Financial Expense Analytics & Budget Reconciliation
-- Complete Database DDL Schema & Seed Script for MySQL / MySQL Workbench
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. DROP EXISTING TABLES
DROP TABLE IF EXISTS expense_status_history;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS expense_categories;
DROP TABLE IF EXISTS reconciliations;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 2. CREATE SCHEMAS & TABLES
-- =============================================================================

-- TABLE 1: users (Auth Service)
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'EMPLOYEE',
    department_id VARCHAR(50),
    department_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLE 2: refresh_tokens (Auth Service - Token Rotation & Revocation)
CREATE TABLE refresh_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_refresh_tokens_user (user_id),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLE 3: departments (Budget Service)
CREATE TABLE departments (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    manager_id VARCHAR(36),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_departments_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLE 4: expense_categories (Expense Service)
CREATE TABLE expense_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_expense_categories_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLE 5: budgets (Budget Service - Authorized Allocations)
CREATE TABLE budgets (
    id VARCHAR(36) PRIMARY KEY,
    department_id VARCHAR(50) NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    category_id VARCHAR(50),
    category_name VARCHAR(100),
    period VARCHAR(20) NOT NULL DEFAULT 'ANNUAL',
    fiscal_year INT NOT NULL,
    fiscal_month INT DEFAULT NULL,
    allocated_amount DECIMAL(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    threshold_warning_percent DECIMAL(5, 2) NOT NULL DEFAULT 80.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_budget_period (department_id, category_id, period, fiscal_year, fiscal_month),
    INDEX idx_budgets_dept_year (department_id, fiscal_year),
    CONSTRAINT fk_budgets_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_budgets_category FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLE 6: expenses (Expense Service - Full Lifecycle State Machine)
CREATE TABLE expenses (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36) NOT NULL,
    employee_name VARCHAR(150) NOT NULL,
    employee_email VARCHAR(255) NOT NULL,
    category_id VARCHAR(50) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    department_id VARCHAR(50) NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    description TEXT NOT NULL,
    vendor VARCHAR(150) NOT NULL,
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    submission_date DATETIME DEFAULT NULL,
    reviewed_by VARCHAR(36) DEFAULT NULL,
    reviewed_by_name VARCHAR(150) DEFAULT NULL,
    review_date DATETIME DEFAULT NULL,
    rejection_reason TEXT,
    comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_expenses_employee (employee_id),
    INDEX idx_expenses_department (department_id),
    INDEX idx_expenses_category (category_id),
    INDEX idx_expenses_status (status),
    INDEX idx_expenses_date (expense_date),
    CONSTRAINT fk_expenses_category FOREIGN KEY (category_id) REFERENCES expense_categories(id),
    CONSTRAINT fk_expenses_department FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLE 7: expense_status_history (Audit Trail of State Transitions)
CREATE TABLE expense_status_history (
    id VARCHAR(36) PRIMARY KEY,
    expense_id VARCHAR(36) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(36) NOT NULL,
    changed_by_name VARCHAR(150) NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status_history_expense (expense_id),
    CONSTRAINT fk_status_history_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TABLE 8: reconciliations (Budget Reconciliation Service - Variance Snapshots)
CREATE TABLE reconciliations (
    id VARCHAR(36) PRIMARY KEY,
    department_id VARCHAR(50) NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    category_id VARCHAR(50),
    category_name VARCHAR(100),
    period VARCHAR(20) NOT NULL DEFAULT 'ANNUAL',
    fiscal_year INT NOT NULL,
    fiscal_month INT DEFAULT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    allocated_budget DECIMAL(14, 2) NOT NULL,
    actual_expenditure DECIMAL(14, 2) NOT NULL,
    pending_expenditure DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    variance DECIMAL(14, 2) NOT NULL,
    remaining_budget DECIMAL(14, 2) NOT NULL,
    utilization_percent DECIMAL(7, 2) NOT NULL,
    is_over_budget BOOLEAN NOT NULL DEFAULT FALSE,
    warning_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    reconciled_by VARCHAR(36) NOT NULL,
    reconciled_by_name VARCHAR(150) NOT NULL,
    reconciled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reconciliations_dept (department_id),
    INDEX idx_reconciliations_period (fiscal_year, fiscal_month),
    CONSTRAINT fk_reconciliations_dept FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================================
-- 3. INSERT SEED DATA
-- =============================================================================

-- Seed Departments
INSERT INTO departments (id, code, name, description) VALUES
('dept-eng-001', 'ENG', 'Software Engineering', 'Core product engineering & cloud platform'),
('dept-fin-002', 'FIN', 'Finance & Accounting', 'Corporate treasury, payroll & compliance'),
('dept-mkt-003', 'MKT', 'Sales & Marketing', 'Growth, demand generation & client acquisition'),
('dept-hr-004',  'HR',  'People Operations & HR', 'Talent recruitment, culture & compensation'),
('dept-prd-005', 'PRD', 'Product Management & UX', 'Product roadmap & design systems')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Seed Expense Categories
INSERT INTO expense_categories (id, name, code, description, is_active) VALUES
('cat-soft-001', 'Cloud & Software Subscriptions', 'SOFTWARE', 'AWS, GitHub, Datadog, Figma', TRUE),
('cat-trav-002', 'Travel & Accommodation', 'TRAVEL', 'Flights, hotels, client visits', TRUE),
('cat-hard-003', 'Hardware & Peripherals', 'HARDWARE', 'MacBooks, monitors, office equipment', TRUE),
('cat-meal-004', 'Meals & Corporate Dining', 'MEALS', 'Client entertainment, team dinners', TRUE),
('cat-conf-005', 'Training & Conferences', 'TRAINING', 'Tech conferences, courses, certifications', TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Seed Demo Users
-- Admin:     admin@spendwise.corp    (Pass: Admin@12345)
-- Finance:   finance@spendwise.corp  (Pass: Finance@12345)
-- Employee:  employee@spendwise.corp (Pass: Employee@12345)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, department_id, department_name) VALUES
('a0000000-0000-0000-0000-000000000001', 'admin@spendwise.corp',    '$2a$10$HPh1xhbwjaf7GTLZ9/rUxeyTfbouVB.G19lWlnlYQKacIaQQaLbza', 'Sarah',  'Chen',  'ADMIN',           'dept-eng-001', 'Software Engineering'),
('b0000000-0000-0000-0000-000000000002', 'finance@spendwise.corp',  '$2a$10$KJKK8suu4YllF10cZyqeQOamabkRVgO6Kf1SEhR2Czj/yQYQsR9Bm', 'Marcus', 'Vance', 'FINANCE_MANAGER', 'dept-fin-002', 'Finance & Accounting'),
('c0000000-0000-0000-0000-000000000003', 'employee@spendwise.corp', '$2a$10$KoUTqM4dGkAKFcmTs2xvG.M9evN1h.pNpnIjmPey.O1znhdAh6t0a', 'Alex',   'Reyes', 'EMPLOYEE',        'dept-eng-001', 'Software Engineering')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

-- Seed Authorized Budgets (FY 2026)
INSERT INTO budgets (id, department_id, department_name, category_id, category_name, period, fiscal_year, fiscal_month, allocated_amount, currency, threshold_warning_percent) VALUES
('d0000000-0000-0000-0000-000000000001', 'dept-eng-001', 'Software Engineering', 'cat-soft-001', 'Cloud & Software Subscriptions', 'ANNUAL', 2026, NULL, 60000.00, 'USD', 80.00),
('d0000000-0000-0000-0000-000000000002', 'dept-eng-001', 'Software Engineering', 'cat-hard-003', 'Hardware & Peripherals',          'ANNUAL', 2026, NULL, 25000.00, 'USD', 85.00),
('d0000000-0000-0000-0000-000000000003', 'dept-mkt-003', 'Sales & Marketing',    'cat-trav-002', 'Travel & Accommodation',            'ANNUAL', 2026, NULL, 35000.00, 'USD', 75.00),
('d0000000-0000-0000-0000-000000000004', 'dept-fin-002', 'Finance & Accounting',  'cat-soft-001', 'Cloud & Software Subscriptions', 'ANNUAL', 2026, NULL, 18000.00, 'USD', 80.00)
ON DUPLICATE KEY UPDATE allocated_amount = VALUES(allocated_amount);

-- Seed Realistic Expenses
INSERT INTO expenses (
    id, employee_id, employee_name, employee_email,
    category_id, category_name, department_id, department_name,
    amount, currency, description, vendor, expense_date,
    status, submission_date, reviewed_by, reviewed_by_name, review_date, comments
) VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000003', 'Alex Reyes', 'employee@spendwise.corp',
    'cat-soft-001', 'Cloud & Software Subscriptions', 'dept-eng-001', 'Software Engineering',
    4200.00, 'USD', 'AWS Production Kubernetes Cluster Hosting - Q1', 'Amazon Web Services', '2026-02-15',
    'APPROVED', '2026-02-15 10:00:00', 'b0000000-0000-0000-0000-000000000002', 'Marcus Vance', '2026-02-16 14:30:00',
    'Budget verified and approved for corporate payment.'
),
(
    'e0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000003', 'Alex Reyes', 'employee@spendwise.corp',
    'cat-soft-001', 'Cloud & Software Subscriptions', 'dept-eng-001', 'Software Engineering',
    1540.00, 'USD', 'GitHub Enterprise Tier Annual Renewal', 'GitHub, Inc.', '2026-02-20',
    'APPROVED', '2026-02-20 11:20:00', 'b0000000-0000-0000-0000-000000000002', 'Marcus Vance', '2026-02-21 09:15:00',
    'Approved against Software Subscriptions budget.'
),
(
    'e0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000003', 'Alex Reyes', 'employee@spendwise.corp',
    'cat-hard-003', 'Hardware & Peripherals', 'dept-eng-001', 'Software Engineering',
    2850.00, 'USD', 'Apple MacBook Pro M3 Max for Senior DevOps Engineer', 'Apple Store Online', '2026-03-01',
    'APPROVED', '2026-03-01 16:45:00', 'b0000000-0000-0000-0000-000000000002', 'Marcus Vance', '2026-03-02 11:00:00',
    'Approved per Engineering hardware refreshment policy.'
),
(
    'e0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000003', 'Alex Reyes', 'employee@spendwise.corp',
    'cat-trav-002', 'Travel & Accommodation', 'dept-eng-001', 'Software Engineering',
    1240.50, 'USD', 'Flight & Hotel for AWS re:Invent Conference', 'Delta Air Lines & Marriott', '2026-03-10',
    'SUBMITTED', '2026-03-10 09:15:00', NULL, NULL, NULL,
    'Submitted for manager review.'
),
(
    'e0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0000-000000000003', 'Alex Reyes', 'employee@spendwise.corp',
    'cat-soft-001', 'Cloud & Software Subscriptions', 'dept-eng-001', 'Software Engineering',
    240.00, 'USD', 'Figma Organization Seats - Monthly Renewal', 'Figma, Inc.', '2026-03-22',
    'DRAFT', NULL, NULL, NULL, NULL,
    'Draft - awaiting final seat headcount.'
)
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Seed Reconciliations
INSERT INTO reconciliations (
    id, department_id, department_name, category_id, category_name,
    period, fiscal_year, fiscal_month, currency,
    allocated_budget, actual_expenditure, pending_expenditure,
    variance, remaining_budget, utilization_percent, is_over_budget, warning_triggered, notes,
    reconciled_by, reconciled_by_name, reconciled_at
) VALUES
(
    'f0000000-0000-0000-0000-000000000001',
    'dept-eng-001', 'Software Engineering', 'cat-soft-001', 'Cloud & Software Subscriptions',
    'ANNUAL', 2026, NULL, 'USD',
    60000.00, 5740.00, 0.00,
    54260.00, 54260.00, 9.57, FALSE, FALSE, 'Q1 Routine Reconciliation: Engineering Software within healthy budget bounds.',
    'b0000000-0000-0000-0000-000000000002', 'Marcus Vance', '2026-03-15 17:00:00'
),
(
    'f0000000-0000-0000-0000-000000000002',
    'dept-eng-001', 'Software Engineering', 'cat-hard-003', 'Hardware & Peripherals',
    'ANNUAL', 2026, NULL, 'USD',
    25000.00, 2850.00, 0.00,
    22150.00, 22150.00, 11.40, FALSE, FALSE, 'Q1 Hardware Asset Reconciliation: Healthy budget balance remaining.',
    'b0000000-0000-0000-0000-000000000002', 'Marcus Vance', '2026-03-15 17:05:00'
)
ON DUPLICATE KEY UPDATE notes = VALUES(notes);

-- Seed Expense Audit History
INSERT INTO expense_status_history (id, expense_id, from_status, to_status, changed_by, changed_by_name, reason, created_at) VALUES
('h0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', NULL, 'DRAFT', 'c0000000-0000-0000-0000-000000000003', 'Alex Reyes', 'Initial expense record created', '2026-02-15 09:30:00'),
('h0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'DRAFT', 'SUBMITTED', 'c0000000-0000-0000-0000-000000000003', 'Alex Reyes', 'Submitted for manager review', '2026-02-15 10:00:00'),
('h0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'SUBMITTED', 'APPROVED', 'b0000000-0000-0000-0000-000000000002', 'Marcus Vance', 'Budget verified and approved for corporate payment.', '2026-02-16 14:30:00')
ON DUPLICATE KEY UPDATE reason = VALUES(reason);
