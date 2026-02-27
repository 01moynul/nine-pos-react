// src/context/LanguageContext.tsx
import React, { createContext, useState, useContext,type ReactNode } from 'react';

// 1. Define the available languages for our UI
export type Language = 'en' | 'ms';

// 2. Define the translation dictionary structure
interface Translations {
  [key: string]: {
    en: string;
    ms: string;
  };
}

// 3. The Central Dictionary
// We will expand this list as we update the Dashboard and Admin pages.
const translations: Translations = {
  dashboard: { en: 'Dashboard', ms: 'Papan Pemuka' },
  products: { en: 'Products', ms: 'Produk' },
  reports: { en: 'Reports', ms: 'Laporan' },
  logout: { en: 'Logout', ms: 'Log Keluar' },
  switch_lang: { en: 'BM', ms: 'EN' }, // Text for the toggle button

  // --- NEW TRANSLATIONS BELOW ---
  search_placeholder: { en: 'Search...', ms: 'Cari...' },
  all_categories: { en: 'All', ms: 'Semua' },
  current_order: { en: 'Current Order', ms: 'Pesanan Semasa' },
  cart_empty: { en: 'Cart is empty', ms: 'Troli kosong' },
  subtotal: { en: 'Subtotal', ms: 'Jumlah Kecil' },
  sst_tax: { en: 'SST (6%)', ms: 'Cukai SST (6%)' },
  total: { en: 'Total', ms: 'Jumlah Keseluruhan' },
  pay_print: { en: 'Pay & Print', ms: 'Bayar & Cetak' },

  // --- MANAGER UI TRANSLATIONS ---
  inventory_mgmt: { en: 'Inventory Management', ms: 'Pengurusan Inventori' },
  add_product: { en: 'Add Product', ms: 'Tambah Produk' },
  search_inventory: { en: 'Search inventory...', ms: 'Cari inventori...' },
  sales_analytics: { en: 'Sales Analytics', ms: 'Analitik Jualan' },
  real_time_metrics: { en: 'Real-time performance metrics', ms: 'Metrik prestasi masa nyata' },
  total_revenue: { en: 'Total Revenue', ms: 'Jumlah Hasil' },
  total_orders: { en: 'Total Orders', ms: 'Jumlah Pesanan' },
  avg_order_value: { en: 'Avg. Order Value', ms: 'Nilai Pesanan Purata' },

  // --- STOCK VALUATION TRANSLATIONS ---
  valuation_confirmation: { 
    en: 'We confirm that the above stock has been physically counted and mutually agreed by both Seller and Buyer.', 
    ms: 'Kami mengesahkan bahawa stok di atas telah dikira secara fizikal dan dipersetujui bersama oleh Penjual dan Pembeli.' 
  },
  seller_name: { en: 'Seller Name', ms: 'Nama Penjual' },
  buyer_name: { en: 'Buyer Name', ms: 'Nama Pembeli' },
  signature: { en: 'Signature', ms: 'Tandatangan' },
  date: { en: 'Date', ms: 'Tarikh' },
  
};

// 4. Define what data/functions the context will expose to other components
interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string; // The translation helper function
}

// 5. Initialize the React Context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 6. Create the Provider Wrapper
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default the app to English
  const [language, setLanguage] = useState<Language>('en');

  // Flips the state between English and Bahasa Melayu
  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ms' : 'en'));
  };

  // The translation function: takes a key, returns the string for the current language
  const t = (key: string): string => {
    if (!translations[key]) {
      console.warn(`Translation key missing: ${key}`);
      return key; // Fallback to the key itself if no translation is found
    }
    return translations[key][language];
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// 7. Custom Hook for easy consumption in any component
// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};