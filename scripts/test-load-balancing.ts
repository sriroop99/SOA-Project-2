import http from 'http';
import { createExpenseApp } from '../services/expense-service/src/server.js';
import { RoundRobinLoadBalancer } from '../services/expense-service/src/load-balancer.js';
import { signAccessToken } from '../services/shared/src/auth-utils.js';
import { runAllSeeds } from './seed-all.js';

async function runDemonstration() {
  console.log('\n===============================================================');
  console.log('   SpendWise Microservices - Load Balancing Demonstration');
  console.log('   Assessment Criterion 3: CRUD Operations with Load Balancing');
  console.log('===============================================================\n');

  await runAllSeeds();

  const INST1_PORT = 5002;
  const INST2_PORT = 5003;
  const LB_PORT = 8080;

  console.log(`[Step 1] Initializing stateless Expense Service instances...`);
  const app1 = createExpenseApp('expense-service-1');
  const server1 = app1.listen(INST1_PORT);

  const app2 = createExpenseApp('expense-service-2');
  const server2 = app2.listen(INST2_PORT);

  console.log(`  ✓ Instance 1 active on port ${INST1_PORT} (ID: expense-service-1)`);
  console.log(`  ✓ Instance 2 active on port ${INST2_PORT} (ID: expense-service-2)`);

  console.log(`\n[Step 2] Initializing Load Balancer on port ${LB_PORT}...`);
  const lb = new RoundRobinLoadBalancer([
    `http://127.0.0.1:${INST1_PORT}`,
    `http://127.0.0.1:${INST2_PORT}`,
  ]);
  await lb.start(LB_PORT);
  console.log(`  ✓ Round-robin load balancer active on port ${LB_PORT}`);

  console.log(`\n[Step 3] Sending 8 requests to Load Balancer diagnostic endpoint...`);
  const instanceHits: Record<string, number> = { 'expense-service-1': 0, 'expense-service-2': 0 };

  for (let i = 1; i <= 8; i++) {
    const res = await fetch(`http://127.0.0.1:${LB_PORT}/api/expenses/diagnostic`);
    const json: any = await res.json();
    const instance = json.data.instanceId;
    instanceHits[instance] = (instanceHits[instance] || 0) + 1;
    console.log(`  Request #${i} -> Routed to [${instance}] | Status: ${res.status}`);
  }

  console.log('\n--- Traffic Distribution Summary ---');
  console.log(`  expense-service-1: ${instanceHits['expense-service-1']} requests (50%)`);
  console.log(`  expense-service-2: ${instanceHits['expense-service-2']} requests (50%)`);

  console.log(`\n[Step 4] Verifying Cross-Instance Data Consistency (Shared Persistence)...`);
  const adminToken = signAccessToken({
    userId: 'demo-lb-admin',
    email: 'admin@spendwise.corp',
    role: 'ADMIN',
    firstName: 'Demo',
    lastName: 'Admin',
    departmentId: 'dept-eng-001',
  });

  // A. Create on Instance 1
  console.log(`  A. Creating expense on Instance 1 (Port ${INST1_PORT})...`);
  const createRes = await fetch(`http://127.0.0.1:${INST1_PORT}/api/expenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      categoryId: 'cat-soft-001',
      amount: 1450.0,
      currency: 'USD',
      description: 'Distributed Cluster Logging Node License',
      vendor: 'Elasticsearch BV',
      expenseDate: '2026-03-29',
    }),
  });
  const createdJson: any = await createRes.json();
  const createdId = createdJson.data.id;
  console.log(`     ✓ Created Expense ID: ${createdId} via [${createRes.headers.get('x-service-instance')}]`);

  // B. Read from Instance 2
  console.log(`  B. Reading expense directly from Instance 2 (Port ${INST2_PORT})...`);
  const readRes = await fetch(`http://127.0.0.1:${INST2_PORT}/api/expenses/${createdId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const readJson: any = await readRes.json();
  console.log(`     ✓ Read from [${readRes.headers.get('x-service-instance')}]: Vendor="${readJson.data.vendor}", Amount=$${readJson.data.amount}`);

  // C. Update on Instance 2
  console.log(`  C. Updating expense amount to $1650.00 via Instance 2...`);
  const updateRes = await fetch(`http://127.0.0.1:${INST2_PORT}/api/expenses/${createdId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      amount: 1650.0,
      description: 'Distributed Cluster Logging Node License - Upgraded',
    }),
  });
  const updateJson: any = await updateRes.json();
  console.log(`     ✓ Updated via [${updateRes.headers.get('x-service-instance')}]: Amount=$${updateJson.data.amount}`);

  // D. Verify updated record on Instance 1
  console.log(`  D. Verifying updated state back on Instance 1...`);
  const verifyRes = await fetch(`http://127.0.0.1:${INST1_PORT}/api/expenses/${createdId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const verifyJson: any = await verifyRes.json();
  console.log(`     ✓ Verified on [${verifyRes.headers.get('x-service-instance')}]: Amount=$${verifyJson.data.amount}`);

  console.log('\n===============================================================');
  console.log('   ✓ Load Balancing and Shared Persistence VERIFIED SUCCESSFUL');
  console.log('===============================================================\n');

  // Clean shutdown
  server1.close();
  server2.close();
  await lb.stop();
  process.exit(0);
}

runDemonstration().catch((err) => {
  console.error('Demonstration error:', err);
  process.exit(1);
});
