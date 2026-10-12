import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import {
  isTrustedHostMessage,
  getParentOrigin,
  EMBED_ALLOWED_PARENT_ORIGINS,
} from './embedTrust';

// Runs in the default node environment: `window` and `document` are stubbed per
// test. The function only ever reads `window.parent` and `document.referrer`, so
// a minimal stand-in is enough and the suite stays free of a jsdom dependency.
// `MessageEvent.source` is typed as MessageEventSource (a real Window,
// MessagePort or ServiceWorker), which a plain object can never satisfy. The
// function under test only ever compares the value by identity, so casting the
// stand-in is honest here rather than a shortcut around a real constraint.
const realParent = { name: 'the framing window' } as unknown as MessageEventSource;
const popUp = { name: 'pop-up' } as unknown as MessageEventSource;

const message = (over: Partial<MessageEvent> = {}): MessageEvent =>
  ({
    source: realParent,
    origin: 'https://host.example',
    data: { type: 'earth-globe', command: 'flyTo', payload: {} },
    ...over,
  }) as MessageEvent;

beforeEach(() => {
  vi.stubGlobal('window', { parent: realParent });
  vi.stubGlobal('document', { referrer: '' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  // Restore the shipped default so the allowlist cases cannot leak into others.
  EMBED_ALLOWED_PARENT_ORIGINS.length = 0;
});

describe('isTrustedHostMessage — default (empty allowlist)', () => {
  it('ships with an empty allowlist, i.e. any parent may script its own embed', () => {
    expect(EMBED_ALLOWED_PARENT_ORIGINS).toEqual([]);
  });

  it('accepts a message from the window that actually framed us', () => {
    expect(isTrustedHostMessage(message())).toBe(true);
  });

  // The whole point of the check: a pop-up, opener or sibling frame that shares
  // our origin policy must not be able to drive the globe.
  it('rejects a message from any other window', () => {
    expect(isTrustedHostMessage(message({ source: popUp }))).toBe(false);
    expect(isTrustedHostMessage(message({ source: null }))).toBe(false);
  });

  it('ignores origin when no allowlist is configured', () => {
    expect(isTrustedHostMessage(message({ origin: 'https://evil.example' }))).toBe(true);
  });
});

describe('isTrustedHostMessage — configured allowlist', () => {
  it('only accepts a listed origin from the real parent', () => {
    EMBED_ALLOWED_PARENT_ORIGINS.push('https://host.example');

    expect(isTrustedHostMessage(message())).toBe(true);
    expect(isTrustedHostMessage(message({ origin: 'https://other.example' }))).toBe(false);
  });

  it('still rejects a non-parent window even when its origin is listed', () => {
    // The source check runs first and is not negotiable by the allowlist.
    EMBED_ALLOWED_PARENT_ORIGINS.push('https://host.example');

    expect(
      isTrustedHostMessage(message({ source: popUp }))
    ).toBe(false);
  });
});

describe('getParentOrigin', () => {
  const withReferrer = (value: string) => {
    vi.stubGlobal('document', { referrer: value });
  };

  it('derives the origin from the referrer', () => {
    withReferrer('https://host.example/some/page?a=1');
    expect(getParentOrigin()).toBe('https://host.example');
  });

  it('returns empty when the browser withholds the referrer', () => {
    withReferrer('');
    expect(getParentOrigin()).toBe('');
  });

  it('returns empty rather than throwing on an unparseable referrer', () => {
    withReferrer('::::not a url');
    expect(getParentOrigin()).toBe('');
  });
});