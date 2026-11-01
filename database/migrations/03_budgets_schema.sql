-- SpendWise Budget and Reconciliation Service Schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    manager_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY,
    department_id VARCHAR(50) NOT NULL REFERENCES departments(id),
    department_name VARCHAR(100) NOT NULL,
    category_id VARCHAR(50),
    category_name VARCHAR(100),
    period VARCHAR(20) NOT NULL DEFAULT 'ANNUAL',
    fiscal_year INT NOT NULL,
    fiscal_month INT,
    allocated_amount NUMERIC(14, 2) NOT NULL CHECK (allocated_amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    threshold_warning_percent NUMERIC(5, 2) NOT NULL DEFAULT 80.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_budget_period UNIQUE (department_id, category_id, period, fiscal_year, fiscal_month)
);

CREATE INDEX IF NOT EXISTS idx_budgets_dept_year ON budgets(department_id, fiscal_year);

CREATE TABLE IF NOT EXISTS reconciliations (
    id UUID PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_reconciliations_dept ON reconciliations(department_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_period ON reconciliations(fiscal_year, fiscal_month);
