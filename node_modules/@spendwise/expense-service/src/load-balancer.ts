import http from 'http';
import { URL } from 'url';

export interface UpstreamServer {
  target: string;
  isAlive: boolean;
  failCount: number;
}

export class RoundRobinLoadBalancer {
  private upstreams: UpstreamServer[];
  private currentIndex = 0;
  private server: http.Server | null = null;

  constructor(targets: string[]) {
    this.upstreams = targets.map((target) => ({
      target,
      isAlive: true,
      failCount: 0,
    }));
  }

  public getNextUpstream(): UpstreamServer | null {
    const healthy = this.upstreams.filter((u) => u.isAlive);
    if (healthy.length === 0) return null;

    const selected = healthy[this.currentIndex % healthy.length];
    this.currentIndex = (this.currentIndex + 1) % healthy.length;
    return selected;
  }

  public start(port: number = 8080): Promise<http.Server> {
    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        // Handle balancer health check
        if (req.url === '/health' || req.url === '/lb-status') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'HEALTHY',
              balancer: 'RoundRobinLoadBalancer',
              upstreams: this.upstreams,
              nextIndex: this.currentIndex,
              timestamp: new Date().toISOString(),
            })
          );
          return;
        }

        const upstream = this.getNextUpstream();
        if (!upstream) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              error: { code: 'ALL_UPSTREAMS_DOWN', message: 'No healthy expense service instances available' },
            })
          );
          return;
        }

        const upstreamUrl = new URL(req.url || '/', upstream.target);
        const headers = { ...req.headers, host: upstreamUrl.host };

        const proxyReq = http.request(
          upstreamUrl.toString(),
          {
            method: req.method,
            headers,
            timeout: 5000,
          },
          (proxyRes) => {
            // Forward headers including X-Service-Instance
            const responseHeaders = {
              ...proxyRes.headers,
              'X-Load-Balancer': 'SpendWise-Round-Robin-Proxy',
              'X-Routed-Upstream': upstream.target,
            };
            res.writeHead(proxyRes.statusCode || 200, responseHeaders);
            proxyRes.pipe(res);
          }
        );

        proxyReq.on('error', (err) => {
          console.error(`[LoadBalancer] Error contacting ${upstream.target}:`, err.message);
          upstream.failCount++;
          if (upstream.failCount >= 3) {
            upstream.isAlive = false;
          }
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              error: { code: 'BAD_GATEWAY', message: `Upstream error contacting ${upstream.target}` },
            })
          );
        });

        proxyReq.on('timeout', () => {
          proxyReq.destroy();
          res.writeHead(504, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              error: { code: 'GATEWAY_TIMEOUT', message: 'Upstream connection timed out' },
            })
          );
        });

        req.pipe(proxyReq);
      });

      this.server.listen(port, () => {
        console.log(`[LoadBalancer] Listening on port ${port}, distributing traffic across:`, this.upstreams.map((u) => u.target));
        resolve(this.server!);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

if (process.argv[1]?.includes('load-balancer')) {
  const lb = new RoundRobinLoadBalancer(['http://127.0.0.1:5002', 'http://127.0.0.1:5003']);
  lb.start(8080);
}
