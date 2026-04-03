export type AppLanguage = 'fa' | 'ar' | 'en'

export const LANGUAGE_STORAGE_KEY = 'lian-vpn-miniapp-language-v1'

export const languageOptions: Array<{ id: AppLanguage; label: string }> = [
  { id: 'fa', label: 'فارسی' },
  { id: 'ar', label: 'العربية' },
  { id: 'en', label: 'English' },
]

const locales: Record<AppLanguage, string> = {
  fa: 'fa-IR',
  ar: 'ar-SA',
  en: 'en-US',
}

const staticTranslations: Record<AppLanguage, Record<string, string>> = {
  en: {},
  fa: {
    Language: 'زبان',
    Close: 'بستن',
    'VPN access': 'دسترسی VPN',
    'Free trial': 'نسخه آزمایشی',
    'Featured subscription cards': 'پلن‌های پیشنهادی',
    'These cards can be promoted on the home feed the same way as the reference screenshot.':
      'این کارت‌ها را می‌توان مثل نمونه در فید اصلی نمایش داد.',
    Home: 'خانه',
    Plans: 'پلن‌ها',
    'My VPN': 'VPN من',
    Support: 'پشتیبانی',
    Profile: 'پروفایل',
    Subscriber: 'مشترک',
    Services: 'سرویس‌ها',
    'My VPN overview': 'خلاصه VPN من',
    'Active lines, devices, and the nearest renewal at a glance.':
      'وضعیت سرویس‌ها، دستگاه‌ها و نزدیک‌ترین تمدید را یک‌جا ببین.',
    'Next expiry': 'انقضای بعدی',
    'Quick controls': 'کنترل سریع',
    'One compact card per service with the actions users actually need.':
      'برای هر سرویس یک کارت جمع‌وجور با اکشن‌های اصلی قرار داده شده است.',
    'Latest payments': 'پرداخت‌های اخیر',
    'The newest orders stay here so the page does not get too long.':
      'جدیدترین سفارش‌ها اینجا می‌مانند تا صفحه بیش از حد بلند نشود.',
    Type: 'نوع',
    Plan: 'پلن',
    Volume: 'حجم',
    Devices: 'دستگاه‌ها',
    'No active plan': 'بدون پلن فعال',
    'No protocol': 'بدون پروتکل',
    'No expiry': 'بدون انقضا',
    Inactive: 'غیرفعال',
    Active: 'فعال',
    Trial: 'آزمایشی',
    Expiring: 'رو به پایان',
    Expired: 'منقضی',
    Network: 'شبکه',
    'Server pulse': 'وضعیت سرورها',
    'Status, load, and latency are visible before the user purchases.':
      'وضعیت، بار و پینگ سرورها قبل از خرید برای کاربر قابل مشاهده است.',
    'Referral loop': 'حلقه دعوت',
    'Bring friends, stack wallet credit': 'با دعوت دوستان اعتبار بگیر',
    'Copy link': 'کپی لینک',
    Catalog: 'کاتالوگ',
    'VPN plans ready to sell': 'پلن‌های VPN',
    'This screen covers list, compare, coupon input, and direct checkout.':
      'این صفحه لیست پلن‌ها، مقایسه، کد تخفیف و پرداخت مستقیم را پوشش می‌دهد.',
    'Discount codes': 'کدهای تخفیف',
    'Copy and use in checkout': 'کپی کن و داخل پرداخت استفاده کن',
    'Tap a code to place it in the box below.': 'یک کد را انتخاب کن تا داخل باکس قرار بگیرد.',
    'What is this?': 'چیست؟',
    'Pick an active code': 'انتخاب کد فعال',
    'Choose one of the active discount codes or type your own. If it is valid, the final amount updates instantly.':
      'یکی از کدهای تخفیف فعال را انتخاب کن یا کد خودت را وارد کن. اگر معتبر باشد، مبلغ نهایی همان لحظه به‌روزرسانی می‌شود.',
    'No active discount codes right now': 'فعلا کد تخفیف فعالی وجود ندارد',
    Copy: 'کپی',
    'Buy now': 'خرید',
    All: 'همه',
    Starter: 'استارتر',
    Streaming: 'استریم',
    Family: 'خانوادگی',
    Unlimited: 'نامحدود',
    Business: 'سازمانی',
    'Open checkout': 'پرداخت',
    Delivery: 'تحویل',
    'Configs, renewals, and upgrades': 'کانفیگ، تمدید و ارتقا',
    'Everything the customer needs after payment lives in this tab.':
      'هر چیزی که کاربر بعد از پرداخت نیاز دارد در این تب قرار گرفته است.',
    'Add another plan': 'افزودن پلن',
    'Add plan': 'افزودن',
    'No active services yet': 'هنوز سرویسی فعال نیست',
    'Use the Plans tab to simulate the purchase flow and auto-delivery.':
      'از تب پلن‌ها خرید را شبیه‌سازی کن تا تحویل خودکار را ببینی.',
    'Browse plans': 'مشاهده پلن‌ها',
    Payments: 'پرداخت‌ها',
    'Order history': 'تاریخچه سفارش',
    'Paid orders, revenue, and next renewal at a glance.':
      'سفارش‌های پرداخت‌شده، درآمد و نزدیک‌ترین تمدید را یک‌جا ببین.',
    'Renewals, upgrades, and trial activations are all recorded here.':
      'تمدید، ارتقا و فعال‌سازی نسخه آزمایشی همگی اینجا ثبت می‌شوند.',
    'Tickets, guides, and FAQs': 'تیکت، راهنما و سوالات متداول',
    'This tab combines self-serve setup with direct support escalation.':
      'این تب راه‌اندازی سریع و ارجاع مستقیم به پشتیبانی را کنار هم می‌آورد.',
    'Open a ticket': 'ایجاد تیکت',
    'Open link': 'باز کردن لینک',
    'App Store': 'اپ‌استور',
    Releases: 'ریلیزها',
    'Install from the App Store': 'از اپ‌استور نصب کن',
    'Import your config': 'کانفیگ را ایمپورت کن',
    'Tap connect': 'روی اتصال بزن',
    'Install from GitHub': 'از گیت‌هاب نصب کن',
    'Enable VPN': 'VPN را فعال کن',
    'Download the desktop release': 'نسخه دسکتاپ را دانلود کن',
    'Launch the app': 'اپ را اجرا کن',
    'Download the macOS release': 'نسخه macOS را دانلود کن',
    'Enable system proxy': 'پروکسی سیستم را فعال کن',
    'Support inbox': 'صندوق پشتیبانی',
    'Ticket title': 'عنوان تیکت',
    Setup: 'نصب و راه‌اندازی',
    Billing: 'پرداخت',
    Speed: 'سرعت',
    'Describe the issue': 'مشکل را توضیح بده',
    'Send ticket': 'ارسال تیکت',
    Queue: 'صف',
    'Recent tickets': 'تیکت‌های اخیر',
    'Open and pending issues stay visible to both the customer and admin.':
      'مشکلات باز و در انتظار هم برای کاربر و هم برای ادمین قابل مشاهده می‌مانند.',
    FAQ: 'سوالات متداول',
    'Answer the most common questions': 'پاسخ به سوالات پرتکرار',
    'Search in the global field and the FAQ list reacts instantly.':
      'با جست‌وجوی سراسری، لیست FAQ هم‌زمان فیلتر می‌شود.',
    'Edit FAQ entries': 'ویرایش FAQ',
    'Everything customers read in Support can be changed here.':
      'هر چیزی که کاربر در بخش پشتیبانی می‌خواند از اینجا قابل ویرایش است.',
    Question: 'سوال',
    Answer: 'پاسخ',
    'Add new FAQ': 'افزودن FAQ جدید',
    'Create a new FAQ item that appears instantly in Support.':
      'یک آیتم FAQ جدید بساز که بلافاصله در بخش پشتیبانی نمایش داده شود.',
    'Create FAQ': 'ایجاد FAQ',
    Account: 'حساب',
    'member since': 'عضو از',
    Referrals: 'دعوت‌ها',
    'Preferred route': 'مسیر ترجیحی',
    Growth: 'رشد',
    'Promos, referrals, and loyalty': 'تخفیف، دعوت و وفاداری',
    'Useful sales levers that keep this kind of VPN mini app sticky.':
      'اهرم‌های فروش مفیدی که این مدل مینی‌اپ VPN را چسبنده‌تر می‌کنند.',
    Referral: 'دعوت',
    'Share the Telegram deep link and reward wallet credit on successful purchases.':
      'لینک عمیق تلگرام را به اشتراک بگذار و به ازای خرید موفق، اعتبار کیف پول بگیر.',
    'Copy referral link': 'کپی لینک دعوت',
    'Live promo codes': 'کدهای تخفیف فعال',
    Orders: 'سفارش‌ها',
    'Lifetime value view': 'نمای ارزش طول عمر',
    'A compact summary of what this user has already purchased.':
      'خلاصه‌ای فشرده از خریدهای انجام‌شده‌ی این کاربر.',
    'Total paid': 'جمع پرداختی',
    'Open admin console': 'ورود به پنل ادمین',
    Admin: 'ادمین',
    'Operator console': 'کنسول اپراتور',
    'Pricing, campaigns, server states, tickets, customer snapshots, and broadcast messages.':
      'قیمت‌گذاری، کمپین‌ها، وضعیت سرورها، تیکت‌ها، مشتریان و پیام‌های سراسری در این بخش مدیریت می‌شوند.',
    'Back to profile': 'بازگشت به پروفایل',
    Revenue: 'درآمد',
    'Active users': 'کاربران فعال',
    'Open tickets': 'تیکت‌های باز',
    'Avg latency': 'میانگین پینگ',
    Broadcast: 'اعلان',
    'Push a home banner': 'انتشار بنر هوم',
    'Notice title': 'عنوان اعلان',
    'Notice message': 'متن اعلان',
    lime: 'سبز',
    ice: 'آبی',
    amber: 'کهربایی',
    'Publish notice': 'انتشار اعلان',
    'Edit live home banners': 'ویرایش بنرهای هوم',
    'Change any existing notice and publish new ones from the same place.':
      'اعلان‌های موجود را ویرایش کن و از همین‌جا اعلان جدید هم منتشر کن.',
    'Create a new banner that appears instantly in the home feed.':
      'یک بنر جدید بساز که بلافاصله در هوم نمایش داده شود.',
    'Notice tone': 'رنگ اعلان',
    'Adjust pricing and placement': 'تنظیم قیمت و جایگاه',
    'Simple operators for demo purposes. In production these would talk to a real backend.':
      'این کنترل‌ها برای نسخه دمو هستند و در نسخه واقعی به بک‌اند متصل می‌شوند.',
    Feature: 'ویژه‌کردن',
    Unfeature: 'خارج از ویژه',
    Servers: 'سرورها',
    'Network status controls': 'کنترل وضعیت شبکه',
    'Useful for showing planned maintenance or overloads in the user-facing app.':
      'برای نمایش تعمیرات برنامه‌ریزی‌شده یا بار زیاد در اپ کاربری مفید است.',
    Campaigns: 'کمپین‌ها',
    'Coupons and acquisition loops': 'کوپن‌ها و حلقه‌های جذب',
    'Toggle campaigns on or off without touching code.':
      'کمپین‌ها را بدون دست‌زدن به کد فعال یا غیرفعال کن.',
    Disable: 'غیرفعال',
    Enable: 'فعال',
    'Support queue': 'صف پشتیبانی',
    'Moderate tickets': 'مدیریت تیکت‌ها',
    'Mark tickets as pending or resolved straight from the admin panel.':
      'تیکت‌ها را مستقیماً از پنل ادمین در انتظار یا حل‌شده کن.',
    'Edit ticket threads': 'ویرایش رشته تیکت‌ها',
    'Update the title, category, status, and every message shown to the customer.':
      'عنوان، دسته‌بندی، وضعیت و تمام پیام‌هایی که کاربر می‌بیند را از اینجا ویرایش کن.',
    Category: 'دسته‌بندی',
    Status: 'وضعیت',
    Sender: 'فرستنده',
    Timestamp: 'زمان',
    'Message text': 'متن پیام',
    'Add support message': 'افزودن پیام پشتیبانی',
    'Add user message': 'افزودن پیام کاربر',
    Pending: 'در انتظار',
    Resolve: 'حل کردن',
    Customers: 'مشتری‌ها',
    'Snapshot of active buyers': 'نمایی از خریداران فعال',
    'A lightweight placeholder for a future full admin CRM.':
      'یک جایگزین سبک برای CRM کامل در آینده.',
    'Reset demo state': 'بازنشانی داده‌های دمو',
    Checkout: 'پرداخت',
    Mode: 'حالت',
    Duration: 'مدت',
    'Promo code': 'کد تخفیف',
    Card: 'کارت‌به‌کارت',
    'Card transfer': 'واریز کارت‌به‌کارت',
    Crypto: 'کریپتو',
    'Crypto payment': 'پرداخت کریپتو',
    Wallet: 'کیف پول',
    'Payment details': 'اطلاعات پرداخت',
    'Wallet addresses': 'آدرس‌های ولت',
    'Please upload the receipt after payment.': 'لطفا حتما رسید ارسال کنید',
    Bank: 'بانک',
    'Card number': 'شماره کارت',
    IBAN: 'شبا',
    'Parsian Bank - Abedi': 'بانک پارسیان - عابدی',
    'Upload receipt screenshot': 'بارگذاری اسکرین‌شات رسید',
    'Change receipt screenshot': 'تغییر اسکرین‌شات رسید',
    'Receipt screenshot': 'اسکرین‌شات رسید',
    'Receipt attached to this order': 'رسید به این سفارش متصل شد',
    'You can also upload the screenshot later from Orders.':
      'می‌توانی اسکرین‌شات را بعدا هم از بخش سفارشات بارگذاری کنی.',
    'Submit transfer request': 'ثبت سفارش واریز',
    'Submit payment request': 'ثبت درخواست پرداخت',
    Total: 'مجموع',
    'Confirm payment': 'تایید پرداخت',
    'Receipt uploaded': 'رسید بارگذاری شد',
    'Please choose an image file': 'لطفا یک فایل تصویری انتخاب کن',
    'Receipt uploaded on': 'زمان بارگذاری رسید:',
    'Receipt pending': 'در انتظار رسید',
    'Awaiting transfer': 'در حال واریز',
    'Awaiting crypto payment': 'در انتظار پرداخت کریپتو',
    'Order moved to Orders and is waiting for your transfer receipt':
      'سفارش به بخش سفارشات منتقل شد و منتظر رسید واریز است',
    'Order moved to Orders and is waiting for your payment receipt':
      'سفارش به بخش سفارشات منتقل شد و منتظر رسید پرداخت است',
    Ping: 'پینگ',
    Expires: 'انقضا',
    Config: 'کانفیگ',
    Download: 'دانلود',
    Reset: 'ریست',
    Optimize: 'بهینه‌سازی',
    Renew: 'تمدید',
    Upgrade: 'ارتقا',
    Open: 'باز',
    Resolved: 'حل‌شده',
    Online: 'آنلاین',
    Busy: 'شلوغ',
    Maintenance: 'نگهداری',
    paid: 'پرداخت‌شده',
    processing: 'در حال واریز',
    purchase: 'خرید',
    renew: 'تمدید',
    upgrade: 'ارتقا',
    trial: 'آزمایشی',
    'Search plans, perks, locations, or FAQ': 'جست‌وجوی پلن، مزایا، لوکیشن یا FAQ',
    Toman: 'تومان',
    Germany: 'آلمان',
    Turkey: 'ترکیه',
    Netherlands: 'هلند',
    Finland: 'فنلاند',
    France: 'فرانسه',
    UK: 'بریتانیا',
    UAE: 'امارات',
    Sweden: 'سوئد',
    Tehran: 'تهران',
    Tabriz: 'تبریز',
    Shiraz: 'شیراز',
    Rasht: 'رشت',
    Frankfurt: 'فرانکفورت',
    Amsterdam: 'آمستردام',
    Istanbul: 'استانبول',
    Dubai: 'دبی',
    Helsinki: 'هلسینکی',
    'Starter 30': 'استارتر ۳۰',
    'Stream 90': 'استریم ۹۰',
    'Family 180': 'خانوادگی ۱۸۰',
    'Unlimited 365': 'نامحدود ۳۶۵',
    'Team Shield': 'تیم شیلد',
    'Starter 30 Trial': 'استارتر ۳۰ آزمایشی',
    'Cheap daily driver': 'پلن اقتصادی روزمره',
    'Stable streaming routes': 'مسیرهای پایدار استریم',
    'Home pack for multiple devices': 'بسته خانگی برای چند دستگاه',
    'Long term best value': 'بهترین ارزش بلندمدت',
    'Shared access for small teams': 'دسترسی اشتراکی برای تیم‌های کوچک',
    Popular: 'محبوب',
    'Value max': 'بیشترین ارزش',
    Team: 'تیمی',
    Fast: 'سریع',
    Turbo: 'توربو',
    'Turbo+': 'توربو+',
    Flagship: 'پرچمدار',
    'Good for messaging, social apps, and a single personal device.':
      'برای پیام‌رسانی، شبکه‌های اجتماعی و یک دستگاه شخصی مناسب است.',
    'Balanced latency and stable media routes for TV and mobile.':
      'پینگ متعادل و مسیرهای پایدار برای موبایل و تلویزیون.',
    'One subscription for the house with enough slots for all devices.':
      'یک اشتراک برای خانه با ظرفیت کافی برای همه دستگاه‌ها.',
    'Full speed annual plan with premium support and smart failover.':
      'پلن سالانه با سرعت کامل، پشتیبانی ویژه و جابه‌جایی هوشمند مسیر.',
    'Admin friendly slots, broad device coverage, and predictable speed.':
      'اسلات‌های مناسب ادمین، پوشش گسترده دستگاه و سرعت قابل پیش‌بینی.',
    'Instant delivery': 'تحویل فوری',
    'Auto renew': 'تمدید خودکار',
    '1 tap copy config': 'کپی سریع کانفیگ',
    'Streaming tuned routes': 'مسیرهای بهینه برای استریم',
    'Priority routing': 'مسیر اولویت‌دار',
    'Setup guides': 'راهنمای نصب',
    '8 devices': '۸ دستگاه',
    'Family sharing': 'اشتراک خانوادگی',
    'VIP queue': 'صف VIP',
    'Annual savings': 'صرفه‌جویی سالانه',
    'Priority support': 'پشتیبانی اولویت‌دار',
    'Best route rotation': 'بهترین چرخش مسیر',
    '12 seats': '۱۲ کاربر',
    'Shared billing': 'صورتحساب اشتراکی',
    'Bulk config export': 'خروجی گروهی کانفیگ',
    'First order launch': 'تخفیف اولین خرید',
    'Get a direct discount on your first paid order.':
      'برای اولین سفارش پرداختی تخفیف مستقیم بگیر.',
    '20% off': '۲۰٪ تخفیف',
    'Renewal week': 'هفته تمدید',
    'Extra discount if your active service is near expiry.':
      'اگر سرویس فعال نزدیک انقضا باشد، تخفیف اضافه می‌گیری.',
    '10% off': '۱۰٪ تخفیف',
    'Family switch': 'تغییر به پلن خانوادگی',
    'Move to a shared package with a higher bundle discount.':
      'به یک پلن اشتراکی با تخفیف بیشتر مهاجرت کن.',
    '25% off': '۲۵٪ تخفیف',
    'Tonight maintenance window': 'بازه نگهداری امشب',
    'Netherlands route rotation starts at 01:00 and should finish in under 15 minutes.':
      'چرخش مسیر هلند از ساعت ۰۱:۰۰ شروع می‌شود و کمتر از ۱۵ دقیقه طول می‌کشد.',
    'New low-ping route': 'مسیر جدید با پینگ پایین',
    'Frankfurt gaming route is live for Stream and Unlimited plans.':
      'مسیر گیم فرانکفورت برای پلن‌های استریم و نامحدود فعال شد.',
    'How do I receive the config after payment?':
      'بعد از پرداخت کانفیگ را چطور دریافت می‌کنم؟',
    'As soon as the order is marked paid, the config is added to My Services and can be copied or downloaded instantly.':
      'به‌محض ثبت پرداخت، کانفیگ به بخش سرویس‌های من اضافه می‌شود و می‌توانی آن را فوراً کپی یا دانلود کنی.',
    'Can I switch my route after buying?': 'بعد از خرید می‌توانم مسیرم را عوض کنم؟',
    'Yes. The service page lets you reset the config and support can move you to a better route when needed.':
      'بله. از صفحه سرویس می‌توانی کانفیگ را ریست کنی و پشتیبانی هم در صورت نیاز تو را به مسیر بهتر منتقل می‌کند.',
    'Do you support iPhone, Android, Windows, and macOS?':
      'از iPhone، Android، Windows و macOS پشتیبانی می‌کنید؟',
    'Yes. Each platform has a quick setup guide inside Support with the recommended client and steps.':
      'بله. برای هر پلتفرم یک راهنمای سریع نصب داخل بخش پشتیبانی قرار داده شده است.',
    'What happens after the subscription ends?':
      'بعد از پایان اشتراک چه اتفاقی می‌افتد؟',
    'The service status changes to expired, but your order history stays visible and you can renew with one tap.':
      'وضعیت سرویس به منقضی تغییر می‌کند، اما تاریخچه سفارش باقی می‌ماند و می‌توانی با یک لمس تمدید کنی.',
    'Can I share a family plan?': 'می‌توانم پلن خانوادگی را به اشتراک بگذارم؟',
    'Family plans are made for multiple devices and shared usage, but they still have a defined device ceiling.':
      'پلن‌های خانوادگی برای چند دستگاه و استفاده مشترک طراحی شده‌اند، اما همچنان سقف دستگاه مشخص دارند.',
    'Slow route on mobile network': 'کندی مسیر روی اینترنت موبایل',
    'Latency jumps when I switch from Wi-Fi to mobile data.':
      'وقتی از Wi-Fi به دیتای موبایل می‌روم، پینگ ناگهان بالا می‌رود.',
    'We moved your profile to the Frankfurt low-jitter route. Test again and tell us if it improved.':
      'پروفایل تو را به مسیر کم‌نوسان فرانکفورت منتقل کردیم. دوباره تست کن و بگو بهتر شده یا نه.',
    'Invoice request for annual package': 'درخواست فاکتور برای پلن سالانه',
    'Send me the paid invoice for accounting.':
      'فاکتور پرداختی را برای حسابداری برایم بفرست.',
    'Invoice was generated and sent to your Telegram inbox.':
      'فاکتور تولید شد و به صندوق تلگرام تو ارسال شد.',
    user: 'کاربر',
    support: 'پشتیبانی',
    iPhone: 'آیفون',
    Android: 'اندروید',
    Windows: 'ویندوز',
    macOS: 'مک',
    'Install the client': 'کلاینت را نصب کن',
    'Scan the QR or import config': 'QR را اسکن کن یا کانفیگ را ایمپورت کن',
    'Toggle connect': 'اتصال را فعال کن',
    'Paste the config string': 'رشته کانفیگ را پیست کن',
    'Enable the route': 'مسیر را فعال کن',
    'Download the desktop client': 'کلاینت دسکتاپ را دانلود کن',
    'Import the config file': 'فایل کانفیگ را وارد کن',
    'Use smart routing': 'از اسمارت روتینگ استفاده کن',
    'Add a new profile': 'پروفایل جدید اضافه کن',
    'Drop the config file': 'فایل کانفیگ را وارد کن',
    'Turn on system proxy': 'پروکسی سیستم را روشن کن',
    'Plan pricing updated': 'قیمت پلن به‌روزرسانی شد',
    'Featured placement updated': 'جایگاه ویژه به‌روزرسانی شد',
    'Write a title and message before publishing':
      'قبل از انتشار، عنوان و متن را وارد کن',
    'Broadcast notice published to the home screen':
      'اعلان روی صفحه اصلی منتشر شد',
    'Add a question and answer first': 'اول یک سوال و پاسخ وارد کن',
    'New FAQ added': 'FAQ جدید اضافه شد',
    'Referral link copied': 'لینک دعوت کپی شد',
    'Clipboard is not available': 'کلیپ‌بورد در دسترس نیست',
    'Demo data reset': 'داده‌های دمو بازنشانی شد',
    'Trial was already activated on this account':
      'نسخه آزمایشی قبلاً برای این حساب فعال شده است',
    '3 day trial unlocked': 'نسخه آزمایشی ۳ روزه فعال شد',
    'Subscription renewed': 'اشتراک تمدید شد',
    'Plan upgraded successfully': 'پلن با موفقیت ارتقا یافت',
    'VPN service delivered instantly': 'سرویس VPN بلافاصله تحویل شد',
    'Fresh config generated': 'کانفیگ جدید تولید شد',
    'Route optimized for the selected service': 'مسیر سرویس انتخاب‌شده بهینه شد',
    'Config file downloaded': 'فایل کانفیگ دانلود شد',
    'Config copied to clipboard': 'کانفیگ در کلیپ‌بورد کپی شد',
    'You are already on the highest plan': 'هم‌اکنون روی بالاترین پلن هستی',
    'Fill in the ticket title and message': 'عنوان و متن تیکت را کامل کن',
    'Ticket sent to support': 'تیکت برای پشتیبانی ارسال شد',
    'Marked as resolved from admin console.': 'از پنل ادمین به‌عنوان حل‌شده علامت‌گذاری شد.',
    'Server status changed': 'وضعیت سرور تغییر کرد',
    'Campaign state updated': 'وضعیت کمپین به‌روزرسانی شد',
    'Best entry': 'ورودی برتر',
  },
  ar: {
    Language: 'اللغة',
    Close: 'إغلاق',
    'VPN access': 'وصول VPN',
    'Free trial': 'نسخة تجريبية',
    'Featured subscription cards': 'الباقات المقترحة',
    'These cards can be promoted on the home feed the same way as the reference screenshot.':
      'يمكن عرض هذه البطاقات في الصفحة الرئيسية بنفس أسلوب النموذج المرجعي.',
    Home: 'الرئيسية',
    Plans: 'الباقات',
    'My VPN': 'خدمة VPN',
    Support: 'الدعم',
    Profile: 'الملف',
    Subscriber: 'المشترك',
    Services: 'الخدمات',
    'My VPN overview': 'ملخص VPN الخاص بي',
    'Active lines, devices, and the nearest renewal at a glance.':
      'شاهد الخطوط النشطة والأجهزة وأقرب موعد تجديد في مكان واحد.',
    'Next expiry': 'أقرب انتهاء',
    'Quick controls': 'تحكم سريع',
    'One compact card per service with the actions users actually need.':
      'بطاقة مختصرة لكل خدمة تضم الإجراءات التي يحتاجها المستخدم فعلاً.',
    'Latest payments': 'أحدث المدفوعات',
    'The newest orders stay here so the page does not get too long.':
      'تبقى أحدث الطلبات هنا حتى لا تصبح الصفحة طويلة جداً.',
    Type: 'النوع',
    Plan: 'الخطة',
    Volume: 'الحجم',
    Devices: 'الأجهزة',
    'No active plan': 'لا توجد خطة نشطة',
    'No protocol': 'لا يوجد بروتوكول',
    'No expiry': 'بدون انتهاء',
    Inactive: 'غير نشط',
    Active: 'نشط',
    Trial: 'تجريبي',
    Expiring: 'قارب على الانتهاء',
    Expired: 'منتهي',
    Network: 'الشبكة',
    'Server pulse': 'حالة الخوادم',
    'Status, load, and latency are visible before the user purchases.':
      'يمكن للمستخدم رؤية الحالة والحمل وزمن الاستجابة قبل الشراء.',
    'Referral loop': 'نظام الإحالة',
    'Bring friends, stack wallet credit': 'ادعُ الأصدقاء واحصل على رصيد',
    'Copy link': 'نسخ الرابط',
    Catalog: 'الكتالوج',
    'VPN plans ready to sell': 'باقات VPN',
    'This screen covers list, compare, coupon input, and direct checkout.':
      'هذه الشاشة تشمل قائمة الباقات والمقارنة وأكواد الخصم والدفع المباشر.',
    'Discount codes': 'أكواد الخصم',
    'Copy and use in checkout': 'انسخ واستخدمه في الدفع',
    'Tap a code to place it in the box below.': 'اختر كودا ليتم وضعه مباشرة داخل الحقل.',
    'What is this?': 'ما هذا؟',
    'Pick an active code': 'اختر كودا نشطا',
    'Choose one of the active discount codes or type your own. If it is valid, the final amount updates instantly.':
      'اختر أحد أكواد الخصم النشطة أو اكتب كودك الخاص. إذا كان صالحا فسيتم تحديث المبلغ النهائي فورا.',
    'No active discount codes right now': 'لا توجد أكواد خصم نشطة حاليا',
    Copy: 'نسخ',
    'Buy now': 'اشترِ الآن',
    All: 'الكل',
    Starter: 'أساسي',
    Streaming: 'بث',
    Family: 'عائلي',
    Unlimited: 'غير محدود',
    Business: 'أعمال',
    'Open checkout': 'فتح الدفع',
    Delivery: 'التسليم',
    'Configs, renewals, and upgrades': 'التهيئة والتجديد والترقية',
    'Everything the customer needs after payment lives in this tab.':
      'كل ما يحتاجه العميل بعد الدفع موجود في هذا التبويب.',
    'Add another plan': 'إضافة باقة',
    'Add plan': 'إضافة',
    'No active services yet': 'لا توجد خدمات نشطة بعد',
    'Use the Plans tab to simulate the purchase flow and auto-delivery.':
      'استخدم تبويب الباقات لمحاكاة الشراء ورؤية التسليم التلقائي.',
    'Browse plans': 'استعراض الباقات',
    Payments: 'المدفوعات',
    'Order history': 'سجل الطلبات',
    'Paid orders, revenue, and next renewal at a glance.':
      'شاهد الطلبات المدفوعة والإيراد وأقرب تجديد في مكان واحد.',
    'Renewals, upgrades, and trial activations are all recorded here.':
      'يتم تسجيل التجديدات والترقيات والتفعيل التجريبي هنا.',
    'Tickets, guides, and FAQs': 'التذاكر والأدلة والأسئلة الشائعة',
    'This tab combines self-serve setup with direct support escalation.':
      'هذا التبويب يجمع بين الإعداد الذاتي والتصعيد المباشر للدعم.',
    'Open a ticket': 'فتح تذكرة',
    'Open link': 'فتح الرابط',
    'App Store': 'آب ستور',
    Releases: 'الإصدارات',
    'Install from the App Store': 'ثبّت من آب ستور',
    'Import your config': 'استورد الإعداد',
    'Tap connect': 'اضغط اتصال',
    'Install from GitHub': 'ثبّت من GitHub',
    'Enable VPN': 'فعّل VPN',
    'Download the desktop release': 'حمّل إصدار سطح المكتب',
    'Launch the app': 'شغّل التطبيق',
    'Download the macOS release': 'حمّل إصدار macOS',
    'Enable system proxy': 'فعّل بروكسي النظام',
    'Support inbox': 'صندوق الدعم',
    'Ticket title': 'عنوان التذكرة',
    Setup: 'الإعداد',
    Billing: 'الفوترة',
    Speed: 'السرعة',
    Account: 'الحساب',
    'Describe the issue': 'اشرح المشكلة',
    'Send ticket': 'إرسال التذكرة',
    Queue: 'الطابور',
    'Recent tickets': 'أحدث التذاكر',
    'Open and pending issues stay visible to both the customer and admin.':
      'تظل المشاكل المفتوحة والمعلقة مرئية للعميل وللمشرف.',
    FAQ: 'الأسئلة الشائعة',
    'Answer the most common questions': 'الإجابة عن أكثر الأسئلة شيوعاً',
    'Search in the global field and the FAQ list reacts instantly.':
      'ابحث في الحقل العام وسيتم تحديث قائمة الأسئلة فوراً.',
    'Edit FAQ entries': 'تحرير عناصر الأسئلة الشائعة',
    'Everything customers read in Support can be changed here.':
      'كل ما يقرأه العميل في قسم الدعم يمكن تعديله من هنا.',
    Question: 'السؤال',
    Answer: 'الإجابة',
    'Add new FAQ': 'إضافة FAQ جديد',
    'Create a new FAQ item that appears instantly in Support.':
      'أنشئ عنصراً جديداً يظهر فوراً في قسم الدعم.',
    'Create FAQ': 'إنشاء FAQ',
    'member since': 'عضو منذ',
    Referrals: 'الإحالات',
    'Preferred route': 'المسار المفضل',
    Growth: 'النمو',
    'Promos, referrals, and loyalty': 'العروض والإحالات والولاء',
    'Useful sales levers that keep this kind of VPN mini app sticky.':
      'عناصر بيع مفيدة تجعل هذا النوع من تطبيقات VPN المصغرة أكثر فعالية.',
    Referral: 'إحالة',
    'Share the Telegram deep link and reward wallet credit on successful purchases.':
      'شارك الرابط العميق على تيليجرام واحصل على رصيد محفظة عند نجاح الشراء.',
    'Copy referral link': 'نسخ رابط الإحالة',
    'Live promo codes': 'أكواد الخصم النشطة',
    Orders: 'الطلبات',
    'Lifetime value view': 'قيمة العميل الإجمالية',
    'A compact summary of what this user has already purchased.':
      'ملخص مختصر لما اشتراه هذا المستخدم حتى الآن.',
    'Total paid': 'إجمالي المدفوع',
    'Open admin console': 'فتح لوحة الإدارة',
    Admin: 'الإدارة',
    'Operator console': 'لوحة المشغل',
    'Pricing, campaigns, server states, tickets, customer snapshots, and broadcast messages.':
      'إدارة الأسعار والحملات وحالات الخوادم والتذاكر والعملاء والرسائل العامة.',
    'Back to profile': 'العودة إلى الملف',
    Revenue: 'الإيراد',
    'Active users': 'المستخدمون النشطون',
    'Open tickets': 'التذاكر المفتوحة',
    'Avg latency': 'متوسط التأخير',
    Broadcast: 'إعلان',
    'Push a home banner': 'نشر بانر للرئيسية',
    'Notice title': 'عنوان الإعلان',
    'Notice message': 'رسالة الإعلان',
    lime: 'أخضر',
    ice: 'أزرق',
    amber: 'كهرماني',
    'Publish notice': 'نشر الإعلان',
    'Edit live home banners': 'تحرير بانرات الرئيسية',
    'Change any existing notice and publish new ones from the same place.':
      'عدّل الإعلانات الحالية وانشر إعلانات جديدة من نفس المكان.',
    'Create a new banner that appears instantly in the home feed.':
      'أنشئ بانراً جديداً يظهر فوراً في الواجهة الرئيسية.',
    'Notice tone': 'لون الإعلان',
    'Adjust pricing and placement': 'تعديل الأسعار والظهور',
    'Simple operators for demo purposes. In production these would talk to a real backend.':
      'عناصر تحكم بسيطة للعرض التجريبي، وفي الإنتاج تتصل بواجهة خلفية حقيقية.',
    Feature: 'تمييز',
    Unfeature: 'إلغاء التمييز',
    Servers: 'الخوادم',
    'Network status controls': 'التحكم في حالة الشبكة',
    'Useful for showing planned maintenance or overloads in the user-facing app.':
      'مفيد لعرض الصيانة المجدولة أو الضغط الزائد في التطبيق الموجّه للمستخدم.',
    Campaigns: 'الحملات',
    'Coupons and acquisition loops': 'الكوبونات وآليات الاكتساب',
    'Toggle campaigns on or off without touching code.':
      'شغّل الحملات أو عطّلها دون تعديل الكود.',
    Disable: 'تعطيل',
    Enable: 'تفعيل',
    'Support queue': 'طابور الدعم',
    'Moderate tickets': 'إدارة التذاكر',
    'Mark tickets as pending or resolved straight from the admin panel.':
      'يمكنك تحويل التذاكر إلى معلّقة أو محلولة مباشرة من لوحة الإدارة.',
    'Edit ticket threads': 'تحرير محادثات التذاكر',
    'Update the title, category, status, and every message shown to the customer.':
      'حدّث العنوان والفئة والحالة وكل رسالة تظهر للعميل.',
    Category: 'الفئة',
    Status: 'الحالة',
    Sender: 'المرسل',
    Timestamp: 'الوقت',
    'Message text': 'نص الرسالة',
    'Add support message': 'إضافة رسالة دعم',
    'Add user message': 'إضافة رسالة عميل',
    Pending: 'معلّق',
    Resolve: 'حل',
    Customers: 'العملاء',
    'Snapshot of active buyers': 'نظرة على المشترين النشطين',
    'A lightweight placeholder for a future full admin CRM.':
      'عنصر خفيف مؤقت إلى حين بناء CRM كامل.',
    'Reset demo state': 'إعادة ضبط بيانات العرض',
    Checkout: 'الدفع',
    Mode: 'الوضع',
    Duration: 'المدة',
    'Promo code': 'كود الخصم',
    Card: 'تحويل بطاقة',
    'Card transfer': 'تحويل بالبطاقة',
    Crypto: 'كريبتو',
    'Crypto payment': 'دفع كريبتو',
    Wallet: 'المحفظة',
    'Payment details': 'بيانات الدفع',
    'Wallet addresses': 'عناوين المحافظ',
    'Please upload the receipt after payment.': 'يرجى إرسال صورة الإيصال بعد التحويل',
    Bank: 'البنك',
    'Card number': 'رقم البطاقة',
    IBAN: 'الآيبان',
    'Parsian Bank - Abedi': 'بنك بارسيان - عبدي',
    'Upload receipt screenshot': 'رفع صورة الإيصال',
    'Change receipt screenshot': 'تغيير صورة الإيصال',
    'Receipt screenshot': 'صورة الإيصال',
    'Receipt attached to this order': 'تم إرفاق الإيصال بهذا الطلب',
    'You can also upload the screenshot later from Orders.':
      'يمكنك أيضا رفع صورة الإيصال لاحقا من قسم الطلبات.',
    'Submit transfer request': 'إرسال طلب التحويل',
    'Submit payment request': 'إرسال طلب الدفع',
    Total: 'الإجمالي',
    'Confirm payment': 'تأكيد الدفع',
    'Receipt uploaded': 'تم رفع الإيصال',
    'Please choose an image file': 'يرجى اختيار صورة',
    'Receipt uploaded on': 'تم رفع الإيصال في',
    'Receipt pending': 'بانتظار الإيصال',
    'Awaiting transfer': 'بانتظار التحويل',
    'Awaiting crypto payment': 'بانتظار دفع الكريبتو',
    'Order moved to Orders and is waiting for your transfer receipt':
      'تم نقل الطلب إلى قسم الطلبات وهو بانتظار إيصال التحويل',
    'Order moved to Orders and is waiting for your payment receipt':
      'تم نقل الطلب إلى قسم الطلبات وهو بانتظار إيصال الدفع',
    Ping: 'البينغ',
    Expires: 'ينتهي',
    Config: 'التهيئة',
    Download: 'تنزيل',
    Reset: 'إعادة ضبط',
    Optimize: 'تحسين',
    Renew: 'تجديد',
    Upgrade: 'ترقية',
    Open: 'مفتوح',
    Resolved: 'محلول',
    Online: 'متصل',
    Busy: 'مشغول',
    Maintenance: 'صيانة',
    paid: 'مدفوع',
    processing: 'بانتظار التحويل',
    purchase: 'شراء',
    renew: 'تجديد',
    upgrade: 'ترقية',
    trial: 'تجريبي',
    'Search plans, perks, locations, or FAQ': 'ابحث عن الباقات أو المزايا أو المواقع أو الأسئلة الشائعة',
    Toman: 'تومان',
    Germany: 'ألمانيا',
    Turkey: 'تركيا',
    Netherlands: 'هولندا',
    Finland: 'فنلندا',
    France: 'فرنسا',
    UK: 'بريطانيا',
    UAE: 'الإمارات',
    Sweden: 'السويد',
    Tehran: 'طهران',
    Tabriz: 'تبريز',
    Shiraz: 'شيراز',
    Rasht: 'رشت',
    Frankfurt: 'فرانكفورت',
    Amsterdam: 'أمستردام',
    Istanbul: 'إسطنبول',
    Dubai: 'دبي',
    Helsinki: 'هلسنكي',
    'Starter 30': 'ستارتر 30',
    'Stream 90': 'ستريم 90',
    'Family 180': 'فاميلي 180',
    'Unlimited 365': 'غير محدود 365',
    'Team Shield': 'تيم شيلد',
    'Starter 30 Trial': 'ستارتر 30 تجريبي',
    'Cheap daily driver': 'خيار اقتصادي للاستخدام اليومي',
    'Stable streaming routes': 'مسارات مستقرة للبث',
    'Home pack for multiple devices': 'باقة منزلية لعدة أجهزة',
    'Long term best value': 'أفضل قيمة على المدى الطويل',
    'Shared access for small teams': 'وصول مشترك للفرق الصغيرة',
    'Best entry': 'أفضل بداية',
    Popular: 'شائع',
    'Value max': 'أفضل قيمة',
    Team: 'فريق',
    Fast: 'سريع',
    Turbo: 'توربو',
    'Turbo+': 'توربو+',
    Flagship: 'رائد',
    'Good for messaging, social apps, and a single personal device.':
      'مناسب للمراسلة والتطبيقات الاجتماعية وجهاز شخصي واحد.',
    'Balanced latency and stable media routes for TV and mobile.':
      'زمن استجابة متوازن ومسارات مستقرة للبث على الهاتف والتلفاز.',
    'One subscription for the house with enough slots for all devices.':
      'اشتراك واحد للمنزل مع عدد كافٍ من الأجهزة.',
    'Full speed annual plan with premium support and smart failover.':
      'خطة سنوية بسرعة كاملة مع دعم مميز وتحويل ذكي للمسارات.',
    'Admin friendly slots, broad device coverage, and predictable speed.':
      'مقاعد مناسبة للإدارة، وتغطية واسعة للأجهزة، وسرعة مستقرة.',
    'Instant delivery': 'تسليم فوري',
    'Auto renew': 'تجديد تلقائي',
    '1 tap copy config': 'نسخ سريع للإعداد',
    'Streaming tuned routes': 'مسارات مهيأة للبث',
    'Priority routing': 'توجيه ذو أولوية',
    'Setup guides': 'أدلة الإعداد',
    '8 devices': '8 أجهزة',
    'Family sharing': 'مشاركة عائلية',
    'VIP queue': 'طابور VIP',
    'Annual savings': 'توفير سنوي',
    'Priority support': 'دعم أولوية',
    'Best route rotation': 'أفضل تدوير للمسارات',
    '12 seats': '12 مستخدماً',
    'Shared billing': 'فوترة مشتركة',
    'Bulk config export': 'تصدير جماعي للإعدادات',
    'First order launch': 'إطلاق أول طلب',
    'Get a direct discount on your first paid order.':
      'احصل على خصم مباشر على أول طلب مدفوع.',
    '20% off': 'خصم 20٪',
    'Renewal week': 'أسبوع التجديد',
    'Extra discount if your active service is near expiry.':
      'خصم إضافي إذا كانت خدمتك النشطة على وشك الانتهاء.',
    '10% off': 'خصم 10٪',
    'Family switch': 'الانتقال إلى الخطة العائلية',
    'Move to a shared package with a higher bundle discount.':
      'انتقل إلى باقة مشتركة مع خصم أعلى.',
    '25% off': 'خصم 25٪',
    'Tonight maintenance window': 'نافذة صيانة الليلة',
    'Netherlands route rotation starts at 01:00 and should finish in under 15 minutes.':
      'تدوير مسار هولندا يبدأ الساعة 01:00 وينتهي خلال أقل من 15 دقيقة.',
    'New low-ping route': 'مسار جديد منخفض البينغ',
    'Frankfurt gaming route is live for Stream and Unlimited plans.':
      'مسار الألعاب في فرانكفورت أصبح متاحاً لخطط Stream وUnlimited.',
    'How do I receive the config after payment?':
      'كيف أستلم الإعداد بعد الدفع؟',
    'As soon as the order is marked paid, the config is added to My Services and can be copied or downloaded instantly.':
      'بمجرد تأكيد الدفع تتم إضافة الإعداد إلى خدماتي ويمكن نسخه أو تنزيله فوراً.',
    'Can I switch my route after buying?': 'هل أستطيع تغيير المسار بعد الشراء؟',
    'Yes. The service page lets you reset the config and support can move you to a better route when needed.':
      'نعم، يمكنك إعادة ضبط الإعداد من صفحة الخدمة ويمكن للدعم نقلك إلى مسار أفضل عند الحاجة.',
    'Do you support iPhone, Android, Windows, and macOS?':
      'هل تدعمون iPhone وAndroid وWindows وmacOS؟',
    'Yes. Each platform has a quick setup guide inside Support with the recommended client and steps.':
      'نعم، لكل منصة دليل إعداد سريع داخل قسم الدعم.',
    'What happens after the subscription ends?':
      'ماذا يحدث بعد انتهاء الاشتراك؟',
    'The service status changes to expired, but your order history stays visible and you can renew with one tap.':
      'تتحول حالة الخدمة إلى منتهية، لكن يبقى سجل الطلبات ويمكنك التجديد بلمسة واحدة.',
    'Can I share a family plan?': 'هل يمكنني مشاركة الخطة العائلية؟',
    'Family plans are made for multiple devices and shared usage, but they still have a defined device ceiling.':
      'الخطط العائلية مناسبة لعدة أجهزة واستخدام مشترك، لكنها ما زالت تملك حدّاً لعدد الأجهزة.',
    'Slow route on mobile network': 'بطء في المسار على شبكة الجوال',
    'Latency jumps when I switch from Wi-Fi to mobile data.':
      'يرتفع التأخير بشكل مفاجئ عند الانتقال من الواي فاي إلى بيانات الجوال.',
    'We moved your profile to the Frankfurt low-jitter route. Test again and tell us if it improved.':
      'قمنا بنقل ملفك إلى مسار فرانكفورت منخفض التذبذب. جرّب مرة أخرى وأخبرنا إن تحسن الأداء.',
    'Invoice request for annual package': 'طلب فاتورة للباقـة السنوية',
    'Send me the paid invoice for accounting.':
      'أرسل لي الفاتورة المدفوعة لأغراض المحاسبة.',
    'Invoice was generated and sent to your Telegram inbox.':
      'تم إنشاء الفاتورة وإرسالها إلى صندوق الوارد في تيليجرام.',
    user: 'المستخدم',
    support: 'الدعم',
    iPhone: 'آيفون',
    Android: 'أندرويد',
    Windows: 'ويندوز',
    macOS: 'ماك',
    'Install the client': 'قم بتثبيت التطبيق',
    'Scan the QR or import config': 'امسح QR أو استورد الإعداد',
    'Toggle connect': 'شغّل الاتصال',
    'Paste the config string': 'ألصق نص الإعداد',
    'Enable the route': 'فعّل المسار',
    'Download the desktop client': 'نزّل تطبيق سطح المكتب',
    'Import the config file': 'استورد ملف الإعداد',
    'Use smart routing': 'استخدم التوجيه الذكي',
    'Add a new profile': 'أضف ملفاً جديداً',
    'Drop the config file': 'أضف ملف الإعداد',
    'Turn on system proxy': 'فعّل بروكسي النظام',
    'Plan pricing updated': 'تم تحديث سعر الباقة',
    'Featured placement updated': 'تم تحديث موضع التمييز',
    'Write a title and message before publishing':
      'اكتب عنواناً ورسالة قبل النشر',
    'Broadcast notice published to the home screen':
      'تم نشر الإعلان في الصفحة الرئيسية',
    'Add a question and answer first': 'أدخل سؤالاً وإجابة أولاً',
    'New FAQ added': 'تمت إضافة FAQ جديد',
    'Referral link copied': 'تم نسخ رابط الإحالة',
    'Clipboard is not available': 'الحافظة غير متاحة',
    'Demo data reset': 'تمت إعادة ضبط بيانات العرض',
    'Trial was already activated on this account':
      'تم تفعيل النسخة التجريبية مسبقاً لهذا الحساب',
    '3 day trial unlocked': 'تم تفعيل النسخة التجريبية لمدة 3 أيام',
    'Subscription renewed': 'تم تجديد الاشتراك',
    'Plan upgraded successfully': 'تمت ترقية الباقة بنجاح',
    'VPN service delivered instantly': 'تم تسليم خدمة VPN فوراً',
    'Fresh config generated': 'تم إنشاء إعداد جديد',
    'Route optimized for the selected service': 'تم تحسين المسار للخدمة المحددة',
    'Config file downloaded': 'تم تنزيل ملف الإعداد',
    'Config copied to clipboard': 'تم نسخ الإعداد إلى الحافظة',
    'You are already on the highest plan': 'أنت بالفعل على أعلى باقة',
    'Fill in the ticket title and message': 'املأ عنوان التذكرة ورسالتها',
    'Ticket sent to support': 'تم إرسال التذكرة إلى الدعم',
    'Marked as resolved from admin console.':
      'تم تعليمها كمحلولة من لوحة الإدارة.',
    'Server status changed': 'تم تغيير حالة الخادم',
    'Campaign state updated': 'تم تحديث حالة الحملة',
  },
}

export const createTranslator = (language: AppLanguage) => {
  const locale = locales[language]
  const dictionary = staticTranslations[language]
  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value)
  const tr = (value: string) => dictionary[value] ?? value

  return {
    dir: (language === 'en' ? 'ltr' : 'rtl') as 'rtl' | 'ltr',
    tr,
    formatNumber,
    formatMoney: (value: number) => `${formatNumber(value)} ${tr('Toman')}`,
    formatDate: (value: string) =>
      new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(value)),
    chipOnline: (count: number) =>
      language === 'fa'
        ? `${formatNumber(count)} آنلاین`
        : language === 'ar'
          ? `${formatNumber(count)} متصل`
          : `${formatNumber(count)} online`,
    chipExpiring: (count: number) =>
      language === 'fa'
        ? `${formatNumber(count)} رو به پایان`
        : language === 'ar'
          ? `${formatNumber(count)} قارب على الانتهاء`
          : `${formatNumber(count)} expiring`,
    chipTickets: (count: number) =>
      language === 'fa'
        ? `${formatNumber(count)} تیکت`
        : language === 'ar'
          ? `${formatNumber(count)} تذاكر`
          : `${formatNumber(count)} tickets`,
    daysLeft: (count: number) =>
      language === 'fa'
        ? `${formatNumber(count)} روز مانده`
        : language === 'ar'
          ? `${formatNumber(count)} أيام متبقية`
          : `${formatNumber(count)} days left`,
    daysAccess: (count: number) =>
      language === 'fa'
        ? `${formatNumber(count)} روز دسترسی`
        : language === 'ar'
          ? `${formatNumber(count)} يوم وصول`
          : `${formatNumber(count)} days access`,
    devicesCount: (count: number) =>
      language === 'fa'
        ? `${formatNumber(count)} دستگاه`
        : language === 'ar'
          ? `${formatNumber(count)} أجهزة`
          : `${formatNumber(count)} devices`,
    moreLocations: (count: number) =>
      language === 'fa'
        ? `+${formatNumber(count)} بیشتر`
        : language === 'ar'
          ? `+${formatNumber(count)} أخرى`
          : `+${formatNumber(count)} more`,
    loadLabel: (count: number) =>
      language === 'fa'
        ? `${formatNumber(count)}٪ بار`
        : language === 'ar'
          ? `${formatNumber(count)}٪ حمل`
          : `${formatNumber(count)}% load`,
    uptimeLabel: (value: string) =>
      language === 'fa'
        ? `آپتایم ${value}`
        : language === 'ar'
          ? `مدة التشغيل ${value}`
          : `uptime ${value}`,
    referralText: (code: string) =>
      language === 'fa'
        ? `کد فعلی ${code}. هر دعوت موفق، اعتبار کیف پول را افزایش می‌دهد و می‌تواند تخفیف فعال کند.`
        : language === 'ar'
          ? `الكود الحالي ${code}. كل دعوة ناجحة تضيف رصيداً إلى المحفظة وقد تفعّل عرضاً جديداً.`
          : `Current code ${code}. Each successful invite adds wallet balance and can trigger a promo.`,
    promoApplied: (code: string, percent: number) =>
      language === 'fa'
        ? `${code} اعمال شد: ${formatNumber(percent)}٪ تخفیف`
        : language === 'ar'
          ? `تم تطبيق ${code}: خصم ${formatNumber(percent)}٪`
          : `${code} applied: ${formatNumber(percent)}% off`,
    copiedMessage: (value: string) =>
      language === 'fa'
        ? `${value} کپی شد`
        : language === 'ar'
          ? `تم نسخ ${value}`
          : `${value} copied`,
    ticketUpdatedMessage: (status: string) =>
      language === 'fa'
        ? `تیکت به ${status} تغییر کرد`
        : language === 'ar'
          ? `تم تحديث التذكرة إلى ${status}`
          : `Ticket updated to ${status}`,
  }
}
