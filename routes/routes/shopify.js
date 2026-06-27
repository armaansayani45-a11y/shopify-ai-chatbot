const express = require('express');
const router  = express.Router();
const { getOrders, getProducts, findOrder } = require('../utils/shopify');

router.get('/orders', async (req, res) => {
  try {
    const orders = await getOrders(parseInt(req.query.limit) || 50);
    res.json({ count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders/:orderNumber', async (req, res) => {
  try {
    const order = await findOrder(req.params.orderNumber);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/products', async (req, res) => {
  try {
    const products = await getProducts(parseInt(req.query.limit) || 50);
    res.json({ count: products.length, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
