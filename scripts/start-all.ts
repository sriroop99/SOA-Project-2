import { runAllSeeds } from './seed-all.js';
import { app as gatewayApp } from '../services/api-gateway/src/server.js';
import { app as authApp } from '../services/auth-service/src/server.js';
import { createExpenseApp } from '../services/expense-service/src/server.js';
import { RoundRobinLoadBalancer } from '../services/expense-service/src/load-balancer.js';
import { app as budgetApp } from '../services/budget-service/src/server.js';
import { app as analyticsApp } from '../services/analytics-service/src/server.js';
import { app as eurekaApp } from '../services/eureka-server/src/server.js';
import { registry as eurekaRegistry } from '../services/eureka-server/src/registry.js';

async function bootstrap() {
  console.log('===============================================================');
  console.log('   SpendWise — Corporate Financial Expense Analytics');
  console.log('   SOA Programming & Microservices — Cluster 1 Review 2');
  console.log('===============================================================\n');

  // 1. Seed persistent data
  await runAllSeeds();

  // 2. Start Services
  const EUREKA_PORT = 8761;
  const AUTH_PORT = 5001;
  const EXP1_PORT = 5002;
  const EXP2_PORT = 5003;
  const LB_PORT = 8080;
  const BUDGET_PORT = 5004;
  const ANALYTICS_PORT = 5005;
  const GATEWAY_PORT = 5000;

  // Start Eureka Service Registry first
  eurekaApp.listen(EUREKA_PORT, () => {
    console.log(`✓ [Eureka Service Registry]   -> http://localhost:${EUREKA_PORT}`);
  });

  authApp.listen(AUTH_PORT, () => {
    console.log(`✓ [Auth Service]               -> http://localhost:${AUTH_PORT}`);
  });

  const app1 = createExpenseApp('expense-service-1');
  app1.listen(EXP1_PORT, () => {
    console.log(`✓ [Expense Service Instance 1] -> http://localhost:${EXP1_PORT}`);
  });

  const app2 = createExpenseApp('expense-service-2');
  app2.listen(EXP2_PORT, () => {
    console.log(`✓ [Expense Service Instance 2] -> http://localhost:${EXP2_PORT}`);
  });

  const lb = new RoundRobinLoadBalancer([
    `http://127.0.0.1:${EXP1_PORT}`,
    `http://127.0.0.1:${EXP2_PORT}`,
  ]);
  await lb.start(LB_PORT);
  console.log(`✓ [Expense Load Balancer]      -> http://localhost:${LB_PORT} (Round-Robin)`);

  budgetApp.listen(BUDGET_PORT, () => {
    console.log(`✓ [Budget & Reconciliation]    -> http://localhost:${BUDGET_PORT}`);
  });

  analyticsApp.listen(ANALYTICS_PORT, () => {
    console.log(`✓ [Analytics & Reporting]      -> http://localhost:${ANALYTICS_PORT}`);
  });

  // Register all nodes with Eureka Service Discovery
  eurekaRegistry.register({ app: 'API-GATEWAY', instanceId: 'api-gateway:5000', port: GATEWAY_PORT });
  eurekaRegistry.register({ app: 'AUTH-SERVICE', instanceId: 'auth-service:5001', port: AUTH_PORT });
  eurekaRegistry.register({ app: 'EXPENSE-SERVICE', instanceId: 'expense-service-1:5002', port: EXP1_PORT });
  eurekaRegistry.register({ app: 'EXPENSE-SERVICE', instanceId: 'expense-service-2:5003', port: EXP2_PORT });
  eurekaRegistry.register({ app: 'EXPENSE-LOAD-BALANCER', instanceId: 'load-balancer:8080', port: LB_PORT });
  eurekaRegistry.register({ app: 'BUDGET-SERVICE', instanceId: 'budget-service:5004', port: BUDGET_PORT });
  eurekaRegistry.register({ app: 'ANALYTICS-SERVICE', instanceId: 'analytics-service:5005', port: ANALYTICS_PORT });

  gatewayApp.listen(GATEWAY_PORT, () => {
    console.log(`✓ [API Gateway & Web Portal]   -> http://localhost:${GATEWAY_PORT}`);
    console.log('\n===============================================================');
    console.log(' All SpendWise Microservices cluster nodes are online & healthy!');
    console.log(' Eureka Service Registry:     http://localhost:8761');
    console.log(' Web Portal & API Gateway:     http://localhost:5000');
    console.log(' Vite Dev Server (if running): http://localhost:3000');
    console.log(' Load Balancer (Round-Robin):  http://localhost:8080');
    console.log('===============================================================\n');
  });
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrapping error:', err);
  process.exit(1);
});
