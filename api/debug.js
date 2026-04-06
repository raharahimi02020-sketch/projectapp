const { createClient } = require('redis')

const ORDERS_KEY = 'lian_orders'

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Id')

  if (req.method === 'OPTIONS') { res.status(204).end(); return }

  const checks = {
    env: {
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? '✅ set (' + process.env.TELEGRAM_BOT_TOKEN.slice(0, 8) + '...)' : '❌ MISSING',
      ADMIN_IDS: process.env.ADMIN_IDS || '❌ MISSING (fallback to VITE_ADMIN_IDS)',
      VITE_ADMIN_IDS: process.env.VITE_ADMIN_IDS || '❌ MISSING',
      APP_URL: process.env.APP_URL || '❌ MISSING',
      VITE_APP_URL: process.env.VITE_APP_URL || '❌ MISSING',
      VERCEL_URL: process.env.VERCEL_URL || '❌ MISSING',
      REDIS_URL: process.env.REDIS_URL ? '✅ set (' + process.env.REDIS_URL.slice(0, 20) + '...)' : '❌ MISSING — orders will NOT persist',
      SMTP_USER: process.env.SMTP_USER ? '✅ set' : '⚠️ not set (email disabled)',
    },
    redis: { connected: false, ordersCount: 0, error: null },
    headers_received: {
      'x-telegram-id': req.headers['x-telegram-id'] || '(not sent)',
    },
  }

  // Test Redis connection
  if (process.env.REDIS_URL) {
    try {
      const redis = createClient({ url: process.env.REDIS_URL })
      await redis.connect()
      checks.redis.connected = true

      const raw = await redis.get(ORDERS_KEY)
      const orders = raw ? JSON.parse(raw) : []
      checks.redis.ordersCount = orders.length
      if (orders.length > 0) {
        checks.redis.lastOrder = {
          id: orders[0].id,
          planName: orders[0].planName,
          status: orders[0].status,
          user: orders[0].user?.firstName + ' @' + (orders[0].user?.username ?? '?'),
          createdAt: orders[0].createdAt,
        }
      }

      await redis.disconnect()
    } catch (err) {
      checks.redis.error = err.message
    }
  }

  res.status(200).json(checks)
}
