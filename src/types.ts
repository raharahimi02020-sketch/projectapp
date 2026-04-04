export type Screen = 'landing' | 'home' | 'plans' | 'services' | 'support' | 'profile' | 'admin'

export type PlanCategory =
  | 'starter'
  | 'streaming'
  | 'family'
  | 'unlimited'
  | 'business'

export type ServiceStatus = 'active' | 'trial' | 'expiring' | 'expired'
export type TicketStatus = 'open' | 'pending' | 'resolved'
export type ServerStatus = 'online' | 'busy' | 'maintenance'
export type PaymentMethod = 'card' | 'crypto' | 'wallet'

export interface TelegramUserProfile {
  id: number
  first_name: string
  username?: string
  photo_url?: string
  is_premium?: boolean
}

export interface UserProfile {
  id: string
  firstName: string
  username: string
  avatarUrl?: string
  city: string
  preferredRegion: string
  walletCredit: number
  referralCode: string
  referrals: number
  premium: boolean
  memberSince: string
}

export interface Plan {
  id: string
  name: string
  category: PlanCategory
  subtitle: string
  description: string
  badge?: string
  featured?: boolean
  price: number
  durationDays: number
  deviceLimit: number
  locations: string[]
  speedTier: string
  dataCap: string
  protocols: string[]
  accent: string
  perks: string[]
}

export interface UserService {
  id: string
  planId: string
  planName: string
  status: ServiceStatus
  expiresAt: string
  devicesInUse: number
  deviceLimit: number
  region: string
  protocol: string
  configCode: string
  orderId: string
  latency: number
  uptime: string
}

export interface Order {
  id: string
  planId: string
  planName: string
  amount: number
  status: 'paid' | 'processing'
  paymentMethod: PaymentMethod
  kind: 'purchase' | 'renew' | 'upgrade' | 'trial'
  createdAt: string
  promoCode?: string
  serviceId?: string
  receiptImage?: string
  receiptFileName?: string
  receiptUploadedAt?: string
  user?: {
    telegramId?: number
    firstName: string
    username: string
  }
}

export interface TicketMessage {
  id: string
  from: 'user' | 'support'
  text: string
  timestamp: string
}

export interface SupportTicket {
  id: string
  title: string
  category: 'setup' | 'billing' | 'speed' | 'account'
  status: TicketStatus
  lastMessageAt: string
  messages: TicketMessage[]
}

export interface Server {
  id: string
  city: string
  country: string
  latency: number
  load: number
  status: ServerStatus
  protocols: string[]
}

export interface Campaign {
  id: string
  title: string
  description: string
  code: string
  discountPercent: number
  reward: string
  active: boolean
}

export interface Notice {
  id: string
  title: string
  message: string
  tone: 'lime' | 'ice' | 'amber'
}

export interface FAQItem {
  id: string
  question: string
  answer: string
}

export interface CustomerSnapshot {
  id: string
  name: string
  handle: string
  city: string
  activePlan: string
  status: ServiceStatus
  lifetimeValue: number
}

export interface PersistentState {
  profile: UserProfile
  plans: Plan[]
  services: UserService[]
  orders: Order[]
  tickets: SupportTicket[]
  servers: Server[]
  campaigns: Campaign[]
  notices: Notice[]
  faqs: FAQItem[]
  customers: CustomerSnapshot[]
  trialUsed: boolean
}
