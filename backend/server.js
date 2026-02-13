import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import db from './database.js';
import transactionRoutes from './routes/transactions.js';
import budgetRoutes from './routes/budget.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/budget', budgetRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback - serve index.html for all non-API routes
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// Avvia server
async function start() {
  // Inizializza database
  await db.init();
  console.log('✅ Database inizializzato');

  app.listen(PORT, () => {
    console.log(`
  ╔════════════════════════════════════════╗
  ║     💰 BUDGET APP - Backend            ║
  ╠════════════════════════════════════════╣
  ║  Server attivo su:                     ║
  ║  http://localhost:${PORT}                 ║
  ╚════════════════════════════════════════╝
    `);
  });
}

start();
