import type { TelegramUserProfile } from '../types'

type ImpactLevel = 'light' | 'medium' | 'heavy'

interface TelegramThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
}

interface TelegramWebApp {
  colorScheme?: 'light' | 'dark'
  initDataUnsafe?: {
    user?: TelegramUserProfile
    start_param?: string
  }
  platform?: string
  themeParams?: TelegramThemeParams
  HapticFeedback?: {
    impactOccurred: (style: ImpactLevel) => void
  }
  ready: () => void
  expand: () => void
  disableVerticalSwipes?: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

export const getTelegramWebApp = () => window.Telegram?.WebApp

export const getTelegramUser = () => getTelegramWebApp()?.initDataUnsafe?.user

export const initTelegramShell = () => {
  const app = getTelegramWebApp()

  if (!app) {
    return null
  }

  app.ready()
  app.expand()
  app.disableVerticalSwipes?.()
  app.setHeaderColor?.('#0c1014')
  app.setBackgroundColor?.('#050608')

  const theme = app.themeParams
  if (theme) {
    const root = document.documentElement
    if (theme.bg_color) {
      root.style.setProperty('--tg-bg', theme.bg_color)
    }
    if (theme.text_color) {
      root.style.setProperty('--tg-text', theme.text_color)
    }
    if (theme.secondary_bg_color) {
      root.style.setProperty('--tg-panel', theme.secondary_bg_color)
    }
    if (theme.button_color) {
      root.style.setProperty('--tg-button', theme.button_color)
    }
  }

  return app
}

export const pulseTelegram = (style: ImpactLevel = 'light') => {
  getTelegramWebApp()?.HapticFeedback?.impactOccurred(style)
}
