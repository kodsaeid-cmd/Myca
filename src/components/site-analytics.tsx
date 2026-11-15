"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type EventType = "page_view" | "phone_click" | "cta_click" | "button_click" | "link_click";

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "myca_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function sendEvent(eventType: EventType, path: string, eventName = "") {
  try {
    let visitorId = window.localStorage.getItem("myca_visitor_id_v1");
    if (!visitorId) {
      visitorId = createId();
      window.localStorage.setItem("myca_visitor_id_v1", visitorId);
    }
    let sessionId = window.sessionStorage.getItem("myca_session_id_v1");
    if (!sessionId) {
      sessionId = createId();
      window.sessionStorage.setItem("myca_session_id_v1", sessionId);
    }
    const params = new URLSearchParams(window.location.search);
    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        visitorId, sessionId, eventType, eventName, path,
        referrer: document.referrer,
        utmSource: params.get("utm_source") ?? ""
      }),
      keepalive: true
    }).catch(() => undefined);
  } catch {
    // Analytics must never block the customer's journey when browser storage is unavailable.
  }
}

export function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/login")) return;
    sendEvent("page_view", pathname);
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const phoneLink = target.closest<HTMLAnchorElement>('a[href^="tel:"]');
      if (phoneLink) {
        sendEvent("phone_click", window.location.pathname, phoneLink.getAttribute("href") ?? "tel");
        return;
      }
      const cta = target.closest<HTMLElement>("[data-analytics='cta'], .pricing-primary-cta, .primary-button, .primaryButton");
      if (cta) {
        sendEvent("cta_click", window.location.pathname, (cta.innerText || cta.getAttribute("aria-label") || "CTA").trim().slice(0, 120));
        return;
      }
      const button = target.closest<HTMLButtonElement>("button");
      if (button) {
        sendEvent("button_click", window.location.pathname, (button.innerText || button.getAttribute("aria-label") || "button").trim().slice(0, 120));
        return;
      }
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (link) sendEvent("link_click", window.location.pathname, (link.innerText || link.getAttribute("href") || "link").trim().slice(0, 120));
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
