-- SpendWise Expense Service Schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS expense_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY,
    employee_id UUID NOT NULL,
    employee_name VARCHAR(150) NOT NULL,
    employee_email VARCHAR(255) NOT NULL,
    category_id VARCHAR(50) NOT NULL REFERENCES expense_categories(id),
    category_name VARCHAR(100) NOT NULL,
    department_id VARCHAR(50) NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    description TEXT NOT NULL,
    vendor VARCHAR(150) NOT NULL,
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    submission_date TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,
    reviewed_by_name VARCHAR(150),
    review_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_employee ON expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_department ON expenses(department_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

CREATE TABLE IF NOT EXISTS expense_status_history (
    id UUID PRIMARY KEY,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by UUID NOT NULL,
    changed_by_name VARCHAR(150) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_status_history_expense ON expense_status_history(expense_id);
