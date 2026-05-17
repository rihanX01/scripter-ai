import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const ADSENSE_CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined) ?? "";

let scriptInjected = false;
function injectAdsenseScript() {
  if (scriptInjected || typeof document === "undefined" || !ADSENSE_CLIENT) return;
  scriptInjected = true;
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  document.head.appendChild(s);
}

type Props = {
  slot: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  layout?: string;
  className?: string;
  /** Force showing even for paid plans (rarely used) */
  alwaysShow?: boolean;
  /** Approximate min-height to avoid CLS while loading */
  minHeight?: number;
};

/**
 * AdSlot — Google AdSense container.
 * Renders ONLY for free-tier or signed-out users. Paid users (pro/max) see nothing.
 * Set VITE_ADSENSE_CLIENT in .env (e.g. ca-pub-XXXXXXXXXXXXXXXX) to activate.
 */
export function AdSlot({ slot, format = "auto", layout, className = "", alwaysShow, minHeight = 100 }: Props) {
  const { profile, loading } = useAuth();
  const ref = useRef<HTMLModElement | null>(null);

  const isPaid = profile?.plan === "pro" || profile?.plan === "max";
  const shouldRender = alwaysShow || !isPaid;

  useEffect(() => {
    if (!shouldRender || loading) return;
    injectAdsenseScript();
    if (!ADSENSE_CLIENT) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* noop */
    }
  }, [shouldRender, loading, slot]);

  if (!shouldRender) return null;

  // Placeholder when AdSense not configured yet — keeps layout, signals slot to dev.
  if (!ADSENSE_CLIENT) {
    return (
      <div
        className={`glass rounded-2xl flex items-center justify-center text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60 border border-dashed border-white/10 ${className}`}
        style={{ minHeight }}
        aria-label="Advertisement placeholder"
      >
        ad · set VITE_ADSENSE_CLIENT to activate
      </div>
    );
  }

  return (
    <div className={`ad-container ${className}`} style={{ minHeight }} aria-label="Advertisement">
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
        {...(layout ? { "data-ad-layout": layout } : {})}
      />
    </div>
  );
}