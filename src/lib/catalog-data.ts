export const roleTitles: Record<string, string> = {
  receiver: "خدمت گیرنده",
  provider: "خدمت‌دهنده",
  collaborator: "همکار",
  "recruitment-partner": "همکار جذب",
  "support-office": "دفتر پشتیبانی"
};

export const catalogData: Record<string, { title: string; description: string; pages: { title: string; image: string }[] }> = {
  "elder-home": {
    title: "کاتالوگ مراقبت سالمند در منزل",
    description: "راهنمای انتخاب پکیج مناسب برای مراقبت از سالمند در منزل.",
    pages: [2, 3, 4, 5, 6].map((n, i) => ({
      title: "صفحه " + (i + 1),
      image: "https://springboot.asayesheiranian.ir/media/catalogs/pages/elder-home-" + n + ".png"
    }))
  },
  "myca-products": {
    title: "کاتالوگ محصولات مایکا",
    description: "خدمات خانواده، مراقبتی و امور منزل: سالمندی، مادریار و کودک، و خدمات منزل و اداری.",
    pages: [
      "کاتالوگ محصولات", "مراقبت از سالمند بدون بیماری خاص", "مراقبت از سالمند با مشکلات محدود",
      "سایر خدمات سالمندی", "آغوش نوزاد", "قدم‌های اول", "سایر خدمات مادریار و کودک",
      "خانه مرتب", "خانه‌یار", "سایر خدمات منزل و اداری"
    ].map((title, i) => ({
      title,
      image: "https://springboot.asayesheiranian.ir/media/catalogs/pages/myca-products-" + (i + 1) + ".png"
    }))
  }
};

export const catalogCards = [
  { slug: "myca-products", title: "کاتالوگ محصولات مایکا", description: "خدمات خانواده، مراقبتی و امور منزل: سالمندی، مادریار و کودک، و خدمات منزل و اداری.", pages: "۱۰ صفحه" },
  { slug: "elder-home", title: "کاتالوگ مراقبت سالمند در منزل", description: "راهنمای انتخاب پکیج مناسب برای مراقبت از سالمند در منزل.", pages: "۵ صفحه" },
  { slug: "elders-pricing", title: "قیمت‌گذاری خدمات سالمندی", description: "مقایسه پکیج‌های سالمندی و برآورد شفاف هزینه قرارداد.", pages: "محاسبه‌گر هزینه" },
  { slug: "pedia", title: "قیمت‌گذاری مراقبت کودک", description: "پکیج‌های مراقبت از نوزاد، کودک و همراهی دوران بارداری.", pages: "محاسبه‌گر هزینه" }
];