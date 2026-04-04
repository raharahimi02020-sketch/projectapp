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
  { id: 'starter', label: 'Starter' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'family', label: 'Family' },
  { id: 'unlimited', label: 'Unlimited' },
  { id: 'business', label: 'Business' },
]

const paymentOptions: Array<{ id: PaymentMethod; label: string }> = [
  { id: 'card', label: 'Card' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'wallet', label: 'Wallet' },
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

const orderStatusOptions: Array<Order['status']> = ['paid', 'processing']
const orderKindOptions: Array<Order['kind']> = ['purchase', 'renew', 'upgrade', 'trial']

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
  category: 'starter',
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
  perks: ['Instant delivery'],
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
  const [screen, setScreen] = useState<Screen>('landing')
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
  const [adminMessage, setAdminMessage] = useState('')
  const [adminTone, setAdminTone] = useState<'lime' | 'ice' | 'amber'>('lime')
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
  }, [state])

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
  const filteredPlans = state.plans.filter((plan) => {
    const matchesCategory =
      activeCategory === 'all' || plan.category === activeCategory
    const haystack = [
      tr(plan.name),
      tr(plan.subtitle),
      tr(plan.description),
      plan.locations.map((location) => tr(location)).join(' '),
      plan.perks.map((perk) => tr(perk)).join(' '),
    ]
      .join(' ')
      .toLowerCase()

    return matchesCategory && (!planSearchToken || haystack.includes(planSearchToken))
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

    const starterPlan = state.plans.find((plan) => plan.category === 'starter')
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
            paymentMethod: 'wallet',
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
      const manualReceiptFlow =
        paymentMethod === 'card' || paymentMethod === 'crypto'
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
      void notifyPurchaseByEmail(notificationPayload)
    }

    pulseTelegram('heavy')
    showToast(
      paymentMethod === 'card' || paymentMethod === 'crypto'
        ? tr('Order moved to Orders and is waiting for your payment receipt')
        : purchaseIntent.mode === 'renew'
          ? tr('Subscription renewed')
          : purchaseIntent.mode === 'upgrade'
            ? tr('Plan upgraded successfully')
            : tr('VPN service delivered instantly'),
    )
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

  const updateOrderField = <K extends keyof Order>(orderId: string, field: K, value: Order[K]) => {
    setState((previous) => {
      const currentOrder = previous.orders.find((order) => order.id === orderId)

      if (!currentOrder) {
        return previous
      }

      let orders = previous.orders
      let services = previous.services

      if (field === 'planId') {
        const nextPlan =
          previous.plans.find((plan) => plan.id === value) ??
          previous.plans.find((plan) => plan.id === currentOrder.planId)

        orders = previous.orders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                planId: nextPlan?.id ?? order.planId,
                planName: nextPlan?.name ?? order.planName,
                amount: nextPlan?.price ?? order.amount,
              }
            : order,
        )

        services = previous.services.map((service) =>
          service.orderId === orderId
            ? {
                ...service,
                planId: nextPlan?.id ?? service.planId,
                planName: nextPlan?.name ?? service.planName,
                deviceLimit: nextPlan?.deviceLimit ?? service.deviceLimit,
              }
            : service,
        )
      } else if (field === 'promoCode') {
        orders = previous.orders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                promoCode: String(value).trim()
                  ? String(value).trim().toUpperCase()
                  : undefined,
              }
            : order,
        )
      } else if (field === 'status' && value === 'paid' && currentOrder.status !== 'paid') {
        const nextOrder: Order = { ...currentOrder, status: 'paid' }
        const fulfillment = fulfillOrder(
          previous.services,
          previous.plans,
          previous.servers,
          previous.profile,
          nextOrder,
        )

        services = fulfillment.services
        orders = previous.orders.map((order) =>
          order.id === orderId ? nextOrder : order,
        )
      } else {
        orders = previous.orders.map((order) =>
          order.id === orderId ? { ...order, [field]: value } : order,
        )
      }

      return {
        ...previous,
        orders,
        services,
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
      locations: newPlanDraft.locations.length ? newPlanDraft.locations : ['Germany'],
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

  const copyReferral = async () => {
    const success = await copyText(
      `https://t.me/lianvpn_bot?start=${state.profile.referralCode}`,
    )
    showToast(
      success ? tr('Referral link copied') : tr('Clipboard is not available'),
    )
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

  const renderLanding = () => (
    <div className="landing-shell">
      <div className="landing-brand">
        <h1 className="landing-title">Lian Global</h1>
        <p className="landing-subtitle">{tr('Digital services without borders')}</p>
      </div>

      <div className="landing-cards">
        <button className="landing-card landing-card-vpn" onClick={() => switchScreen('home')}>
          <div className="landing-card-logo">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="vpn-bg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#2a1060"/>
                  <stop offset="100%" stopColor="#0a0520"/>
                </radialGradient>
                <linearGradient id="vpn-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f5c842"/>
                  <stop offset="100%" stopColor="#c8960a"/>
                </linearGradient>
                <linearGradient id="vpn-L" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9b59f7"/>
                  <stop offset="100%" stopColor="#6020c0"/>
                </linearGradient>
                <linearGradient id="vpn-wave" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c89fff"/>
                  <stop offset="100%" stopColor="#7030d0"/>
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="56" fill="url(#vpn-bg)" stroke="url(#vpn-gold)" strokeWidth="2"/>
              <circle cx="60" cy="60" r="50" fill="none" stroke="url(#vpn-gold)" strokeWidth="0.8" opacity="0.4"/>
              <path d="M36 34 L36 82 L60 82" stroke="url(#vpn-L)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M57 72 Q68 58 79 62 Q88 65 84 76 Q79 86 68 83 Q58 80 57 72Z" fill="url(#vpn-wave)"/>
            </svg>
          </div>
          <div className="landing-card-label">VPN SERVICES</div>
          <div className="landing-card-tap">{tr('TAP TO ENTER')}</div>
        </button>

        <button className="landing-card landing-card-exchange" onClick={() => switchScreen('home')}>
          <div className="landing-card-logo">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="ex-bg" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="#1a0a40"/>
                  <stop offset="100%" stopColor="#060314"/>
                </radialGradient>
                <linearGradient id="ex-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f5c842"/>
                  <stop offset="100%" stopColor="#c8960a"/>
                </linearGradient>
                <linearGradient id="ex-purple" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6020c0"/>
                  <stop offset="100%" stopColor="#9b59f7"/>
                </linearGradient>
              </defs>
              <rect width="120" height="120" rx="14" fill="url(#ex-bg)"/>
              <circle cx="60" cy="55" r="26" stroke="url(#ex-purple)" strokeWidth="2.5" fill="none"/>
              <path d="M46 55 L74 55 M60 41 L60 69" stroke="url(#ex-purple)" strokeWidth="1.8" opacity="0.5"/>
              <text x="60" y="62" textAnchor="middle" fill="url(#ex-gold)" fontSize="22" fontWeight="bold" fontFamily="sans-serif">L</text>
              <path d="M22 30 Q60 16 98 30" stroke="url(#ex-gold)" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <path d="M98 80 Q60 94 22 80" stroke="url(#ex-purple)" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <polygon points="94,22 98,30 88,28" fill="url(#ex-gold)"/>
              <polygon points="26,88 22,80 32,82" fill="url(#ex-purple)"/>
              <circle cx="40" cy="76" r="9" fill="#0a0520" stroke="url(#ex-purple)" strokeWidth="1.5"/>
              <text x="40" y="80" textAnchor="middle" fill="#f5c842" fontSize="10" fontWeight="bold">₿</text>
              <circle cx="80" cy="34" r="9" fill="#0a0520" stroke="url(#ex-gold)" strokeWidth="1.5"/>
              <text x="80" y="38" textAnchor="middle" fill="#f5c842" fontSize="10" fontWeight="bold">$</text>
            </svg>
          </div>
          <div className="landing-card-label">EXCHANGE SERVICES</div>
          <div className="landing-card-tap">{tr('TAP TO ENTER')}</div>
        </button>
      </div>

      <p className="landing-footer">{tr('Fast delivery, security, and 24h support')}</p>
    </div>
  )

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
          eyebrow={tr('Plans')}
          title={tr('Featured subscription cards')}
          subtitle={tr(
            'These cards can be promoted on the home feed the same way as the reference screenshot.',
          )}
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
          eyebrow={tr('Delivery')}
          title={tr('Configs, renewals, and upgrades')}
          subtitle={tr('Everything the customer needs after payment lives in this tab.')}
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
                  onCopy={linkedService ? () => copyConfig(linkedService) : undefined}
                  onDownload={linkedService ? () => downloadConfig(linkedService) : undefined}
                  onCopyPaymentValue={copyPaymentDetail}
                  onUploadReceipt={(file) => void applyOrderReceipt(order.id, file)}
                  onRenew={
                    linkedService
                      ? () => openCheckout(linkedService.planId, 'renew', linkedService.id)
                      : undefined
                  }
                  onUpgrade={linkedService ? () => openUpgrade(linkedService) : undefined}
                />
              )
            })
          ) : (
            <div className="empty-card">
              <h3>{tr('Order history')}</h3>
              <p>{tr('Use the Plans tab to simulate the purchase flow and auto-delivery.')}</p>
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
              value={formatCompactValue(revenue)}
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
          eyebrow={tr('Support')}
          title={tr('Tickets, guides, and FAQs')}
          subtitle={tr('This tab combines self-serve setup with direct support escalation.')}
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
          eyebrow={tr('Queue')}
          title={tr('Recent tickets')}
          subtitle={tr('Open and pending issues stay visible to both the customer and admin.')}
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
          eyebrow={tr('FAQ')}
          title={tr('Answer the most common questions')}
          subtitle={tr('Search in the global field and the FAQ list reacts instantly.')}
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

          <div className="mini-stats">
            <MetricTile label={tr('Wallet')} value={formatMoney(state.profile.walletCredit)} compact />
            <MetricTile label={tr('Referrals')} value={formatNumber(state.profile.referrals)} compact />
            <MetricTile label={tr('Preferred route')} value={tr(state.profile.preferredRegion)} compact />
          </div>
        </div>
      </section>

      <section className="content-section">
        <SectionHeader
          eyebrow={tr('Growth')}
          title={tr('Promos, referrals, and loyalty')}
          subtitle={tr('Useful sales levers that keep this kind of VPN mini app sticky.')}
        />

        <div className="grid-two">
          <div className="content-card">
            <p className="eyebrow">{tr('Referral')}</p>
            <h3>{state.profile.referralCode}</h3>
            <p className="muted-copy">
              {tr(
                'Share the Telegram deep link and reward wallet credit on successful purchases.',
              )}
            </p>
            <button className="ghost-button" onClick={copyReferral}>
              {tr('Copy referral link')}
            </button>
          </div>

          <div className="content-card">
            <p className="eyebrow">{tr('Live promo codes')}</p>
            <div className="coupon-tags">
              {featuredCampaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  className="campaign-pill"
                  onClick={async () => {
                    const success = await copyText(campaign.code)
                    showToast(
                      success
                        ? copiedMessage(campaign.code)
                        : tr('Clipboard is not available'),
                    )
                  }}
                >
                  {campaign.code}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <SectionHeader
          eyebrow={tr('Orders')}
          title={tr('Lifetime value view')}
          subtitle={tr('A compact summary of what this user has already purchased.')}
        />

        <div className="customer-row card-frame">
          <strong>{tr('Total paid')}</strong>
          <span>{formatMoney(paidLifetimeValue(state.orders))}</span>
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
      </section>

      <section className="content-section">
        <SectionHeader
          eyebrow={tr('Orders')}
          title={tr('All orders')}
        />
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
                      <span className={`plan-meta-chip ${order.status === 'paid' ? '' : 'chip-amber'}`}>
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
                      <button
                        className="primary-button full-width"
                        onClick={() => updateOrderField(order.id, 'status', 'paid')}
                      >
                        {tr('Mark as paid')}
                      </button>
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
        {screen === 'landing' && renderLanding()}
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
              {paymentMethod === 'card' || paymentMethod === 'crypto'
                ? tr('Submit payment request')
                : tr('Confirm payment')}
            </button>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

type SectionHeaderProps = {
  eyebrow: string
  title: string
  subtitle?: string
  action?: ReactNode
}

function SectionHeader({ eyebrow, title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
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
            <StatusPill tone={order.status === 'paid' ? 'lime' : 'amber'}>
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

          <div className="config-shell order-card-config">
            <div className="service-config-main">
              <span>{tr('Config')}</span>
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
