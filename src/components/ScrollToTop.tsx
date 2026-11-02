import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

function jumpToTop() {
  const html = document.documentElement;
  const body = document.body;
  const prevHtml = html.style.scrollBehavior;
  const prevBody = body.style.scrollBehavior;
  // Override global CSS `scroll-behavior: smooth` so we don't animate from mid-page
  html.style.scrollBehavior = "auto";
  body.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  html.scrollTop = 0;
  body.scrollTop = 0;
  html.style.scrollBehavior = prevHtml;
  body.style.scrollBehavior = prevBody;
}

/** Jump to top before paint on every route change. */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    jumpToTop();
    // Catch any late browser scroll restoration after paint
    const id = requestAnimationFrame(() => jumpToTop());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
