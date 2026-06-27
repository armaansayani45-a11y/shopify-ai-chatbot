/**
 * Shopify API Helper
 * Fetches live store data: orders, products, customers
 */

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN;
const SHOPIFY_TOKEN  = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION    = '2024-01';

const shopifyFetch = async (endpoint) => {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_TOKEN) {
    throw new Error('Shopify credentials not configured. Check your .env file.');
  }

  const url = `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_TOKEN,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
};

/**
 * Get recent orders (last 50)
 */
const getOrders = async (limit = 50) => {
  const data = await shopifyFetch(`orders.json?status=any&limit=${limit}`);
  return data.orders.map((o) => ({
    id:          o.id,
    orderNumber: o.order_number,
    name:        o.name,
    email:       o.email,
    phone:       o.phone,
    totalPrice:  o.total_price,
    currency:    o.currency,
    status:      o.financial_status,
    fulfillment: o.fulfillment_status || 'unfulfilled',
    createdAt:   o.created_at,
    customer:    o.customer
      ? `${o.customer.first_name} ${o.customer.last_name}`
      : 'Guest',
    items: (o.line_items || []).map((i) => ({
      title:    i.title,
      quantity: i.quantity,
      price:    i.price,
    })),
    trackingUrl:    o.fulfillments?.[0]?.tracking_url || null,
    trackingNumber: o.fulfillments?.[0]?.tracking_number || null,
    shippingAddress: o.shipping_address
      ? `${o.shipping_address.city}, ${o.shipping_address.province}`
      : 'N/A',
  }));
};

/**
 * Get products (first 50)
 */
const getProducts = async (limit = 50) => {
  const data = await shopifyFetch(`products.json?limit=${limit}`);
  return data.products.map((p) => ({
    id:       p.id,
    title:    p.title,
    vendor:   p.vendor,
    type:     p.product_type,
    tags:     p.tags,
    price:    p.variants?.[0]?.price || '0',
    stock:    p.variants?.[0]?.inventory_quantity || 0,
    sku:      p.variants?.[0]?.sku || 'N/A',
    image:    p.image?.src || null,
    variants: (p.variants || []).map((v) => ({
      title: v.title,
      price: v.price,
      stock: v.inventory_quantity,
      sku:   v.sku,
    })),
  }));
};

/**
 * Look up a single order by order number (e.g. "2847")
 */
const findOrder = async (orderNumber) => {
  const orders = await getOrders(250);
  return orders.find(
    (o) =>
      String(o.orderNumber) === String(orderNumber) ||
      o.name === `#${orderNumber}`
  );
};

module.exports = { getOrders, getProducts, findOrder };
