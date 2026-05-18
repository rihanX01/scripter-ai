import { useEffect, useState } from "react";

// Approx FX rates (USD -> local). Updated periodically; kept conservative.
// Rounded to nice marketing numbers in formatPrice.
const RATES: Record<string, { code: string; symbol: string; rate: number; locale: string; round: number }> = {
  US: { code: "USD", symbol: "$", rate: 1, locale: "en-US", round: 1 },
  IN: { code: "INR", symbol: "₹", rate: 84, locale: "en-IN", round: 10 },
  GB: { code: "GBP", symbol: "£", rate: 0.79, locale: "en-GB", round: 1 },
  EU: { code: "EUR", symbol: "€", rate: 0.92, locale: "en-IE", round: 1 },
  CA: { code: "CAD", symbol: "C$", rate: 1.37, locale: "en-CA", round: 1 },
  AU: { code: "AUD", symbol: "A$", rate: 1.52, locale: "en-AU", round: 1 },
  NZ: { code: "NZD", symbol: "NZ$", rate: 1.65, locale: "en-NZ", round: 1 },
  JP: { code: "JPY", symbol: "¥", rate: 155, locale: "ja-JP", round: 100 },
  CN: { code: "CNY", symbol: "¥", rate: 7.2, locale: "zh-CN", round: 1 },
  KR: { code: "KRW", symbol: "₩", rate: 1380, locale: "ko-KR", round: 1000 },
  SG: { code: "SGD", symbol: "S$", rate: 1.35, locale: "en-SG", round: 1 },
  HK: { code: "HKD", symbol: "HK$", rate: 7.8, locale: "en-HK", round: 1 },
  AE: { code: "AED", symbol: "د.إ", rate: 3.67, locale: "ar-AE", round: 1 },
  SA: { code: "SAR", symbol: "﷼", rate: 3.75, locale: "ar-SA", round: 1 },
  BR: { code: "BRL", symbol: "R$", rate: 5.7, locale: "pt-BR", round: 1 },
  MX: { code: "MXN", symbol: "MX$", rate: 19.5, locale: "es-MX", round: 5 },
  ZA: { code: "ZAR", symbol: "R", rate: 18.5, locale: "en-ZA", round: 5 },
  CH: { code: "CHF", symbol: "CHF ", rate: 0.89, locale: "de-CH", round: 1 },
  SE: { code: "SEK", symbol: "kr ", rate: 10.7, locale: "sv-SE", round: 5 },
  NO: { code: "NOK", symbol: "kr ", rate: 10.9, locale: "nb-NO", round: 5 },
  DK: { code: "DKK", symbol: "kr ", rate: 6.9, locale: "da-DK", round: 5 },
  PL: { code: "PLN", symbol: "zł ", rate: 4.05, locale: "pl-PL", round: 1 },
  TR: { code: "TRY", symbol: "₺", rate: 34, locale: "tr-TR", round: 10 },
  RU: { code: "RUB", symbol: "₽", rate: 95, locale: "ru-RU", round: 50 },
  ID: { code: "IDR", symbol: "Rp ", rate: 16000, locale: "id-ID", round: 5000 },
  PH: { code: "PHP", symbol: "₱", rate: 58, locale: "en-PH", round: 10 },
  TH: { code: "THB", symbol: "฿", rate: 36, locale: "th-TH", round: 10 },
  VN: { code: "VND", symbol: "₫", rate: 25000, locale: "vi-VN", round: 5000 },
  PK: { code: "PKR", symbol: "₨", rate: 278, locale: "ur-PK", round: 50 },
  BD: { code: "BDT", symbol: "৳", rate: 119, locale: "bn-BD", round: 10 },
  NG: { code: "NGN", symbol: "₦", rate: 1600, locale: "en-NG", round: 100 },
  EG: { code: "EGP", symbol: "E£", rate: 49, locale: "ar-EG", round: 10 },
  AR: { code: "ARS", symbol: "AR$", rate: 1000, locale: "es-AR", round: 100 },
};

const EU_COUNTRIES = new Set([
  "AT","BE","CY","DE","EE","ES","FI","FR","GR","HR","IE","IT","LT","LU","LV","MT","NL","PT","SI","SK",
]);

const STORAGE_KEY = "region_price_v1";

export type RegionInfo = {
  country: string;
  code: string;
  symbol: string;
  rate: number;
  locale: string;
  round: number;
};

const DEFAULT: RegionInfo = { country: "US", ...RATES.US };

export function useRegionPrice(): RegionInfo {
  const [info, setInfo] = useState<RegionInfo>(() => {
    if (typeof window === "undefined") return DEFAULT;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const c = JSON.parse(cached) as { country: string; t: number };
        if (Date.now() - c.t < 24 * 60 * 60 * 1000) {
          return resolve(c.country);
        }
      }
    } catch {}
    return DEFAULT;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (!res.ok) return;
        const data = await res.json();
        const country: string | undefined = data?.country_code || data?.country;
        if (!country || cancelled) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ country, t: Date.now() }));
        setInfo(resolve(country));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  return info;
}

function resolve(country: string): RegionInfo {
  const cc = country.toUpperCase();
  if (RATES[cc]) return { country: cc, ...RATES[cc] };
  if (EU_COUNTRIES.has(cc)) return { country: cc, ...RATES.EU };
  return DEFAULT;
}

export function formatPrice(usd: number, region: RegionInfo): string {
  if (usd === 0) return `${region.symbol}0`;
  const raw = usd * region.rate;
  const rounded = Math.max(region.round, Math.round(raw / region.round) * region.round);
  try {
    return new Intl.NumberFormat(region.locale, {
      style: "currency",
      currency: region.code,
      maximumFractionDigits: 0,
    }).format(rounded);
  } catch {
    return `${region.symbol}${rounded.toLocaleString()}`;
  }
}
