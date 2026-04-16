import type { Request, Response, NextFunction, RequestHandler } from 'express';

const DEFAULT_MAX_BYTES = 1_048_576; // 1 MB

export function bodyLimit(maxBytes: number = DEFAULT_MAX_BYTES): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Reject immediately based on Content-Length header before any buffering
    const contentLength = req.headers['content-length'];
    if (contentLength !== undefined) {
      const declared = parseInt(contentLength, 10);
      if (!Number.isNaN(declared) && declared > maxBytes) {
        res.status(413).json({ error: 'Payload Too Large' });
        return;
      }
    }

    // Require Content-Length on requests with a body (POST, PUT, PATCH)
    // to prevent bypass via chunked transfer without declared size
    const method = req.method?.toUpperCase();
    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && contentLength === undefined) {
      res.status(411).json({ error: 'Length Required' });
      return;
    }

    next();
  };
}
