import nodemailer from 'nodemailer'

const DEFAULT_TO = 'lianglobalco@gmail.com'

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let raw = ''

    req.on('data', (chunk) => {
      raw += chunk
    })

    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })

    req.on('error', reject)
  })

const buildTextBody = (payload) => {
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
    `Plan id: ${payload.plan?.id ?? 'unknown'}`,
    `Duration days: ${payload.plan?.durationDays ?? 'unknown'}`,
    `Device limit: ${payload.plan?.deviceLimit ?? 'unknown'}`,
    `Protocols: ${(payload.plan?.protocols ?? []).join(', ') || 'unknown'}`,
    `Locations: ${(payload.plan?.locations ?? []).join(', ') || 'unknown'}`,
    '',
    serviceInfo,
  ].join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' })
    return
  }

  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  if (!smtpUser || !smtpPass) {
    res.status(503).json({ ok: false, error: 'smtp_not_configured' })
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

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') !== 'false',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  const recipient = process.env.PURCHASE_NOTIFY_TO || DEFAULT_TO
  const from = process.env.SMTP_FROM || smtpUser
  const username = payload.user?.username ? `@${payload.user.username}` : 'unknown'

  await transporter.sendMail({
    from,
    to: recipient,
    subject: `Lian purchase | ${payload.plan.name} | ${username}`,
    text: buildTextBody(payload),
  })

  res.status(200).json({ ok: true })
}
