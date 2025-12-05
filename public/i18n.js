// Client-side i18n manager with localStorage cache
class I18n {
  constructor() {
    this.translations = {};
    this.currentLang = this.getLangFromCookie() || 'en';
    this.cacheVersion = '1.0'; // Increment this to invalidate cache
    this.init();
  }

  getLangFromCookie() {
    const match = document.cookie.match(/lang=([^;]+)/);
    return match ? match[1] : null;
  }

  setLangCookie(lang) {
    const days = 30;
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `lang=${lang};expires=${date.toUTCString()};path=/`;
  }

  getCacheKey(lang) {
    return `i18n_${lang}_v${this.cacheVersion}`;
  }

  async init() {
    await this.loadTranslations(this.currentLang);
  }

  async loadTranslations(lang) {
    // Try to get from localStorage cache first
    const cacheKey = this.getCacheKey(lang);
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        this.translations = JSON.parse(cached);
        this.currentLang = lang;
        this.updatePageContent();
        console.log(`✅ Loaded ${lang} translations from cache`);
        return;
      } catch (error) {
        console.warn('Failed to parse cached translations, fetching fresh...', error);
        localStorage.removeItem(cacheKey);
      }
    }

    // Fetch from server if not in cache
    try {
      const response = await fetch(`/api/translations/${lang}`);
      if (response.ok) {
        this.translations = await response.json();
        this.currentLang = lang;
        
        // Save to localStorage cache
        try {
          localStorage.setItem(cacheKey, JSON.stringify(this.translations));
          console.log(`💾 Cached ${lang} translations to localStorage`);
        } catch (error) {
          console.warn('Failed to cache translations:', error);
          // Clear old cache if storage is full
          this.clearOldCache();
        }
        
        this.updatePageContent();
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }

  clearOldCache() {
    // Remove old translation cache entries
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('i18n_') && !key.includes(`_v${this.cacheVersion}`)) {
        localStorage.removeItem(key);
        console.log(`🗑️  Removed old cache: ${key}`);
      }
    });
  }

  t(key) {
    return this.translations[key] || key;
  }

  async switchLanguage(lang) {
    if (lang === this.currentLang) return;
    
    await this.loadTranslations(lang);
    this.setLangCookie(lang);
  }

  updatePageContent() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });
  }
}

// Initialize i18n
const i18n = new I18n();

// Setup language switcher event listeners
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-lang]').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const lang = e.currentTarget.getAttribute('data-lang');
      await i18n.switchLanguage(lang);
    });
  });
});
