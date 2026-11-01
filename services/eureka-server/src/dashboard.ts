import { registry } from './registry.js';
import os from 'os';

export function renderEurekaDashboard(): string {
  const instances = registry.getAll();
  const uptimeSec = registry.getUptimeSeconds();
  const uptimeStr = `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m ${uptimeSec % 60}s`;

  // Group by Application name
  const appMap = new Map<string, typeof instances>();
  for (const inst of instances) {
    const list = appMap.get(inst.app) || [];
    list.push(inst);
    appMap.set(inst.app, list);
  }

  const appRows = Array.from(appMap.entries())
    .map(([appName, instList]) => {
      const statusHtml = instList
        .map(
          (i) =>
            `<span class="badge ${i.status === 'UP' ? 'badge-success' : 'badge-danger'}"><b>${i.status}</b></span> (<a href="${i.statusPageUrl}" target="_blank">${i.instanceId}</a>)`
        )
        .join(', &nbsp;');

      return `
        <tr>
          <td><b class="app-name">${appName}</b></td>
          <td>n/a (${instList.length})</td>
          <td>(${instList.length})</td>
          <td>${statusHtml}</td>
        </tr>
      `;
    })
    .join('');

  const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
  const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
  const usedMemMb = totalMemMb - freeMemMb;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Eureka | SpendWise Microservices Registry</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --primary: #6db33f;
      --primary-dark: #5a9632;
      --bg: #f8f9fa;
      --card-bg: #ffffff;
      --text: #2c3e50;
      --border: #e9ecef;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    header {
      background: #343a40;
      color: white;
      padding: 1rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 4px solid var(--primary);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand h1 {
      font-size: 1.35rem;
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    .brand span {
      background: var(--primary);
      color: white;
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .nav-links a {
      color: #adb5bd;
      text-decoration: none;
      font-size: 0.85rem;
      margin-left: 1rem;
      transition: color 0.2s;
    }
    .nav-links a:hover {
      color: white;
    }
    .container {
      max-width: 1280px;
      margin: 1.5rem auto;
      padding: 0 1rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    .card-header {
      background: #f1f3f5;
      padding: 0.75rem 1.25rem;
      font-weight: 600;
      font-size: 0.95rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-body {
      padding: 1.25rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    th, td {
      padding: 0.65rem 0.85rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th {
      background: #fafbfc;
      font-weight: 600;
      color: #495057;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .app-name {
      color: #0366d6;
      font-family: monospace;
      font-size: 0.95rem;
    }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.45rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 3px;
    }
    .badge-success {
      background: #d4edda;
      color: #155724;
    }
    .badge-danger {
      background: #f8d7da;
      color: #721c24;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 768px) {
      .grid-2 { grid-template-columns: 1fr; }
    }
    .alert-banner {
      background: #e8f5e9;
      border-left: 4px solid var(--primary);
      padding: 0.75rem 1rem;
      margin-bottom: 1.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      color: #2e7d32;
    }
    code {
      background: #f1f3f5;
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 0.85rem;
      font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #6db33f;"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
      <h1>Spring Cloud Eureka</h1>
      <span>Service Registry</span>
    </div>
    <div class="nav-links">
      <a href="/eureka/apps" target="_blank">Raw Apps JSON (/eureka/apps)</a>
      <a href="/health" target="_blank">Health</a>
      <a href="http://localhost:5000" target="_blank">SpendWise Portal</a>
    </div>
  </header>

  <div class="container">
    <div class="alert-banner">
      ✓ <b>Eureka Service Discovery is active on port 8761</b> — Microservices in Cluster 1 (Review 2) are dynamically registered and monitored with periodic lease heartbeats.
    </div>

    <!-- Instances Table -->
    <div class="card">
      <div class="card-header">
        <span>Instances currently registered with Eureka</span>
        <small style="color: #6c757d;">Total Registered Instances: <b>${instances.length}</b></small>
      </div>
      <div class="card-body" style="padding: 0;">
        <table>
          <thead>
            <tr>
              <th style="width: 28%;">Application</th>
              <th style="width: 15%;">AMIs</th>
              <th style="width: 15%;">Availability Zones</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${appRows || '<tr><td colspan="4" style="text-align: center; color: #888; padding: 2rem;">No instances currently registered.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- System Status & General Info -->
    <div class="grid-2">
      <div class="card">
        <div class="card-header">System Status</div>
        <div class="card-body" style="padding: 0;">
          <table>
            <tbody>
              <tr><td><b>Environment</b></td><td><code>production</code></td></tr>
              <tr><td><b>Data center</b></td><td><code>default</code></td></tr>
              <tr><td><b>Current time</b></td><td>${new Date().toLocaleString()}</td></tr>
              <tr><td><b>Uptime</b></td><td>${uptimeStr}</td></tr>
              <tr><td><b>Lease expiration enabled</b></td><td><span class="badge badge-success">true</span></td></tr>
              <tr><td><b>Renews threshold</b></td><td>${instances.length * 2}</td></tr>
              <tr><td><b>Renews (last min)</b></td><td>${instances.length * 2}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">General Info & Nodes</div>
        <div class="card-body" style="padding: 0;">
          <table>
            <tbody>
              <tr><td><b>total-avail-memory</b></td><td>${totalMemMb} MB</td></tr>
              <tr><td><b>used-memory</b></td><td>${usedMemMb} MB</td></tr>
              <tr><td><b>free-memory</b></td><td>${freeMemMb} MB</td></tr>
              <tr><td><b>num-of-cpus</b></td><td>${os.cpus().length}</td></tr>
              <tr><td><b>Architecture</b></td><td><code>${os.arch()} (${os.platform()})</code></td></tr>
              <tr><td><b>Registry Protocol</b></td><td><code>Netflix Eureka REST API v2</code></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

</body>
</html>`;
}
