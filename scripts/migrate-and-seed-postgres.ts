import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { hashPassword } from '../services/shared/src/auth-utils.js';

async function migrateAndSeedPostgres() {
  console.log('--- SpendWise PostgreSQL Migration & Seed Tool ---');

  const host = process.env.PGHOST || 'localhost';
  const port = parseInt(process.env.PGPORT || '5432', 10);
  const user = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || 'postgres';
  const dbName = 'spendwise';

  console.log(`Connecting to PostgreSQL host ${host}:${port} as user '${user}'...`);

  // Step 1: Connect to maintenance db to ensure 'spendwise' database exists
  const rootClient = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });

  try {
    await rootClient.connect();
    console.log('✓ Successfully connected to PostgreSQL server.');

    const checkDb = await rootClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (checkDb.rowCount === 0) {
      console.log(`Creating database '${dbName}'...`);
      await rootClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✓ Database '${dbName}' created.`);
    } else {
      console.log(`✓ Database '${dbName}' already exists.`);
    }
  } catch (err: any) {
    console.error('Failed to connect to PostgreSQL maintenance database:', err.message);
    console.error('Make sure PostgreSQL 17 Windows service is running on port 5432.');
    process.exit(1);
  } finally {
    await rootClient.end();
  }

  // Step 2: Connect to 'spendwise' database and run DDL migrations
  const appClient = new Client({
    host,
    port,
    user,
    password,
    database: dbName,
  });

  try {
    await appClient.connect();
    console.log(`Applying DDL schema migrations to database '${dbName}'...`);

    const migrationsDir = path.resolve(process.cwd(), 'database', 'migrations');
    const migrationFiles = ['01_auth_schema.sql', '02_expenses_schema.sql', '03_budgets_schema.sql'];

    for (const file of migrationFiles) {
      const sqlPath = path.join(migrationsDir, file);
      if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, 'utf-8');
        await appClient.query(sql);
        console.log(`  ✓ Applied migration: ${file}`);
      }
    }

    // Step 3: Insert seed records if empty
    console.log('Seeding initial records into PostgreSQL tables...');

    // A. Departments
    const depts = [
      ['dept-eng-001', 'ENG', 'Software Engineering', 'Core product engineering & cloud platform'],
      ['dept-fin-002', 'FIN', 'Finance & Accounting', 'Corporate treasury, payroll & compliance'],
      ['dept-mkt-003', 'MKT', 'Sales & Marketing', 'Growth, demand generation & client acquisition'],
      ['dept-hr-004', 'HR', 'People Operations & HR', 'Talent recruitment, culture & compensation'],
      ['dept-prd-005', 'PRD', 'Product Management & UX', 'Product roadmap & design systems'],
    ];
    for (const d of depts) {
      await appClient.query(
        `INSERT INTO departments (id, code, name, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        d
      );
    }
    console.log('  ✓ Seeded departments table.');

    // B. Expense Categories
    const categories = [
      ['cat-soft-001', 'Cloud & Software Subscriptions', 'SOFTWARE', 'AWS, GitHub, Datadog, Figma', true],
      ['cat-trav-002', 'Travel & Accommodation', 'TRAVEL', 'Flights, hotels, client visits', true],
      ['cat-hard-003', 'Hardware & Peripherals', 'HARDWARE', 'MacBooks, monitors, office equipment', true],
      ['cat-meal-004', 'Meals & Corporate Dining', 'MEALS', 'Client entertainment, team dinners', true],
      ['cat-conf-005', 'Training & Conferences', 'TRAINING', 'Tech conferences, courses, certifications', true],
    ];
    for (const c of categories) {
      await appClient.query(
        `INSERT INTO expense_categories (id, name, code, description, is_active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        c
      );
    }
    console.log('  ✓ Seeded expense_categories table.');

    // C. Users
    const adminHash = await hashPassword('Admin@12345');
    const finHash = await hashPassword('Finance@12345');
    const empHash = await hashPassword('Employee@12345');

    const users = [
      ['a0000000-0000-0000-0000-000000000001', 'admin@spendwise.corp', adminHash, 'Sarah', 'Chen', 'ADMIN', 'Software Engineering'],
      ['b0000000-0000-0000-0000-000000000002', 'finance@spendwise.corp', finHash, 'Marcus', 'Vance', 'FINANCE_MANAGER', 'Finance & Accounting'],
      ['c0000000-0000-0000-0000-000000000003', 'employee@spendwise.corp', empHash, 'Alex', 'Reyes', 'EMPLOYEE', 'Software Engineering'],
    ];

    for (const u of users) {
      await appClient.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role, department_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        u
      );
    }
    console.log('  ✓ Seeded users table (admin, finance_manager, employee).');

    // D. Budgets
    const budgets = [
      ['d0000000-0000-0000-0000-000000000001', 'dept-eng-001', 'Software Engineering', 'cat-soft-001', 'Cloud & Software Subscriptions', 'ANNUAL', 2026, null, 60000.0, 'USD', 80.0],
      ['d0000000-0000-0000-0000-000000000002', 'dept-eng-001', 'Software Engineering', 'cat-hard-003', 'Hardware & Peripherals', 'ANNUAL', 2026, null, 25000.0, 'USD', 85.0],
      ['d0000000-0000-0000-0000-000000000003', 'dept-mkt-003', 'Sales & Marketing', 'cat-trav-002', 'Travel & Accommodation', 'ANNUAL', 2026, null, 35000.0, 'USD', 75.0],
    ];

    for (const b of budgets) {
      await appClient.query(
        `INSERT INTO budgets (id, department_id, department_name, category_id, category_name, period, fiscal_year, fiscal_month, allocated_amount, currency, threshold_warning_percent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        b
      );
    }
    console.log('  ✓ Seeded budgets table.');

    // E. Sample Expenses
    const expenses = [
      [
        'e0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000003',
        'Alex Reyes',
        'employee@spendwise.corp',
        'cat-soft-001',
        'Cloud & Software Subscriptions',
        'dept-eng-001',
        'Software Engineering',
        4200.0,
        'USD',
        'AWS Production Kubernetes Hosting - Q1',
        'Amazon Web Services',
        '2026-02-15',
        'APPROVED',
        'b0000000-0000-0000-0000-000000000002',
        'Marcus Vance',
      ],
      [
        'e0000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000003',
        'Alex Reyes',
        'employee@spendwise.corp',
        'cat-soft-001',
        'Cloud & Software Subscriptions',
        'dept-eng-001',
        'Software Engineering',
        1540.0,
        'USD',
        'GitHub Enterprise Renewal',
        'GitHub, Inc.',
        '2026-02-20',
        'APPROVED',
        'b0000000-0000-0000-0000-000000000002',
        'Marcus Vance',
      ],
      [
        'e0000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000003',
        'Alex Reyes',
        'employee@spendwise.corp',
        'cat-meal-004',
        'Meals & Corporate Dining',
        'dept-eng-001',
        'Software Engineering',
        320.0,
        'USD',
        'Team Dinner celebrating SOA Microservices Milestone',
        'The Capital Grille',
        '2026-03-15',
        'DRAFT',
        null,
        null,
      ],
    ];

    for (const exp of expenses) {
      await appClient.query(
        `INSERT INTO expenses (id, employee_id, employee_name, employee_email, category_id, category_name, department_id, department_name, amount, currency, description, vendor, expense_date, status, reviewed_by, reviewed_by_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO NOTHING`,
        exp
      );
    }
    console.log('  ✓ Seeded expenses table.');

    console.log('\n--- PostgreSQL Database is Ready for pgAdmin 4! ---');
  } catch (err: any) {
    console.error('Error migrating/seeding spendwise database:', err.message);
  } finally {
    await appClient.end();
  }
}

migrateAndSeedPostgres();
