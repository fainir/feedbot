"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    mixpanel: {
      track: (event: string, props?: Record<string, unknown>) => void;
      identify: (id: string) => void;
      people: { set: (props: Record<string, unknown>) => void };
      init: (token: string, config?: Record<string, unknown>) => void;
    };
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

export function Analytics() {
  const pathname = usePathname();

  // Track page views on route change
  useEffect(() => {
    if (GA_ID && window.gtag) {
      window.gtag("config", GA_ID, { page_path: pathname });
    }
    if (MIXPANEL_TOKEN && window.mixpanel) {
      window.mixpanel.track("Page View", { path: pathname });
    }
  }, [pathname]);

  return (
    <>
      {/* Google Analytics */}
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { send_page_view: true });
            `}
          </Script>
        </>
      )}

      {/* Mixpanel */}
      {MIXPANEL_TOKEN && (
        <Script id="mixpanel-init" strategy="afterInteractive">
          {`
            (function(f,b){if(!b.__SV){var e,g,i,h;window.mixpanel=b;b._i=[];b.init=function(e,f,c){function g(a,d){var b=d.split(".");2==b.length&&(a=a[b[0]],d=b[1]);a[d]=function(){a.push([d].concat(Array.prototype.slice.call(arguments,0)))}}var a=b;"undefined"!==typeof c?a=b[c]=[]:c="mixpanel";a.people=a.people||[];a.toString=function(a){var d="mixpanel";"mixpanel"!==c&&(d+="."+c);a||(d+=" (stub)");return d};a.people.toString=function(){return a.toString(1)+".people (stub)"};i="disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(" ");for(h=0;h<i.length;h++)g(a,i[h]);var j="set set_once union unset remove delete".split(" ");a.get_group=function(){function b(c){d[c]=function(){call2_args=arguments;call2=[c].concat(Array.prototype.slice.call(call2_args,0));a.push([e,call2])}}for(var d={},e=["get_group"].concat(Array.prototype.slice.call(arguments,0)),c=0;c<j.length;c++)b(j[c]);return d};b._i.push([e,f,c])};b.__SV=1.2;e=f.createElement("script");e.type="text/javascript";e.async=!0;e.src="https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js";g=f.getElementsByTagName("script")[0];g.parentNode.insertBefore(e,g)}})(document,window.mixpanel||[]);
            mixpanel.init('${MIXPANEL_TOKEN}', {
              track_pageview: true,
              persistence: 'localStorage',
              ip: false
            });
          `}
        </Script>
      )}
    </>
  );
}

// Helper to track custom events from anywhere in the app
export function trackEvent(event: string, props?: Record<string, unknown>) {
  if (GA_ID && window.gtag) {
    window.gtag("event", event, props);
  }
  if (MIXPANEL_TOKEN && window.mixpanel) {
    window.mixpanel.track(event, props);
  }
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (MIXPANEL_TOKEN && window.mixpanel) {
    window.mixpanel.identify(userId);
    if (traits) window.mixpanel.people.set(traits);
  }
}
