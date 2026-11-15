export type PricingPackage = {
  id: string;
  detailId?: string;
  requestService?: string;
  title: string;
  description: string;
  monthlySalaryMillion?: number;
  ageRange?: string;
  tag?: string;
  custom?: boolean;
};

export type PricingSharedService = { title: string; description: string };

export type PricingCatalog = {
  slug: string;
  kind: "elderly" | "child";
  title: string;
  eyebrow: string;
  description: string;
  summary: string;
  hero: string;
  sharedServices: PricingSharedService[];
  packages: PricingPackage[];
  rules: string[];
};

export const commissionRates = [
  { months: 1, percent: 25 },
  { months: 2, percent: 30 },
  { months: 3, percent: 35 },
  { months: 4, percent: 45 },
  { months: 5, percent: 48 },
  { months: 6, percent: 65 },
  { months: 12, percent: 120 }
];

export const pricingCatalogs: Record<string, PricingCatalog> = {
  "elders-pricing": {
    slug: "elders-pricing",
    kind: "elderly",
    title: "مراقبت از سالمند، با انتخابی شفاف",
    eyebrow: "کاتالوگ قیمت‌گذاری خدمات سالمندی",
    description: "پکیج‌های مراقبت از سالمند در منزل و برآورد هزینه قرارداد",
    summary: "تمام پکیج‌ها خدمات پایه مشترک دارند؛ تفاوت آن‌ها در سطح نیاز سالمند، میزان وابستگی و مسئولیت مراقب است.",
    hero: "https://mycaapp.com/customer-home/myca-hero-elderly-care-hijab.png",
    sharedServices: [
      { title: "نظافت متعارف منزل تا ۱۰۰ مترمربع", description: "انجام نظافت روزانه فضاهای اصلی منزل برای حفظ آرامش و بهداشت محیط." },
      { title: "پخت غذا برای ۳ نفر", description: "تهیه غذای سالم و خانگی برای سالمند و حداکثر دو نفر از اعضای خانواده." },
      { title: "رسیدگی به امور روزانه سالمند", description: "کمک در امور شخصی و روزمره سالمند با احترام به شأن و استقلال او." },
      { title: "همراهی و نظارت بر سالمند", description: "همراهی در طول روز، گفت‌وگو و ایجاد حس امنیت و نظارت بر شرایط سالمند." }
    ],
    packages: [
      { id: "hamdam", detailId: "elder_hamdam", requestService: "independent", title: "همدم", monthlySalaryMillion: 33, tag: "نیازهای سبک", description: "مناسب سالمندانی با نیازهای سبک‌تر؛ همراهی، نظارت کلی، کمک در کارهای روزمره و یادآوری مصرف داروها." },
      { id: "hamrah", detailId: "elder_hamrah", requestService: "semi-dependent", title: "همراه", monthlySalaryMillion: 41, tag: "نیازهای متوسط", description: "مناسب سالمندانی با نیازهای متوسط؛ کمک در جابه‌جایی، تحرک، استفاده از سرویس بهداشتی، استحمام و امور روزانه." },
      { id: "hami", detailId: "elder_hami", requestService: "dependent", title: "حامی", monthlySalaryMillion: 46, tag: "نیازهای بیشتر", description: "مناسب سالمندانی با نیازهای سنگین‌تر و وابستگی بیشتر؛ کمک مستمر در مراقبت شخصی، جابه‌جایی، تغذیه و نظارت دقیق‌تر." },
      { id: "aramyar", detailId: "elder_aramyar", requestService: "dependent", title: "آرامیار", monthlySalaryMillion: 50, tag: "پکیج تخصصی", description: "مناسب سالمندانی که با آلزایمر یا مشکلات شناختی و رفتاری روبه‌رو هستند و به همراهی ساختارمند و نظارت دقیق نیاز دارند." },
      { id: "tavanyar", detailId: "elder_tavanyar", requestService: "dependent", title: "توانیار", monthlySalaryMillion: 48, tag: "پکیج تخصصی", description: "مناسب سالمندانی با معلولیت، قطع عضو یا محدودیت‌های جسمی و حرکتی شدید که به کمک و پشتیبانی بیشتر نیاز دارند." },
      { id: "custom", requestService: "independent", title: "پکیج خودت را بساز", custom: true, tag: "سفارشی‌سازی", description: "نیازها و شرایط خانواده را مشخص کنید تا پکیج متناسب با شما طراحی شود." }
    ],
    rules: [
      "قیمت‌های پایه برای شیفت ۸ ساعته، از شنبه تا پنجشنبه تعریف شده‌اند.",
      "در صورت انتخاب شیفت شبانه‌روزی، ۳۵٪ به حقوق ماهانه مراقب اضافه می‌شود.",
      "در صورت نیاز به حضور در روز جمعه، معادل یک روز اضافه در ماه به مبلغ قرارداد افزوده می‌شود.",
      "کمیسیون مایکا فقط یک‌بار در هر قرارداد دریافت می‌شود؛ مبلغ آن بر اساس مدت قرارداد محاسبه می‌شود."
    ]
  },
  "pedia": {
    slug: "pedia",
    kind: "child",
    title: "مراقبت کودک، متناسب با هر مرحله رشد",
    eyebrow: "کاتالوگ قیمت‌گذاری مراقبت کودک",
    description: "پکیج‌های مراقبت از نوزاد، کودک و همراهی مادر در دوران بارداری",
    summary: "در پکیج‌های مراقبت کودک، خدمات پایه مشترک‌اند؛ نوع مراقبت و سطح مسئولیت بر اساس سن کودک و نیاز خانواده تعیین می‌شود. همراهی دوران بارداری خدمت جداگانه‌ای متناسب با نیاز مادر است.",
    hero: "https://mycaapp.com/customer-home/myca-hero-child-care-hijab.png",
    sharedServices: [
      { title: "نظافت متعارف فضای کودک", description: "مرتب‌سازی و نظافت روزانه فضای مرتبط با کودک و وسایل پرکاربرد برای حفظ بهداشت محیط." },
      { title: "تهیه غذای متناسب با سن کودک", description: "آماده‌سازی وعده‌ها و میان‌وعده‌های سالم مطابق برنامه خانواده و نیاز کودک." },
      { title: "رسیدگی به امور روزمره کودک", description: "همراهی در روتین روزانه، تعویض لباس، خواب و رسیدگی به نیازهای معمول کودک." },
      { title: "مراقبت، حضور و نظارت", description: "حضور فعال در کنار کودک برای حفظ ایمنی و ایجاد حس امنیت و آرامش." }
    ],
    packages: [
      { id: "infant", detailId: "child_newborn", requestService: "infant-nurse", title: "مراقبت از نوزاد", ageRange: "تا ۱۲ ماه", monthlySalaryMillion: 39, tag: "نوزاد", description: "مناسب نوزاد و مادر در ماه‌های اول؛ مراقبت روزمره، تغذیه، بهداشت، خواب و رسیدگی به امور مرتبط با نوزاد." },
      { id: "toddler", detailId: "child_2_4", requestService: "child-care", title: "مراقبت از کودک", ageRange: "۲ تا ۴ سال", monthlySalaryMillion: 40, tag: "نوپا", description: "مناسب کودک نوپا با نیاز به مراقبت روزانه، تغذیه سالم، بازی، سرگرمی و رسیدگی به روتین‌های روزمره." },
      { id: "preschool", detailId: "child_4_6", requestService: "child-care", title: "مراقبت از کودک", ageRange: "۴ تا ۶ سال", monthlySalaryMillion: 44, tag: "پیش‌دبستانی", description: "مناسب کودک پیش‌دبستانی؛ علاوه بر مراقبت روزانه، بازی هدفمند، تقویت مهارت‌های اولیه و نظم روزمره." },
      { id: "school-age", detailId: "child_6_12", requestService: "child-care", title: "مراقبت کودک همراه آموزش", ageRange: "۶ تا ۱۲ سال", monthlySalaryMillion: 50, tag: "پکیج تخصصی", description: "مناسب کودک دبستانی؛ مراقبت روزانه، همراهی در تکالیف و برنامه‌های منظم، تغذیه سالم و نظارت." },
      { id: "pregnancy", detailId: "child_pregnancy", requestService: "mother-companion", title: "همراهی دوران بارداری", monthlySalaryMillion: 37, tag: "مادر و کودک", description: "همراهی و کمک غیرپزشکی به مادر در امور روزمره، آماده‌سازی غذای مناسب و همراهی در مراجعات موردنیاز." },
      { id: "custom", requestService: "child-care", title: "پکیج خودت را بساز", custom: true, tag: "سفارشی‌سازی", description: "نیازها، سن و شرایط خانواده را مشخص کنید تا پکیج متناسب با شما طراحی شود." }
    ],
    rules: [
      "قیمت‌های پایه برای شیفت ۸ ساعته، از شنبه تا پنجشنبه تعریف شده‌اند.",
      "در صورت انتخاب شیفت شبانه‌روزی، ۳۵٪ به حقوق ماهانه مراقب اضافه می‌شود.",
      "برای هر کودک اضافه، ۲۵٪ به حقوق ماهانه مراقب افزوده می‌شود.",
      "در صورت نیاز به حضور در روز جمعه، معادل یک روز اضافه در ماه به مبلغ قرارداد افزوده می‌شود.",
      "کمیسیون مایکا فقط یک‌بار در هر قرارداد دریافت می‌شود؛ مبلغ آن بر اساس مدت قرارداد محاسبه می‌شود."
    ]
  }
};
