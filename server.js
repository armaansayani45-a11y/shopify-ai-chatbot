/**
 * ============================================================
 *  StyleKart AI Chatbot — Backend Server
 *  Built for: Shopify + Claude AI + WhatsApp (Wati)
 * ============================================================
 *
 *  SETUP:
 *    1. npm install
 *    2. Copy .env.example to .env and fill in your keys
 *    3. node server.js
 *
 *  ENDPOINTS:
 *    POST /api/chat         — Main AI chat (website widget)
 *    GET  /api/orders       — Fetch Shopify orders
 *    GET  /api/products     — Fetch Shopify products
 *    POST /api/whatsapp     — WhatsApp webhook (Wati)
 *    GET  /health           — Health check
 * ============================================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api', require('./routes/chat'));
app.use('/api', require('./routes/shopify'));
app.use('/api', require('./routes/whatsapp'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    shopify: !!process.env.SHOPIFY_ACCESS_TOKEN,
    claude: !!process.env.ANTHROPIC_API_KEY,
    wati: !!process.env.WATI_TOKEN,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   AI Chatbot Server Running          ║
  ║   Port: ${PORT}                          ║
  ║   Health: http://localhost:${PORT}/health ║
  ╚══════════════════════════════════════╝
  `);
});
