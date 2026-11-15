export type ServiceOption = { title: string; description?: string };
export type ServiceItem = { slug: string; title: string; description: string; icon: string; href?: string; requiresAuthOnSelect?: boolean; options?: ServiceOption[] };
export type CategoryData = {
  id: string; title: string; hero: string; headline: string; subheadline: string;
  supportingText?: string; urgentLabel: string; services: ServiceItem[];
};

const elderShifts: ServiceOption[] = [
  { title: "روزانه", description: "همراهی، رسیدگی و کمک در فعالیت‌های روزانه" },
  { title: "شبانه", description: "حضور و مراقبت در شب" },
  { title: "شبانه‌روزی", description: "مراقبت ۲۴ ساعته در منزل" }
];

export const categories: Record<string, CategoryData> = {
  "11": {
    id: "11", title: "مراقبت از سالمند",
    hero: "https://mycaapp.com/customer-home/myca-hero-elderly-care-hijab.png",
    headline: "با آرامش،\nدر کنار عزیزان شما", subheadline: "مراقبت حرفه‌ای، امن و قابل اعتماد در منزل",
    urgentLabel: "پرستار سالمند",
    services: [
      { slug: "independent", title: "سالمند مستقل", description: "همراهی برای سالمند مستقل در منزل", icon: "elderly-rocker.svg", href: "/category/22", options: elderShifts },
      { slug: "semi-dependent", title: "سالمند نیمه‌وابسته", description: "مراقبت متناسب با نیاز نیمه‌وابسته", icon: "home-care.svg", options: elderShifts },
      { slug: "dependent", title: "سالمند وابسته", description: "مراقبت تخصصی، بازتوانی و همراهی", icon: "elder-medical-care.svg", options: elderShifts }
    ]
  },
  "12": {
    id: "12", title: "مراقبت از کودک",
    hero: "https://mycaapp.com/customer-home/myca-hero-child-care-hijab.png",
    headline: "با آرامش خاطر", subheadline: "همراه شما در مراقبت از فرزند", urgentLabel: "پرستار کودک",
    services: [
      { slug: "infant-nurse", title: "پرستار نوزاد", description: "مراقبت از نوزاد تا دو سالگی", icon: "mother-child.svg", href: "/category/27", options: [
        { title: "روزانه", description: "این خدمت برای پرستاری از نوزادان تا ۲ سالگی در نظر گرفته شده است." },
        { title: "شبانه", description: "حضور و مراقبت در شب" }, { title: "شبانه‌روزی", description: "مراقبت ۲۴ ساعته در منزل" }
      ] },
      { slug: "mother-companion", title: "مادریار", description: "همراهی مادر در دوره پس از زایمان", icon: "mother-child.svg" },
      { slug: "child-care", title: "کودکیار", description: "نگهداری و همراهی کودک در منزل", icon: "mother-child.svg" },
      { slug: "psychologist", title: "روانشناس", description: "روانشناس به عنوان خدمتی برای کودکان در نظر گرفته شده است.", icon: "psychologist.svg" },
      { slug: "child-care-package", title: "پکیج مراقبت کودک", description: "پکیج‌های مراقبت کودک و مادر", icon: "mother-child.svg" }
    ]
  },
  "13": {
    id: "13", title: "پرستاری و مراقبت بیمار",
    hero: "https://mycaapp.com/customer-home/myca-hero-patient-care-hijab.png",
    headline: "مراقبت تخصصی", subheadline: "در کنار بیمار، در منزل و مراکز درمانی", urgentLabel: "پرستار بیمار",
    services: [
      { slug: "nursing-assistant", title: "کمک‌بهیار", description: "مشاهده جزئیات و انتخاب خدمت", icon: "certified-nurse.svg" },
      { slug: "hourly-nurse", title: "نرس ساعتی", description: "این خدمت برای اعزام نرس‌ها به صورت ساعتی در نظر گرفته شده است.", icon: "certified-nurse.svg" },
      { slug: "one-time-nurse", title: "نرس موردی", description: "این خدمات برای ارائه خدمات نرسینگ مانند سرم‌تراپی، تزریقات و ... در نظر گرفته شده است.", icon: "certified-nurse.svg" },
      { slug: "hospital-companion", title: "همراه بیمار در بیمارستان", description: "همراه بیمار در بیمارستان به پرستاری گفته می‌شود که به جای خانواده بیمار در بیمارستان، به عنوان همراه بیمار به صورت ساعتی (شیفت ۲۴ ساعته) انجام وظیفه می‌کند.", icon: "hospital.svg" }
    ]
  },
  "14": {
    id: "14", title: "امور منزل",
    hero: "https://mycaapp.com/customer-home/myca-hero-home-services-hijab.png",
    headline: "خانه مرتب، خیال آسوده", subheadline: "خدمات امور منزل با استاندارد مایکا", urgentLabel: "امور منزل",
    services: [
      { slug: "home-cleaning", title: "نظافت منزل", description: "تمیزکاری منظم و دقیق در محل", icon: "cleaning-spray.svg", options: [
        { title: "روزانه", description: "خدمات نظافت منزل به صورت ساعتی" }, { title: "شبانه‌روزی", description: "خدمات نظافت منزل" }
      ] },
      { slug: "cooking-home", title: "آشپزی و امور منزل", description: "آشپزی و امور روزانه در منزل", icon: "meal-preparation.svg" },
      { slug: "home-cook", title: "آشپزی در منزل", description: "آشپزی در منزل؛ فقط برای روزانه انجام می‌شود و بدون آموز می‌باشد.", icon: "meal-preparation.svg" }
    ]
  },
  "17": {
    id: "17", title: "مشاوره و همراهی",
    hero: "https://mycaapp.com/customer-home/myca-hero-corporate-hijab.png",
    headline: "خدمات منظم برای محیط کار", subheadline: "نیروی مورد اعتماد برای شرکت شما", urgentLabel: "خدمات شرکتی",
    services: [
      { slug: "pantry", title: "آبدارچی", description: "اعزام آبدارچی برای شرکت‌ها", icon: "hot-beverage.svg", requiresAuthOnSelect: true },
      { slug: "office-cleaning", title: "نظافت شرکت", description: "نظافت شرکت خدمتی است برای انجام تمیزکاری در شرکت‌ها که به صورت ساعتی انجام می‌شود.", icon: "cleaning-spray.svg" }
    ]
  },
  "32": {
    id: "32", title: "مراقبت ویژه",
    hero: "https://mycaapp.com/customer-home/myca-hero-medical-hijab.png",
    headline: "خدمات پزشکی در دسترس", subheadline: "مشاهده و مقایسه خدمات تخصصی", urgentLabel: "پزشکی و پیراپزشکی",
    services: [
      { slug: "laboratory", title: "آزمایشگاه", description: "با توجه به نوع آزمایش درخواستی موردی محاسبه می‌شود.", icon: "laboratory.svg", requiresAuthOnSelect: true },
      { slug: "physiotherapy", title: "فیزیوتراپی", description: "فیزیوتراپی به صورت جلسه‌ای (موردی) محاسبه می‌شود.", icon: "physiotherapy.svg" },
      { slug: "specialist-doctor", title: "پزشک متخصص", description: "به صورت جلسه‌ای هر مراجعه (موردی) محاسبه می‌شود.", icon: "certified-nurse.svg" }
    ]
  },
  "22": {
    id: "22", title: "سالمند مستقل",
    hero: "https://mycaapp.com/customer-home/myca-hero-elderly-care-hijab.png",
    headline: "با آرامش،", subheadline: "در کنار عزیزان شما", supportingText: "مراقبت حرفه‌ای، امن و قابل اعتماد در منزل",
    urgentLabel: "پرستار سالمند / سالمند مستقل",
    services: [
      { slug: "daily", title: "سالمند مستقل روزانه", description: "همراهی، رسیدگی و کمک در فعالیت‌های روزانه", icon: "elderly-rocker.svg" },
      { slug: "night", title: "سالمند مستقل شبانه", description: "حضور و مراقبت در شب", icon: "elderly-rocker.svg" },
      { slug: "24h", title: "سالمند مستقل شبانه‌روزی", description: "مراقبت ۲۴ ساعته در منزل", icon: "elderly-rocker.svg" }
    ]
  },
  "27": {
    id: "27", title: "پرستار نوزاد",
    hero: "https://mycaapp.com/customer-home/myca-hero-child-care-hijab.png",
    headline: "با آرامش خاطر", subheadline: "همراه شما در مراقبت از فرزند", urgentLabel: "پرستار کودک / پرستار نوزاد",
    services: [
      { slug: "daily", title: "پرستار نوزاد روزانه", description: "این خدمت برای پرستاری از نوزادان تا ۲ سالگی در نظر گرفته شده است.", icon: "mother-child.svg" },
      { slug: "night", title: "پرستار نوزاد شبانه", description: "حضور و مراقبت در شب", icon: "mother-child.svg" },
      { slug: "24h", title: "پرستار نوزاد شبانه‌روزی", description: "مراقبت ۲۴ ساعته در منزل", icon: "mother-child.svg" }
    ]
  }
};

export const homeServiceCards = [
  { title: "مراقب سالمند", href: "/category/11", icon: "elderly-rocker.svg" },
  { title: "مراقب کودک", href: "/category/12", icon: "mother-child.svg" },
  { title: "خدمات و امور منزل", href: "/category/14", icon: "home-cleaning.svg" }
];

export const menuItems = [
  { label: "تماس با ما", href: "tel:41124", icon: "phone" },
  { label: "پرستار بیمار", href: "/category/13", icon: "heart" },
  { label: "پزشکی و پیراپزشکی", href: "/category/32", icon: "activity" },
  { label: "خدمات شرکتی", href: "/category/17", icon: "building" },
  { label: "درخواست بررسی", href: "/login/receiver?next=/receiver/reviews/create", icon: "file" },
  { label: "سوابق بررسی", href: "/login/receiver?next=/receiver/reviews/history", icon: "history" },
  { label: "امتیازدهی", href: "/login/receiver?next=/receiver/rating", icon: "star" },
  { label: "درخواست مرخصی", href: "/login/receiver?next=/receiver/leave", icon: "calendar" },
  { label: "ثبت کامنت", href: "/login/receiver?next=/receiver/comments", icon: "message" },
  { label: "تمدید و الحاقیه", href: "/login/receiver?next=/receiver/revisions", icon: "file" },
  { label: "ثبت تیکت", href: "/login/receiver?next=/ticketing", icon: "ticket" },
  { label: "ورود و ثبت‌نام خدمت‌گیرنده", href: "/login/receiver", icon: "user" },
  { label: "ورود و ثبت‌نام خدمت‌دهنده", href: "/login/provider", icon: "user" },
  { label: "ورود و ثبت‌نام همکار", href: "/login/collaborator", icon: "users" },
  { label: "ورود و ثبت‌نام همکار جذب", href: "/login/recruitment-partner", icon: "users" },
  { label: "ورود و ثبت‌نام دفتر پشتیبانی", href: "/login/support-office", icon: "building" },
  { label: "کاتالوگ‌های خدمات", href: "/catalogs", icon: "book" }
];

export const homeSearchSuggestions = [
  { title: "سالمند مستقل", subtitle: "پرستار سالمند", icon: "elderly-rocker.svg", href: "/category/22", group: "sub" },
  { title: "سالمند نیمه‌وابسته", subtitle: "پرستار سالمند", icon: "home-care.svg", href: "/category/11", group: "sub" },
  { title: "سالمند وابسته", subtitle: "پرستار سالمند", icon: "elder-medical-care.svg", href: "/category/11", group: "sub" },
  { title: "سالمند نیمه‌وابسته روزانه", subtitle: "سالمند نیمه‌وابسته", icon: "home-care.svg", href: "/category/11", group: "shift" },
  { title: "سالمند نیمه‌وابسته شبانه", subtitle: "سالمند نیمه‌وابسته", icon: "home-care.svg", href: "/category/11", group: "shift" },
  { title: "سالمند نیمه‌وابسته شبانه‌روزی", subtitle: "سالمند نیمه‌وابسته", icon: "home-care.svg", href: "/category/11", group: "shift" },
  { title: "سالمند وابسته روزانه", subtitle: "سالمند وابسته", icon: "elder-medical-care.svg", href: "/category/11", group: "shift" },
  { title: "سالمند وابسته شبانه", subtitle: "سالمند وابسته", icon: "elder-medical-care.svg", href: "/category/11", group: "shift" },
  { title: "سالمند وابسته شبانه‌روزی", subtitle: "سالمند وابسته", icon: "elder-medical-care.svg", href: "/category/11", group: "shift" },
  { title: "سالمند مستقل روزانه", subtitle: "سالمند مستقل", icon: "elderly-rocker.svg", href: "/category/22", group: "shift" },
  { title: "سالمند مستقل شبانه", subtitle: "سالمند مستقل", icon: "elderly-rocker.svg", href: "/category/22", group: "shift" },
  { title: "سالمند مستقل شبانه‌روزی", subtitle: "سالمند مستقل", icon: "elderly-rocker.svg", href: "/category/22", group: "shift" }
];