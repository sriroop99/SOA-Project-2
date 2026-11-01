import { hashPassword } from '../services/shared/src/auth-utils.js';
import { authRepo } from '../services/auth-service/src/db/auth-db.js';
import { expenseRepo } from '../services/expense-service/src/db/expense-db.js';
import { budgetRepo } from '../services/budget-service/src/db/budget-db.js';
import { calculateBudgetVariance } from '../services/shared/src/reconciliation-engine.js';

export async function runAllSeeds() {
  console.log('--- Starting SpendWise Database Seed ---');

  // 1. Departments
  const departments = [
    { id: 'dept-eng-001', code: 'ENG', name: 'Software Engineering', description: 'Core product engineering & cloud platform' },
    { id: 'dept-fin-002', code: 'FIN', name: 'Finance & Accounting', description: 'Corporate treasury, payroll & compliance' },
    { id: 'dept-mkt-003', code: 'MKT', name: 'Sales & Marketing', description: 'Growth, demand generation & client acquisition' },
    { id: 'dept-hr-004', code: 'HR', name: 'People Operations & HR', description: 'Talent recruitment, culture & compensation' },
    { id: 'dept-prd-005', code: 'PRD', name: 'Product Management & UX', description: 'Product roadmap & design systems' },
  ];

  for (const dept of departments) {
    await budgetRepo.createDepartment(dept);
  }
  console.log(`✓ Seeded ${departments.length} departments.`);

  // 2. Categories
  const categories = [
    { id: 'cat-soft-001', code: 'SOFTWARE', name: 'Cloud & Software Subscriptions', description: 'AWS, GitHub, Datadog, Figma' },
    { id: 'cat-trav-002', code: 'TRAVEL', name: 'Travel & Accommodation', description: 'Flights, hotels, client visits' },
    { id: 'cat-hard-003', code: 'HARDWARE', name: 'Hardware & Peripherals', description: 'MacBooks, monitors, office equipment' },
    { id: 'cat-meal-004', code: 'MEALS', name: 'Meals & Corporate Dining', description: 'Client entertainment, team dinners' },
    { id: 'cat-conf-005', code: 'TRAINING', name: 'Training & Conferences', description: 'Tech conferences, courses, certifications' },
  ];

  for (const cat of categories) {
    await expenseRepo.createCategory({ ...cat, isActive: true });
  }
  console.log(`✓ Seeded ${categories.length} expense categories.`);

  // 3. Demo Users
  const adminPasswordHash = await hashPassword('Admin@12345');
  const financePasswordHash = await hashPassword('Finance@12345');
  const employeePasswordHash = await hashPassword('Employee@12345');

  const users = [
    {
      email: 'admin@spendwise.corp',
      passwordHash: adminPasswordHash,
      firstName: 'Sarah',
      lastName: 'Chen',
      role: 'ADMIN' as const,
      departmentId: 'dept-eng-001',
      departmentName: 'Software Engineering',
    },
    {
      email: 'finance@spendwise.corp',
      passwordHash: financePasswordHash,
      firstName: 'Marcus',
      lastName: 'Vance',
      role: 'FINANCE_MANAGER' as const,
      departmentId: 'dept-fin-002',
      departmentName: 'Finance & Accounting',
    },
    {
      email: 'employee@spendwise.corp',
      passwordHash: employeePasswordHash,
      firstName: 'Alex',
      lastName: 'Reyes',
      role: 'EMPLOYEE' as const,
      departmentId: 'dept-eng-001',
      departmentName: 'Software Engineering',
    },
  ];

  const createdUsers: any[] = [];
  for (const u of users) {
    const existing = await authRepo.findUserByEmail(u.email);
    if (!existing) {
      const created = await authRepo.createUser(u);
      createdUsers.push(created);
    } else {
      createdUsers.push(existing);
    }
  }
  console.log(`✓ Seeded demo users: admin, finance_manager, employee.`);

  const admin = createdUsers[0];
  const finance = createdUsers[1];
  const employee = createdUsers[2];

  // 4. Budgets
  const currentYear = 2026;
  const budgets = [
    {
      departmentId: 'dept-eng-001',
      departmentName: 'Software Engineering',
      categoryId: 'cat-soft-001',
      categoryName: 'Cloud & Software Subscriptions',
      period: 'ANNUAL' as const,
      fiscalYear: currentYear,
      allocatedAmount: 60000,
      currency: 'USD' as const,
      thresholdWarningPercent: 80,
    },
    {
      departmentId: 'dept-eng-001',
      departmentName: 'Software Engineering',
      categoryId: 'cat-hard-003',
      categoryName: 'Hardware & Peripherals',
      period: 'ANNUAL' as const,
      fiscalYear: currentYear,
      allocatedAmount: 25000,
      currency: 'USD' as const,
      thresholdWarningPercent: 85,
    },
    {
      departmentId: 'dept-mkt-003',
      departmentName: 'Sales & Marketing',
      categoryId: 'cat-trav-002',
      categoryName: 'Travel & Accommodation',
      period: 'ANNUAL' as const,
      fiscalYear: currentYear,
      allocatedAmount: 35000,
      currency: 'USD' as const,
      thresholdWarningPercent: 75,
    },
    {
      departmentId: 'dept-fin-002',
      departmentName: 'Finance & Accounting',
      categoryId: 'cat-soft-001',
      categoryName: 'Cloud & Software Subscriptions',
      period: 'ANNUAL' as const,
      fiscalYear: currentYear,
      allocatedAmount: 18000,
      currency: 'USD' as const,
      thresholdWarningPercent: 80,
    },
  ];

  for (const b of budgets) {
    await budgetRepo.createBudget(b);
  }
  console.log(`✓ Seeded ${budgets.length} budgets.`);

  // 5. Realistic Expenses
  const sampleExpenses = [
    {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeEmail: employee.email,
      categoryId: 'cat-soft-001',
      categoryName: 'Cloud & Software Subscriptions',
      departmentId: 'dept-eng-001',
      departmentName: 'Software Engineering',
      amount: 4200.0,
      currency: 'USD' as const,
      description: 'AWS Production Kubernetes Cluster Hosting - Q1',
      vendor: 'Amazon Web Services',
      expenseDate: '2026-02-15',
      submitNow: true,
    },
    {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeEmail: employee.email,
      categoryId: 'cat-soft-001',
      categoryName: 'Cloud & Software Subscriptions',
      departmentId: 'dept-eng-001',
      departmentName: 'Software Engineering',
      amount: 1540.0,
      currency: 'USD' as const,
      description: 'GitHub Enterprise Tier Annual Renewal',
      vendor: 'GitHub, Inc.',
      expenseDate: '2026-02-20',
      submitNow: true,
    },
    {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeEmail: employee.email,
      categoryId: 'cat-hard-003',
      categoryName: 'Hardware & Peripherals',
      departmentId: 'dept-eng-001',
      departmentName: 'Software Engineering',
      amount: 2850.0,
      currency: 'USD' as const,
      description: 'Apple MacBook Pro M3 Max for Senior DevOps Engineer',
      vendor: 'Apple Store Online',
      expenseDate: '2026-03-01',
      submitNow: true,
    },
    {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeEmail: employee.email,
      categoryId: 'cat-trav-002',
      categoryName: 'Travel & Accommodation',
      departmentId: 'dept-eng-001',
      departmentName: 'Software Engineering',
      amount: 1120.5,
      currency: 'USD' as const,
      description: 'Flights & Hotel for KubeCon North America 2026',
      vendor: 'United Airlines & Hyatt',
      expenseDate: '2026-03-10',
      submitNow: true,
    },
    {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeEmail: employee.email,
      categoryId: 'cat-meal-004',
      categoryName: 'Meals & Corporate Dining',
      departmentId: 'dept-eng-001',
      departmentName: 'Software Engineering',
      amount: 320.0,
      currency: 'USD' as const,
      description: 'Team Dinner celebrating SOA Microservices Milestone',
      vendor: 'The Capital Grille',
      expenseDate: '2026-03-15',
      submitNow: false, // Remains DRAFT
    },
  ];

  for (let i = 0; i < sampleExpenses.length; i++) {
    const exp = await expenseRepo.createExpense(sampleExpenses[i]);
    // Approve the first 3 expenses to provide actual expenditure for reconciliation
    if (i < 3) {
      await expenseRepo.reviewExpense(
        exp.id,
        { id: finance.id, name: `${finance.firstName} ${finance.lastName}` },
        { status: 'APPROVED', comments: 'Budget verified and approved for corporate payment.' }
      );
    }
  }
  console.log(`✓ Seeded ${sampleExpenses.length} sample expenses in various statuses.`);

  // 6. Historical Reconciliation
  const engApprovedExpenses = await expenseRepo.listExpenses({
    departmentId: 'dept-eng-001',
    status: 'APPROVED',
  });
  const actualEng = engApprovedExpenses.items.reduce((sum, e) => sum + e.amount, 0);
  const engBudget = 85000;
  const calc = calculateBudgetVariance(engBudget, actualEng, 1120.5, 80);

  await budgetRepo.saveReconciliation({
    departmentId: 'dept-eng-001',
    departmentName: 'Software Engineering',
    period: 'ANNUAL',
    fiscalYear: 2026,
    currency: 'USD',
    allocatedBudget: calc.allocatedBudget,
    actualExpenditure: calc.actualExpenditure,
    pendingExpenditure: calc.pendingExpenditure,
    variance: calc.variance,
    remainingBudget: calc.remainingBudget,
    utilizationPercent: calc.utilizationPercent,
    isOverBudget: calc.isOverBudget,
    warningTriggered: calc.warningTriggered,
    notes: 'Q1 Initial Budget Reconciliation - all approved expenses verified against general ledger.',
    reconciledBy: finance.id,
    reconciledByName: `${finance.firstName} ${finance.lastName}`,
  });
  console.log(`✓ Seeded historical reconciliation snapshot.`);

  console.log('--- Database Seed Complete! ---');
}

const isCliRun = process.argv[1] && (
  process.argv[1].endsWith('seed-all.ts') ||
  process.argv[1].endsWith('seed-all.js')
);

if (isCliRun) {
  runAllSeeds().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}
