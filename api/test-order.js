const { createClient } = require('redis')

const ORDERS_KEY = 'lian_orders'

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }

  const results = { steps: [], success: false }

  // Step 1: Check Redis
  if (!process.env.REDIS_URL) {
    results.steps.push('❌ REDIS_URL not set')
    res.status(200).json(results)
    return
  }
  results.steps.push('✅ REDIS_URL is set')

  let redis
  try {
    redis = createClient({
      url: process.env.REDIS_URL,
      socket: { connectTimeout: 5000, reconnectStrategy: false },
    })
    await redis.connect()
    results.steps.push('✅ Redis connected')
  } catch (e) {
    results.steps.push('❌ Redis connect failed: ' + e.message)
    res.status(200).json(results)
    return
  }

  // Step 2: Read current orders
  let ordersBefore = []
  try {
    const raw = await redis.get(ORDERS_KEY)
    ordersBefore = raw ? JSON.parse(raw) : []
    results.steps.push(`✅ Current orders in Redis: ${ordersBefore.length}`)
  } catch (e) {
    results.steps.push('❌ Failed to read orders: ' + e.message)
  }

  // Step 3: Write a test order
  const testOrder = {
    id: 'test_order_' + Date.now(),
    planId: 'test_plan',
    planName: 'Test Plan',
    amount: 0,
    status: 'processing',
    paymentMethod: 'card',
    kind: 'purchase',
    createdAt: new Date().toISOString(),
    user: {
      telegramId: 99999,
      firstName: 'Test User',
      username: 'test_user',
    },
  }

  try {
    ordersBefore.unshift(testOrder)
    await redis.set(ORDERS_KEY, JSON.stringify(ordersBefore))
    results.steps.push(`✅ Test order written: ${testOrder.id}`)
  } catch (e) {
    results.steps.push('❌ Failed to write order: ' + e.message)
    res.status(200).json(results)
    return
  }

  // Step 4: Read back and verify
  try {
    const raw2 = await redis.get(ORDERS_KEY)
    const ordersAfter = raw2 ? JSON.parse(raw2) : []
    const found = ordersAfter.find((o) => o.id === testOrder.id)
    if (found) {
      results.steps.push(`✅ Test order verified in Redis! Total orders: ${ordersAfter.length}`)
      results.success = true
    } else {
      results.steps.push('❌ Test order NOT found after write')
    }
  } catch (e) {
    results.steps.push('❌ Failed to read back: ' + e.message)
  }

  // Step 5: Clean up test order
  try {
    const raw3 = await redis.get(ORDERS_KEY)
    let orders = raw3 ? JSON.parse(raw3) : []
    orders = orders.filter((o) => o.id !== testOrder.id)
    await redis.set(ORDERS_KEY, JSON.stringify(orders))
    results.steps.push('✅ Test order cleaned up')
  } catch (e) {
    results.steps.push('⚠️ Cleanup failed (harmless): ' + e.message)
  }

  try { await redis.disconnect() } catch { }

  results.summary = results.success
    ? '✅ Redis read/write works perfectly. Problem is in frontend order submission.'
    : '❌ Redis has issues. Orders cannot be persisted.'

  res.status(200).json(results)
}
