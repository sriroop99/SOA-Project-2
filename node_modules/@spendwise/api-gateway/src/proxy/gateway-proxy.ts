import http from 'http';
import { URL } from 'url';
import { Request, Response } from 'express';
import { makeErrorResponse } from '@spendwise/shared';

export function createServiceProxy(targetBaseUrl: string) {
  return (req: Request, res: Response) => {
    const targetUrl = new URL(req.originalUrl, targetBaseUrl);

    // Forward original headers with custom forwarding additions
    const headers: http.OutgoingHttpHeaders = { ...req.headers };
    headers.host = targetUrl.host;

    // Attach gateway identification header
    headers['x-forwarded-by'] = 'SpendWise-API-Gateway';

    const proxyReq = http.request(
      targetUrl.toString(),
      {
        method: req.method,
        headers,
        timeout: 10000,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      console.error(`[API Gateway] Upstream error contacting ${targetBaseUrl}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json(
          makeErrorResponse(
            'BAD_GATEWAY',
            `API Gateway failed to reach upstream microservice at ${targetBaseUrl}`,
            { details: err.message }
          )
        );
      }
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json(
          makeErrorResponse(
            'GATEWAY_TIMEOUT',
            `API Gateway request to upstream service at ${targetBaseUrl} timed out`
          )
        );
      }
    });

    req.pipe(proxyReq);
  };
}
