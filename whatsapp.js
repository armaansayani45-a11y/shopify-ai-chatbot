/**
 * WhatsApp Webhook Route (Wati Integration)
 *
 * POST /api/whatsapp
 * Receives incoming WhatsApp messages from Wati,
 * calls Claude with live Shopify data, and sends reply back.
 *
 * Set this URL as your webhook in Wati dashboard:
 *   https://your-server.railway.app/api/whatsapp
 */

const express = require('express');
const router  = express.Router();
const { chat }        = require('../utils/claude');
const { getOrders, getProducts } = require('../utils/shopify');

const WATI_API_URL = process.env.WATI_API_URL;  // e.g. https://live-server.wati.io
const WATI_TOKEN   = process.env.WATI_TOKEN;

// In-memory session store (use Redis in production)
const sessions = {};

/**
 * Send a WhatsApp message via Wati API
 */
const sendWatiMessage = async (whatsappNumber, text) => {
  if (!WATI_API_URL || !WATI_TOKEN) {
    console.warn('Wati not configured — message not sent:', text);
    return;
  }

  const url = `${WATI_API_URL}/api/v1/sendSessionMessage/${whatsappNumber}`;
  const res = await fetch(url, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${WATI_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messageText: text }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Wati send error:', err);
  }
};

/**
 * POST /api/whatsapp
 * Wati sends webhook payload like:
 * { waId: "919876543210", text: "Track my order", ... }
 */
router.post('/whatsapp', async (req, res) => {
  // Acknowledge immediately so Wati doesn't retry
  res.status(200).json({ status: 'received' });

  try {
    const body = req.body;

    // Wati webhook payload structure
    const whatsappNumber = body.waId || body.from;
    const incomingText   = body.text || body.body || body.message;

    if (!whatsappNumber || !incomingText) {
      console.warn('Invalid Wati payload:', body);
      return;
    }

    console.log(`WA [${whatsappNumber}]: ${incomingText}`);

    // Get or create session for this user
    if (!sessions[whatsappNumber]) {
      sessions[whatsappNumber] = { history: [], createdAt: Date.now() };
    }
    const session = sessions[whatsappNumber];

    // Add user message to history
    session.history.push({ role: 'user', content: incomingText });

    // Keep history to last 20 messages to control token usage
    if (session.history.length > 20) {
      session.history = session.history.slice(-20);
    }

    // Fetch live Shopify data
    let orders   = [];
    let products = [];
    try {
      [orders, products] = await Promise.all([getOrders(50), getProducts(50)]);
    } catch (err) {
      console.warn('Shopify fetch skipped:', err.message);
    }

    // Call Claude
    const storeName = process.env.STORE_NAME || 'StyleKart';
    const tone      = process.env.BOT_TONE   || 'friendly';

    const { reply } = await chat(session.history, {
      storeName,
      orders,
      products,
      tone,
    });

    // Add assistant reply to history
    session.history.push({ role: 'assistant', content: reply });

    // Send reply back via Wati
    await sendWatiMessage(whatsappNumber, reply);

    console.log(`Bot → [${whatsappNumber}]: ${reply.substring(0, 80)}...`);

    // Clean up old sessions (older than 24 hours)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [num, s] of Object.entries(sessions)) {
      if (s.createdAt < cutoff) delete sessions[num];
    }
  } catch (err) {
    console.error('WhatsApp handler error:', err.message);
  }
});

/**
 * GET /api/whatsapp/sessions
 * Debug endpoint — see active chat sessions
 */
router.get('/whatsapp/sessions', (req, res) => {
  const summary = Object.entries(sessions).map(([num, s]) => ({
    number:   num,
    messages: s.history.length,
    since:    new Date(s.createdAt).toISOString(),
  }));
  res.json({ activeSessions: summary.length, sessions: summary });
});

module.exports = router;
