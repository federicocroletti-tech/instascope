export interface RuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
}

declare global {
  interface Window {
    __INSTASCOPE_CONFIG__?: RuntimeConfig;
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  if (typeof window === 'undefined') {
    return { supabaseUrl: '', supabaseAnonKey: '', siteUrl: '' };
  }
  return window.__INSTASCOPE_CONFIG__ ?? { supabaseUrl: '', supabaseAnonKey: '', siteUrl: '' };
}
