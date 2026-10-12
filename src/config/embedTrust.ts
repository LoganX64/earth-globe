/**
 * postMessage trust boundary for the embed.
 *
 * Living in its own module so it can be unit tested: `embed.tsx` runs
 * `createRoot(...)` at import time, so anything defined there is unreachable
 * from a test without mounting the whole app.
 *
 * Driving the embed from a host page is a PUBLIC, UNAUTHENTICATED API: anyone
 * may embed embed.html and script it. What is not allowed is a third party
 * messaging an embed that is already on screen, so commands are accepted only
 * from window.parent itself.
 *
 * To additionally restrict which sites may drive the embed, list their origins
 * here. Empty (the default) means "any parent page may script its own embed".
 */
export const EMBED_ALLOWED_PARENT_ORIGINS: string[] = [];

export const isTrustedHostMessage = (event: MessageEvent): boolean => {
  // Must come from the window that actually framed us. This is what stops a
  // pop-up, opener, or any other frame from driving the globe.
  if (event.source !== window.parent) return false;
  if (EMBED_ALLOWED_PARENT_ORIGINS.length === 0) return true;
  return EMBED_ALLOWED_PARENT_ORIGINS.includes(event.origin);
};

/**
 * Origin of the page that framed us, when the browser tells us. Used to scope
 * the outbound 'ready' handshake instead of broadcasting it to any parent.
 */
export const getParentOrigin = (): string => {
  try {
    return document.referrer ? new URL(document.referrer).origin : "";
  } catch {
    return "";
  }
};