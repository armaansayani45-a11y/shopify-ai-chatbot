const express = require('express');
const router  = express.Router();
const { chat } = require('../utils/claude');
const { getOrders, getProducts } = require('../utils/shopify');

const sessions = {};

const sendWatiMessage = async (number, text) => {
  if (!process.env.WATI_API_URL || !process.env.WATI_TOKEN) return;
  await fetch(`${process.env.WATI_API_URL}/api/v1/sendSessionMessage/${number}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WATI_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageText: text }),
  });
};

router.post('/whatsapp', async (req, res) => {
  res.status(200).json({ status: 'received' });
  try {
    const whatsappNumber = req.body.waId || req.body.from;
    const incomingText   = req.body.text || req.body.body || req.body.message;
    if (!whatsappNumber || !incomingText) return;

    if (!sessions[whatsappNumber]) sessions[whatsappNumber] = { history: [], createdAt: Date.now() };
    const session = sessions[whatsappNumber];
    session.history.push({ role: 'user', content: incomingText });
    if (session.history.length > 20) session.history = session.history.slice(-20);

    let orders = [], products = [];
    try { [orders, products] = await Promise.all([getOrders(50), getProducts(50)]); } catch(e) {}

    const { reply } = await chat(session.history, {
      storeName: process.env.STORE_NAME || 'StyleKart',
      tone: process.env.BOT_TONE || 'friendly',
      orders, products,
    });

    session.history.push({ role: 'assistant', content: reply });
    await sendWatiMessage(whatsappNumber, reply);
  } catch (err) {
    console.error('WhatsApp error:', err.message);
  }
});

router.get('/whatsapp/sessions', (req, res) => {
  res.json({ activeSessions: Object.keys(sessions).length });
});

module.exports = router;
