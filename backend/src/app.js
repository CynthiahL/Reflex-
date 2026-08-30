import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import route definitions to mount onto the router middleware tree
import authRoutes from './routes/auth.js';
import deliveryRoutes from './routes/deliveries.js';
import riderRoutes from './routes/riders.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check endpoint for deployment monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Mounted Routes in exact accordance with file layout structure
app.use('/api/auth', authRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/riders', riderRoutes);

// Catch-all route for unhandled endpoint requests
app.use((req, res, next) => {
  res.status(404).json({ error: `Method ${req.method} on route ${req.url} not found` });
});

// Global Error Handling Middleware to prevent app crashes and hide internal trace leaks
app.use((err, req, res, next) => {
  console.error(' Global Server Error:', err.stack);
  res.status(500).json({ error: 'An unexpected internal server error occurred' });
});

// Fire up listener
app.listen(PORT, () => {
  console.log(` Reflex Backend Server streaming live on http://localhost:${PORT}`);
});

export default app;
