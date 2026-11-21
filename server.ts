import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeDatabase, getDatabaseStatus } from './server/db.ts';
import { authRouter } from './server/routes/authRoutes.ts';
import { screeningRouter } from './server/routes/screeningRoutes.ts';
import { availabilityRouter } from './server/routes/availabilityRoutes.ts';
import { appointmentRouter } from './server/routes/appointmentRoutes.ts';
import { recoveryRouter } from './server/routes/recoveryRoutes.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json());

  // Initialize Database
  await initializeDatabase();

  // API Health and Database Inspection Status
  app.get('/api/health', (req: Request, res: Response) => {
    const status = getDatabaseStatus();
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'CampusCare API',
      database: status,
      tables_verified: [
        'students',
        'counsellors',
        'counsellor_availability',
        'appointments',
        'screenings',
        'password_recovery'
      ]
    });
  });

  // Mount API Routers
  app.use('/api/auth', authRouter);
  app.use('/api/screenings', screeningRouter);
  app.use('/api/availability', availabilityRouter);
  app.use('/api/appointments', appointmentRouter);
  app.use('/api/recovery', recoveryRouter);

  // Global 404 for API routes
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  // Vite middleware for dev or static serving in prod
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CampusCare] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[CampusCare Fatal] Server bootstrap failed:', err);
  process.exit(1);
});
