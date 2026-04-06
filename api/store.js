const { createClient } = require('redis')

const STORE_KEY = 'lian_app_data'
const ORDERS_KEY = 'lian_orders'
const ADMIN_IDS = (process.env.ADMIN_IDS ?? process.env.VITE_ADMIN_IDS ?? '8461153976,7302457228')
  .split(',').map((id) => id.trim()).filter(Boolean)

let _redis = null
let memCache = null
let memOrders = []

const getRedis = async () => {
  // Check if existing connection is still alive
  if (_redis?.isReady) return _redis

  // If we have a dead reference, clean it up
  if (_redis) {
    try { await _redis.disconnect() } catch { }
    _redis = null
  }

  if (!process.env.REDIS_URL) {
    console.warn('[store] ⚠️ REDIS_URL not set — orders will NOT persist on Vercel. Add it in Vercel Dashboard → Settings → Environment Variables.')
    return null
  }
  try {
    const client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: false,   // don't auto-reconnect in serverless
      },
    })
    client.on('error', (err) => {
      console.error('[store] Redis error:', err.message)
      _redis = null
    })
    await client.connect()
    _redis = client
    console.log('[store] ✅ Redis connected')
    return _redis
  } catch (e) {
    console.error('[store] ❌ Redis connect failed:', e.message)
    _redis = null
    return null
  }
}

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}) } catch (e) { reject(e) }
    })
    req.on('error', reject)
  })

const emptyStore = () => ({ plans: [], campaigns: [], servers: [], notices: [], faqs: [] })

const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Id')
  res.setHeader('Cache-Control', 'no-store')
}

const loadOrders = async (redis) => {
  if (redis) {
    try {
      const raw = await redis.get(ORDERS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return memOrders.slice() }
  }
  return memOrders.slice()
}

const saveOrders = async (redis, orders) => {
  memOrders = orders
  if (redis) {
    try {
      await redis.set(ORDERS_KEY, JSON.stringify(orders))
      console.log(`[store] ✅ Saved ${orders.length} orders to Redis`)
    } catch (e) {
      console.error(`[store] ❌ Failed to save orders to Redis:`, e.message)
    }
  } else {
    console.warn(`[store] ⚠️ No Redis — ${orders.length} orders saved to memory only (will be lost on cold start)`)
  }
}

module.exports = async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const redis = await getRedis()
  // Read telegram ID from query string (?tgid=123) or header — query avoids CORS preflight
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`)
  const callerTgId = url.searchParams.get('tgid') || req.headers['x-telegram-id'] || ''
  const isCallerAdmin = callerTgId && ADMIN_IDS.includes(String(callerTgId))

  // ── GET ──
  if (req.method === 'GET') {
    try {
      let data = null
      if (redis) {
        const raw = await redis.get(STORE_KEY)
        data = raw ? JSON.parse(raw) : null
      } else {
        data = memCache
      }

      const allOrders = await loadOrders(redis)
      const result = data ?? emptyStore()
      result._redis = !!redis

      // Admins see ALL orders; users see ONLY their own
      if (isCallerAdmin) {
        result.orders = allOrders
        console.log(`[store] GET admin ${callerTgId}: returning ${allOrders.length} orders (redis: ${!!redis})`)
      } else if (callerTgId) {
        result.orders = allOrders.filter(
          (o) => String(o.user?.telegramId) === String(callerTgId)
        )
      } else {
        result.orders = []
      }

      res.status(200).json(result)
    } catch {
      const result = memCache ?? emptyStore()
      // Still try to load orders even if store config failed
      try {
        const fallbackOrders = await loadOrders(redis)
        if (isCallerAdmin) {
          result.orders = fallbackOrders
        } else if (callerTgId) {
          result.orders = fallbackOrders.filter(
            (o) => String(o.user?.telegramId) === String(callerTgId)
          )
        } else {
          result.orders = []
        }
      } catch {
        result.orders = []
      }
      res.status(200).json(result)
    }
    return
  }

  // ── POST: admin syncs store config (plans, campaigns, etc.) ──
  if (req.method === 'POST') {
    let body
    try { body = await readJsonBody(req) } catch { res.status(400).json({ ok: false }); return }

    if (Array.isArray(body?.plans)) {
      const data = {
        plans: body.plans ?? [],
        campaigns: body.campaigns ?? [],
        servers: body.servers ?? [],
        notices: body.notices ?? [],
        faqs: body.faqs ?? [],
      }
      memCache = data
      if (redis) {
        try { await redis.set(STORE_KEY, JSON.stringify(data)) } catch { }
      }
      res.status(200).json({ ok: true })
      return
    }

    res.status(400).json({ ok: false })
    return
  }

  // ── PUT: order operations ──
  if (req.method === 'PUT') {
    let body
    try { body = await readJsonBody(req) } catch { res.status(400).json({ ok: false }); return }

    // Submit a new order
    if (body?.action === 'submit_order' && body.order?.id) {
      const orders = await loadOrders(redis)
      if (!orders.some((o) => o.id === body.order.id)) {
        orders.unshift(body.order)
        await saveOrders(redis, orders)
      }
      console.log(`[store] Order submitted: ${body.order.id} by user ${body.order.user?.telegramId ?? '?'}`)
      res.status(200).json({ ok: true })
      return
    }

    // Update a single order
    if (body?.action === 'update_order' && body.orderId && body.updates) {
      const orders = await loadOrders(redis)
      const idx = orders.findIndex((o) => o.id === body.orderId)
      if (idx === -1) {
        res.status(404).json({ ok: false, error: 'order_not_found' })
        return
      }

      // Non-admin can only cancel their own processing orders or upload receipt
      if (!isCallerAdmin) {
        const order = orders[idx]
        if (String(order.user?.telegramId) !== String(callerTgId)) {
          res.status(403).json({ ok: false, error: 'not_your_order' })
          return
        }

        // Allow receipt uploads on own orders
        if (body.updates.receiptImage || body.updates.receiptFileName || body.updates.receiptUploadedAt) {
          const receiptUpdates = {}
          if (body.updates.receiptImage) receiptUpdates.receiptImage = body.updates.receiptImage
          if (body.updates.receiptFileName) receiptUpdates.receiptFileName = body.updates.receiptFileName
          if (body.updates.receiptUploadedAt) receiptUpdates.receiptUploadedAt = body.updates.receiptUploadedAt
          orders[idx] = { ...order, ...receiptUpdates }
        } else if (body.updates.status === 'cancelled') {
          if (order.status !== 'processing') {
            res.status(400).json({ ok: false, error: 'cannot_cancel' })
            return
          }
          orders[idx] = { ...order, status: 'cancelled' }
        } else {
          res.status(403).json({ ok: false, error: 'not_allowed' })
          return
        }
      } else {
        orders[idx] = { ...orders[idx], ...body.updates }
      }

      await saveOrders(redis, orders)
      console.log(`[store] Order ${body.orderId} updated by ${isCallerAdmin ? 'admin' : 'user'} ${callerTgId}`)
      res.status(200).json({ ok: true })
      return
    }

    // Delete an order (admin only)
    if (body?.action === 'delete_order' && body.orderId) {
      if (!isCallerAdmin) {
        res.status(403).json({ ok: false, error: 'admin_only' })
        return
      }
      let orders = await loadOrders(redis)
      orders = orders.filter((o) => o.id !== body.orderId)
      await saveOrders(redis, orders)
      console.log(`[store] Order ${body.orderId} deleted by admin ${callerTgId}`)
      res.status(200).json({ ok: true })
      return
    }

    res.status(400).json({ ok: false })
    return
  }

  res.status(405).json({ ok: false })
}
