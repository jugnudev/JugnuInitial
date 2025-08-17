import { Request, Response, NextFunction } from 'express';

export function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const key = req.header('x-admin-key') || '';
  
  if (!key) {
    console.log(`[Admin Auth] Missing admin key for route: ${req.path}`);
    return res.status(401).json({ ok: false, error: 'Missing admin key' });
  }
  
  const validKey = process.env.ADMIN_PASSWORD || 'jugnu1401';
  
  if (key !== validKey) {
    console.log(`[Admin Auth] Invalid admin key for route: ${req.path}`);
    return res.status(403).json({ ok: false, error: 'Invalid admin key' });
  }
  
  return next();
}