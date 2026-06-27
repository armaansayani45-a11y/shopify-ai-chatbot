const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_TOKEN  = process.env.SHOPIFY_ACCESS_TOKEN;

const shopifyFetch = async (endpoint) => {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) throw new Error('Shopify credentials not configured');
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/${endpoint}`, {
    headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
  return res.json();
};

const getOrders = async (limit = 50) => {
  const data = await shopifyFetch(`orders.json?status=any&limit=${limit}`);
  return data.orders.map(o => ({
    id: o.id, orderNumber: o.order_number, name: o.name,
    email: o.email, totalPrice: o.total_price,
    fulfillment: o.fulfillment_status || 'unfulfilled',
    customer: o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : 'Guest',
    items: (o.line_items || []).map(i => ({ title: i.title, quantity: i.quantity, price: i.price })),
    trackingNumber: o.fulfillments?.[0]?.tracking_number || null,
    trackingUrl: o.fulfillments?.[0]?.tracking_url || null,
  }));
};

const getProducts = async (limit = 50) => {
  const data = await shopifyFetch(`products.json?limit=${limit}`);
  return data.products.map(p => ({
    id: p.id, title: p.title,
    price: p.variants?.[0]?.price || '0',
    stock: p.variants?.[0]?.inventory_quantity || 0,
    sku: p.variants?.[0]?.sku || 'N/A',
  }));
};

const findOrder = async (orderNumber) => {
  const orders = await getOrders(250);
  return orders.find(o => String(o.orderNumber) === String(orderNumber) || o.name === `#${orderNumber}`);
};

module.exports = { getOrders, getProducts, findOrder };
