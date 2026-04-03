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

const isoDaysFromNow = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

const createProfile = (telegramUser?: TelegramUserProfile): UserProfile => ({
  id: telegramUser?.id ? String(telegramUser.id) : 'user_local_01',
  firstName: telegramUser?.first_name ?? 'کاربر',
  username: telegramUser?.username ?? 'user',
  avatarUrl: telegramUser?.photo_url,
  city: 'Tehran',
  preferredRegion: 'Germany',
  walletCredit: 0,
  referralCode: `LIAN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  referrals: 0,
  premium: Boolean(telegramUser?.is_premium),
  memberSince: new Date().toISOString(),
})

const plans: Plan[] = [
  {
    id: 'starter-30',
    name: 'Starter 30',
    category: 'starter',
    subtitle: 'Cheap daily driver',
    description: 'Good for messaging, social apps, and a single personal device.',
    badge: 'Best entry',
    featured: true,
    price: 189000,
    durationDays: 30,
    deviceLimit: 2,
    locations: ['Germany', 'Turkey', 'Netherlands', 'Finland'],
    speedTier: 'Fast',
    dataCap: 'Unlimited',
    protocols: ['VLESS', 'Reality'],
    accent: 'lime',
    perks: ['Instant delivery', 'Auto renew', '1 tap copy config'],
  },
  {
    id: 'stream-90',
    name: 'Stream 90',
    category: 'streaming',
    subtitle: 'Stable streaming routes',
    description: 'Balanced latency and stable media routes for TV and mobile.',
    badge: 'Popular',
    featured: true,
    price: 489000,
    durationDays: 90,
    deviceLimit: 4,
    locations: ['Germany', 'France', 'UK', 'Netherlands', 'UAE'],
    speedTier: 'Turbo',
    dataCap: 'Unlimited',
    protocols: ['VLESS', 'Hysteria'],
    accent: 'ice',
    perks: ['Streaming tuned routes', 'Priority routing', 'Setup guides'],
  },
  {
    id: 'family-180',
    name: 'Family 180',
    category: 'family',
    subtitle: 'Home pack for multiple devices',
    description: 'One subscription for the house with enough slots for all devices.',
    badge: 'Family',
    price: 899000,
    durationDays: 180,
    deviceLimit: 8,
    locations: ['Germany', 'Turkey', 'UAE', 'Netherlands', 'Finland'],
    speedTier: 'Turbo+',
    dataCap: 'Unlimited',
    protocols: ['Reality', 'Hysteria'],
    accent: 'amber',
    perks: ['8 devices', 'Family sharing', 'VIP queue'],
  },
  {
    id: 'unlimited-365',
    name: 'Unlimited 365',
    category: 'unlimited',
    subtitle: 'Long term best value',
    description: 'Full speed annual plan with premium support and smart failover.',
    badge: 'Value max',
    featured: true,
    price: 1499000,
    durationDays: 365,
    deviceLimit: 10,
    locations: ['Germany', 'France', 'Sweden', 'Turkey', 'UAE', 'Netherlands'],
    speedTier: 'Flagship',
    dataCap: 'Unlimited',
    protocols: ['Reality', 'Hysteria', 'TUIC'],
    accent: 'lime',
    perks: ['Annual savings', 'Priority support', 'Best route rotation'],
  },
  {
    id: 'business-30',
    name: 'Team Shield',
    category: 'business',
    subtitle: 'Shared access for small teams',
    description: 'Admin friendly slots, broad device coverage, and predictable speed.',
    badge: 'Team',
    price: 749000,
    durationDays: 30,
    deviceLimit: 12,
    locations: ['Germany', 'Netherlands', 'France', 'Turkey'],
    speedTier: 'Business',
    dataCap: 'Unlimited',
    protocols: ['Reality', 'TUIC'],
    accent: 'ice',
    perks: ['12 seats', 'Shared billing', 'Bulk config export'],
  },
]

const services: UserService[] = []

const tickets: SupportTicket[] = []

const servers: Server[] = [
  {
    id: 'srv_001',
    city: 'Frankfurt',
    country: 'Germany',
    latency: 38,
    load: 46,
    status: 'online',
    protocols: ['Reality', 'Hysteria'],
  },
  {
    id: 'srv_002',
    city: 'Amsterdam',
    country: 'Netherlands',
    latency: 44,
    load: 53,
    status: 'online',
    protocols: ['VLESS', 'Reality'],
  },
  {
    id: 'srv_003',
    city: 'Istanbul',
    country: 'Turkey',
    latency: 61,
    load: 79,
    status: 'busy',
    protocols: ['VLESS'],
  },
  {
    id: 'srv_004',
    city: 'Dubai',
    country: 'UAE',
    latency: 69,
    load: 41,
    status: 'online',
    protocols: ['Reality', 'TUIC'],
  },
  {
    id: 'srv_005',
    city: 'Helsinki',
    country: 'Finland',
    latency: 52,
    load: 14,
    status: 'maintenance',
    protocols: ['Hysteria'],
  },
]

const campaigns: Campaign[] = [
  {
    id: 'cmp_001',
    title: 'First order launch',
    description: 'Get a direct discount on your first paid order.',
    code: 'SAFE20',
    discountPercent: 20,
    reward: '20% off',
    active: true,
  },
  {
    id: 'cmp_002',
    title: 'Renewal week',
    description: 'Extra discount if your active service is near expiry.',
    code: 'RENEW10',
    discountPercent: 10,
    reward: '10% off',
    active: true,
  },
]

const notices: Notice[] = [
  {
    id: 'ntc_001',
    title: 'خوش آمدید به Lian VPN',
    message: 'برای شروع یکی از پلن‌ها رو انتخاب کن و اتصال امن داشته باش.',
    tone: 'lime',
  },
]

const faqs: FAQItem[] = [
  {
    id: 'faq_001',
    question: 'How do I receive the config after payment?',
    answer: 'As soon as the order is marked paid, the config is added to My Services and can be copied or downloaded instantly.',
  },
  {
    id: 'faq_002',
    question: 'Can I switch my route after buying?',
    answer: 'Yes. The service page lets you reset the config and support can move you to a better route when needed.',
  },
  {
    id: 'faq_003',
    question: 'Do you support iPhone, Android, Windows, and macOS?',
    answer: 'Yes. Each platform has a quick setup guide inside Support with the recommended client and steps.',
  },
  {
    id: 'faq_004',
    question: 'What happens after the subscription ends?',
    answer: 'The service status changes to expired, but your order history stays visible and you can renew with one tap.',
  },
]

const customers: CustomerSnapshot[] = []

export const createInitialState = (
  telegramUser?: TelegramUserProfile,
): PersistentState => ({
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
