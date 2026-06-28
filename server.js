/**
 * AI Chatbot Server — Single File Version
 * No folders needed! Everything in one file.
 * 
 * SETUP:
 * 1. Upload ONLY this file + package.json to GitHub
 * 2. Add environment variables in Render dashboard
 * 3. Deploy!
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const app     = express();
const PORT    = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────
// SHOPIFY HELPER
// ─────────────────────────────────────────
const shopifyFetch = async (endpoint) => {
  const domain = process.env.SHOPIFY_DOMAIN;
  const token  = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!domain || !token) throw new Error('Shopify credentials not set');
  const res = await fetch(`https://${domain}/admin/api/2024-01/${endpoint}`, {
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error(`Shopify error: ${res.status}`);
  return res.json();
};

const getOrders = async (limit = 50) => {
  const data = await shopifyFetch(`orders.json?status=any&limit=${limit}`);
  return data.orders.map(o => ({
    name:        o.name,
    customer:    o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : 'Guest',
    email:       o.email,
    totalPrice:  o.total_price,
    fulfillment: o.fulfillment_status || 'unfulfilled',
    items:       (o.line_items || []).map(i => i.title).join(', '),
    tracking:    o.fulfillments?.[0]?.tracking_number || 'N/A',
  }));
};

const getProducts = async (limit = 50) => {
  const data = await shopifyFetch(`products.json?limit=${limit}`);
  return data.products.map(p => ({
    title: p.title,
    price: p.variants?.[0]?.price || '0',
    stock: p.variants?.[0]?.inventory_quantity || 0,
    sku:   p.variants?.[0]?.sku || 'N/A',
  }));
};

// ─────────────────────────────────────────
// CLAUDE AI HELPER
// ─────────────────────────────────────────
const buildPrompt = ({ storeName, orders, products, tone }) => {
  const tones = {
    friendly:     'You are a warm, helpful WhatsApp support agent.',
    professional: 'You are a professional customer support representative.',
    hinglish:     'You are a helpful agent who speaks in Hinglish (mix of Hindi and English). Example: "Haan bilkul! Main aapka order check karta hoon 😊"',
    sales:        'You are an enthusiastic sales agent focused on helping customers buy.',
  };

  const orderText   = orders.length
    ? orders.slice(0, 20).map(o => `• ${o.name} | ${o.customer} | ₹${o.totalPrice} | ${o.fulfillment} | Tracking: ${o.tracking} | Items: ${o.items}`).join('\n')
    : 'No orders available';

  const productText = products.length
    ? products.slice(0, 20).map(p => `• ${p.title} | ₹${p.price} | Stock: ${p.stock}`).join('\n')
    : 'No products available';

  return `${tones[tone] || tones.friendly} You work for ${storeName}, an Indian e-commerce brand.

LIVE ORDERS:
${orderText}

LIVE PRODUCTS:
${productText}

STORE POLICIES:
• Returns: Free within 7 days
• Refunds: 3-5 business days
• Free shipping on orders above ₹999
• COD available above ₹299

INSTRUCTIONS:
• Keep replies SHORT — 2-4 lines max, WhatsApp style
• Use emojis naturally
• Look up order details from the list above when customer asks
• Always offer a helpful next step`;
};

const callClaude = async (messages, storeData) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 1000,
      system:     buildPrompt(storeData),
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Claude error: ${err.error?.message || res.statusText}`);
  }

  const data  = await res.json();
  const reply = data.content.map(b => b.text || '').join('');
  return { reply, tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) };
};

// ─────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    shopify:   !!process.env.SHOPIFY_ACCESS_TOKEN,
    claude:    !!process.env.ANTHROPIC_API_KEY,
    wati:      !!process.env.WATI_TOKEN,
  });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], storeName = process.env.STORE_NAME || 'StyleKart', tone = 'friendly' } = req.body;
    if (!messages.length) return res.status(400).json({ error: 'messages array is required' });

    let orders = [], products = [];
    try { [orders, products] = await Promise.all([getOrders(50), getProducts(50)]); }
    catch (e) { console.warn('Shopify skipped:', e.message); }

    const { reply, tokensUsed } = await callClaude(messages, { storeName, orders, products, tone });
    res.json({ reply, tokensUsed });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await getOrders(parseInt(req.query.limit) || 50);
    res.json({ count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get products
app.get('/api/products', async (req, res) => {
  try {
    const products = await getProducts(parseInt(req.query.limit) || 50);
    res.json({ count: products.length, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WhatsApp webhook (Wati)
const sessions = {};
app.post('/api/whatsapp', async (req, res) => {
  res.status(200).json({ status: 'received' });
  try {
    const number = req.body.waId || req.body.from;
    const text   = req.body.text || req.body.body || req.body.message;
    if (!number || !text) return;

    if (!sessions[number]) sessions[number] = { history: [], createdAt: Date.now() };
    const session = sessions[number];
    session.history.push({ role: 'user', content: text });
    if (session.history.length > 20) session.history = session.history.slice(-20);

    let orders = [], products = [];
    try { [orders, products] = await Promise.all([getOrders(50), getProducts(50)]); } catch(e) {}

    const { reply } = await callClaude(session.history, {
      storeName: process.env.STORE_NAME || 'StyleKart',
      tone:      process.env.BOT_TONE   || 'friendly',
      orders, products,
    });

    session.history.push({ role: 'assistant', content: reply });

    // Send via Wati
    if (process.env.WATI_API_URL && process.env.WATI_TOKEN) {
      await fetch(`${process.env.WATI_API_URL}/api/v1/sendSessionMessage/${number}`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${process.env.WATI_TOKEN}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messageText: reply }),
      });
    }

    console.log(`[WA] ${number}: ${reply.substring(0, 60)}...`);
  } catch (err) {
    console.error('WhatsApp error:', err.message);
  }
});

// ─────────────────────────────────────────
// START
// ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ AI Chatbot Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
