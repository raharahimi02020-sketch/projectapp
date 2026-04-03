const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const APP_URL = process.env.VITE_APP_URL || 'https://your-app.vercel.app'

const sendMessage = async (chatId, text, replyMarkup) => {
  const body = { chat_id: chatId, text, parse_mode: 'HTML' }
  if (replyMarkup) body.reply_markup = replyMarkup

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false })
    return
  }

  if (!BOT_TOKEN) {
    res.status(503).json({ ok: false, error: 'bot_not_configured' })
    return
  }

  let update
  try {
    update = await readJsonBody(req)
  } catch {
    res.status(400).json({ ok: false })
    return
  }

  const message = update?.message
  if (!message) {
    res.status(200).json({ ok: true })
    return
  }

  const chatId = message.chat?.id
  const text = message.text ?? ''
  const firstName = message.from?.first_name ?? 'کاربر'

  if (text.startsWith('/start')) {
    await sendMessage(
      chatId,
      `سلام ${firstName} 👋\n\nبه <b>Lian VPN</b> خوش اومدی!\n\nبرای خرید پلن و مدیریت سرویست روی دکمه زیر بزن:`,
      {
        inline_keyboard: [[
          {
            text: '🚀 باز کردن مینی‌اپ',
            web_app: { url: APP_URL },
          },
        ]],
      },
    )
  } else if (text === '/help') {
    await sendMessage(
      chatId,
      '📋 <b>راهنما</b>\n\n/start — شروع و باز کردن مینی‌اپ\n/help — این راهنما\n/support — ارتباط با پشتیبانی\n\nبرای هر سوالی به @Programer_Rha پیام بده.',
    )
  } else if (text === '/support') {
    await sendMessage(
      chatId,
      '🛟 برای پشتیبانی به @Programer_Rha پیام بده.',
    )
  } else {
    await sendMessage(
      chatId,
      `برای شروع /start رو بزن یا مینی‌اپ رو باز کن.`,
      {
        inline_keyboard: [[
          {
            text: '🚀 باز کردن مینی‌اپ',
            web_app: { url: APP_URL },
          },
        ]],
      },
    )
  }

  res.status(200).json({ ok: true })
}
