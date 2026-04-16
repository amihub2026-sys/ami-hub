import { Injectable, signal } from '@angular/core';

export type Language = 'en' | 'ta';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  currentLang = signal<Language>('en');

  translations: Record<Language, any> = {
    en: {
      nav: {
        home: 'Home',
        profiles: 'Profiles',
        plans: 'Plans',
        login: 'Login',
        register: 'Register',
        biodata: 'Create Biodata'
      },
      hero: {
        title: 'Find Anything. Sell Everything.',
        subtitle: 'India’s Fast Growing Local Marketplace',
        explore: 'Explore Now',
        browse: 'Browse Products'
      },
      home: {
        featuredBusinesses: 'Featured Businesses',
        browseCategories: 'Browse Categories',
        // discoverProducts: 'Discover Products',
        // discoverServices: 'Discover Services',
        trendingNearYou: 'Trending Near You',
        trendingDeals: 'Trending Deals',
        achievements: 'Our Marketplace Achievements',
        happyCustomers: 'Happy Customers',
        productsSold: 'Products Sold',
        servicesCompleted: 'Services Completed',
        trustedSellers: 'Trusted Sellers',
        viewAllCategories: 'View All Categories',
        viewAllDeals: 'View All Deals'
      },
      search: {
        all: 'All',
        products: 'Products',
        services: 'Services',
        findNow: 'Find Now',
        placeholderAll: 'Search products and services...',
        placeholderProducts: 'Search products...',
        placeholderServices: 'Search services...'
      },
      footer: {
        about: 'About Us',
        contact: 'Contact Us',
        privacy: 'Privacy Policy',
        terms: 'Terms & Conditions'
      }
    },

    ta: {
      nav: {
        home: 'முகப்பு',
        profiles: 'சுயவிவரங்கள்',
        plans: 'திட்டங்கள்',
        login: 'உள்நுழைவு',
        register: 'பதிவு',
        biodata: 'பயோடேட்டா உருவாக்கு'
      },
      hero: {
        title: 'தேவைப்படும் அனைத்தையும் கண்டுபிடிக்கவும். எதையும் விற்கவும்.',
        subtitle: 'இந்தியாவின் வேகமாக வளர்ந்து வரும் உள்ளூர் சந்தை',
        explore: 'இப்போது பார்க்கவும்',
        browse: 'பொருட்களை உலாவுக'
      },
      home: {
        featuredBusinesses: 'சிறப்பு வணிகங்கள்',
        browseCategories: 'வகைகளை உலாவுக',
        discoverProducts: 'பொருட்களை கண்டறியவும்',
        discoverServices: 'சேவைகளை கண்டறியவும்',
        trendingNearYou: 'உங்கள் அருகிலுள்ள பிரபலமானவை',
        trendingDeals: 'சிறந்த சலுகைகள்',
        achievements: 'எங்கள் சந்தை சாதனைகள்',
        happyCustomers: 'மகிழ்ச்சியான வாடிக்கையாளர்கள்',
        productsSold: 'விற்கப்பட்ட பொருட்கள்',
        servicesCompleted: 'முடிக்கப்பட்ட சேவைகள்',
        trustedSellers: 'நம்பகமான விற்பனையாளர்கள்',
        viewAllCategories: 'அனைத்து வகைகளையும் காண்க',
        viewAllDeals: 'அனைத்து சலுகைகளையும் காண்க'
      },
      search: {
        all: 'அனைத்தும்',
        products: 'பொருட்கள்',
        services: 'சேவைகள்',
        findNow: 'தேடு',
        placeholderAll: 'பொருட்கள் மற்றும் சேவைகளை தேடுங்கள்...',
        placeholderProducts: 'பொருட்களை தேடுங்கள்...',
        placeholderServices: 'சேவைகளை தேடுங்கள்...'
      },
      footer: {
        about: 'எங்களை பற்றி',
        contact: 'தொடர்பு கொள்ள',
        privacy: 'தனியுரிமைக் கொள்கை',
        terms: 'விதிமுறைகள் மற்றும் நிபந்தனைகள்'
      }
    }
  };

  setLanguage(lang: Language) {
    this.currentLang.set(lang);
    localStorage.setItem('lang', lang);
  }

  initLanguage() {
    const saved = localStorage.getItem('lang') as Language | null;
    if (saved === 'en' || saved === 'ta') {
      this.currentLang.set(saved);
    }
  }

  t(path: string): string {
    const lang = this.currentLang();
    const keys = path.split('.');
    let value = this.translations[lang];

    for (const key of keys) {
      value = value?.[key];
    }

    return value ?? path;
  }
}