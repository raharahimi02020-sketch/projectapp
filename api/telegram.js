const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

// VITE_ vars are only for frontend build. Use APP_URL or VERCEL_URL on server.
const APP_URL = (
  process.env.APP_URL ||
  process.env.VITE_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
).replace(/\/$/, '')

const SUPPORT_USERNAME = '@lianvpn_1'

const sendMessage = async (chatId, text, replyMarkup) => {
  if (!chatId) return
  const body = { chat_id: chatId, text, parse_mode: 'HTML' }
  if (replyMarkup) body.reply_markup = replyMarkup
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    console.error('sendMessage error:', e)
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

module.exports = async function handler(req, res) {
  // Allow GET for webhook verification check
  if (req.method === 'GET') {
    res.status(200).json({ ok: true, bot: !!BOT_TOKEN, app_url: APP_URL || 'NOT SET' })
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false })
    return
  }

  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not set')
    res.status(503).json({ ok: false, error: 'bot_not_configured' })
    return
  }

  let update
  try {
    update = await readJsonBody(req)
  } catch (e) {
    res.status(400).json({ ok: false })
    return
  }

  const message = update?.message
  if (!message) {
    res.status(200).json({ ok: true })
    return
  }

  const chatId = message.chat?.id
  const text = (message.text ?? '').trim()
  const firstName = message.from?.first_name ?? 'کاربر'

  if (text.startsWith('/start')) {
    await sendMessage(
      chatId,
      `سلام ${firstName} 👋\n\nبه <b>Lian VPN</b> خوش اومدی!\n\nبرای خرید پلن و مدیریت سرویست روی دکمه زیر بزن:`,
      {
        inline_keyboard: [[
          { text: '🚀 باز کردن مینی‌اپ', web_app: { url: APP_URL } }
        ]]
      }
    )
  } else if (text === '/help') {
    await sendMessage(
      chatId,
      `📋 <b>راهنما</b>\n\n/start — شروع و باز کردن مینی‌اپ\n/support — پشتیبانی\n\nپشتیبانی: ${SUPPORT_USERNAME}`
    )
  } else if (text === '/support') {
    await sendMessage(
      chatId,
      `🛟 برای پشتیبانی به ${SUPPORT_USERNAME} پیام بده.`
    )
  } else {
    await sendMessage(
      chatId,
      `برای شروع /start بزن یا مستقیم وارد مینی‌اپ شو 👇`,
      {
        inline_keyboard: [[
          { text: '🚀 مینی‌اپ', web_app: { url: APP_URL } }
        ]]
      }
    )
  }

  res.status(200).json({ ok: true })
}
