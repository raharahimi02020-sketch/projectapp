import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react'
import './App.css'
import {
  LANGUAGE_STORAGE_KEY,
  createTranslator,
  languageOptions,
  type AppLanguage,
} from './i18n'
import { getTelegramUser, initTelegramShell, isAdminUser, pulseTelegram } from './lib/telegram'
import {
  loadPersistentState,
  savePersistentState,
} from './lib/storage'
import type {
  Campaign,
  CustomerSnapshot,
  FAQItem,
  Notice,
  Order,
  PaymentMethod,
  Plan,
  PlanCategory,
  Screen,
  Server,
  ServiceStatus,
  SupportTicket,
  UserProfile,
  UserService,
} from './types'

type PurchaseIntent =
  | {
      mode: 'buy' | 'renew' | 'upgrade'
      planId: string
      serviceId?: string
    }
  | null

type PurchaseNotificationPayload = {
  orderId: string
  createdAt: string
  kind: Order['kind']
  amount: number
  paymentMethod: PaymentMethod
  promoCode?: string
  user: {
    telegramId?: number
    firstName: string
    username: string
    city: string
  }
  plan: {
    id: string
    name: string
    durationDays: number
    deviceLimit: number
    protocols: string[]
    locations: string[]
  }
  service?: {
    region: string
    protocol: string
    expiresAt: string
    configCode: string
  }
}

const navItems: Array<{
  id: Exclude<Screen, 'admin'>
  label: string
  icon: typeof HomeIcon
}> = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'plans', label: 'Plans', icon: LayersIcon },
  { id: 'services', label: 'Orders', icon: ShieldIcon },
  { id: 'support', label: 'Support', icon: ChatIcon },
  { id: 'profile', label: 'Profile', icon: UserIcon },
]

const planCategories: Array<{ id: PlanCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'v2ray', label: 'V2Ray' },
  { id: 'openvpn', label: 'OpenVPN' },
]

const paymentOptions: Array<{ id: PaymentMethod; label: string }> = [
  { id: 'card', label: 'Card' },
  { id: 'crypto', label: 'Crypto' },
]

const bankTransferDetails = {
  note: 'Payment details',
  warning: 'Please upload the receipt after payment.',
  bank: 'Parsian Bank - Abedi',
  cardNumber: '6221061219677137',
  iban: 'IR280540109180021431636005',
} as const

const cryptoTransferDetails = {
  note: 'Wallet addresses',
  warning: 'Please upload the receipt after payment.',
  wallets: [
    {
      id: 'tron',
      asset: 'USDT',
      network: 'TRON',
      address: 'TFEgn9u5vV3tMUSaYeuWmkaAv5ec3nmGvd',
    },
    {
      id: 'ethereum',
      asset: 'USDT',
      network: 'Ethereum',
      address: '0x5eF41585E58E4DfF685e7bbDb7782E6741FcBA1B',
    },
    {
      id: 'ton',
      asset: 'USDT',
      network: 'TON',
      address: 'UQCijclDg_rAzZRjmlsgDA12YH2w3ABPlsH2vJOtoJVwjtRd',
    },
  ],
} as const


const setupGuides = [
  {
    platform: 'iPhone',
    client: 'V2Box',
    linkLabel: 'App Store',
    url: 'https://apps.apple.com/us/app/v2box-v2ray-client/id6446814690',
    steps: ['Install from the App Store', 'Import your config', 'Tap connect'],
  },
  {
    platform: 'Android',
    client: 'v2rayNG',
    linkLabel: 'GitHub',
    url: 'https://github.com/2dust/v2rayNG/releases',
    steps: ['Install from GitHub', 'Import your config', 'Enable VPN'],
  },
  {
    platform: 'Windows',
    client: 'v2rayN',
    linkLabel: 'Releases',
    url: 'https://github.com/2dust/v2rayN/releases',
    steps: ['Download the desktop release', 'Import your config', 'Launch the app'],
  },
  {
    platform: 'macOS',
    client: 'v2rayN',
    linkLabel: 'Releases',
    url: 'https://github.com/2dust/v2rayN/releases',
    steps: ['Download the macOS release', 'Import your config', 'Enable system proxy'],
  },
]
const daysRemaining = (value: string) =>
  Math.max(
    0,
    Math.ceil((new Date(value).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  )

const averageLatency = (servers: Server[]) => {
  const liveServers = servers.filter((server) => server.status !== 'maintenance')
  if (!liveServers.length) {
    return 0
  }

  const total = liveServers.reduce((sum, server) => sum + server.latency, 0)
  return Math.round(total / liveServers.length)
}

const makeId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const splitCsv = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const joinCsv = (items: string[]) => items.join(', ')

const toDateInputValue = (value: string) => value.slice(0, 10)

const toIsoDate = (value: string) =>
  value ? new Date(`${value}T12:00:00.000Z`).toISOString() : new Date().toISOString()

const createEmptyPlanDraft = (): Plan => ({
  id: '',
  name: '',
  category: 'v2ray',
  subtitle: '',
  description: '',
  badge: '',
  featured: false,
  price: 189000,
  durationDays: 30,
  deviceLimit: 2,
  locations: ['Germany'],
  speedTier: 'Fast',
  dataCap: 'Unlimited',
  protocols: ['VLESS'],
  accent: 'lime',
  perks: ['Instant delivery', 'V2Ray (VLESS)', 'Single user'],
})

const createEmptyCampaignDraft = (): Campaign => ({
  id: '',
  title: '',
  description: '',
  code: '',
  discountPercent: 10,
  reward: '',
  active: true,
})

const createEmptyFaqDraft = (): FAQItem => ({
  id: '',
  question: '',
  answer: '',
})

const serviceStatusOptions: ServiceStatus[] = ['active', 'trial', 'expiring', 'expired']
const accentOptions = ['lime', 'ice', 'amber'] as const

const resolvePrimaryService = (services: UserService[]) =>
  services.find((service) => service.status !== 'expired') ?? services[0]

const paidLifetimeValue = (orders: Order[]) =>
  orders.reduce((sum, order) => sum + (order.status === 'paid' ? order.amount : 0), 0)

const totalOrdersValue = (orders: Order[]) =>
  orders.reduce((sum, order) => sum + (order.status !== 'cancelled' && order.status !== 'rejected' ? order.amount : 0), 0)

const buildPrimaryCustomerSnapshot = (
  profile: UserProfile,
  services: UserService[],
  orders: Order[],
): CustomerSnapshot => {
  const primaryService = resolvePrimaryService(services)

  return {
    id: profile.id,
    name: profile.firstName,
    handle: `@${profile.username}`,
    city: profile.city,
    activePlan: primaryService?.planName ?? 'No active plan',
    status: primaryService?.status ?? 'expired',
    lifetimeValue: paidLifetimeValue(orders),
  }
}

const syncPrimaryCustomer = (
  profile: UserProfile,
  services: UserService[],
  orders: Order[],
  customers: CustomerSnapshot[],
) => {
  const nextSnapshot = buildPrimaryCustomerSnapshot(profile, services, orders)

  return customers.some((customer) => customer.id === nextSnapshot.id)
    ? customers.map((customer) =>
        customer.id === nextSnapshot.id ? { ...customer, ...nextSnapshot } : customer,
      )
    : [nextSnapshot, ...customers]
}

const buildConfigText = (service: UserService) => [
  '# LIAN config',
  `plan=${service.planName}`,
  `region=${service.region}`,
  `protocol=${service.protocol}`,
  `code=${service.configCode}`,
  `devices=${service.deviceLimit}`,
  `expires_at=${service.expiresAt}`,
].join('\n')

const slugify = (value: string) => value.toLowerCase().replace(/\s+/g, '-')

const statusLabel = (status: ServiceStatus) => {
  switch (status) {
    case 'active':
      return 'Active'
    case 'trial':
      return 'Trial'
    case 'expiring':
      return 'Expiring'
    default:
      return 'Expired'
  }
}

const ticketStatusLabel = (status: SupportTicket['status']) => {
  switch (status) {
    case 'open':
      return 'Open'
    case 'pending':
      return 'Pending'
    default:
      return 'Resolved'
  }
}

const createExpiry = (base: Date, durationDays: number) => {
  const next = new Date(base)
  next.setDate(next.getDate() + durationDays)
  return next.toISOString()
}

const chooseBestServer = (servers: Server[], plan: Plan) => {
  const candidates = servers
    .filter(
      (server) =>
        server.status !== 'maintenance' &&
        plan.locations.some((location) => location === server.country),
    )
    .sort((left, right) => left.load - right.load || left.latency - right.latency)

  return candidates[0] ?? servers[0]
}

const buildServiceForOrder = (
  plan: Plan,
  servers: Server[],
  profile: UserProfile,
  orderId: string,
  serviceId: string,
) => {
  const server = chooseBestServer(servers, plan)

  return {
    id: serviceId,
    planId: plan.id,
    planName: plan.name,
    status: plan.durationDays <= 30 ? ('expiring' as const) : ('active' as const),
    expiresAt: createExpiry(new Date(), plan.durationDays),
    devicesInUse: 1,
    deviceLimit: plan.deviceLimit,
    region: server.country,
    protocol: plan.protocols[0],
    configCode: `LIAN://${slugify(plan.name)}/${slugify(profile.username)}/${serviceId}`,
    orderId,
    latency: server.latency,
    uptime: '99.95%',
  }
}

const fulfillOrder = (
  services: UserService[],
  plans: Plan[],
  servers: Server[],
  profile: UserProfile,
  order: Order,
) => {
  const livePlan = plans.find((plan) => plan.id === order.planId)

  if (!livePlan) {
    return { services, fulfilledService: undefined as UserService | undefined }
  }

  if (order.kind === 'purchase' || order.kind === 'trial') {
    const nextService = buildServiceForOrder(
      livePlan,
      servers,
      profile,
      order.id,
      order.serviceId ?? makeId('svc'),
    )

    return {
      services: [
        nextService,
        ...services.filter(
          (service) => service.orderId !== order.id && service.id !== nextService.id,
        ),
      ],
      fulfilledService: nextService,
    }
  }

  if (!order.serviceId) {
    return { services, fulfilledService: undefined as UserService | undefined }
  }

  if (order.kind === 'renew') {
    let fulfilledService: UserService | undefined

    const nextServices = services.map((service) => {
      if (service.id !== order.serviceId) {
        return service
      }

      const baseDate =
        new Date(service.expiresAt).getTime() > Date.now()
          ? new Date(service.expiresAt)
          : new Date()

      fulfilledService = {
        ...service,
        status: 'active',
        expiresAt: createExpiry(baseDate, livePlan.durationDays),
        orderId: order.id,
      }

      return fulfilledService
    })

    return { services: nextServices, fulfilledService }
  }

  if (order.kind === 'upgrade') {
    const server = chooseBestServer(servers, livePlan)
    let fulfilledService: UserService | undefined

    const nextServices = services.map((service) => {
      if (service.id !== order.serviceId) {
        return service
      }

      fulfilledService = {
        ...service,
        planId: livePlan.id,
        planName: livePlan.name,
        status: 'active',
        expiresAt: createExpiry(new Date(), livePlan.durationDays),
        deviceLimit: livePlan.deviceLimit,
        region: server.country,
        protocol: livePlan.protocols[0],
        configCode: `LIAN://${slugify(livePlan.name)}/${slugify(profile.username)}/${service.id}`,
        orderId: order.id,
        latency: server.latency,
        uptime: '99.98%',
      }

      return fulfilledService
    })

    return { services: nextServices, fulfilledService }
  }

  return { services, fulfilledService: undefined as UserService | undefined }
}

const getCheckoutBase = (plan: Plan, mode: NonNullable<PurchaseIntent>['mode']) =>
  mode === 'upgrade' ? Math.max(Math.round(plan.price * 0.65), 119000) : plan.price

const getPromo = (campaigns: Campaign[], promoCode: string) =>
  campaigns.find(
    (campaign) =>
      campaign.active && campaign.code === promoCode.trim().toUpperCase(),
  )

const downloadTextFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

const copyText = async (value: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    return false
  }

  return false
}

const notifyPurchaseByEmail = async (payload: PurchaseNotificationPayload) => {
  try {
    await fetch('/api/purchase-notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // Purchase flow should not fail if email delivery is temporarily unavailable.
  }
}

const readReceiptImage = (file: File) =>
  new Promise<{ image: string; name: string }>((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('invalid_file_type'))
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      const image = typeof reader.result === 'string' ? reader.result : ''

      if (!image) {
        reject(new Error('empty_image'))
        return
      }

      resolve({ image, name: file.name })
    }

    reader.onerror = () => reject(new Error('read_failed'))
    reader.readAsDataURL(file)
  })

function App() {
  const telegramUser = getTelegramUser()
  const isAdmin = isAdminUser(telegramUser?.id)
  const [state, setState] = useState(() => loadPersistentState(telegramUser))
  const [language, setLanguage] = useState<AppLanguage>(() => {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
      return saved === 'ar' || saved === 'en' ? saved : 'fa'
    } catch {
      return 'fa'
    }
  })
  const [screen, setScreen] = useState<Screen>('home')
  const [search] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [activeCategory, setActiveCategory] = useState<PlanCategory | 'all'>('all')
  const [purchaseIntent, setPurchaseIntent] = useState<PurchaseIntent>(null)
  const [promoInput, setPromoInput] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [checkoutReceiptDraft, setCheckoutReceiptDraft] = useState<{
    image: string
    name: string
  } | null>(null)
  const [ticketTitle, setTicketTitle] = useState('')
  const [ticketCategory, setTicketCategory] =
    useState<SupportTicket['category']>('setup')
  const [ticketMessage, setTicketMessage] = useState('')
  const [adminTitle, setAdminTitle] = useState('')
  const [ticketReplyTexts, setTicketReplyTexts] = useState<Record<string, string>>({})
  const [deliveryDrafts, setDeliveryDrafts] = useState<Record<string, {
    configCode: string
    vpnUsername: string
    vpnPassword: string
    ovpnFileContent: string
  }>>({})

  const getDeliveryDraft = (orderId: string) =>
    deliveryDrafts[orderId] ?? { configCode: '', vpnUsername: '', vpnPassword: '', ovpnFileContent: '' }

  const setDeliveryField = (orderId: string, field: string, value: string) => {
    setDeliveryDrafts((prev) => ({
      ...prev,
      [orderId]: { ...getDeliveryDraft(orderId), [field]: value },
    }))
  }
  const [adminMessage, setAdminMessage] = useState('')
  const [adminTone, setAdminTone] = useState<'lime' | 'ice' | 'amber'>('lime')
  const [redisConnected, setRedisConnected] = useState<boolean | null>(null)
  const [newPlanDraft, setNewPlanDraft] = useState<Plan>(() => createEmptyPlanDraft())
  const [newCampaignDraft, setNewCampaignDraft] =
    useState<Campaign>(() => createEmptyCampaignDraft())
  const [newFaqDraft, setNewFaqDraft] = useState<FAQItem>(() => createEmptyFaqDraft())
  const [isPromoPanelOpen, setIsPromoPanelOpen] = useState(false)
  const [isCheckoutPromoPanelOpen, setIsCheckoutPromoPanelOpen] = useState(false)
  const [toast, setToast] = useState('')
  const i18n = createTranslator(language)
  const compactLocale =
    language === 'fa' ? 'fa-IR' : language === 'ar' ? 'ar-SA' : 'en-US'
  const {
    tr,
    dir,
    formatMoney,
    formatDate,
    formatNumber,
    daysLeft,
    daysAccess,
    devicesCount,
    moreLocations,
    uptimeLabel,
    promoApplied,
    copiedMessage,
  } = i18n
  const formatCompactValue = (value: number) =>
    new Intl.NumberFormat(compactLocale, {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(value)

  useEffect(() => {
    initTelegramShell()
  }, [])

  // Build store API URL with telegram ID as query param (avoids CORS preflight)
  const storeUrl = telegramUser?.id ? `/api/store?tgid=${telegramUser.id}` : '/api/store'

  useEffect(() => {
    const loadFromServer = async () => {
      try {
        const res = await fetch(storeUrl)
        if (!res.ok) return
        const data = await res.json()

        // Track Redis connectivity for admin warning
        if (typeof data._redis === 'boolean') {
          setRedisConnected(data._redis)
        }

        setState((prev) => {
          const next = { ...prev }

          // Load plans/campaigns/etc from server
          if (data.plans?.length) next.plans = data.plans
          if (data.campaigns?.length) next.campaigns = data.campaigns
          if (data.notices?.length) next.notices = data.notices
          if (data.faqs?.length) next.faqs = data.faqs
          if (data.servers?.length) next.servers = data.servers

          // Orders from server are already filtered by the API:
          // - Admin gets ALL orders
          // - User gets ONLY their own orders
          if (Array.isArray(data.orders)) {
            if (isAdmin) {
              // Admin: merge server orders with any local orders, server wins
              const localMap = new Map<string, Order>(prev.orders.map((o) => [o.id, o]))
              const serverMap = new Map<string, Order>(data.orders.map((o: Order) => [o.id, o]))
              const merged = new Map<string, Order>([...localMap, ...serverMap])
              // Keep local receipt images
              for (const [id, order] of merged) {
                const local = localMap.get(id)
                if (local?.receiptImage && !order.receiptImage) {
                  merged.set(id, { ...order, receiptImage: local.receiptImage, receiptFileName: local.receiptFileName, receiptUploadedAt: local.receiptUploadedAt })
                }
              }
              next.orders = Array.from(merged.values()).sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )
            } else {
              // User: update status of local orders from server (admin may have confirmed/rejected)
              // and add any server orders not present locally (e.g. user on new device)
              const serverMap = new Map<string, Order>(data.orders.map((o: Order) => [o.id, o]))
              const localIds = new Set(prev.orders.map((o) => o.id))
              const updatedLocal = prev.orders.map((localOrder) => {
                const sv = serverMap.get(localOrder.id)
                if (sv) {
                  return {
                    ...localOrder,
                    status: sv.status as Order['status'],
                    serviceId: sv.serviceId ?? localOrder.serviceId,
                    receiptImage: localOrder.receiptImage ?? sv.receiptImage,
                    receiptFileName: localOrder.receiptFileName ?? sv.receiptFileName,
                    receiptUploadedAt: localOrder.receiptUploadedAt ?? sv.receiptUploadedAt,
                  }
                }
                return localOrder
              })
              // Add server-only orders (not present locally)
              const serverOnly = data.orders.filter((o: Order) => !localIds.has(o.id))
              next.orders = [...updatedLocal, ...serverOnly].sort(
                (a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )
            }
          }

          return next
        })
      } catch {
        // silently fall back to localStorage state
      }
    }
    void loadFromServer()

    // Poll: admins every 10s, users every 30s
    const ms = isAdmin ? 10000 : 30000
    const interval = window.setInterval(() => { void loadFromServer() }, ms)
    return () => window.clearInterval(interval)
  }, [isAdmin, storeUrl])

  useEffect(() => {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      // Ignore storage failures in constrained webviews.
    }

    document.documentElement.lang = language
    document.documentElement.dir = dir
  }, [dir, language])

  useEffect(() => {
    savePersistentState(state)
    // Admin syncs public config (plans, campaigns, etc.) — NOT orders
    const syncToServer = async () => {
      try {
        await fetch(storeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plans: state.plans,
            campaigns: state.campaigns,
            notices: state.notices,
            faqs: state.faqs,
            servers: state.servers,
          }),
          keepalive: true,
        })
      } catch { /* silent */ }
    }
    if (isAdmin) void syncToServer()
  }, [state, isAdmin])

  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const timer = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const { body, documentElement } = document
    const previousBodyOverflow = body.style.overflow
    const previousHtmlOverflow = documentElement.style.overflow

    if (purchaseIntent) {
      body.style.overflow = 'hidden'
      documentElement.style.overflow = 'hidden'
    }

    return () => {
      body.style.overflow = previousBodyOverflow
      documentElement.style.overflow = previousHtmlOverflow
    }
  }, [purchaseIntent])

  const searchToken = deferredSearch.trim().toLowerCase()
  const planSearchToken = screen === 'plans' ? searchToken : ''
  const faqSearchToken = screen === 'support' ? searchToken : ''
  const activeServices = state.services.filter(
    (service) => service.status !== 'expired',
  )
  const openTicketCount = state.tickets.filter(
    (ticket) => ticket.status !== 'resolved',
  ).length
  const ALLOWED_PROTOCOLS = ['VLESS', 'VMess', 'Reality', 'OpenVPN', 'V2Ray']
  const filteredPlans = state.plans.filter((plan) => {
    const matchesCategory =
      activeCategory === 'all' || plan.category === activeCategory
    const hasAllowedProtocol = plan.protocols.some((p) =>
      ALLOWED_PROTOCOLS.includes(p)
    )
    const haystack = [
      tr(plan.name),
      tr(plan.subtitle),
      tr(plan.description),
      plan.locations.map((location) => tr(location)).join(' '),
      plan.perks.map((perk) => tr(perk)).join(' '),
    ]
      .join(' ')
      .toLowerCase()

    return matchesCategory && hasAllowedProtocol && (!planSearchToken || haystack.includes(planSearchToken))
  })
  const featuredPlans = filteredPlans.filter((plan) => plan.featured).slice(0, 3)
  const filteredFaqs = state.faqs.filter((faq) => {
    if (!faqSearchToken) {
      return true
    }

    const haystack = `${tr(faq.question)} ${tr(faq.answer)}`.toLowerCase()
    return haystack.includes(faqSearchToken)
  })
  const featuredCampaigns = state.campaigns.filter((campaign) => campaign.active)
  const selectedPlan = purchaseIntent
    ? state.plans.find((plan) => plan.id === purchaseIntent.planId)
    : undefined
  const selectedPromo = purchaseIntent
    ? getPromo(state.campaigns, promoInput)
    : undefined
  const checkoutAmount =
    selectedPlan && purchaseIntent
      ? Math.round(
          getCheckoutBase(selectedPlan, purchaseIntent.mode) *
            (1 - (selectedPromo?.discountPercent ?? 0) / 100),
        )
      : 0
  const avgPing = averageLatency(state.servers)
  const revenue = paidLifetimeValue(state.orders)
  const totalSpent = totalOrdersValue(state.orders)
  const activeUsers = state.customers.filter(
    (customer) => customer.status === 'active' || customer.status === 'expiring',
  ).length
  const nextExpiringService = [...activeServices].sort(
    (left, right) =>
      new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime(),
  )[0]
  const primaryService = activeServices[0]
  const serviceTone: 'lime' | 'ice' | 'amber' | 'neutral' = primaryService
    ? primaryService.status === 'active' || primaryService.status === 'trial'
      ? 'lime'
      : 'amber'
    : 'neutral'
  const showToast = (message: string) => setToast(message)

  const switchScreen = (next: Screen) => {
    startTransition(() => setScreen(next))
  }

  const openCheckout = (
    planId: string,
    mode: NonNullable<PurchaseIntent>['mode'],
    serviceId?: string,
  ) => {
    setPurchaseIntent({ planId, mode, serviceId })
    setPaymentMethod('card')
    setPromoInput('')
    setCheckoutReceiptDraft(null)
    setIsCheckoutPromoPanelOpen(false)
    pulseTelegram('light')
  }

  const closeCheckout = () => {
    setPurchaseIntent(null)
    setPromoInput('')
    setCheckoutReceiptDraft(null)
    setIsCheckoutPromoPanelOpen(false)
  }

  const copyPaymentDetail = async (value: string, label: string) => {
    const success = await copyText(value)
    pulseTelegram('light')
    showToast(success ? copiedMessage(label) : tr('Clipboard is not available'))
  }

  const applyOrderReceipt = async (orderId: string, file: File | null) => {
    if (!file) {
      return
    }

    try {
      const receipt = await readReceiptImage(file)

      setState((previous) => ({
        ...previous,
        orders: previous.orders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                receiptImage: receipt.image,
                receiptFileName: receipt.name,
                receiptUploadedAt: new Date().toISOString(),
              }
            : order,
        ),
      }))

      showToast(tr('Receipt uploaded'))
      pulseTelegram('light')

      // Sync receipt to server so admins can see it
      void fetch(storeUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_order',
          orderId,
          updates: {
            receiptImage: receipt.image,
            receiptFileName: receipt.name,
            receiptUploadedAt: new Date().toISOString(),
          },
        }),
        keepalive: true,
      }).catch(() => null)
    } catch {
      showToast(tr('Please choose an image file'))
    }
  }

  const handleCheckoutReceiptChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const receipt = await readReceiptImage(file)
      setCheckoutReceiptDraft(receipt)
      showToast(tr('Receipt attached to this order'))
      pulseTelegram('light')
    } catch {
      showToast(tr('Please choose an image file'))
    }
  }

  const startTrial = () => {
    if (state.trialUsed) {
      showToast(tr('Trial was already activated on this account'))
      return
    }

    const starterPlan = state.plans.find((plan) => plan.category === 'v2ray') ?? state.plans[0]
    if (!starterPlan) {
      return
    }

    setState((previous) => {
      const server = chooseBestServer(previous.servers, starterPlan)
      const orderId = makeId('ord')
      const serviceId = makeId('svc')
      const nextService: UserService = {
        id: serviceId,
        planId: starterPlan.id,
        planName: `${starterPlan.name} Trial`,
        status: 'trial',
        expiresAt: createExpiry(new Date(), 3),
        devicesInUse: 1,
        deviceLimit: starterPlan.deviceLimit,
        region: server.country,
        protocol: starterPlan.protocols[0],
        configCode: `LIAN://TRIAL/${slugify(previous.profile.username)}/${serviceId}`,
        orderId,
        latency: server.latency,
        uptime: '99.80%',
      }

      const existingCustomer = previous.customers.find(
        (customer) => customer.id === previous.profile.id,
      )
      const nextCustomer = existingCustomer
        ? previous.customers.map((customer) =>
            customer.id === previous.profile.id
              ? {
                  ...customer,
                  activePlan: nextService.planName,
                  status: 'trial' as const,
                }
              : customer,
          )
        : [
            {
              id: previous.profile.id,
              name: `${previous.profile.firstName} Demo`,
              handle: `@${previous.profile.username}`,
              city: previous.profile.city,
              activePlan: nextService.planName,
              status: 'trial' as const,
              lifetimeValue: 0,
            },
            ...previous.customers,
          ]

      return {
        ...previous,
        services: [nextService, ...previous.services],
        orders: [
          {
            id: orderId,
            planId: starterPlan.id,
            planName: starterPlan.name,
            amount: 0,
            status: 'paid',
            paymentMethod: 'card',
            kind: 'trial',
            createdAt: new Date().toISOString(),
            serviceId,
          },
          ...previous.orders,
        ],
        customers: nextCustomer,
        trialUsed: true,
      }
    })

    pulseTelegram('medium')
    showToast(tr('3 day trial unlocked'))
    switchScreen('services')
  }

  const confirmCheckout = () => {
    if (!purchaseIntent || !selectedPlan) {
      return
    }

    let notificationPayload: PurchaseNotificationPayload | null = null

    setState((previous) => {
      const livePlan = previous.plans.find((plan) => plan.id === purchaseIntent.planId)
      if (!livePlan) {
        return previous
      }

      const promo = getPromo(previous.campaigns, promoInput)
      const orderId = makeId('ord')
      const createdAt = new Date().toISOString()
      const targetServiceId =
        purchaseIntent.mode === 'buy' ? makeId('svc') : purchaseIntent.serviceId
      const manualReceiptFlow = true // all payments require receipt confirmation
      const orderKind: Order['kind'] =
        purchaseIntent.mode === 'buy'
          ? 'purchase'
          : purchaseIntent.mode === 'renew'
            ? 'renew'
            : 'upgrade'
      const amount = Math.round(
        getCheckoutBase(livePlan, purchaseIntent.mode) *
          (1 - (promo?.discountPercent ?? 0) / 100),
      )

      let nextServices = previous.services
      let notifiedService: UserService | undefined
      if (!manualReceiptFlow) {
        const fulfillment = fulfillOrder(
          previous.services,
          previous.plans,
          previous.servers,
          previous.profile,
          {
            id: orderId,
            planId: livePlan.id,
            planName: livePlan.name,
            amount,
            status: 'paid',
            paymentMethod,
            kind: orderKind,
            createdAt,
            promoCode: promo?.code,
            serviceId: targetServiceId,
          },
        )

        nextServices = fulfillment.services
        notifiedService = fulfillment.fulfilledService
      }

      const nextOrder: Order = {
        id: orderId,
        planId: livePlan.id,
        planName: livePlan.name,
        amount,
        status: manualReceiptFlow ? 'processing' : 'paid',
        paymentMethod,
        kind: orderKind,
        createdAt,
        promoCode: promo?.code,
        serviceId: targetServiceId,
        receiptImage: manualReceiptFlow ? checkoutReceiptDraft?.image : undefined,
        receiptFileName: manualReceiptFlow ? checkoutReceiptDraft?.name : undefined,
        receiptUploadedAt:
          manualReceiptFlow && checkoutReceiptDraft ? createdAt : undefined,
        user: {
          telegramId: telegramUser?.id,
          firstName: previous.profile.firstName,
          username: previous.profile.username,
        },
      }

      const nextOrders = [nextOrder, ...previous.orders]

      notificationPayload = {
        orderId,
        createdAt,
        kind: orderKind,
        amount,
        paymentMethod,
        promoCode: promo?.code,
        user: {
          telegramId: telegramUser?.id,
          firstName: previous.profile.firstName,
          username: previous.profile.username,
          city: previous.profile.city,
        },
        plan: {
          id: livePlan.id,
          name: livePlan.name,
          durationDays: livePlan.durationDays,
          deviceLimit: livePlan.deviceLimit,
          protocols: livePlan.protocols,
          locations: livePlan.locations,
        },
        service: notifiedService
          ? {
              region: notifiedService.region,
              protocol: notifiedService.protocol,
              expiresAt: notifiedService.expiresAt,
              configCode: notifiedService.configCode,
            }
          : undefined,
      }

      return {
        ...previous,
        services: nextServices,
        orders: nextOrders,
        customers: syncPrimaryCustomer(
          previous.profile,
          nextServices,
          nextOrders,
          previous.customers,
        ),
      }
    })

    if (notificationPayload) {
      const payload = notificationPayload as PurchaseNotificationPayload
      void notifyPurchaseByEmail(payload)

      // Save order to server so admins can see it (with retry + visible debug)
      const orderData = {
        action: 'submit_order',
        order: {
          id: payload.orderId,
          planId: payload.plan.id,
          planName: payload.plan.name,
          amount: payload.amount,
          status: 'processing' as const,
          paymentMethod: payload.paymentMethod,
          kind: payload.kind,
          createdAt: payload.createdAt,
          promoCode: payload.promoCode,
          user: {
            telegramId: payload.user.telegramId,
            firstName: payload.user.firstName,
            username: payload.user.username,
          },
          receiptImage: checkoutReceiptDraft?.image,
          receiptFileName: checkoutReceiptDraft?.name,
          receiptUploadedAt: checkoutReceiptDraft ? payload.createdAt : undefined,
        },
      }

      // Submit with retry and visible feedback
      ;(async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const r = await fetch(storeUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(orderData),
            })
            if (r.ok) {
              console.log('[submit_order] ✅ Order synced to server:', payload.orderId)
              showToast('✅ سفارش به سرور ارسال شد')
              return
            }
            console.error(`[submit_order] Server ${r.status} attempt ${attempt + 1}`)
          } catch (err) {
            console.error(`[submit_order] Network error attempt ${attempt + 1}:`, err)
          }
          await new Promise((ok) => setTimeout(ok, 2000))
        }
        showToast('⚠️ خطا در ارسال سفارش به سرور')
        console.error('[submit_order] ❌ All retries failed:', payload.orderId)
      })()
    } else {
      console.error('[confirmCheckout] ❌ notificationPayload is NULL — order was NOT sent to server')
      showToast('⚠️ خطا: سفارش به سرور ارسال نشد')
    }

    pulseTelegram('heavy')
    showToast(tr('Order submitted — awaiting payment receipt'))
    closeCheckout()
    switchScreen('services')
  }

  const downloadConfig = (service: UserService) => {
    downloadTextFile(
      `${slugify(service.planName)}-${service.id}.txt`,
      buildConfigText(service),
    )
    pulseTelegram('light')
    showToast(tr('Config file downloaded'))
  }

  const copyConfig = async (service: UserService) => {
    const success = await copyText(service.configCode)
    pulseTelegram('light')
    showToast(
      success ? tr('Config copied to clipboard') : tr('Clipboard is not available'),
    )
  }

  const copyVpnCredentials = async (service: UserService) => {
    const text = `Username: ${service.vpnUsername ?? ''}
Password: ${service.vpnPassword ?? ''}`
    const success = await copyText(text)
    pulseTelegram('light')
    showToast(success ? 'یوزرنیم و پسورد کپی شد' : tr('Clipboard is not available'))
  }

  const downloadOvpnFile = (service: UserService) => {
    if (!service.ovpnFileContent) return
    downloadTextFile(service.ovpnFileName ?? 'lian.ovpn', service.ovpnFileContent)
    pulseTelegram('light')
    showToast('فایل OpenVPN دانلود شد')
  }

  const openUpgrade = (service: UserService) => {
    const currentPlan = state.plans.find((plan) => plan.id === service.planId)
    const upgrade =
      state.plans
        .filter((plan) => (currentPlan ? plan.price > currentPlan.price : true))
        .sort((left, right) => left.price - right.price)[0] ?? state.plans.at(-1)

    if (!upgrade) {
      showToast(tr('You are already on the highest plan'))
      return
    }

    openCheckout(upgrade.id, 'upgrade', service.id)
  }

  const submitTicket = () => {
    if (!ticketTitle.trim() || !ticketMessage.trim()) {
      showToast(tr('Fill in the ticket title and message'))
      return
    }

    setState((previous) => ({
      ...previous,
      tickets: [
        {
          id: makeId('tkt'),
          title: ticketTitle.trim(),
          category: ticketCategory,
          status: 'open',
          lastMessageAt: new Date().toISOString(),
          messages: [
            {
              id: makeId('msg'),
              from: 'user',
              text: ticketMessage.trim(),
              timestamp: new Date().toISOString(),
            },
          ],
        },
        ...previous.tickets,
      ],
    }))

    setTicketTitle('')
    setTicketMessage('')
    setTicketCategory('setup')
    pulseTelegram('medium')
    showToast(tr('Ticket sent to support'))
  }

  const updateServiceField = <K extends keyof UserService>(
    serviceId: string,
    field: K,
    value: UserService[K],
  ) => {
    setState((previous) => {
      const currentService = previous.services.find((service) => service.id === serviceId)

      if (!currentService) {
        return previous
      }

      let services = previous.services
      let orders = previous.orders

      if (field === 'planId') {
        const nextPlan =
          previous.plans.find((plan) => plan.id === value) ??
          previous.plans.find((plan) => plan.id === currentService.planId)

        services = previous.services.map((service) =>
          service.id === serviceId
            ? {
                ...service,
                planId: nextPlan?.id ?? service.planId,
                planName: nextPlan?.name ?? service.planName,
                deviceLimit: nextPlan?.deviceLimit ?? service.deviceLimit,
              }
            : service,
        )

        orders = previous.orders.map((order) =>
          order.id === currentService.orderId
            ? {
                ...order,
                planId: nextPlan?.id ?? order.planId,
                planName: nextPlan?.name ?? order.planName,
                amount: nextPlan?.price ?? order.amount,
              }
            : order,
        )
      } else {
        services = previous.services.map((service) =>
          service.id === serviceId ? { ...service, [field]: value } : service,
        )
      }

      return {
        ...previous,
        services,
        orders,
        customers: syncPrimaryCustomer(
          previous.profile,
          services,
          orders,
          previous.customers,
        ),
      }
    })
  }


  const updatePlanField = <K extends keyof Plan>(planId: string, field: K, value: Plan[K]) => {
    setState((previous) => {
      const currentPlan = previous.plans.find((plan) => plan.id === planId)

      if (!currentPlan) {
        return previous
      }

      const plans = previous.plans.map((plan) =>
        plan.id === planId ? { ...plan, [field]: value } : plan,
      )

      const nextPlan =
        plans.find((plan) => plan.id === planId) ??
        currentPlan

      const services = previous.services.map((service) => {
        if (service.planId !== planId) {
          return service
        }

        return {
          ...service,
          planName:
            field === 'name' ? String(value) : nextPlan.name,
          deviceLimit:
            field === 'deviceLimit' ? Number(value) : nextPlan.deviceLimit,
        }
      })

      const orders = previous.orders.map((order) =>
        order.planId === planId
          ? {
              ...order,
              planName: field === 'name' ? String(value) : nextPlan.name,
            }
          : order,
      )

      const customers = syncPrimaryCustomer(
        previous.profile,
        services,
        orders,
        previous.customers.map((customer) =>
          customer.activePlan === currentPlan.name
            ? { ...customer, activePlan: nextPlan.name }
            : customer,
        ),
      )

      return { ...previous, plans, services, orders, customers }
    })
  }

  const updateCampaignField = <K extends keyof Campaign>(
    campaignId: string,
    field: K,
    value: Campaign[K],
  ) => {
    setState((previous) => ({
      ...previous,
      campaigns: previous.campaigns.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              [field]:
                field === 'code' ? String(value).trim().toUpperCase() : value,
            }
          : campaign,
      ),
    }))
  }

  const updateNoticeField = <K extends keyof Notice>(
    noticeId: string,
    field: K,
    value: Notice[K],
  ) => {
    setState((previous) => ({
      ...previous,
      notices: previous.notices.map((notice) =>
        notice.id === noticeId ? { ...notice, [field]: value } : notice,
      ),
    }))
  }

  const updateFaqField = <K extends keyof FAQItem>(
    faqId: string,
    field: K,
    value: FAQItem[K],
  ) => {
    setState((previous) => ({
      ...previous,
      faqs: previous.faqs.map((faq) =>
        faq.id === faqId ? { ...faq, [field]: value } : faq,
      ),
    }))
  }

  const updateNewPlanField = <K extends keyof Plan>(field: K, value: Plan[K]) => {
    setNewPlanDraft((previous) => ({ ...previous, [field]: value }))
  }

  const updateNewCampaignField = <K extends keyof Campaign>(
    field: K,
    value: Campaign[K],
  ) => {
    setNewCampaignDraft((previous) => ({
      ...previous,
      [field]: field === 'code' ? String(value).trim().toUpperCase() : value,
    }))
  }

  const updateNewFaqField = <K extends keyof FAQItem>(field: K, value: FAQItem[K]) => {
    setNewFaqDraft((previous) => ({ ...previous, [field]: value }))
  }

  const addPlan = () => {
    const trimmedName = newPlanDraft.name.trim()

    if (!trimmedName) {
      showToast(tr('Add a package name first'))
      return
    }

    const nextPlan: Plan = {
      ...newPlanDraft,
      id: newPlanDraft.id.trim() || slugify(trimmedName) || makeId('plan'),
      name: trimmedName,
      subtitle: newPlanDraft.subtitle.trim() || trimmedName,
      description: newPlanDraft.description.trim() || trimmedName,
      badge: newPlanDraft.badge?.trim() || undefined,
      price: Math.max(99000, Number(newPlanDraft.price) || 0),
      durationDays: Math.max(1, Number(newPlanDraft.durationDays) || 30),
      deviceLimit: Math.max(1, Number(newPlanDraft.deviceLimit) || 1),
      locations: newPlanDraft.locations.length ? newPlanDraft.locations : [],
      protocols: newPlanDraft.protocols.length ? newPlanDraft.protocols : ['VLESS'],
      perks: newPlanDraft.perks.length ? newPlanDraft.perks : ['Instant delivery'],
    }

    setState((previous) => ({
      ...previous,
      plans: [nextPlan, ...previous.plans],
    }))
    setNewPlanDraft(createEmptyPlanDraft())
    pulseTelegram('medium')
    showToast(tr('New package added'))
  }

  const deletePlan = (planId: string) => {
    setState((prev) => ({ ...prev, plans: prev.plans.filter((p) => p.id !== planId) }))
    pulseTelegram('medium')
    showToast(tr('Package deleted'))
  }

  const deleteCampaign = (campaignId: string) => {
    setState((prev) => ({ ...prev, campaigns: prev.campaigns.filter((c) => c.id !== campaignId) }))
    showToast(tr('Discount code deleted'))
  }

  const deleteFaq = (faqId: string) => {
    setState((prev) => ({ ...prev, faqs: prev.faqs.filter((f) => f.id !== faqId) }))
    showToast(tr('FAQ deleted'))
  }

  const addCampaign = () => {
    const trimmedTitle = newCampaignDraft.title.trim()
    const trimmedCode = newCampaignDraft.code.trim().toUpperCase()

    if (!trimmedTitle || !trimmedCode) {
      showToast(tr('Add a title and discount code first'))
      return
    }

    const nextCampaign: Campaign = {
      ...newCampaignDraft,
      id: newCampaignDraft.id.trim() || makeId('cmp'),
      title: trimmedTitle,
      description: newCampaignDraft.description.trim() || trimmedTitle,
      code: trimmedCode,
      reward:
        newCampaignDraft.reward.trim() ||
        `${Math.max(1, Number(newCampaignDraft.discountPercent) || 0)}% off`,
      discountPercent: Math.max(1, Number(newCampaignDraft.discountPercent) || 0),
    }

    setState((previous) => ({
      ...previous,
      campaigns: [nextCampaign, ...previous.campaigns],
    }))
    setNewCampaignDraft(createEmptyCampaignDraft())
    pulseTelegram('medium')
    showToast(tr('New discount code added'))
  }

  const addFaq = () => {
    const trimmedQuestion = newFaqDraft.question.trim()
    const trimmedAnswer = newFaqDraft.answer.trim()

    if (!trimmedQuestion || !trimmedAnswer) {
      showToast(tr('Add a question and answer first'))
      return
    }

    const nextFaq: FAQItem = {
      id: newFaqDraft.id.trim() || makeId('faq'),
      question: trimmedQuestion,
      answer: trimmedAnswer,
    }

    setState((previous) => ({
      ...previous,
      faqs: [nextFaq, ...previous.faqs],
    }))
    setNewFaqDraft(createEmptyFaqDraft())
    pulseTelegram('medium')
    showToast(tr('New FAQ added'))
  }

  const publishNotice = () => {
    if (!adminTitle.trim() || !adminMessage.trim()) {
      showToast(tr('Write a title and message before publishing'))
      return
    }

    setState((previous) => ({
      ...previous,
      notices: [
        {
          id: makeId('ntc'),
          title: adminTitle.trim(),
          message: adminMessage.trim(),
          tone: adminTone,
        },
        ...previous.notices,
      ],
    }))
    setAdminTitle('')
    setAdminMessage('')
    setAdminTone('lime')
    pulseTelegram('medium')
    showToast(tr('Broadcast notice published to the home screen'))
  }

  const confirmDelivery = (orderId: string) => {
    const draft = getDeliveryDraft(orderId)
    if (!draft.configCode && !draft.vpnUsername && !draft.ovpnFileContent) {
      showToast('حداقل یک نوع سرویس وارد کن (V2Ray یا OpenVPN)')
      return
    }

    setState((prev) => {
      const order = prev.orders.find((o) => o.id === orderId)
      if (!order) return prev

      // Create or update the service
      const serviceId = order.serviceId ?? makeId('svc')
      const livePlan = prev.plans.find((p) => p.id === order.planId) ?? prev.plans[0]

      const existingService = prev.services.find((s) => s.id === serviceId)

      const newService: typeof prev.services[0] = existingService
        ? {
            ...existingService,
            status: 'active',
            configCode: draft.configCode || existingService.configCode,
            vpnUsername: draft.vpnUsername || undefined,
            vpnPassword: draft.vpnPassword || undefined,
            ovpnFileContent: draft.ovpnFileContent || undefined,
            ovpnFileName: draft.ovpnFileContent
              ? `lian-${serviceId.slice(-6)}.ovpn`
              : undefined,
          }
        : {
            id: serviceId,
            planId: order.planId,
            planName: order.planName,
            status: 'active' as const,
            expiresAt: createExpiry(new Date(), livePlan?.durationDays ?? 30),
            devicesInUse: 1,
            deviceLimit: livePlan?.deviceLimit ?? 1,
            region: '',
            protocol: draft.configCode ? 'V2Ray' : 'OpenVPN',
            configCode: draft.configCode,
            orderId,
            latency: 0,
            uptime: '99.9%',
            vpnUsername: draft.vpnUsername || undefined,
            vpnPassword: draft.vpnPassword || undefined,
            ovpnFileContent: draft.ovpnFileContent || undefined,
            ovpnFileName: draft.ovpnFileContent
              ? `lian-${serviceId.slice(-6)}.ovpn`
              : undefined,
          }

      const services = existingService
        ? prev.services.map((s) => (s.id === serviceId ? newService : s))
        : [...prev.services, newService]

      const orders = prev.orders.map((o) =>
        o.id === orderId
          ? { ...o, status: 'paid' as const, serviceId }
          : o
      )

      return {
        ...prev,
        services,
        orders,
        customers: syncPrimaryCustomer(prev.profile, services, orders, prev.customers),
      }
    })

    // Clear the draft after delivery
    setDeliveryDrafts((prev) => {
      const next = { ...prev }
      delete next[orderId]
      return next
    })

    // Sync order status to server
    void fetch(storeUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_order',
        orderId,
        updates: { status: 'paid', serviceId: orderId },
      }),
      keepalive: true,
    }).catch(() => null)

    pulseTelegram('heavy')
    showToast('✅ سرویس تایید و ارسال شد')
  }

  // ── User: cancel own order ──
  const cancelOrder = (orderId: string) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === orderId && o.status === 'processing'
          ? { ...o, status: 'cancelled' as const }
          : o,
      ),
    }))
    void fetch(storeUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_order',
        orderId,
        updates: { status: 'cancelled' },
      }),
      keepalive: true,
    }).catch(() => null)
    pulseTelegram('medium')
    showToast(tr('Order cancelled'))
  }

  // ── Admin: reject order ──
  const rejectOrder = (orderId: string) => {
    if (!window.confirm(tr('Confirm reject?'))) return
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === orderId ? { ...o, status: 'rejected' as const } : o,
      ),
    }))
    void fetch(storeUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_order',
        orderId,
        updates: { status: 'rejected' },
      }),
      keepalive: true,
    }).catch(() => null)
    pulseTelegram('heavy')
    showToast(tr('Order rejected'))
  }

  // ── Admin: delete order ──
  const deleteOrder = (orderId: string) => {
    if (!window.confirm(tr('Confirm delete?'))) return
    setState((prev) => ({
      ...prev,
      orders: prev.orders.filter((o) => o.id !== orderId),
    }))
    void fetch(storeUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_order',
        orderId,
      }),
      keepalive: true,
    }).catch(() => null)
    pulseTelegram('heavy')
    showToast(tr('Order deleted'))
  }

  const replyToTicket = (ticketId: string) => {
    const text = (ticketReplyTexts[ticketId] ?? '').trim()
    if (!text) {
      showToast(tr('Write a reply first'))
      return
    }
    setState((prev) => ({
      ...prev,
      tickets: prev.tickets.map((ticket) =>
        ticket.id !== ticketId
          ? ticket
          : {
              ...ticket,
              status: 'pending' as const,
              lastMessageAt: new Date().toISOString(),
              messages: [
                ...ticket.messages,
                {
                  id: makeId('msg'),
                  from: 'support' as const,
                  text,
                  timestamp: new Date().toISOString(),
                },
              ],
            }
      ),
    }))
    setTicketReplyTexts((prev) => ({ ...prev, [ticketId]: '' }))
    pulseTelegram('medium')
    showToast(tr('Reply sent'))
  }

  const closeTicket = (ticketId: string) => {
    setState((prev) => ({
      ...prev,
      tickets: prev.tickets.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status: 'resolved' as const } : ticket
      ),
    }))
    showToast(tr('Ticket closed'))
  }


  const copyPromoCode = async (code: string) => {
    const success = await copyText(code)
    setPromoInput(code)
    setIsPromoPanelOpen(false)
    pulseTelegram('light')
    showToast(success ? copiedMessage(code) : tr('Clipboard is not available'))
  }

  const applyCheckoutPromoCode = (code: string) => {
    setPromoInput(code)
    setIsCheckoutPromoPanelOpen(false)
    pulseTelegram('light')
  }

  const renderHome = () => (
    <>
      <section className="profile-card card-frame subscriber-card">
        <div className="profile-row subscriber-head">
          <div className="avatar-shell">
            {state.profile.avatarUrl ? (
              <img src={state.profile.avatarUrl} alt={state.profile.firstName} />
            ) : (
              <span>{state.profile.firstName.slice(0, 1)}</span>
            )}
          </div>

          <div className="subscriber-copy">
            <p className="eyebrow">{tr('Subscriber')}</p>
            <h2>{state.profile.firstName}</h2>
            <p className="muted-copy">
              @{state.profile.username} • {tr(state.profile.city)}
            </p>
          </div>

          <StatusPill tone={serviceTone}>
            {primaryService ? tr(statusLabel(primaryService.status)) : tr('Inactive')}
          </StatusPill>
        </div>
      </section>

      <section className="content-section">
        <SectionHeader
          title={tr('سرویس‌های پیشنهادی')}
        />

        <div className="plan-grid">
          {featuredPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              actionLabel={tr('Buy now')}
              tr={tr}
              formatMoney={formatMoney}
              daysAccess={daysAccess}
              devicesCount={devicesCount}
              moreLocations={moreLocations}
              onAction={() => openCheckout(plan.id, 'buy')}
            />
          ))}
        </div>
      </section>

    </>
  )

  const renderPlans = () => (
    <>
      <section className="content-section">
        <div className="plans-header-stack">
          <SectionHeader
            eyebrow={tr('Catalog')}
            title={tr('VPN plans ready to sell')}
            subtitle={tr('This screen covers list, compare, coupon input, and direct checkout.')}
            action={
              <button
                className="ghost-button small icon-button"
                onClick={() => setIsPromoPanelOpen((open) => !open)}
                aria-label={
                  isPromoPanelOpen ? tr('Close') : tr('Discount codes')
                }
                aria-expanded={isPromoPanelOpen}
                aria-controls="promo-panel"
              >
                {isPromoPanelOpen ? <CloseIcon /> : <TagIcon />}
              </button>
            }
          />

          {isPromoPanelOpen ? (
            <div className="promo-popover card-frame" id="promo-panel">
              <div className="promo-popover-head">
                <div>
                  <p className="eyebrow">{tr('Discount codes')}</p>
                  <h3>{tr('Copy and use in checkout')}</h3>
                </div>
                <button
                  className="ghost-button small icon-button"
                  onClick={() => setIsPromoPanelOpen(false)}
                  aria-label={tr('Close')}
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="promo-code-list">
                {featuredCampaigns.map((campaign) => (
                  <div key={campaign.id} className="promo-code-row">
                    <div>
                      <strong>{campaign.code}</strong>
                      <p className="muted-copy">{tr(campaign.reward)}</p>
                    </div>
                    <button
                      className="primary-button"
                      onClick={() => void copyPromoCode(campaign.code)}
                    >
                      {tr('Copy')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="tab-slider"
          role="tablist"
          aria-label={tr('Plans')}
        >
          {planCategories.map((category) => (
            <button
              key={category.id}
              className={`chip tab-chip ${activeCategory === category.id ? 'chip-active' : ''}`}
              role="tab"
              aria-selected={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
            >
              {tr(category.label)}
            </button>
          ))}
        </div>
      </section>

      <section className="content-section">
        <div className="plan-grid">
          {filteredPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              actionLabel={tr('Open checkout')}
              tr={tr}
              formatMoney={formatMoney}
              daysAccess={daysAccess}
              devicesCount={devicesCount}
              moreLocations={moreLocations}
              onAction={() => openCheckout(plan.id, 'buy')}
            />
          ))}
        </div>
      </section>
    </>
  )

  const renderServices = () => (
    <>
      <section className="content-section">
        <SectionHeader
          eyebrow=""
          title={tr('My services')}
        />

        <div className="order-card-list">
          {state.orders.length ? (
            state.orders.map((order) => {
              const linkedService = activeServices.find(
                (service) => service.orderId === order.id,
              )

              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  service={linkedService}
                  tr={tr}
                  formatDate={formatDate}
                  formatMoney={formatMoney}
                  formatNumber={formatNumber}
                  daysLeft={daysLeft}
                  uptimeLabel={uptimeLabel}
                  onCopy={linkedService?.configCode ? () => copyConfig(linkedService) : undefined}
                  onDownload={linkedService ? () => downloadConfig(linkedService) : undefined}
                  onCopyCredentials={linkedService?.vpnUsername ? () => copyVpnCredentials(linkedService) : undefined}
                  onDownloadOvpn={linkedService?.ovpnFileContent ? () => downloadOvpnFile(linkedService) : undefined}
                  onCopyPaymentValue={copyPaymentDetail}
                  onUploadReceipt={(file) => void applyOrderReceipt(order.id, file)}
                  onRenew={
                    linkedService
                      ? () => openCheckout(linkedService.planId, 'renew', linkedService.id)
                      : undefined
                  }
                  onUpgrade={linkedService ? () => openUpgrade(linkedService) : undefined}
                  onCancel={order.status === 'processing' ? () => cancelOrder(order.id) : undefined}
                />
              )
            })
          ) : (
            <div className="empty-card">
              <h3>{tr('Order history')}</h3>
              <p>{tr('No orders yet')}</p>
              <button className="primary-button" onClick={() => switchScreen('plans')}>
                {tr('Browse plans')}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="content-section">
        <div className="orders-overview card-frame">
          <div className="orders-overview-head">
            <div className="orders-overview-copy">
              <p className="eyebrow">{tr('Orders')}</p>
              <h2>{tr('Order history')}</h2>
              <p className="muted-copy">
                {tr('Paid orders, revenue, and next renewal at a glance.')}
              </p>
            </div>
            <button className="ghost-button small orders-overview-action" onClick={() => switchScreen('plans')}>
              {tr('Add plan')}
            </button>
          </div>

          <div className="mini-stats orders-overview-grid">
            <MetricTile
              label={tr('Orders')}
              value={formatNumber(state.orders.length)}
              icon={<ReceiptIcon />}
              iconOnly
              compact
            />
            <MetricTile
              label={tr('Services')}
              value={formatNumber(activeServices.length)}
              icon={<ShieldIcon />}
              iconOnly
              compact
            />
            <MetricTile
              label={tr('Total paid')}
              value={formatCompactValue(totalSpent)}
              icon={<WalletIcon />}
              iconOnly
              compact
            />
            <MetricTile
              label={tr('Next expiry')}
              value={
                nextExpiringService
                  ? daysLeft(daysRemaining(nextExpiringService.expiresAt))
                  : tr('No expiry')
              }
              icon={<CalendarIcon />}
              iconOnly
              compact
            />
          </div>
        </div>
      </section>
    </>
  )

  const renderSupport = () => (
    <>
      <section className="content-section">
        <SectionHeader
          eyebrow=""
          title={tr('Support')}
        />

        <div className="grid-two">
          {setupGuides.map((guide) => (
            <div key={guide.platform} className="content-card guide-card">
              <div className="guide-card-head">
                <div>
                  <p className="eyebrow">{tr(guide.platform)}</p>
                  <h3 className="guide-client">{guide.client}</h3>
                </div>
                <a
                  className="guide-link"
                  href={guide.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${guide.client} ${tr('Open link')}`}
                >
                  <span>{tr(guide.linkLabel)}</span>
                  <LaunchIcon />
                </a>
              </div>
              <ul className="guide-steps">
                {guide.steps.map((step) => (
                  <li key={step}>{tr(step)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="content-section">
        <div className="support-form card-frame">
          <div className="support-form-head">
            <p className="eyebrow">{tr('Open a ticket')}</p>
            <h2>{tr('Support inbox')}</h2>
          </div>
          <div className="form-grid">
            <input
              className="field"
              placeholder={tr('Ticket title')}
              value={ticketTitle}
              onChange={(event) => setTicketTitle(event.target.value)}
            />
            <select
              className="field"
              value={ticketCategory}
              onChange={(event) =>
                setTicketCategory(event.target.value as SupportTicket['category'])
              }
            >
              <option value="setup">{tr('Setup')}</option>
              <option value="billing">{tr('Billing')}</option>
              <option value="speed">{tr('Speed')}</option>
              <option value="account">{tr('Account')}</option>
            </select>
            <textarea
              className="field field-area"
              placeholder={tr('Describe the issue')}
              value={ticketMessage}
              onChange={(event) => setTicketMessage(event.target.value)}
            />
            <button className="primary-button" onClick={submitTicket}>
              {tr('Send ticket')}
            </button>
          </div>
        </div>
      </section>

      <section className="content-section">
        <SectionHeader
          eyebrow=""
          title={tr('My tickets')}
        />

        <div className="ticket-list">
          {state.tickets.map((ticket) => (
            <details key={ticket.id} className="ticket-card ticket-accordion">
              <summary className="ticket-summary">
                <div className="ticket-summary-copy">
                  <div className="stat-line">
                    <StatusPill tone={ticket.status === 'resolved' ? 'ice' : 'amber'}>
                      {tr(ticketStatusLabel(ticket.status))}
                    </StatusPill>
                    <span>{formatDate(ticket.lastMessageAt)}</span>
                  </div>
                  <h3>{tr(ticket.title)}</h3>
                </div>
                <span className="ticket-toggle" aria-hidden="true">
                  <ChevronIcon />
                </span>
              </summary>
              <div className="ticket-thread">
                {ticket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`ticket-message ticket-${message.from}`}
                  >
                    <strong>{tr(message.from)}</strong>
                    <p>{tr(message.text)}</p>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="content-section">
        <SectionHeader
          eyebrow=""
          title={tr('FAQ')}
        />

        <div className="faq-list">
          {filteredFaqs.map((faq) => (
            <details key={faq.id} className="faq-item">
              <summary>{tr(faq.question)}</summary>
              <p>{tr(faq.answer)}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  )

  const renderProfile = () => (
    <>
      <section className="content-section">
        <div className="profile-card card-frame">
          <div className="profile-row">
            <div className="avatar-shell">
              {state.profile.avatarUrl ? (
                <img src={state.profile.avatarUrl} alt={state.profile.firstName} />
              ) : (
                <span>{state.profile.firstName.slice(0, 1)}</span>
              )}
            </div>
            <div>
              <p className="eyebrow">{tr('Account')}</p>
              <h2>{state.profile.firstName}</h2>
              <p className="muted-copy">
                @{state.profile.username} • {tr(state.profile.city)} • {tr('member since')}{' '}
                {formatDate(state.profile.memberSince)}
              </p>
            </div>
          </div>


        </div>
      </section>

      <section className="content-section">
        <SectionHeader
          eyebrow={tr('Orders')}
          title={tr('Lifetime value view')}
        />

        <div className="customer-row card-frame">
          <strong>{tr('Total paid')}</strong>
          <span>{formatMoney(totalSpent)}</span>
        </div>
      </section>

      <section className="content-section">
        {isAdmin ? (
          <button className="primary-button full-width" onClick={() => switchScreen('admin')}>
            {tr('Open admin console')}
          </button>
        ) : null}
      </section>
    </>
  )

  const renderAdmin = () => (
    <>
      <section className="content-section">
        <SectionHeader
          eyebrow={tr('Admin')}
          title={tr('Operator console')}
          action={
            <button className="link-button" onClick={() => switchScreen('profile')}>
              {tr('Back to profile')}
            </button>
          }
        />

        <div className="admin-grid">
          <MetricTile label={tr('Revenue')} value={formatMoney(revenue)} />
          <MetricTile label={tr('Active users')} value={formatNumber(activeUsers)} />
          <MetricTile label={tr('Open tickets')} value={formatNumber(openTicketCount)} />
          <MetricTile label={tr('Avg latency')} value={`${formatNumber(avgPing)}ms`} />
        </div>
        <button
          className="primary-button full-width"
          style={{ marginTop: 12 }}
          onClick={async () => {
            try {
              const res = await fetch(storeUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  plans: state.plans,
                  campaigns: state.campaigns,
                  notices: state.notices,
                  faqs: state.faqs,
                  servers: state.servers,
                }),
              })
              if (res.ok) {
                showToast(tr('Data synced to server for all users'))
                pulseTelegram('medium')
              } else {
                showToast(tr('Sync failed — check server'))
              }
            } catch {
              showToast(tr('Sync failed — check server'))
            }
          }}
        >
          ☁️ {tr('Sync to server (publish to all users)')}
        </button>
      </section>

      <section className="content-section">
        <SectionHeader
          eyebrow={tr('Orders')}
          title={tr('All orders')}
        />
        {redisConnected === false && (
          <div style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 12,
            fontSize: 13,
            lineHeight: 1.5,
            color: '#fca5a5',
          }}>
            ⚠️ <strong>Redis متصل نیست!</strong> سفارشات فقط در حافظه موقت ذخیره می‌شوند و با ریستارت سرور از بین می‌روند.
            <br />
            در داشبورد Vercel → Settings → Environment Variables مقدار <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 4 }}>REDIS_URL</code> را تنظیم کنید.
          </div>
        )}
        <div className="admin-stack">
          {state.orders.length ? (
            state.orders.map((order) => {
              const linked = state.services.find((s) => s.id === order.serviceId)
              return (
                <details key={order.id} className="admin-card admin-plan-card admin-editor-card">
                  <summary className="admin-plan-summary admin-editor-summary">
                    <div className="admin-plan-copy admin-editor-copy">
                      <strong>{tr(order.planName)}</strong>
                      <p>
                        {formatMoney(order.amount)} •{' '}
                        {order.user?.firstName ?? order.planName}
                        {order.user?.username ? ` @${order.user.username}` : ''}
                      </p>
                    </div>
                    <div className="admin-plan-summary-side">
                      <span className={`plan-meta-chip ${order.status === 'paid' ? '' : order.status === 'cancelled' || order.status === 'rejected' ? 'chip-neutral' : 'chip-amber'}`}>
                        {tr(order.status)}
                      </span>
                      <span className="ticket-toggle order-toggle" aria-hidden="true">
                        <ChevronIcon />
                      </span>
                    </div>
                  </summary>
                  <div className="admin-plan-body admin-editor-body">
                    <div className="admin-order-meta">
                      <div className="admin-order-row"><span>{tr('Plan')}</span><strong>{tr(order.planName)}</strong></div>
                      <div className="admin-order-row"><span>{tr('Amount')}</span><strong>{formatMoney(order.amount)}</strong></div>
                      <div className="admin-order-row"><span>{tr('Payment')}</span><strong>{tr(order.paymentMethod)}</strong></div>
                      <div className="admin-order-row"><span>{tr('Kind')}</span><strong>{tr(order.kind)}</strong></div>
                      <div className="admin-order-row"><span>{tr('Date')}</span><strong>{formatDate(order.createdAt)}</strong></div>
                      {order.promoCode ? (
                        <div className="admin-order-row"><span>{tr('Promo')}</span><strong>{order.promoCode}</strong></div>
                      ) : null}
                      <div className="admin-order-row admin-order-row-full">
                        <span>{tr('Order ID')}</span>
                        <code className="admin-order-code">{order.id}</code>
                      </div>
                      {linked ? (
                        <div className="admin-order-row admin-order-row-full">
                          <span>{tr('Config code')}</span>
                          <code className="admin-order-code">{linked.configCode}</code>
                        </div>
                      ) : null}
                    </div>
                    {order.receiptImage ? (
                      <div className="admin-receipt-block">
                        <p className="eyebrow">{tr('Receipt')}</p>
                        <img src={order.receiptImage} alt={tr('Receipt screenshot')} className="admin-receipt-img" />
                        {order.receiptFileName ? <p className="muted-copy">{order.receiptFileName}</p> : null}
                      </div>
                    ) : order.status === 'processing' ? (
                      <p className="muted-copy">{tr('Receipt pending')}</p>
                    ) : null}
                    {order.status === 'processing' ? (
                      <div className="admin-delivery-box">
                        <p className="admin-delivery-label">📦 ارسال سرویس به کاربر</p>

                        <label className="field-label">
                          <span>V2Ray — کانفیگ یا لینک اشتراک</span>
                          <textarea
                            className="field field-area admin-compact-area"
                            placeholder="vless://... یا vmess://... یا لینک اشتراک"
                            value={getDeliveryDraft(order.id).configCode}
                            onChange={(e) => setDeliveryField(order.id, 'configCode', e.target.value)}
                          />
                        </label>

                        <label className="field-label">
                          <span>OpenVPN — نام کاربری</span>
                          <input
                            className="field"
                            placeholder="username"
                            value={getDeliveryDraft(order.id).vpnUsername}
                            onChange={(e) => setDeliveryField(order.id, 'vpnUsername', e.target.value)}
                          />
                        </label>

                        <label className="field-label">
                          <span>OpenVPN — رمز عبور</span>
                          <input
                            className="field"
                            placeholder="password"
                            value={getDeliveryDraft(order.id).vpnPassword}
                            onChange={(e) => setDeliveryField(order.id, 'vpnPassword', e.target.value)}
                          />
                        </label>

                        <label className="field-label">
                          <span>OpenVPN — فایل .ovpn (متن فایل را paste کن)</span>
                          <textarea
                            className="field field-area admin-compact-area"
                            placeholder="محتوای فایل .ovpn را اینجا paste کن"
                            value={getDeliveryDraft(order.id).ovpnFileContent}
                            onChange={(e) => setDeliveryField(order.id, 'ovpnFileContent', e.target.value)}
                          />
                        </label>

                        <button
                          className="primary-button full-width"
                          onClick={() => confirmDelivery(order.id)}
                        >
                          ✅ تایید پرداخت و ارسال سرویس
                        </button>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button
                            className="ghost-button full-width"
                            style={{ color: '#f87171' }}
                            onClick={() => rejectOrder(order.id)}
                          >
                            ❌ {tr('Reject order')}
                          </button>
                          <button
                            className="ghost-button full-width"
                            style={{ color: '#f87171' }}
                            onClick={() => deleteOrder(order.id)}
                          >
                            🗑 {tr('Delete order')}
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {order.status === 'paid' && linked ? (
                      <div className="admin-delivery-box">
                        <p className="admin-delivery-label">✅ سرویس تحویل داده شده</p>

                        {linked.configCode ? (
                          <div className="admin-delivered-row">
                            <span className="admin-delivered-type">V2Ray</span>
                            <code className="admin-config-code">{linked.configCode.slice(0, 50)}{linked.configCode.length > 50 ? '…' : ''}</code>
                            <button className="ghost-button small" onClick={async () => {
                              const ok = await copyText(linked.configCode)
                              showToast(ok ? '✅ کانفیگ کپی شد' : tr('Clipboard is not available'))
                            }}>📋</button>
                          </div>
                        ) : null}

                        {linked.vpnUsername ? (
                          <div className="admin-delivered-row">
                            <span className="admin-delivered-type">OpenVPN</span>
                            <span>{linked.vpnUsername} / {linked.vpnPassword}</span>
                            <button className="ghost-button small" onClick={async () => {
                              const ok = await copyText(`${linked.vpnUsername}\n${linked.vpnPassword}`)
                              showToast(ok ? '✅ یوزر/پسورد کپی شد' : tr('Clipboard is not available'))
                            }}>📋</button>
                          </div>
                        ) : null}

                        {linked.ovpnFileContent ? (
                          <div className="admin-delivered-row">
                            <span className="admin-delivered-type">.ovpn</span>
                            <span className="muted-copy">{linked.ovpnFileName ?? 'config.ovpn'}</span>
                            <button className="ghost-button small" onClick={() => {
                              downloadTextFile(linked.ovpnFileName ?? 'lian.ovpn', linked.ovpnFileContent ?? '')
                              showToast('فایل دانلود شد')
                            }}>⬇</button>
                          </div>
                        ) : null}

                        <p className="admin-delivery-label" style={{ marginTop: 8 }}>ویرایش و ارسال مجدد</p>
                        <label className="field-label">
                          <span>V2Ray — کانفیگ</span>
                          <textarea
                            className="field field-area admin-compact-area"
                            placeholder="vless://..."
                            value={getDeliveryDraft(order.id).configCode || linked.configCode}
                            onChange={(e) => setDeliveryField(order.id, 'configCode', e.target.value)}
                          />
                        </label>
                        <label className="field-label">
                          <span>OpenVPN یوزر</span>
                          <input className="field" placeholder="username"
                            value={getDeliveryDraft(order.id).vpnUsername || linked.vpnUsername || ''}
                            onChange={(e) => setDeliveryField(order.id, 'vpnUsername', e.target.value)} />
                        </label>
                        <label className="field-label">
                          <span>OpenVPN پسورد</span>
                          <input className="field" placeholder="password"
                            value={getDeliveryDraft(order.id).vpnPassword || linked.vpnPassword || ''}
                            onChange={(e) => setDeliveryField(order.id, 'vpnPassword', e.target.value)} />
                        </label>
                        <button className="ghost-button full-width" style={{ marginTop: 4 }}
                          onClick={() => confirmDelivery(order.id)}>
                          🔄 بروزرسانی سرویس
                        </button>
                      </div>
                    ) : null}
                    {order.status === 'cancelled' ? (
                      <div className="admin-delivery-box">
                        <p className="admin-delivery-label" style={{ color: '#f87171' }}>🚫 {tr('Order was cancelled by user')}</p>
                        <button
                          className="ghost-button full-width"
                          style={{ color: '#f87171', marginTop: 4 }}
                          onClick={() => deleteOrder(order.id)}
                        >
                          🗑 {tr('Delete order')}
                        </button>
                      </div>
                    ) : null}
                    {order.status === 'rejected' ? (
                      <div className="admin-delivery-box">
                        <p className="admin-delivery-label" style={{ color: '#f87171' }}>❌ {tr('Order rejected')}</p>
                        <button
                          className="ghost-button full-width"
                          style={{ color: '#f87171', marginTop: 4 }}
                          onClick={() => deleteOrder(order.id)}
                        >
                          🗑 {tr('Delete order')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </details>
              )
            })
          ) : (
            <div className="empty-card admin-editor-empty">
              <p>{tr('No orders yet')}</p>
            </div>
          )}
        </div>
      </section>

      <section className="content-section">
        <SectionHeader
          eyebrow={tr('Services')}
          title={tr('Edit delivered services')}
        />

        <div className="admin-stack">
          {state.services.length ? (
            state.services.map((service) => (
              <details key={service.id} className="admin-card admin-plan-card admin-editor-card">
                <summary className="admin-plan-summary admin-editor-summary">
                  <div className="admin-plan-copy admin-editor-copy">
                    <strong>{tr(service.planName)}</strong>
                    <p>
                      {tr(statusLabel(service.status))} • {tr(service.region)}
                    </p>
                  </div>
                  <div className="admin-plan-summary-side">
                    <span className="plan-meta-chip">
                      {daysLeft(daysRemaining(service.expiresAt))}
                    </span>
                    <span className="ticket-toggle order-toggle" aria-hidden="true">
                      <ChevronIcon />
                    </span>
                  </div>
                </summary>

                <div className="admin-plan-body admin-editor-body">
                  <div className="admin-form-grid">
                    <label className="field-label">
                      <span>{tr('Package')}</span>
                      <select
                        className="field"
                        value={service.planId}
                        onChange={(event) =>
                          updateServiceField(service.id, 'planId', event.target.value)
                        }
                      >
                        {state.plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {tr(plan.name)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-label">
                      <span>{tr('Status')}</span>
                      <select
                        className="field"
                        value={service.status}
                        onChange={(event) =>
                          updateServiceField(
                            service.id,
                            'status',
                            event.target.value as ServiceStatus,
                          )
                        }
                      >
                        {serviceStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {tr(statusLabel(status))}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-label">
                      <span>{tr('Expires')}</span>
                      <input
                        className="field"
                        type="date"
                        value={toDateInputValue(service.expiresAt)}
                        onChange={(event) =>
                          updateServiceField(service.id, 'expiresAt', toIsoDate(event.target.value))
                        }
                      />
                    </label>
                    <label className="field-label">
                      <span>{tr('Devices in use')}</span>
                      <input
                        className="field"
                        type="number"
                        value={service.devicesInUse}
                        onChange={(event) =>
                          updateServiceField(
                            service.id,
                            'devicesInUse',
                            Math.max(0, Number(event.target.value) || 0),
                          )
                        }
                      />
                    </label>
                    <label className="field-label">
                      <span>{tr('Device limit')}</span>
                      <input
                        className="field"
                        type="number"
                        value={service.deviceLimit}
                        onChange={(event) =>
                          updateServiceField(
                            service.id,
                            'deviceLimit',
                            Math.max(1, Number(event.target.value) || 1),
                          )
                        }
                      />
                    </label>
                    <label className="field-label">
                      <span>{tr('Region')}</span>
                      <input
                        className="field"
                        value={service.region}
                        onChange={(event) =>
                          updateServiceField(service.id, 'region', event.target.value)
                        }
                      />
                    </label>
                    <label className="field-label">
                      <span>{tr('Protocol')}</span>
                      <input
                        className="field"
                        value={service.protocol}
                        onChange={(event) =>
                          updateServiceField(service.id, 'protocol', event.target.value)
                        }
                      />
                    </label>
                    <label className="field-label">
                      <span>{tr('Latency')}</span>
                      <input
                        className="field"
                        type="number"
                        value={service.latency}
                        onChange={(event) =>
                          updateServiceField(
                            service.id,
                            'latency',
                            Math.max(0, Number(event.target.value) || 0),
                          )
                        }
                      />
                    </label>
                    <label className="field-label">
                      <span>{tr('Uptime')}</span>
                      <input
                        className="field"
                        value={service.uptime}
                        onChange={(event) =>
                          updateServiceField(service.id, 'uptime', event.target.value)
                        }
                      />
                    </label>
                    <label className="field-label admin-span-full">
                      <span>{tr('Config code')}</span>
                      <textarea
                        className="field field-area admin-compact-area"
                        value={service.configCode}
                        onChange={(event) =>
                          updateServiceField(service.id, 'configCode', event.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>
              </details>
            ))
          ) : (
            <div className="empty-card admin-editor-empty">
              <p>{tr('No active services yet')}</p>
            </div>
          )}
        </div>
      </section>


      <section className="content-section">
        <SectionHeader
          eyebrow={tr('Broadcast')}
          title={tr('Edit live home banners')}
        />

        <div className="admin-stack">
          {state.notices.map((notice) => (
            <details key={notice.id} className="admin-card admin-plan-card admin-editor-card">
              <summary className="admin-plan-summary admin-editor-summary">
                <div className="admin-plan-copy admin-editor-copy">
                  <strong>{tr(notice.title)}</strong>
                  <p>{tr(notice.message)}</p>
                </div>
                <div className="admin-plan-summary-side">
                  <span className="plan-meta-chip">{tr(notice.tone)}</span>
                  <span className="ticket-toggle order-toggle" aria-hidden="true">
                    <ChevronIcon />
                  </span>
                </div>
              </summary>

              <div className="admin-plan-body admin-editor-body">
                <div className="admin-form-grid">
                  <label className="field-label admin-span-full">
                    <span>{tr('Notice title')}</span>
                    <input
                      className="field"
                      value={notice.title}
                      onChange={(event) =>
                        updateNoticeField(notice.id, 'title', event.target.value)
                      }
                    />
                  </label>
                  <label className="field-label admin-span-full">
                    <span>{tr('Notice message')}</span>
                    <textarea
                      className="field field-area admin-compact-area"
                      value={notice.message}
                      onChange={(event) =>
                        updateNoticeField(notice.id, 'message', event.target.value)
                      }
                    />
                  </label>
                  <label className="field-label">
                    <span>{tr('Notice tone')}</span>
                    <select
                      className="field"
                      value={notice.tone}
                      onChange={(event) =>
                        updateNoticeField(
                          notice.id,
                          'tone',
                          event.target.value as Notice['tone'],
                        )
                      }
                    >
                      {(['lime', 'ice', 'amber'] as const).map((tone) => (
                        <option key={tone} value={tone}>
                          {tr(tone)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </details>
          ))}

          <details className="admin-card admin-plan-card admin-editor-card">
            <summary className="admin-plan-summary admin-editor-summary">
              <div className="admin-plan-copy admin-editor-copy">
                <strong>{tr('Push a home banner')}</strong>
                <p>{tr('Create a new banner that appears instantly in the home feed.')}</p>
              </div>
              <div className="admin-plan-summary-side">
                <span className="ticket-toggle order-toggle" aria-hidden="true">
                  <ChevronIcon />
                </span>
              </div>
            </summary>

            <div className="admin-plan-body admin-editor-body">
              <div className="admin-form-grid">
                <label className="field-label admin-span-full">
                  <span>{tr('Notice title')}</span>
                  <input
                    className="field"
                    value={adminTitle}
                    onChange={(event) => setAdminTitle(event.target.value)}
                  />
                </label>
                <label className="field-label admin-span-full">
                  <span>{tr('Notice message')}</span>
                  <textarea
                    className="field field-area admin-compact-area"
                    value={adminMessage}
                    onChange={(event) => setAdminMessage(event.target.value)}
                  />
                </label>
                <label className="field-label">
                  <span>{tr('Notice tone')}</span>
                  <select
                    className="field"
                    value={adminTone}
                    onChange={(event) =>
                      setAdminTone(event.target.value as typeof adminTone)
                    }
                  >
                    {(['lime', 'ice', 'amber'] as const).map((tone) => (
                      <option key={tone} value={tone}>
                        {tr(tone)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button className="primary-button" onClick={publishNotice}>
                {tr('Publish notice')}
              </button>
            </div>
          </details>
        </div>
      </section>

      <section className="content-section">
        <SectionHeader
          eyebrow={tr('Plans')}
          title={tr('Adjust pricing and placement')}
          subtitle={tr(
            'Edit every field the customer sees, then add new packages when needed.',
          )}
        />

        <div className="admin-stack">
          {state.plans.map((plan) => (
            <details key={plan.id} className="admin-card admin-plan-card admin-editor-card">
              <summary className="admin-plan-summary admin-editor-summary">
                <div className="admin-plan-copy admin-editor-copy">
                  <strong>{tr(plan.name)}</strong>
                  <p>
                    {formatMoney(plan.price)} • {devicesCount(plan.deviceLimit)}
                  </p>
                </div>
                <div className="admin-plan-summary-side">
                  <span className="plan-meta-chip">{tr(plan.category)}</span>
                  {plan.featured ? (
                    <span className="plan-meta-chip">{tr('Feature')}</span>
                  ) : null}
                  <span className="ticket-toggle order-toggle" aria-hidden="true">
                    <ChevronIcon />
                  </span>
                </div>
              </summary>

              <div className="admin-plan-body admin-editor-body">
                <div className="admin-form-grid">
                  <label className="field-label">
                    <span>{tr('Package name')}</span>
                    <input
                      className="field"
                      value={plan.name}
                      onChange={(event) => updatePlanField(plan.id, 'name', event.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    <span>{tr('Category')}</span>
                    <select
                      className="field"
                      value={plan.category}
                      onChange={(event) =>
                        updatePlanField(
                          plan.id,
                          'category',
                          event.target.value as PlanCategory,
                        )
                      }
                    >
                      {planCategories
                        .filter((category) => category.id !== 'all')
                        .map((category) => (
                          <option key={category.id} value={category.id}>
                            {tr(category.label)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field-label">
                    <span>{tr('Price')}</span>
                    <input
                      className="field"
                      type="number"
                      value={plan.price}
                      onChange={(event) =>
                        updatePlanField(plan.id, 'price', Math.max(99000, Number(event.target.value) || 0))
                      }
                    />
                  </label>
                  <label className="field-label">
                    <span>{tr('Days')}</span>
                    <input
                      className="field"
                      type="number"
                      value={plan.durationDays}
                      onChange={(event) =>
                        updatePlanField(
                          plan.id,
                          'durationDays',
                          Math.max(1, Number(event.target.value) || 1),
                        )
                      }
                    />
                  </label>
                  <label className="field-label">
                    <span>{tr('Device limit')}</span>
                    <input
                      className="field"
                      type="number"
                      value={plan.deviceLimit}
                      onChange={(event) =>
                        updatePlanField(
                          plan.id,
                          'deviceLimit',
                          Math.max(1, Number(event.target.value) || 1),
                        )
                      }
                    />
                  </label>
                  <label className="field-label">
                    <span>{tr('Accent')}</span>
                    <select
                      className="field"
                      value={plan.accent}
                      onChange={(event) => updatePlanField(plan.id, 'accent', event.target.value)}
                    >
                      {accentOptions.map((accent) => (
                        <option key={accent} value={accent}>
                          {tr(accent)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field-label">
                    <span>{tr('Badge')}</span>
                    <input
                      className="field"
                      value={plan.badge ?? ''}
                      onChange={(event) => updatePlanField(plan.id, 'badge', event.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    <span>{tr('Featured')}</span>
                    <select
                      className="field"
                      value={String(Boolean(plan.featured))}
                      onChange={(event) =>
                        updatePlanField(plan.id, 'featured', event.target.value === 'true')
                      }
                    >
                      <option value="false">{tr('Off')}</option>
                      <option value="true">{tr('On')}</option>
                    </select>
                  </label>
                  <label className="field-label admin-span-full">
                    <span>{tr('Subtitle')}</span>
                    <input
                      className="field"
                      value={plan.subtitle}
                      onChange={(event) =>
                        updatePlanField(plan.id, 'subtitle', event.target.value)
                      }
                    />
                  </label>
                  <label className="field-label admin-span-full">
                    <span>{tr('Description')}</span>
                    <textarea
                      className="field field-area admin-compact-area"
                      value={plan.description}
                      onChange={(event) =>
                        updatePlanField(plan.id, 'description', event.target.value)
                      }
                    />
                  </label>
                  <label className="field-label">
                    <span>{tr('Speed tier')}</span>
                    <input
                      className="field"
                      value={plan.speedTier}
                      onChange={(event) =>
                        updatePlanField(plan.id, 'speedTier', event.target.value)
                      }
                    />
                  </label>
                  <label className="field-label">
                    <span>{tr('Data cap')}</span>
                    <input
                      className="field"
                      value={plan.dataCap}
                      onChange={(event) =>
                        updatePlanField(plan.id, 'dataCap', event.target.value)
                      }
                    />
                  </label>
                  <label className="field-label admin-span-full">
                    <span>{tr('Locations')}</span>
                    <input
                      className="field"
                      value={joinCsv(plan.locations)}
                      onChange={(event) =>
                        updatePlanField(plan.id, 'locations', splitCsv(event.target.value))
                      }
                    />
                  </label>
                  <label className="field-label admin-span-full">
                    <span>{tr('Protocols')}</span>
                    <input
                      className="field"
                      value={joinCsv(plan.protocols)}
                      onChange={(event) =>
                        updatePlanField(plan.id, 'protocols', splitCsv(event.target.value))
                      }
                    />
                  </label>
                  <label className="field-label admin-span-full">
                    <span>{tr('Perks')}</span>
                    <textarea
                      className="field field-area admin-compact-area"
                      value={joinCsv(plan.perks)}
                      onChange={(event) =>
                        updatePlanField(plan.id, 'perks', splitCsv(event.target.value))
                      }
                    />
                  </label>
                </div>
                <button
                  className="ghost-button full-width admin-delete-btn"
                  onClick={() => deletePlan(plan.id)}
                >
                  {tr('Delete package')}
                </button>
              </div>
            </details>
          ))}

          <details className="admin-card admin-plan-card admin-editor-card">
            <summary className="admin-plan-summary admin-editor-summary">
              <div className="admin-plan-copy admin-editor-copy">
                <strong>{tr('Add new package')}</strong>
                <p>{tr('Create a package that appears instantly in customer plans.')}</p>
              </div>
              <div className="admin-plan-summary-side">
                <span className="ticket-toggle order-toggle" aria-hidden="true">
                  <ChevronIcon />
                </span>
              </div>
            </summary>

            <div className="admin-plan-body admin-editor-body">
              <div className="admin-form-grid">
                <label className="field-label">
                  <span>{tr('Package name')}</span>
                  <input
                    className="field"
                    value={newPlanDraft.name}
                    onChange={(event) => updateNewPlanField('name', event.target.value)}
                  />
                </label>
                <label className="field-label">
                  <span>{tr('Category')}</span>
                  <select
                    className="field"
                    value={newPlanDraft.category}
                    onChange={(event) =>
                      updateNewPlanField(
                        'category',
                        event.target.value as PlanCategory,
                      )
                    }
                  >
                    {planCategories
                      .filter((category) => category.id !== 'all')
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {tr(category.label)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field-label">
                  <span>{tr('Price')}</span>
                  <input
                    className="field"
                    type="number"
                    value={newPlanDraft.price}
                    onChange={(event) =>
                      updateNewPlanField(
                        'price',
                        Math.max(99000, Number(event.target.value) || 0),
                      )
                    }
                  />
                </label>
                <label className="field-label">
                  <span>{tr('Days')}</span>
                  <input
                    className="field"
                    type="number"
                    value={newPlanDraft.durationDays}
                    onChange={(event) =>
                      updateNewPlanField(
                        'durationDays',
                        Math.max(1, Number(event.target.value) || 1),
                      )
                    }
                  />
                </label>
                <label className="field-label">
                  <span>{tr('Device limit')}</span>
                  <input
                    className="field"
                    type="number"
                    value={newPlanDraft.deviceLimit}
                    onChange={(event) =>
                      updateNewPlanField(
                        'deviceLimit',
                        Math.max(1, Number(event.target.value) || 1),
                      )
                    }
                  />
                </label>
                <label className="field-label">
                  <span>{tr('Accent')}</span>
                  <select
                    className="field"
                    value={newPlanDraft.accent}
                    onChange={(event) => updateNewPlanField('accent', event.target.value)}
                  >
                    {accentOptions.map((accent) => (
                      <option key={accent} value={accent}>
                        {tr(accent)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  <span>{tr('Badge')}</span>
                  <input
                    className="field"
                    value={newPlanDraft.badge ?? ''}
                    onChange={(event) => updateNewPlanField('badge', event.target.value)}
                  />
                </label>
                <label className="field-label">
                  <span>{tr('Featured')}</span>
                  <select
                    className="field"
                    value={String(Boolean(newPlanDraft.featured))}
                    onChange={(event) =>
                      updateNewPlanField('featured', event.target.value === 'true')
                    }
                  >
                    <option value="false">{tr('Off')}</option>
                    <option value="true">{tr('On')}</option>
                  </select>
                </label>
                <label className="field-label admin-span-full">
                  <span>{tr('Subtitle')}</span>
                  <input
                    className="field"
                    value={newPlanDraft.subtitle}
                    onChange={(event) => updateNewPlanField('subtitle', event.target.value)}
                  />
                </label>
                <label className="field-label admin-span-full">
                  <span>{tr('Description')}</span>
                  <textarea
                    className="field field-area admin-compact-area"
                    value={newPlanDraft.description}
                    onChange={(event) => updateNewPlanField('description', event.target.value)}
                  />
                </label>
                <label className="field-label">
                  <span>{tr('Speed tier')}</span>
                  <input
                    className="field"
                    value={newPlanDraft.speedTier}
                    onChange={(event) => updateNewPlanField('speedTier', event.target.value)}
                  />
                </label>
                <label className="field-label">
                  <span>{tr('Data cap')}</span>
                  <input
                    className="field"
                    value={newPlanDraft.dataCap}
                    onChange={(event) => updateNewPlanField('dataCap', event.target.value)}
                  />
                </label>
                <label className="field-label admin-span-full">
                  <span>{tr('Locations')}</span>
                  <input
                    className="field"
                    value={joinCsv(newPlanDraft.locations)}
                    onChange={(event) =>
                      updateNewPlanField('locations', splitCsv(event.target.value))
                    }
                  />
                </label>
                <label className="field-label admin-span-full">
                  <span>{tr('Protocols')}</span>
                  <input
                    className="field"
                    value={joinCsv(newPlanDraft.protocols)}
                    placeholder="V2Ray (VLESS), OpenVPN"
                    onChange={(event) =>
                      updateNewPlanField('protocols', splitCsv(event.target.value))
                    }
                  />
                </label>
                <label className="field-label admin-span-full">
                  <span>{tr('Perks')}</span>
                  <textarea
                    className="field field-area admin-compact-area"
                    value={joinCsv(newPlanDraft.perks)}
                    onChange={(event) =>
                      updateNewPlanField('perks', splitCsv(event.target.value))
                    }
                  />
                </label>
              </div>

              <button className="primary-button" onClick={addPlan}>
                {tr('Create package')}
              </button>
            </div>
          </details>
        </div>
      </section>

      <section className="content-section">
        <SectionHeader
          eyebrow={tr('Campaigns')}
          title={tr('Coupons and acquisition loops')}
        />

        <div className="admin-stack">
          {state.campaigns.map((campaign) => (
            <details key={campaign.id} className="admin-card admin-plan-card admin-editor-card">
              <summary className="admin-plan-summary admin-editor-summary">
                <div className="admin-plan-copy admin-editor-copy">
                <strong>{tr(campaign.title)}</strong>
                <p>
                  {campaign.code} • {tr(campaign.reward)}
                </p>
                </div>
                <div className="admin-plan-summary-side">
                  <span className="plan-meta-chip">
                    {campaign.active ? tr('Active') : tr('Disabled')}
                  </span>
                  <span className="ticket-toggle order-toggle" aria-hidden="true">
                    <ChevronIcon />
                  </span>
                </div>
              </summary>

              <div className="admin-plan-body admin-editor-body">
                <div className="admin-form-grid">
                  <label className="field-label">
                    <span>{tr('Title')}</span>
                    <input
                      className="field"
                      value={campaign.title}
                      onChange={(event) =>
                        updateCampaignField(campaign.id, 'title', event.target.value)
                      }
                    />
                  </label>
                  <label className="field-label">
                    <span>{tr('Discount code')}</span>
                    <input
                      className="field"
                      value={campaign.code}
                      onChange={(event) =>
                        updateCampaignField(campaign.id, 'code', event.target.value)
                      }
                    />
                  </label>
                  <label className="field-label">
                    <span>{tr('Discount percent')}</span>
                    <input
                      className="field"
                      type="number"
                      value={campaign.discountPercent}
                      onChange={(event) =>
                        updateCampaignField(
                          campaign.id,
                          'discountPercent',
                          Math.max(1, Number(event.target.value) || 0),
                        )
                      }
                    />
                  </label>
                  <label className="field-label">
                    <span>{tr('Reward')}</span>
                    <input
                      className="field"
                      value={campaign.reward}
                      onChange={(event) =>
                        updateCampaignField(campaign.id, 'reward', event.target.value)
                      }
                    />
                  </label>
                  <label className="field-label">
                    <span>{tr('State')}</span>
                    <select
                      className="field"
                      value={String(campaign.active)}
                      onChange={(event) =>
                        updateCampaignField(campaign.id, 'active', event.target.value === 'true')
                      }
                    >
                      <option value="true">{tr('Active')}</option>
                      <option value="false">{tr('Disabled')}</option>
                    </select>
                  </label>
                  <label className="field-label admin-span-full">
                    <span>{tr('Description')}</span>
                    <textarea
                      className="field field-area admin-compact-area"
                      value={campaign.description}
                      onChange={(event) =>
                        updateCampaignField(campaign.id, 'description', event.target.value)
                      }
                    />
                  </label>
                </div>
                <button
                  className="ghost-button full-width admin-delete-btn"
                  onClick={() => deleteCampaign(campaign.id)}
                >
                  {tr('Delete discount code')}
                </button>
              </div>
            </details>
          ))}

          <details className="admin-card admin-plan-card admin-editor-card">
            <summary className="admin-plan-summary admin-editor-summary">
              <div className="admin-plan-copy admin-editor-copy">
                <strong>{tr('Add new discount code')}</strong>
                <p>{tr('Create a new coupon that appears in checkout immediately.')}</p>
              </div>
              <div className="admin-plan-summary-side">
                <span className="ticket-toggle order-toggle" aria-hidden="true">
                  <ChevronIcon />
                </span>
              </div>
            </summary>

            <div className="admin-plan-body admin-editor-body">
              <div className="admin-form-grid">
                <label className="field-label">
                  <span>{tr('Title')}</span>
                  <input
                    className="field"
                    value={newCampaignDraft.title}
                    onChange={(event) => updateNewCampaignField('title', event.target.value)}
                  />
                </label>
                <label className="field-label">
                  <span>{tr('Discount code')}</span>
                  <input
                    className="field"
                    value={newCampaignDraft.code}
                    onChange={(event) => updateNewCampaignField('code', event.target.value)}
                  />
                </label>
                <label className="field-label">
                  <span>{tr('Discount percent')}</span>
                  <input
                    className="field"
                    type="number"
                    value={newCampaignDraft.discountPercent}
                    onChange={(event) =>
                      updateNewCampaignField(
                        'discountPercent',
                        Math.max(1, Number(event.target.value) || 0),
                      )
                    }
                  />
                </label>
                <label className="field-label">
                  <span>{tr('Reward')}</span>
                  <input
                    className="field"
                    value={newCampaignDraft.reward}
                    onChange={(event) => updateNewCampaignField('reward', event.target.value)}
                  />
                </label>
                <label className="field-label">
                  <span>{tr('State')}</span>
                  <select
                    className="field"
                    value={String(newCampaignDraft.active)}
                    onChange={(event) =>
                      updateNewCampaignField('active', event.target.value === 'true')
                    }
                  >
                    <option value="true">{tr('Active')}</option>
                    <option value="false">{tr('Disabled')}</option>
                  </select>
                </label>
                <label className="field-label admin-span-full">
                  <span>{tr('Description')}</span>
                  <textarea
                    className="field field-area admin-compact-area"
                    value={newCampaignDraft.description}
                    onChange={(event) =>
                      updateNewCampaignField('description', event.target.value)
                    }
                  />
                </label>
              </div>

              <button className="primary-button" onClick={addCampaign}>
                {tr('Create discount code')}
              </button>
            </div>
          </details>
        </div>
      </section>

      <section className="content-section">
        <SectionHeader
          eyebrow={tr('Tickets')}
          title={tr('Support tickets')}
        />
        <div className="admin-stack">
          {state.tickets.length ? (
            state.tickets.map((ticket) => (
              <details key={ticket.id} className="admin-card admin-plan-card admin-editor-card">
                <summary className="admin-plan-summary admin-editor-summary">
                  <div className="admin-plan-copy admin-editor-copy">
                    <strong>{tr(ticket.title)}</strong>
                    <p>{tr(ticket.category)} • {formatDate(ticket.lastMessageAt)}</p>
                  </div>
                  <div className="admin-plan-summary-side">
                    <span className={`plan-meta-chip ${ticket.status === 'resolved' ? '' : 'chip-amber'}`}>
                      {tr(ticket.status)}
                    </span>
                    <span className="ticket-toggle order-toggle" aria-hidden="true">
                      <ChevronIcon />
                    </span>
                  </div>
                </summary>
                <div className="admin-plan-body admin-editor-body">
                  <div className="admin-ticket-thread">
                    {ticket.messages.map((msg) => (
                      <div key={msg.id} className={`admin-ticket-msg admin-ticket-${msg.from}`}>
                        <span className="admin-ticket-from">
                          {msg.from === 'support' ? '🛟 Support' : '👤 User'}
                        </span>
                        <p className="admin-ticket-text">{msg.text}</p>
                        <span className="admin-ticket-time">{formatDate(msg.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                  {ticket.status !== 'resolved' ? (
                    <div className="admin-reply-box">
                      <textarea
                        className="field field-area admin-compact-area"
                        placeholder={tr('Write reply...')}
                        value={ticketReplyTexts[ticket.id] ?? ''}
                        onChange={(e) =>
                          setTicketReplyTexts((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                        }
                      />
                      <div className="admin-reply-actions">
                        <button className="primary-button" onClick={() => replyToTicket(ticket.id)}>
                          {tr('Send reply')}
                        </button>
                        <button className="ghost-button" onClick={() => closeTicket(ticket.id)}>
                          {tr('Close ticket')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="muted-copy" style={{ padding: '8px 0' }}>{tr('Ticket resolved')}</p>
                  )}
                </div>
              </details>
            ))
          ) : (
            <div className="empty-card admin-editor-empty">
              <p>{tr('No tickets yet')}</p>
            </div>
          )}
        </div>
      </section>

      <section className="content-section">
        <SectionHeader
          eyebrow={tr('FAQ')}
          title={tr('Edit FAQ entries')}
        />

        <div className="admin-stack">
          {state.faqs.map((faq) => (
            <details key={faq.id} className="admin-card admin-plan-card admin-editor-card">
              <summary className="admin-plan-summary admin-editor-summary">
                <div className="admin-plan-copy admin-editor-copy">
                  <strong>{tr(faq.question)}</strong>
                  <p>{tr(faq.answer)}</p>
                </div>
                <div className="admin-plan-summary-side">
                  <span className="ticket-toggle order-toggle" aria-hidden="true">
                    <ChevronIcon />
                  </span>
                </div>
              </summary>

              <div className="admin-plan-body admin-editor-body">
                <div className="admin-form-grid">
                  <label className="field-label admin-span-full">
                    <span>{tr('Question')}</span>
                    <input
                      className="field"
                      value={faq.question}
                      onChange={(event) =>
                        updateFaqField(faq.id, 'question', event.target.value)
                      }
                    />
                  </label>
                  <label className="field-label admin-span-full">
                    <span>{tr('Answer')}</span>
                    <textarea
                      className="field field-area admin-compact-area"
                      value={faq.answer}
                      onChange={(event) =>
                        updateFaqField(faq.id, 'answer', event.target.value)
                      }
                    />
                  </label>
                </div>
                <button
                  className="ghost-button full-width admin-delete-btn"
                  onClick={() => deleteFaq(faq.id)}
                >
                  {tr('Delete FAQ')}
                </button>
              </div>
            </details>
          ))}

          <details className="admin-card admin-plan-card admin-editor-card">
            <summary className="admin-plan-summary admin-editor-summary">
              <div className="admin-plan-copy admin-editor-copy">
                <strong>{tr('Add new FAQ')}</strong>
                <p>{tr('Create a new FAQ item that appears instantly in Support.')}</p>
              </div>
              <div className="admin-plan-summary-side">
                <span className="ticket-toggle order-toggle" aria-hidden="true">
                  <ChevronIcon />
                </span>
              </div>
            </summary>

            <div className="admin-plan-body admin-editor-body">
              <div className="admin-form-grid">
                <label className="field-label admin-span-full">
                  <span>{tr('Question')}</span>
                  <input
                    className="field"
                    value={newFaqDraft.question}
                    onChange={(event) => updateNewFaqField('question', event.target.value)}
                  />
                </label>
                <label className="field-label admin-span-full">
                  <span>{tr('Answer')}</span>
                  <textarea
                    className="field field-area admin-compact-area"
                    value={newFaqDraft.answer}
                    onChange={(event) => updateNewFaqField('answer', event.target.value)}
                  />
                </label>
              </div>

              <button className="primary-button" onClick={addFaq}>
                {tr('Create FAQ')}
              </button>
            </div>
          </details>
        </div>
      </section>

    </>
  )

  return (
    <div className={`app-shell ${dir === 'rtl' ? 'language-rtl' : ''}`} dir={dir}>
      <div className="chrome-top">
        <label className="chrome-location chrome-select-shell">
          <GlobeIcon />
          <select
            className="chrome-select"
            aria-label={tr('Language')}
            value={language}
            onChange={(event) => setLanguage(event.target.value as AppLanguage)}
          >
            {languageOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <header className="masthead">
<div>
          <h2>Lian</h2>
        </div>
        <button className="ghost-button small" onClick={startTrial}>
          {tr('Free trial')}
        </button>
      </header>

      <main className="screen-body">
        {screen === 'home' && renderHome()}
        {screen === 'plans' && renderPlans()}
        {screen === 'services' && renderServices()}
        {screen === 'support' && renderSupport()}
        {screen === 'profile' && renderProfile()}
        {screen === 'admin' && isAdmin && renderAdmin()}
      </main>

      <nav className="bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = screen === item.id

          return (
            <button
              key={item.id}
              className={`nav-item ${active ? 'nav-item-active' : ''}`}
              onClick={() => switchScreen(item.id)}
            >
              <Icon />
              <span>{tr(item.label)}</span>
            </button>
          )
        })}
      </nav>

      {purchaseIntent && selectedPlan ? (
        <div className="checkout-overlay" onClick={closeCheckout}>
          <div className="checkout-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="checkout-header">
              <div>
                <p className="eyebrow">{tr('Checkout')}</p>
                <h2>{tr(selectedPlan.name)}</h2>
              </div>
              <button className="chrome-button" onClick={closeCheckout}>
                <ChevronIcon className="chevron-icon" />
              </button>
            </div>

            <div className="checkout-summary">
              <div>
                <span>{tr('Mode')}</span>
                <strong>{tr(purchaseIntent.mode)}</strong>
              </div>
              <div>
                <span>{tr('Devices')}</span>
                <strong>{formatNumber(selectedPlan.deviceLimit)}</strong>
              </div>
              <div>
                <span>{tr('Duration')}</span>
                <strong>{daysAccess(selectedPlan.durationDays)}</strong>
              </div>
            </div>

            <div className="coupon-shell">
              <div className="coupon-field-shell">
                <input
                  className="field"
                  placeholder={tr('Promo code')}
                  value={promoInput}
                  onChange={(event) => setPromoInput(event.target.value.toUpperCase())}
                />
                <button
                  className="ghost-button small icon-button coupon-field-icon"
                  type="button"
                  onClick={() => setIsCheckoutPromoPanelOpen((open) => !open)}
                  aria-label={
                    isCheckoutPromoPanelOpen ? tr('Close') : tr('Discount codes')
                  }
                  aria-expanded={isCheckoutPromoPanelOpen}
                  aria-controls="checkout-promo-panel"
                >
                  {isCheckoutPromoPanelOpen ? <CloseIcon /> : <TagIcon />}
                </button>
              </div>

              {isCheckoutPromoPanelOpen ? (
                <div className="promo-popover checkout-promo-popover" id="checkout-promo-panel">
                  <div className="promo-popover-head">
                    <div>
                      <p className="eyebrow">{tr('Pick an active code')}</p>
                      <h3>{tr('Discount codes')}</h3>
                    </div>
                    <button
                      className="ghost-button small icon-button"
                      type="button"
                      onClick={() => setIsCheckoutPromoPanelOpen(false)}
                      aria-label={tr('Close')}
                    >
                      <CloseIcon />
                    </button>
                  </div>

                  {featuredCampaigns.length ? (
                    <div className="promo-code-list">
                      {featuredCampaigns.map((campaign) => (
                        <button
                          key={campaign.id}
                          className={`promo-code-row promo-select-row ${
                            promoInput === campaign.code ? 'promo-select-row-active' : ''
                          }`}
                          type="button"
                          onClick={() => applyCheckoutPromoCode(campaign.code)}
                        >
                          <div>
                            <strong>{campaign.code}</strong>
                            <p className="muted-copy">{tr(campaign.reward)}</p>
                          </div>
                          <span className="promo-select-badge">
                            {formatNumber(campaign.discountPercent)}%
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-copy">{tr('No active discount codes right now')}</p>
                  )}
                </div>
              ) : null}

              {selectedPromo ? (
                <p className="muted-copy">
                  {promoApplied(selectedPromo.code, selectedPromo.discountPercent)}
                </p>
              ) : null}
            </div>

            <div className="checkout-payments">
              {paymentOptions.map((option) => (
                <button
                  key={option.id}
                  className={`payment-pill ${paymentMethod === option.id ? 'payment-pill-active' : ''}`}
                  onClick={() => setPaymentMethod(option.id)}
                >
                  {tr(option.label)}
                </button>
              ))}
            </div>

            {paymentMethod === 'card' || paymentMethod === 'crypto' ? (
              <div className="bank-transfer-box">
                <div className="bank-transfer-head">
                  <p className="eyebrow">
                    {paymentMethod === 'card' ? tr('Card transfer') : tr('Crypto payment')}
                  </p>
                  <h3>
                    {paymentMethod === 'card'
                      ? tr(bankTransferDetails.note)
                      : tr(cryptoTransferDetails.note)}
                  </h3>
                  <p className="muted-copy">
                    {paymentMethod === 'card'
                      ? tr(bankTransferDetails.warning)
                      : tr(cryptoTransferDetails.warning)}
                  </p>
                </div>

                <div className="payment-details-grid">
                  {paymentMethod === 'card' ? (
                    <>
                      <div className="payment-detail">
                        <span>{tr('Bank')}</span>
                        <strong>{tr(bankTransferDetails.bank)}</strong>
                      </div>
                      <div className="payment-detail">
                        <div className="payment-detail-head">
                          <span>{tr('Card number')}</span>
                          <button
                            className="payment-copy-icon"
                            aria-label={tr('Copy')}
                            title={tr('Copy')}
                            onClick={() =>
                              void copyPaymentDetail(
                                bankTransferDetails.cardNumber,
                                tr('Card number'),
                              )
                            }
                          >
                            <CopyIcon />
                          </button>
                        </div>
                        <div className="payment-detail-value">
                          <strong dir="ltr">{bankTransferDetails.cardNumber}</strong>
                        </div>
                      </div>
                      <div className="payment-detail payment-detail-full">
                        <div className="payment-detail-head">
                          <span>{tr('IBAN')}</span>
                          <button
                            className="payment-copy-icon"
                            aria-label={tr('Copy')}
                            title={tr('Copy')}
                            onClick={() =>
                              void copyPaymentDetail(bankTransferDetails.iban, tr('IBAN'))
                            }
                          >
                            <CopyIcon />
                          </button>
                        </div>
                        <div className="payment-detail-value">
                          <strong dir="ltr">{bankTransferDetails.iban}</strong>
                        </div>
                      </div>
                    </>
                  ) : (
                    cryptoTransferDetails.wallets.map((wallet) => (
                      <div key={wallet.id} className="payment-detail payment-detail-full">
                        <div className="payment-detail-head">
                          <span>{`${wallet.asset} • ${wallet.network}`}</span>
                          <button
                            className="payment-copy-icon"
                            aria-label={tr('Copy')}
                            title={tr('Copy')}
                            onClick={() =>
                              void copyPaymentDetail(
                                wallet.address,
                                `${wallet.asset} ${wallet.network}`,
                              )
                            }
                          >
                            <CopyIcon />
                          </button>
                        </div>
                        <div className="payment-detail-value">
                          <strong dir="ltr">{wallet.address}</strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <label className="ghost-button full-width file-trigger">
                  {checkoutReceiptDraft
                    ? tr('Change receipt screenshot')
                    : tr('Upload receipt screenshot')}
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handleCheckoutReceiptChange(event)}
                  />
                </label>

                {checkoutReceiptDraft ? (
                  <div className="receipt-preview">
                    <img src={checkoutReceiptDraft.image} alt={tr('Receipt screenshot')} />
                    <div>
                      <strong>{checkoutReceiptDraft.name}</strong>
                      <span>{tr('Receipt attached to this order')}</span>
                    </div>
                  </div>
                ) : (
                  <p className="muted-copy">
                    {tr('You can also upload the screenshot later from Orders.')}
                  </p>
                )}
              </div>
            ) : null}

            <div className="checkout-total">
              <span>{tr('Total')}</span>
              <strong>{formatMoney(checkoutAmount)}</strong>
            </div>

            <button className="primary-button full-width" onClick={confirmCheckout}>
              {tr('Submit payment request')}
            </button>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

type SectionHeaderProps = {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: ReactNode
}

function SectionHeader({ eyebrow, title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {subtitle ? <p className="muted-copy">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

type MetricTileProps = {
  label: string
  value: string
  compact?: boolean
  icon?: ReactNode
  iconOnly?: boolean
}

function MetricTile({ label, value, compact, icon, iconOnly }: MetricTileProps) {
  return (
    <div
      className={`metric-tile ${compact ? 'metric-tile-compact' : ''} ${icon ? 'metric-tile-icon' : ''}`}
      title={label}
      aria-label={label}
    >
      {icon ? (
        <div className="metric-tile-head">
          <span className="metric-tile-icon-shell" aria-hidden="true">
            {icon}
          </span>
          {iconOnly ? <span className="sr-only">{label}</span> : <span>{label}</span>}
        </div>
      ) : (
        <span>{label}</span>
      )}
      <strong>{value}</strong>
    </div>
  )
}

type StatusPillProps = {
  children: ReactNode
  tone: 'lime' | 'ice' | 'amber' | 'neutral'
}

function StatusPill({ children, tone }: StatusPillProps) {
  return <span className={`status-pill status-${tone}`}>{children}</span>
}

type PlanCardProps = {
  plan: Plan
  actionLabel: string
  tr: (value: string) => string
  formatMoney: (value: number) => string
  daysAccess: (count: number) => string
  devicesCount: (count: number) => string
  moreLocations: (count: number) => string
  onAction: () => void
}

function PlanCard({
  plan,
  actionLabel,
  tr,
  formatMoney,
  daysAccess,
  devicesCount,
  moreLocations,
  onAction,
}: PlanCardProps) {
  const visibleLocations = plan.locations.slice(0, 2).map((location) => tr(location)).join(' • ')
  const extraLocations =
    plan.locations.length > 2 ? ` ${moreLocations(plan.locations.length - 2)}` : ''
  const visiblePerks = plan.perks.slice(0, 2).map((perk) => tr(perk)).join(' • ')

  return (
    <details className={`plan-card plan-${plan.accent} plan-accordion`}>
      <summary className="plan-summary">
        <div className="plan-top">
          <div className="plan-heading">
            <p className="eyebrow">{tr(plan.badge ?? plan.category)}</p>
            <h3>{tr(plan.name)}</h3>
            <p className="plan-subtitle">{tr(plan.subtitle)}</p>
          </div>
          <div className="plan-summary-side">
            <StatusPill
              tone={
                plan.accent === 'amber'
                  ? 'amber'
                  : plan.accent === 'ice'
                    ? 'ice'
                    : 'lime'
              }
            >
              {tr(plan.speedTier)}
            </StatusPill>
            <span className="ticket-toggle order-toggle" aria-hidden="true">
              <ChevronIcon />
            </span>
          </div>
        </div>

        <div className="plan-price-band">
          <div className="plan-price-copy">
            <strong>{formatMoney(plan.price)}</strong>
            <span>{daysAccess(plan.durationDays)}</span>
          </div>
          <span className="plan-device-pill">{devicesCount(plan.deviceLimit)}</span>
        </div>
      </summary>

      <div className="plan-card-body">
        <p className="plan-description">{tr(plan.description)}</p>

        <div className="plan-meta-row">
          <span className="plan-meta-chip">{`${visibleLocations}${extraLocations}`}</span>
          <span className="plan-meta-chip">{plan.protocols.join(' / ')}</span>
          <span className="plan-meta-chip">{tr(plan.dataCap)}</span>
        </div>

        <p className="plan-note">{visiblePerks}</p>

        <button className="primary-button full-width" onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    </details>
  )
}

type OrderCardProps = {
  order: Order
  service?: UserService
  tr: (value: string) => string
  formatDate: (value: string) => string
  formatMoney: (value: number) => string
  formatNumber: (value: number) => string
  daysLeft: (count: number) => string
  uptimeLabel: (value: string) => string
  onCopy?: () => void
  onDownload?: () => void
  onCopyPaymentValue?: (value: string, label: string) => void
  onUploadReceipt?: (file: File | null) => void
  onRenew?: () => void
  onUpgrade?: () => void
  onCopyCredentials?: () => void
  onDownloadOvpn?: () => void
  onCancel?: () => void
}

function OrderCard({
  order,
  service,
  tr,
  formatDate,
  formatMoney,
  formatNumber,
  daysLeft,
  uptimeLabel,
  onCopy,
  onDownload,
  onCopyPaymentValue,
  onUploadReceipt,
  onRenew,
  onUpgrade,
  onCopyCredentials,
  onDownloadOvpn,
  onCancel,
}: OrderCardProps) {
  const compactConfig = service
    ? service.configCode.length > 36
      ? `${service.configCode.slice(0, 16)}...${service.configCode.slice(-8)}`
      : service.configCode
    : ''
  const awaitingTransfer =
    (order.paymentMethod === 'card' || order.paymentMethod === 'crypto') &&
    order.status === 'processing'

  return (
    <details className="service-card card-frame order-card order-accordion">
      <summary className="order-card-head order-summary">
        <div className="order-card-copy">
          <div className="stat-line">
            <StatusPill tone={order.status === 'paid' ? 'lime' : order.status === 'cancelled' || order.status === 'rejected' ? 'neutral' : 'amber'}>
              {tr(order.status)}
            </StatusPill>
            <span>{tr(order.kind)}</span>
          </div>
          <h3>{tr(order.planName)}</h3>
          <p className="muted-copy">
            {formatDate(order.createdAt)} • {tr(order.paymentMethod)}
          </p>
        </div>

        <div className="order-card-side">
          <strong>{formatMoney(order.amount)}</strong>
          <div className="order-summary-side">
            {service ? (
              <StatusPill
                tone={
                  service.status === 'active'
                    ? 'lime'
                    : service.status === 'expiring'
                      ? 'amber'
                      : service.status === 'trial'
                        ? 'ice'
                        : 'neutral'
                }
              >
                {tr(statusLabel(service.status))}
              </StatusPill>
            ) : null}
            <span className="ticket-toggle order-toggle" aria-hidden="true">
              <ChevronIcon />
            </span>
          </div>
        </div>
      </summary>

      {service ? (
        <div className="order-card-body">
          <div className="mini-stats order-card-grid">
            <MetricTile label={tr('Ping')} value={`${formatNumber(service.latency)}ms`} compact />
            <MetricTile
              label={tr('Devices')}
              value={`${formatNumber(service.devicesInUse)}/${formatNumber(service.deviceLimit)}`}
              compact
            />
            <MetricTile label={tr('Expires')} value={formatDate(service.expiresAt)} compact />
          </div>

          <div className="order-card-meta">
            <span className="plan-meta-chip">{tr(service.region)}</span>
            <span className="plan-meta-chip">{service.protocol}</span>
            <span className="plan-meta-chip">{daysLeft(daysRemaining(service.expiresAt))}</span>
            <span className="plan-meta-chip">{uptimeLabel(service.uptime)}</span>
          </div>

          {service.configCode && compactConfig ? (
            <div className="config-shell order-card-config">
              <div className="service-config-main">
                <span>V2Ray</span>
                <code>{compactConfig}</code>
              </div>
              <div className="service-config-actions">
                {onCopy ? (
                  <button className="ghost-button small" onClick={onCopy}>
                    {tr('Copy')}
                  </button>
                ) : null}
                {onDownload ? (
                  <button className="ghost-button small" onClick={onDownload}>
                    {tr('Download')}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {(onCopyCredentials || onDownloadOvpn) ? (
            <div className="service-vpn-delivery">
              <p className="service-vpn-title">🔐 OpenVPN</p>
              <div className="service-vpn-actions">
                {onCopyCredentials ? (
                  <button className="primary-button" onClick={onCopyCredentials}>
                    📋 یوزر / پسورد
                  </button>
                ) : null}
                {onDownloadOvpn ? (
                  <button className="ghost-button" onClick={onDownloadOvpn}>
                    ⬇ دانلود .ovpn
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="service-actions order-card-actions">
            {onRenew ? (
              <button className="primary-button" onClick={onRenew}>
                {tr('Renew')}
              </button>
            ) : null}
            {onUpgrade ? (
              <button className="ghost-button" onClick={onUpgrade}>
                {tr('Upgrade')}
              </button>
            ) : null}
          </div>
        </div>
      ) : awaitingTransfer ? (
        <div className="order-card-body">
            <div className="bank-transfer-box order-transfer-box">
              <div className="bank-transfer-head">
              <p className="eyebrow">
                {order.paymentMethod === 'card'
                  ? tr('Awaiting transfer')
                  : tr('Awaiting crypto payment')}
              </p>
              <h3>
                {order.paymentMethod === 'card'
                  ? tr(bankTransferDetails.note)
                  : tr(cryptoTransferDetails.note)}
              </h3>
              <p className="muted-copy">
                {order.paymentMethod === 'card'
                  ? tr(bankTransferDetails.warning)
                  : tr(cryptoTransferDetails.warning)}
              </p>
            </div>

            <div className="payment-details-grid">
              {order.paymentMethod === 'card' ? (
                <>
                  <div className="payment-detail">
                    <span>{tr('Bank')}</span>
                    <strong>{tr(bankTransferDetails.bank)}</strong>
                  </div>
                  <div className="payment-detail">
                    <div className="payment-detail-head">
                      <span>{tr('Card number')}</span>
                      <button
                        className="payment-copy-icon"
                        aria-label={tr('Copy')}
                        title={tr('Copy')}
                        onClick={() =>
                          onCopyPaymentValue?.(
                            bankTransferDetails.cardNumber,
                            tr('Card number'),
                          )
                        }
                      >
                        <CopyIcon />
                      </button>
                    </div>
                    <div className="payment-detail-value">
                      <strong dir="ltr">{bankTransferDetails.cardNumber}</strong>
                    </div>
                  </div>
                  <div className="payment-detail payment-detail-full">
                    <div className="payment-detail-head">
                      <span>{tr('IBAN')}</span>
                      <button
                        className="payment-copy-icon"
                        aria-label={tr('Copy')}
                        title={tr('Copy')}
                        onClick={() =>
                          onCopyPaymentValue?.(bankTransferDetails.iban, tr('IBAN'))
                        }
                      >
                        <CopyIcon />
                      </button>
                    </div>
                    <div className="payment-detail-value">
                      <strong dir="ltr">{bankTransferDetails.iban}</strong>
                    </div>
                  </div>
                </>
              ) : (
                cryptoTransferDetails.wallets.map((wallet) => (
                  <div key={wallet.id} className="payment-detail payment-detail-full">
                    <div className="payment-detail-head">
                      <span>{`${wallet.asset} • ${wallet.network}`}</span>
                      <button
                        className="payment-copy-icon"
                        aria-label={tr('Copy')}
                        title={tr('Copy')}
                        onClick={() =>
                          onCopyPaymentValue?.(
                            wallet.address,
                            `${wallet.asset} ${wallet.network}`,
                          )
                        }
                      >
                        <CopyIcon />
                      </button>
                    </div>
                    <div className="payment-detail-value">
                      <strong dir="ltr">{wallet.address}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>

            <label className="ghost-button full-width file-trigger">
              {order.receiptImage
                ? tr('Change receipt screenshot')
                : tr('Upload receipt screenshot')}
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  event.target.value = ''
                  onUploadReceipt?.(file)
                }}
              />
            </label>

            {order.receiptImage ? (
              <div className="receipt-preview">
                <img src={order.receiptImage} alt={tr('Receipt screenshot')} />
                <div>
                  <strong>{order.receiptFileName ?? tr('Receipt uploaded')}</strong>
                  <span>
                    {order.receiptUploadedAt
                      ? `${tr('Receipt uploaded on')} ${formatDate(order.receiptUploadedAt)}`
                      : tr('Receipt attached to this order')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="order-card-meta">
                <span className="plan-meta-chip">{tr('Receipt pending')}</span>
              </div>
            )}
          </div>
          {onCancel ? (
            <button
              className="ghost-button full-width"
              style={{ color: '#f87171', marginTop: 8 }}
              onClick={onCancel}
            >
              ❌ {tr('Cancel order')}
            </button>
          ) : null}
        </div>
      ) : order.status === 'cancelled' || order.status === 'rejected' ? (
        <div className="order-card-body">
          <div className="order-card-meta">
            <span className="plan-meta-chip" style={{ opacity: 0.7 }}>
              {order.status === 'cancelled' ? tr('Order cancelled') : tr('Order rejected')}
            </span>
          </div>
        </div>
      ) : (
        <div className="order-card-body">
          <div className="order-card-meta">
            <span className="plan-meta-chip">{tr('No active plan')}</span>
          </div>
        </div>
      )}
    </details>
  )
}

type IconProps = {
  className?: string
}

function HomeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 10.5L12 4l8 6.5V20H4v-9.5z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 20v-5h6v5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function LayersIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4l8 4-8 4-8-4 8-4z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 12l8 4 8-4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 16l8 4 8-4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function ShieldIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l7 3v5c0 5.1-2.8 8.6-7 10-4.2-1.4-7-4.9-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.5 12.5l1.8 1.8 3.7-4.1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function ChatIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7.5A3.5 3.5 0 018.5 4h7A3.5 3.5 0 0119 7.5v5A3.5 3.5 0 0115.5 16H10l-4 4v-4.5A3.5 3.5 0 015 12.5v-5z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function UserIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 19.5c1.8-3 4.1-4.5 6.5-4.5s4.7 1.5 6.5 4.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function ChevronIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14.5 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function GlobeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 12h16" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 4c2.6 2.3 4 5 4 8s-1.4 5.7-4 8c-2.6-2.3-4-5-4-8s1.4-5.7 4-8z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function TagIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M11 4H6.5A2.5 2.5 0 004 6.5V11l7.8 7.8a1.5 1.5 0 002.1 0l5-5a1.5 1.5 0 000-2.1L11 4z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="8" cy="8" r="1.25" fill="currentColor" />
    </svg>
  )
}

function ReceiptIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4.5h10v15l-2.1-1.6-2.1 1.6-2.1-1.6-2.1 1.6V4.5z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M9.5 9h5M9.5 12h5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function WalletIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7.5A2.5 2.5 0 017.5 5h9A2.5 2.5 0 0119 7.5v9a2.5 2.5 0 01-2.5 2.5h-9A2.5 2.5 0 015 16.5v-9z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M5 9h14" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="15.5" cy="13.5" r="1.1" fill="currentColor" />
    </svg>
  )
}

function CalendarIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="6" width="14" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 4.5v3M16 4.5v3M5 10h14" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function LaunchIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 15L15 9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10 7h7v7" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M18 13v4A2 2 0 0116 19H7a2 2 0 01-2-2V8a2 2 0 012-2h4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function CopyIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="7" width="10" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 15H6a2 2 0 01-2-2V6a2 2 0 012-2h7a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function CloseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 7l10 10" stroke="currentColor" strokeWidth="1.8" />
      <path d="M17 7L7 17" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export default App
