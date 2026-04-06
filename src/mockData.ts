import type {
  Campaign,
  CustomerSnapshot,
  FAQItem,
  Notice,
  PersistentState,
  Plan,
  Server,
  SupportTicket,
  TelegramUserProfile,
  UserProfile,
  UserService,
} from './types'

const createProfile = (telegramUser?: TelegramUserProfile): UserProfile => ({
  id: telegramUser?.id ? String(telegramUser.id) : 'user_local_01',
  firstName: telegramUser?.first_name ?? 'کاربر',
  username: telegramUser?.username ?? 'user',
  avatarUrl: telegramUser?.photo_url,
  city: 'Tehran',
  preferredRegion: '',
  walletCredit: 0,
  referralCode: '',
  referrals: 0,
  premium: Boolean(telegramUser?.is_premium),
  memberSince: new Date().toISOString(),
})

const plans: Plan[] = []
const services: UserService[] = []
const tickets: SupportTicket[] = []
const servers: Server[] = []
const campaigns: Campaign[] = []
const notices: Notice[] = []
const faqs: FAQItem[] = []
const customers: CustomerSnapshot[] = []

export const createInitialState = (telegramUser?: TelegramUserProfile): PersistentState => ({
  profile: createProfile(telegramUser),
  plans,
  services,
  orders: [],
  tickets,
  servers,
  campaigns,
  notices,
  faqs,
  customers,
  trialUsed: false,
})
