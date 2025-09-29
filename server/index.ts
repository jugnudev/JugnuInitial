import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startChatServer } from "./communities/chat-server";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files
app.use('/uploads', express.static('public/uploads'));

// Session middleware for admin authentication
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // API fallback guardrail - ensure no /api/* route returns index.html
  app.use('/api/*', (req, res) => {
    res.set('Content-Type', 'application/json');
    res.status(404).json({
      ok: false,
      error: 'Not found'
    });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development" && process.env.SKIP_VITE !== "true") {
    await setupVite(app, server);
  } else {
    // Production: Add HTTPS redirect middleware
    app.use((req, res, next) => {
      const proto = String(req.headers['x-forwarded-proto'] || '');
      if (process.env.NODE_ENV === 'production' && proto && proto !== 'https') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      next();
    });

    // Production: Serve static files and handle SPA routing
    // Check for the actual build output location: dist/public
    const path = await import('path');
    const fs = await import('fs');
    const distPublicPath = path.resolve(import.meta.dirname, '..', 'dist', 'public');
    const publicPath = path.resolve(import.meta.dirname, 'public');
    
    const staticPath = fs.existsSync(distPublicPath) ? distPublicPath : publicPath;
    
    if (fs.existsSync(staticPath)) {
      // Serve static assets
      app.use(express.static(staticPath));
      
      // Explicit SPA fallbacks for client-side routes
      const indexHtml = path.resolve(staticPath, 'index.html');
      
      // Handle specific client-side routes that need SPA fallback
      app.get(['/onboard/*', '/portal/*', '/sponsor/*', '/admin/*', '/waitlist', '/events/*'], (_req, res) => {
        res.sendFile(indexHtml);
      });
      
      // Final catch-all for any other non-API routes
      app.get('*', (_req, res) => {
        res.sendFile(indexHtml);
      });
    } else {
      // Fallback to original serveStatic if our custom setup fails
      serveStatic(app);
    }
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start WebSocket chat server with careful configuration
    try {
      startChatServer(server);
      log(`✅ WebSocket chat server started successfully`);
    } catch (error) {
      console.error('❌ Failed to start WebSocket server:', error);
    }
  });
})();
