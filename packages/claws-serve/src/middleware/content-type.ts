import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Extract the media type from a Content-Type header, ignoring parameters
 * like charset. Returns the trimmed, lowercased media type.
 */
function parseMediaType(header: string): string {
  const semi = header.indexOf(';');
  const raw = semi === -1 ? header : header.slice(0, semi);
  return raw.trim().toLowerCase();
}

export function contentType(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ct = req.headers['content-type'];
    if (ct === undefined || parseMediaType(ct) !== 'application/json') {
      res.status(415).json({ error: 'Unsupported Media Type' });
      return;
    }
    next();
  };
}
