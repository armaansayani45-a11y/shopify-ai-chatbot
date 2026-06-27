const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';

const buildSystemPrompt = ({ storeName, orders = [], products = [], tone = 'friendly' }) => {
  const tones = {
    friendly:     'You are a warm, helpful WhatsApp support agent.',
    professional: 'You are a professional and efficient customer support representative.',
    hinglish:     'You are a helpful agent who speaks in Hinglish (mix of Hindi and English).',
    sales:        'You are an enthusiastic sales agent focused on helping customers buy.',
  };

  const orderSummary = orders.slice(0, 30).map(o =>
    `• Order ${o.name} | ${o.customer} | ₹${o.totalPrice} | ${o.fulfillment} | Tracking: ${o.trackingNumber || 'N/A'}`
  ).join('\n');

  const productSummary = products.slice(0, 30).map(p =>
    `• ${p.title} | ₹${p.price} | Stock: ${p.stock} units`
  ).join('\n');

  return `${tones[tone] || tones.friendly} You work for ${storeName}, an Indian e-commerce brand.

LIVE ORDERS:
${orderSummary || 'No orders'}

LIVE PRODUCTS:
${productSummary || 'No products'}

POLICIES: Returns free within 7 days. Refund in 3-5 business days. Free shipping above ₹999.

Keep replies short (2-4 lines), WhatsApp style. Use emojis naturally. Always offer a next step.`;
};

const chat = async (messages, storeData) => {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: buildSystemPrompt(storeData),
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Claude API error: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const reply = data.content.map(b => b.text || '').join('');
  const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
  return { reply, tokensUsed };
};

module.exports = { chat, buildSystemPrompt };
