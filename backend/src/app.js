import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';

import authRoutes from './routes/auth.js';
import deliveryRoutes from './routes/deliveries.js';
import riderRoutes from './routes/riders.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================================================
   CORS
========================================================= */

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

/* =========================================================
   BODY PARSER
========================================================= */

app.use(express.json());

/* =========================================================
   HEALTH CHECK
========================================================= */

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Check backend health
 *     description: Returns the operational status of the Reflex backend.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Backend is operational.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

/* =========================================================
   SWAGGER TEST ROUTE
========================================================= */

app.get('/api-docs-test', (req, res) => {
  res.status(200).json({
    message: 'Swagger route area is reachable'
  });
});

/* =========================================================
   SWAGGER DOCUMENTATION
========================================================= */

// Startup diagnostics
console.log('Swagger spec loaded:', !!swaggerSpec);
console.log(
  'Swagger paths:',
  Object.keys(swaggerSpec.paths || {})
);

// Swagger UI
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true
  })
);

/* =========================================================
   API ROUTES
========================================================= */

app.use('/api/auth', authRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/riders', riderRoutes);

/* =========================================================
   404 CATCH-ALL
   MUST COME AFTER SWAGGER AND API ROUTES
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    error: `Method ${req.method} on route ${req.url} not found`
  });
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((err, req, res, next) => {
  console.error('Global Server Error:', err.stack);

  res.status(500).json({
    error: 'An unexpected internal server error occurred'
  });
});

/* =========================================================
   SERVER
========================================================= */

app.listen(PORT, () => {
  console.log(
    `Reflex Backend Server streaming live on http://localhost:${PORT}`
  );

  console.log(
    `Swagger UI: http://localhost:${PORT}/api-docs`
  );
});

export default app;
