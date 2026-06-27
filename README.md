# 🤖 AI E-commerce Chatbot Server
### Shopify + Claude AI + WhatsApp (Wati)

A production-ready backend that powers an AI chatbot for e-commerce stores — with live Shopify data, Claude AI responses, and WhatsApp delivery via Wati.

---

## 📁 Project Structure

```
shopify-ai-chatbot/
├── server.js              ← Main entry point
├── routes/
│   ├── chat.js            ← POST /api/chat (website widget)
│   ├── shopify.js         ← GET /api/orders, /api/products
│   └── whatsapp.js        ← POST /api/whatsapp (Wati webhook)
├── utils/
│   ├── shopify.js         ← Shopify API helper
│   └── claude.js          ← Claude AI helper
├── .env.example           ← Copy to .env and fill in keys
├── package.json
└── README.md
```

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Open .env and fill in your keys
```

### 3. Run the server
```bash
# Production
npm start

# Development (auto-restart)
npm run dev
```

### 4. Test it
```bash
curl http://localhost:3000/health
```

---

## 🔑 Getting Your API Keys

### Shopify Admin API Token
1. Go to Shopify Admin → Settings → Apps → Develop apps
2. Create an app → Configure Admin API scopes
3. Enable: `read_orders`, `read_products`, `read_customers`
4. Install app → copy the **Admin API access token**

### Anthropic (Claude) API Key
1. Go to https://console.anthropic.com
2. Create an account → API Keys → Create key
3. Copy the key starting with `sk-ant-...`

### Wati Token (WhatsApp)
1. Sign up at https://wati.io
2. Dashboard → Settings → API & Webhooks
3. Copy your access token
4. Set webhook URL to: `https://your-server.com/api/whatsapp`

---

## 🌐 API Endpoints

### POST /api/chat
Send a message and get an AI reply with live Shopify data.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Where is my order SK-2847?" }
  ],
  "storeName": "StyleKart",
  "tone": "friendly"
}
```

**Response:**
```json
{
  "reply": "Hey! 📦 Your order #2847 is out for delivery...",
  "tokensUsed": 842
}
```

### GET /api/orders
Fetch live orders from Shopify.
```
GET /api/orders?limit=20
```

### GET /api/orders/:orderNumber
Look up a specific order.
```
GET /api/orders/2847
```

### GET /api/products
Fetch products from Shopify.
```
GET /api/products?limit=20
```

### POST /api/whatsapp
Wati webhook — receives incoming WhatsApp messages and auto-replies.

### GET /api/whatsapp/sessions
Debug: see active chat sessions.

### GET /health
Server health check.

---

## 🚀 Deploy to Railway (Free)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Add environment variables in Railway dashboard

# Deploy
railway up
```

Your server URL will be: `https://your-project.railway.app`

---

## 🔌 Connect to Your Chatbot Widget

In your frontend chatbot, replace direct Claude API calls with:

```javascript
const res = await fetch('https://your-server.railway.app/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: chatHistory,
    storeName: 'YourStore',
    tone: 'friendly'
  })
});
const { reply } = await res.json();
```

---

## 💰 Cost Estimate (Per Month)

| Service | Cost |
|---|---|
| Railway hosting | Free / ₹500 |
| Claude API (~10k msgs) | ~₹2,000 |
| Wati WhatsApp | ₹2,500 |
| **Total** | **~₹5,000/mo** |

**Charge your client: ₹15,000–25,000/mo retainer** 🎯

---

## 🛠 Production Checklist

- [ ] Move session storage from memory to Redis
- [ ] Add rate limiting (express-rate-limit)
- [ ] Add authentication to `/api/orders` endpoint
- [ ] Set up error monitoring (Sentry)
- [ ] Add HTTPS (handled by Railway/Render automatically)
- [ ] Set up WhatsApp webhook verification

---

Built for AI Automation Agencies 🚀
