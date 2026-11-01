-- =============================================================================
-- SpendWise — Corporate Financial Expense Analytics & Budget Reconciliation
-- Complete Database DDL Schema & Seed Script for PostgreSQL / pgAdmin 4
-- Course: 24SDCS03R — SOA Programming and Microservices (Cluster 1 Review 2)
-- =============================================================================

-- Ensure required extension for UUID generation is present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. DROP EXISTING TABLES (In correct dependency order for clean replay)
-- =============================================================================
DROP TABLE IF EXISTS expense_status_history CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS expense_categories CASCADE;
DROP TABLE IF EXISTS reconciliations CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================================================
-- 2. CREATE SCHEMAS & TABLES
-- =============================================================================

-- TABLE 1: users (Auth Service)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'EMPLOYEE' CHECK (role IN ('ADMIN', 'FINANCE_MANAGER', 'EMPLOYEE')),
    department_id VARCHAR(50),
    department_name VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- TABLE 2: refresh_tokens (Auth Service - Token Rotation & Revocation)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- TABLE 3: departments (Budget Service)
CREATE TABLE departments (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    manager_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_departments_code ON departments(code);

-- TABLE 4: expense_categories (Expense Service)
CREATE TABLE expense_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expense_categories_code ON expense_categories(code);

-- TABLE 5: budgets (Budget Service - Authorized Allocations)
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id VARCHAR(50) NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    department_name VARCHAR(100) NOT NULL,
    category_id VARCHAR(50) REFERENCES expense_categories(id) ON DELETE SET NULL,
    category_name VARCHAR(100),
    period VARCHAR(20) NOT NULL DEFAULT 'ANNUAL' CHECK (period IN ('ANNUAL', 'MONTHLY')),
    fiscal_year INT NOT NULL CHECK (fiscal_year BETWEEN 2020 AND 2050),
    fiscal_month INT CHECK (fiscal_month BETWEEN 1 AND 12),
    allocated_amount NUMERIC(14, 2) NOT NULL CHECK (allocated_amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    threshold_warning_percent NUMERIC(5, 2) NOT NULL DEFAULT 80.00 CHECK (threshold_warning_percent BETWEEN 1 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_budget_period UNIQUE (department_id, category_id, period, fiscal_year, fiscal_month)
);

CREATE INDEX idx_budgets_dept_year ON budgets(department_id, fiscal_year);

-- TABLE 6: expenses (Expense Service - Full Lifecycle State Machine)
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL,
    employee_name VARCHAR(150) NOT NULL,
    employee_email VARCHAR(255) NOT NULL,
    category_id VARCHAR(50) NOT NULL REFERENCES expense_categories(id),
    category_name VARCHAR(100) NOT NULL,
    department_id VARCHAR(50) NOT NULL REFERENCES departments(id),
    department_name VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    description TEXT NOT NULL,
    vendor VARCHAR(150) NOT NULL,
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
    submission_date TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,
    reviewed_by_name VARCHAR(150),
    review_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_employee ON expenses(employee_id);
CREATE INDEX idx_expenses_department ON expenses(department_id);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

-- TABLE 7: expense_status_history (Audit Trail of State Transitions)
CREATE TABLE expense_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by UUID NOT NULL,
    changed_by_name VARCHAR(150) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_status_history_expense ON expense_status_history(expense_id);

-- TABLE 8: reconciliations (Budget Reconciliation Service - Variance Snapshots)
CREATE TABLE reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id VARCHAR(50) NOT NULL REFERENCES departments(id),
    department_name VARCHAR(100) NOT NULL,
    category_id VARCHAR(50),
    category_name VARCHAR(100),
    period VARCHAR(20) NOT NULL DEFAULT 'ANNUAL',
    fiscal_year INT NOT NULL,
    fiscal_month INT,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    allocated_budget NUMERIC(14, 2) NOT NULL,
    actual_expenditure NUMERIC(14, 2) NOT NULL,
    pending_expenditure NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    variance NUMERIC(14, 2) NOT NULL,
    remaining_budget NUMERIC(14, 2) NOT NULL,
    utilization_percent NUMERIC(7, 2) NOT NULL,
    is_over_budget BOOLEAN NOT NULL DEFAULT FALSE,
    warning_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    reconciled_by UUID NOT NULL,
    reconciled_by_name VARCHAR(150) NOT NULL,
    reconciled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reconciliations_dept ON reconciliations(department_id);
CREATE INDEX idx_reconciliations_period ON reconciliations(fiscal_year, fiscal_month);


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
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Seed Expense Categories
INSERT INTO expense_categories (id, name, code, description, is_active) VALUES
('cat-soft-001', 'Cloud & Software Subscriptions', 'SOFTWARE', 'AWS, GitHub, Datadog, Figma', TRUE),
('cat-trav-002', 'Travel & Accommodation', 'TRAVEL', 'Flights, hotels, client visits', TRUE),
('cat-hard-003', 'Hardware & Peripherals', 'HARDWARE', 'MacBooks, monitors, office equipment', TRUE),
('cat-meal-004', 'Meals & Corporate Dining', 'MEALS', 'Client entertainment, team dinners', TRUE),
('cat-conf-005', 'Training & Conferences', 'TRAINING', 'Tech conferences, courses, certifications', TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Seed Demo Users (Matching Demo Passwords)
-- Admin Password:     Admin@12345
-- Finance Password:   Finance@12345
-- Employee Password:  Employee@12345
INSERT INTO users (id, email, password_hash, first_name, last_name, role, department_id, department_name) VALUES
('a0000000-0000-0000-0000-000000000001', 'admin@spendwise.corp',    '$2a$10$HPh1xhbwjaf7GTLZ9/rUxeyTfbouVB.G19lWlnlYQKacIaQQaLbza', 'Sarah',  'Chen',  'ADMIN',           'dept-eng-001', 'Software Engineering'),
('b0000000-0000-0000-0000-000000000002', 'finance@spendwise.corp',  '$2a$10$KJKK8suu4YllF10cZyqeQOamabkRVgO6Kf1SEhR2Czj/yQYQsR9Bm', 'Marcus', 'Vance', 'FINANCE_MANAGER', 'dept-fin-002', 'Finance & Accounting'),
('c0000000-0000-0000-0000-000000000003', 'employee@spendwise.corp', '$2a$10$KoUTqM4dGkAKFcmTs2xvG.M9evN1h.pNpnIjmPey.O1znhdAh6t0a', 'Alex',   'Reyes', 'EMPLOYEE',        'dept-eng-001', 'Software Engineering')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Seed Authorized Budgets (FY 2026)
INSERT INTO budgets (id, department_id, department_name, category_id, category_name, period, fiscal_year, fiscal_month, allocated_amount, currency, threshold_warning_percent) VALUES
('d0000000-0000-0000-0000-000000000001', 'dept-eng-001', 'Software Engineering', 'cat-soft-001', 'Cloud & Software Subscriptions', 'ANNUAL', 2026, NULL, 60000.00, 'USD', 80.00),
('d0000000-0000-0000-0000-000000000002', 'dept-eng-001', 'Software Engineering', 'cat-hard-003', 'Hardware & Peripherals',          'ANNUAL', 2026, NULL, 25000.00, 'USD', 85.00),
('d0000000-0000-0000-0000-000000000003', 'dept-mkt-003', 'Sales & Marketing',    'cat-trav-002', 'Travel & Accommodation',            'ANNUAL', 2026, NULL, 35000.00, 'USD', 75.00),
('d0000000-0000-0000-0000-000000000004', 'dept-fin-002', 'Finance & Accounting',  'cat-soft-001', 'Cloud & Software Subscriptions', 'ANNUAL', 2026, NULL, 18000.00, 'USD', 80.00)
ON CONFLICT (id) DO NOTHING;

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
    'APPROVED', '2026-02-15 10:00:00+00', 'b0000000-0000-0000-0000-000000000002', 'Marcus Vance', '2026-02-16 14:30:00+00',
    'Budget verified and approved for corporate payment.'
),
(
    'e0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000003', 'Alex Reyes', 'employee@spendwise.corp',
    'cat-soft-001', 'Cloud & Software Subscriptions', 'dept-eng-001', 'Software Engineering',
    1540.00, 'USD', 'GitHub Enterprise Tier Annual Renewal', 'GitHub, Inc.', '2026-02-20',
    'APPROVED', '2026-02-20 11:20:00+00', 'b0000000-0000-0000-0000-000000000002', 'Marcus Vance', '2026-02-21 09:15:00+00',
    'Approved against Software Subscriptions budget.'
),
(
    'e0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000003', 'Alex Reyes', 'employee@spendwise.corp',
    'cat-hard-003', 'Hardware & Peripherals', 'dept-eng-001', 'Software Engineering',
    2850.00, 'USD', 'Apple MacBook Pro M3 Max for Senior DevOps Engineer', 'Apple Store Online', '2026-03-01',
    'APPROVED', '2026-03-01 16:45:00+00', 'b0000000-0000-0000-0000-000000000002', 'Marcus Vance', '2026-03-02 11:00:00+00',
    'Approved per Engineering hardware refreshment policy.'
),
(
    'e0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000003', 'Alex Reyes', 'employee@spendwise.corp',
    'cat-trav-002', 'Travel & Accommodation', 'dept-eng-001', 'Software Engineering',
    1120.50, 'USD', 'Flights & Hotel for KubeCon North America 2026', 'United Airlines & Hyatt', '2026-03-10',
    'SUBMITTED', '2026-03-10 15:30:00+00', NULL, NULL, NULL,
    NULL
),
(
    'e0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0000-000000000003', 'Alex Reyes', 'employee@spendwise.corp',
    'cat-meal-004', 'Meals & Corporate Dining', 'dept-eng-001', 'Software Engineering',
    320.00, 'USD', 'Team Dinner celebrating SOA Microservices Milestone', 'The Capital Grille', '2026-03-15',
    'DRAFT', NULL, NULL, NULL, NULL,
    NULL
)
ON CONFLICT (id) DO NOTHING;

-- Seed Expense Status History (Audit Trail)
INSERT INTO expense_status_history (id, expense_id, from_status, to_status, changed_by, changed_by_name, reason) VALUES
('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', NULL,        'DRAFT',     'c0000000-0000-0000-0000-000000000003', 'Alex Reyes',   'Created as draft'),
('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'DRAFT',    'SUBMITTED', 'c0000000-0000-0000-0000-000000000003', 'Alex Reyes',   'Submitted for finance approval'),
('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'SUBMITTED','APPROVED',  'b0000000-0000-0000-0000-000000000002', 'Marcus Vance', 'Budget verified and approved for corporate payment.'),
('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', NULL,        'SUBMITTED', 'c0000000-0000-0000-0000-000000000003', 'Alex Reyes',   'Submitted upon creation')
ON CONFLICT (id) DO NOTHING;

-- Seed Historical Reconciliation Snapshot
INSERT INTO reconciliations (
    id, department_id, department_name, category_id, category_name,
    period, fiscal_year, fiscal_month, currency,
    allocated_budget, actual_expenditure, pending_expenditure,
    variance, remaining_budget, utilization_percent,
    is_over_budget, warning_triggered, notes,
    reconciled_by, reconciled_by_name
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'dept-eng-001', 'Software Engineering', NULL, 'General Department Pool',
    'ANNUAL', 2026, NULL, 'USD',
    85000.00, 8590.00, 1120.50,
    76410.00, 76410.00, 10.11,
    FALSE, FALSE, 'Q1 Initial Budget Reconciliation - all approved expenses verified against general ledger.',
    'b0000000-0000-0000-0000-000000000002', 'Marcus Vance'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 4. VERIFICATION QUERIES (Displays seeded row counts)
-- =============================================================================
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL
SELECT 'departments', COUNT(*) FROM departments
UNION ALL
SELECT 'expense_categories', COUNT(*) FROM expense_categories
UNION ALL
SELECT 'budgets', COUNT(*) FROM budgets
UNION ALL
SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'expense_status_history', COUNT(*) FROM expense_status_history
UNION ALL
SELECT 'reconciliations', COUNT(*) FROM reconciliations;
