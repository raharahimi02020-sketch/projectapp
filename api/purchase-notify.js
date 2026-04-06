const nodemailer = require('nodemailer')
const { createClient } = require('redis')

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const ADMIN_IDS = (process.env.ADMIN_IDS ?? process.env.VITE_ADMIN_IDS ?? '8461153976,7302457228')
  .split(',').map((id) => id.trim()).filter(Boolean)
const APP_URL = (
  process.env.APP_URL ||
  process.env.VITE_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
).replace(/\/$/, '')

const ORDERS_KEY = 'lian_orders'
let _redis = null

const getRedis = async () => {
  if (_redis?.isReady) return _redis
  if (_redis) {
    try { await _redis.disconnect() } catch { }
    _redis = null
  }
  if (!process.env.REDIS_URL) {
    console.warn('[purchase-notify] ⚠️ REDIS_URL not set — orders will NOT persist')
    return null
  }
  try {
    const client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: false,
      },
    })
    client.on('error', () => { _redis = null })
    await client.connect()
    _redis = client
    return _redis
  } catch (e) {
    console.error('[purchase-notify] Redis connect error:', e.message)
    _redis = null
    return null
  }
}

const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
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

const buildTelegramMessage = (payload) => {
  const username = payload.user?.username ? `@${payload.user.username}` : '—'
  const telegramId = payload.user?.telegramId ?? '—'
  const name = payload.user?.firstName ?? '—'
  const amount = Number(payload.amount).toLocaleString('fa-IR')
  const method = payload.paymentMethod === 'card' ? '💳 کارت' : '₿ کریپتو'
  const promo = payload.promoCode ? `\n🎟 کد تخفیف: <code>${payload.promoCode}</code>` : ''

  return [
    '🔔 <b>سفارش جدید Lian VPN</b>',
    '',
    `👤 <b>${name}</b> (${username})`,
    `🆔 Telegram ID: <code>${telegramId}</code>`,
    '',
    `📦 پلن: <b>${payload.plan?.name ?? '—'}</b>`,
    `⏱ مدت: ${payload.plan?.durationDays ?? '—'} روز`,
    `📱 دستگاه: ${payload.plan?.deviceLimit ?? '—'} عدد`,
    '',
    `💰 مبلغ: <b>${amount} تومان</b>`,
    `💳 روش: ${method}${promo}`,
    `📊 وضعیت: ⏳ در انتظار تایید`,
    '',
    `🔖 شناسه: <code>${payload.orderId}</code>`,
  ].join('\n')
}

const sendTelegramAlert = async (text) => {
  if (!BOT_TOKEN) {
    console.error('[purchase-notify] BOT_TOKEN is empty')
    return
  }
  if (!ADMIN_IDS.length) {
    console.error('[purchase-notify] ADMIN_IDS is empty')
    return
  }

  console.log(`[purchase-notify] Sending to ${ADMIN_IDS.length} admins: ${ADMIN_IDS.join(', ')}`)

  const results = await Promise.all(
    ADMIN_IDS.map(async (adminId) => {
      try {
        const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: adminId,
            text,
            parse_mode: 'HTML',
            reply_markup: APP_URL ? {
              inline_keyboard: [[
                { text: '📋 پنل ادمین', web_app: { url: APP_URL } }
              ]]
            } : undefined,
          }),
        })
        const json = await resp.json()
        if (!json.ok) {
          console.error(`[purchase-notify] TG error admin ${adminId}:`, JSON.stringify(json))
        }
        return json
      } catch (err) {
        console.error(`[purchase-notify] TG fetch error admin ${adminId}:`, err.message)
        return null
      }
    })
  )
  console.log(`[purchase-notify] TG results:`, results.map(r => r?.ok ?? false))
}

// Save order directly to Redis (same DB as store.js uses)
const saveOrderToRedis = async (order) => {
  const redis = await getRedis()
  let orders = []

  if (redis) {
    try {
      const raw = await redis.get(ORDERS_KEY)
      orders = raw ? JSON.parse(raw) : []
    } catch { orders = [] }

    // Prevent duplicates
    if (!orders.some((o) => o.id === order.id)) {
      orders.unshift(order)
      try {
        await redis.set(ORDERS_KEY, JSON.stringify(orders))
        console.log(`[purchase-notify] Order ${order.id} saved to Redis`)
        return true
      } catch (err) {
        console.error(`[purchase-notify] Redis save error:`, err.message)
        return false
      }
    } else {
      console.log(`[purchase-notify] Order ${order.id} already exists in Redis`)
      return true
    }
  } else {
    console.warn(`[purchase-notify] No Redis — order ${order.id} NOT persisted on server`)
    return false
  }
}

module.exports = async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return }

  let payload
  try { payload = await readJsonBody(req) } catch { res.status(400).json({ ok: false }); return }
  if (!payload?.orderId || !payload?.plan?.name) { res.status(400).json({ ok: false }); return }

  console.log(`[purchase-notify] New order: ${payload.orderId} — plan: ${payload.plan.name} — amount: ${payload.amount}`)

  // 1) Save order directly to Redis
  const orderData = {
    id: payload.orderId,
    planId: payload.plan?.id ?? '',
    planName: payload.plan?.name ?? '',
    amount: payload.amount ?? 0,
    status: 'processing',
    paymentMethod: payload.paymentMethod ?? 'card',
    kind: payload.kind ?? 'purchase',
    createdAt: payload.createdAt ?? new Date().toISOString(),
    promoCode: payload.promoCode,
    user: payload.user ? {
      telegramId: payload.user.telegramId,
      firstName: payload.user.firstName ?? '',
      username: payload.user.username ?? '',
    } : undefined,
  }
  await saveOrderToRedis(orderData)

  // 2) Send Telegram notification to admins
  await sendTelegramAlert(buildTelegramMessage(payload))

  // 3) Send email notification
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 465),
        secure: String(process.env.SMTP_SECURE || 'true') !== 'false',
        auth: { user: smtpUser, pass: smtpPass },
      })
      await transporter.sendMail({
        from: process.env.SMTP_FROM || smtpUser,
        to: process.env.PURCHASE_NOTIFY_TO || 'lianglobalco@gmail.com',
        subject: `Lian | ${payload.plan.name} | ${payload.user?.username ?? 'user'}`,
        text: JSON.stringify(payload, null, 2),
      })
    } catch { }
  }

  res.status(200).json({ ok: true })
}
