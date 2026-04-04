import nodemailer from 'nodemailer'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const ADMIN_IDS = (process.env.VITE_ADMIN_IDS ?? '8461153976')
  .split(',').map((id) => id.trim()).filter(Boolean)

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
  const method = payload.paymentMethod === 'card' ? '💳 کارت'
    : payload.paymentMethod === 'crypto' ? '₿ کریپتو' : '👛 کیف پول'
  const promo = payload.promoCode ? `\n🎟 کد تخفیف: <code>${payload.promoCode}</code>` : ''
  const status = payload.paymentMethod === 'wallet' ? '✅ پرداخت شد' : '⏳ در انتظار رسید'

  return [
    '🛒 <b>سفارش جدید Lian VPN</b>',
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
    `📊 وضعیت: ${status}`,
    '',
    `🔖 ID سفارش: <code>${payload.orderId}</code>`,
  ].join('\n')
}

const sendTelegramAlert = async (text) => {
  if (!BOT_TOKEN || !ADMIN_IDS.length) return
  await Promise.all(
    ADMIN_IDS.map((adminId) =>
      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: adminId, text, parse_mode: 'HTML' }),
      }).catch(() => null)
    )
  )
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

  if (!payload?.orderId || !payload?.plan?.name) {
    res.status(400).json({ ok: false, error: 'invalid_payload' })
    return
  }

  await sendTelegramAlert(buildTelegramMessage(payload))

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
      const username = payload.user?.username ? `@${payload.user.username}` : 'unknown'
      await transporter.sendMail({
        from: process.env.SMTP_FROM || smtpUser,
        to: process.env.PURCHASE_NOTIFY_TO || 'lianglobalco@gmail.com',
        subject: `Lian purchase | ${payload.plan.name} | ${username}`,
        text: JSON.stringify(payload, null, 2),
      })
    } catch { /* email failure doesn't block response */ }
  }

  res.status(200).json({ ok: true })
}
