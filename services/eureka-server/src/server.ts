import express from 'express';
import cors from 'cors';
import { registry } from './registry.js';
import { renderEurekaDashboard } from './dashboard.js';

export const app = express();
const PORT = 8761;

app.use(cors());
app.use(express.json());

// Eureka Web Dashboard
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderEurekaDashboard());
});

// Eureka REST API: List all apps
app.get('/eureka/apps', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(registry.getEurekaAppsJson());
});

// Eureka REST API: Get specific app
app.get('/eureka/apps/:appId', (req, res) => {
  const instances = registry.getByApp(req.params.appId);
  if (instances.length === 0) {
    return res.status(404).json({ error: 'Application not found' });
  }
  res.json({
    application: {
      name: req.params.appId.toUpperCase(),
      instance: instances,
    },
  });
});

// Eureka REST API: Register instance
app.post('/eureka/apps/:appId', (req, res) => {
  const instanceData = req.body.instance || req.body;
  const created = registry.register({
    ...instanceData,
    app: req.params.appId,
  });
  res.status(204).json(created);
});

// Eureka REST API: Heartbeat (Renew lease)
app.put('/eureka/apps/:appId/:instanceId', (req, res) => {
  const renewed = registry.renewLease(req.params.appId, req.params.instanceId);
  if (renewed) {
    res.status(200).send('OK');
  } else {
    res.status(404).send('Instance not registered');
  }
});

// Eureka REST API: Deregister
app.delete('/eureka/apps/:appId/:instanceId', (req, res) => {
  const removed = registry.deregister(req.params.instanceId);
  res.status(removed ? 200 : 404).send(removed ? 'OK' : 'Not found');
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'Eureka Server',
    status: 'UP',
    port: PORT,
    registeredInstances: registry.getAll().length,
  });
});

const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith('eureka-server/src/server.ts') ||
    process.argv[1].endsWith('eureka-server\\src\\server.ts') ||
    process.argv[1].endsWith('eureka-server/dist/server.js') ||
    process.argv[1].endsWith('eureka-server\\dist\\server.js'));

if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`[Eureka Server] Discovery Registry running at http://localhost:${PORT}`);
  });
}
