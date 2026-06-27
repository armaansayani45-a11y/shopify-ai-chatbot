/**
 * POST /api/chat
 * Main AI chat endpoint for the website/app chatbot widget
 *
 * Body: {
 *   messages:  [{role: "user"|"assistant", content: string}],
 *   storeName: string (optional, default from .env),
 *   tone:      "friendly"|"professional"|"hinglish"|"sales" (optional)
 * }
 */

const express = require('express');
const router  = express.Router();
const { chat }        = require('../utils/claude');
const { getOrders, getProducts } = require('../utils/shopify');

router.post('/chat', async (req, res) => {
  try {
    const {
      messages  = [],
      storeName = process.env.STORE_NAME || 'StyleKart',
      tone      = 'friendly',
    } = req.body;

    if (!messages.length) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Fetch live Shopify data in parallel
    let orders   = [];
    let products = [];

    try {
      [orders, products] = await Promise.all([getOrders(50), getProducts(50)]);
    } catch (shopifyErr) {
      // If Shopify isn't connected, continue with empty data
      console.warn('Shopify fetch skipped:', shopifyErr.message);
    }

    const { reply, tokensUsed } = await chat(messages, {
      storeName,
      orders,
      products,
      tone,
    });

    res.json({ reply, tokensUsed });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
