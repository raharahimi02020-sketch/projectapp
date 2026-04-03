import nodemailer from 'nodemailer'

const DEFAULT_TO = 'lianglobalco@gmail.com'
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const ADMIN_IDS = (process.env.VITE_ADMIN_IDS ?? '8461153976')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}) }
      catch (e) { reject(e) }
    })
    req.on('error', reject)
  })

const buildEmailBody = (payload) => {
  const username = payload.user?.username ? `@${payload.user.username}` : 'unknown'
  const telegramId = payload.user?.telegramId ?? 'unknown'
  const promoCode = payload.promoCode || 'none'
  const serviceInfo = payload.service
    ? [
        `Region: ${payload.service.region}`,
        `Protocol: ${payload.service.protocol}`,
        `Expires at: ${payload.service.expiresAt}`,
        `Config: ${payload.service.configCode}`,
      ].join('\n')
    : 'Service details: unavailable'

  return [
    'New Lian purchase notification',
    '',
    `Telegram username: ${username}`,
    `Telegram id: ${telegramId}`,
    `Customer name: ${payload.user?.firstName ?? 'unknown'}`,
    `City: ${payload.user?.city ?? 'unknown'}`,
    '',
    `Order id: ${payload.orderId}`,
    `Created at: ${payload.createdAt}`,
    `Order kind: ${payload.kind}`,
    `Payment method: ${payload.paymentMethod}`,
    `Promo code: ${promoCode}`,
    `Amount: ${payload.amount}`,
    '',
    `Plan: ${payload.plan?.name ?? 'unknown'}`,
    `Duration days: ${payload.plan?.durationDays ?? 'unknown'}`,
    `Device limit: ${payload.plan?.deviceLimit ?? 'unknown'}`,
    `Protocols: ${(payload.plan?.protocols ?? []).join(', ') || 'unknown'}`,
    `Locations: ${(payload.plan?.locations ?? []).join(', ') || 'unknown'}`,
    '',
    serviceInfo,
  ].join('\n')
}

const buildTelegramMessage = (payload) => {
  const username = payload.user?.username ? `@${payload.user.username}` : 'ناشناس'
  const telegramId = payload.user?.telegramId ?? '—'
  const name = payload.user?.firstName ?? 'ناشناس'
  const amount = Number(payload.amount).toLocaleString('fa-IR')
  const method =
    payload.paymentMethod === 'card'
      ? '💳 کارت'
      : payload.paymentMethod === 'crypto'
        ? '₿ کریپتو'
        : '👛 کیف پول'
  const promo = payload.promoCode ? `\n🎟 کد تخفیف: <code>${payload.promoCode}</code>` : ''
  const status =
    payload.paymentMethod === 'wallet'
      ? '✅ پرداخت شد'
      : '⏳ در انتظار رسید'

  return [
    '🛒 <b>سفارش جدید Lian VPN</b>',
    '',
    `👤 <b>${name}</b> (${username})`,
    `🆔 ID: <code>${telegramId}</code>`,
    '',
    `📦 پلن: <b>${payload.plan?.name ?? '—'}</b>`,
    `⏱ مدت: ${payload.plan?.durationDays ?? '—'} روز`,
    `📱 دستگاه: ${payload.plan?.deviceLimit ?? '—'} عدد`,
    '',
    `💰 مبلغ: <b>${amount} تومان</b>`,
    `💳 روش: ${method}${promo}`,
    `📊 وضعیت: ${status}`,
    '',
    `🔖 ID سفارش: <code>${payload.orderId}</code>`,
  ].join('\n')
}

const sendTelegramAlert = async (text) => {
  if (!BOT_TOKEN || !ADMIN_IDS.length) return

  const sends = ADMIN_IDS.map((adminId) =>
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminId,
        text,
        parse_mode: 'HTML',
      }),
    }).catch(() => null),
  )

  await Promise.all(sends)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' })
    return
  }

  let payload
  try {
    payload = await readJsonBody(req)
  } catch {
    res.status(400).json({ ok: false, error: 'invalid_json' })
    return
  }

  if (!payload?.orderId || !payload?.plan?.name || !payload?.user?.firstName) {
    res.status(400).json({ ok: false, error: 'invalid_payload' })
    return
  }

  const telegramText = buildTelegramMessage(payload)
  await sendTelegramAlert(telegramText)

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

      const recipient = process.env.PURCHASE_NOTIFY_TO || DEFAULT_TO
      const from = process.env.SMTP_FROM || smtpUser
      const username = payload.user?.username ? `@${payload.user.username}` : 'unknown'

      await transporter.sendMail({
        from,
        to: recipient,
        subject: `Lian purchase | ${payload.plan.name} | ${username}`,
        text: buildEmailBody(payload),
      })
    } catch {
      // Email failure should not block the response
    }
  }

  res.status(200).json({ ok: true })
}
