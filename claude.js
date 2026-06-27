/**
 * Claude AI Helper
 * Calls Anthropic API with live Shopify data injected into the system prompt
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';

/**
 * Build the system prompt with live store data
 */
const buildSystemPrompt = ({ storeName, orders = [], products = [], tone = 'friendly' }) => {
  const tones = {
    friendly:     'You are a warm, helpful WhatsApp support agent.',
    professional: 'You are a professional and efficient customer support representative.',
    hinglish:     'You are a helpful agent who speaks in Hinglish (natural mix of Hindi and English). Example: "Haan bilkul! Main abhi aapka order check karta hoon 😊"',
    sales:        'You are an enthusiastic sales agent focused on helping customers find products and complete purchases.',
  };

  const orderSummary = orders.slice(0, 30).map((o) =>
    `• Order ${o.name} | ${o.customer} | ₹${o.totalPrice} | ${o.fulfillment} | Tracking: ${o.trackingNumber || 'N/A'} | Items: ${o.items.map((i) => i.title).join(', ')}`
  ).join('\n');

  const productSummary = products.slice(0, 30).map((p) =>
    `• ${p.title} | ₹${p.price} | Stock: ${p.stock} units | SKU: ${p.sku}`
  ).join('\n');

  return `${tones[tone] || tones.friendly} You work for ${storeName}, an Indian e-commerce fashion brand.

You have LIVE access to the Shopify store data below. Use it to answer customer queries accurately.

━━━ LIVE ORDERS (${orders.length} total) ━━━
${orderSummary || 'No orders found'}

━━━ LIVE PRODUCTS (${products.length} total) ━━━
${productSummary || 'No products found'}

━━━ STORE POLICIES ━━━
• Returns: Free within 7 days of delivery
• Exchange: Within 14 days for size or colour
• Refunds: 3-5 business days to original payment method
• Delivery: Standard 3-5 days | Express 1-2 days (₹99 extra)
• COD: Available on orders above ₹299
• Free shipping: On orders above ₹999

━━━ INSTRUCTIONS ━━━
• Keep replies SHORT — WhatsApp style, 2-4 lines max
• Use emojis naturally but don't overdo it
• When customer mentions an order number, look it up in the orders list above
• Recommend specific products from the list when relevant
• Always end with a helpful next step or question
• If you cannot resolve an issue, offer to escalate to a human agent
• Never make up order details or prices not in the data above`;
};

/**
 * Send messages to Claude and get a reply
 * @param {Array} messages - Conversation history [{role, content}]
 * @param {Object} storeData - { storeName, orders, products, tone }
 */
const chat = async (messages, storeData) => {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not set in .env');
  }

  const systemPrompt = buildSystemPrompt(storeData);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':         'application/json',
      'x-api-key':            ANTHROPIC_API_KEY,
      'anthropic-version':    '2023-06-01',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 1000,
      system:     systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Claude API error: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const reply = data.content.map((b) => b.text || '').join('');
  const tokensUsed = data.usage?.input_tokens + data.usage?.output_tokens || 0;

  return { reply, tokensUsed };
};

module.exports = { chat, buildSystemPrompt };
