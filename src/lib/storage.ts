import { createInitialState } from '../mockData'
import type { PersistentState, TelegramUserProfile } from '../types'

const STORAGE_KEY = 'lian-vpn-miniapp-state-v1'

const deepClone = <T,>(value: T) => JSON.parse(JSON.stringify(value)) as T

export const loadPersistentState = (
  telegramUser?: TelegramUserProfile,
): PersistentState => {
  const fallback = createInitialState(telegramUser)

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return fallback
    }

    const parsed = JSON.parse(raw) as PersistentState

    if (
      !parsed ||
      !parsed.profile ||
      !Array.isArray(parsed.plans) ||
      !Array.isArray(parsed.services) ||
      !Array.isArray(parsed.orders)
    ) {
      return fallback
    }

    return {
      ...fallback,
      ...parsed,
      profile: {
        ...fallback.profile,
        ...parsed.profile,
        firstName: telegramUser?.first_name ?? parsed.profile.firstName,
        username: telegramUser?.username ?? parsed.profile.username,
        avatarUrl: telegramUser?.photo_url ?? parsed.profile.avatarUrl,
        premium: telegramUser?.is_premium ?? parsed.profile.premium,
      },
    }
  } catch {
    return fallback
  }
}

export const savePersistentState = (state: PersistentState) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore storage write failures in constrained webviews.
  }
}

export const resetPersistentState = (telegramUser?: TelegramUserProfile) =>
  deepClone(createInitialState(telegramUser))
