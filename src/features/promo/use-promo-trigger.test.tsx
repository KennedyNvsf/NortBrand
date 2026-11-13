// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Promo } from "@/content/promo";
import {
  resetConsentStoreForTests,
  saveConsent,
} from "@/features/consent/consent-store";

import { dismissPromo } from "./promo-storage";
import { usePromoTrigger } from "./use-promo-trigger";

const offer: Promo = {
  id: "test-offer",
  endsAt: "2026-12-31T23:59:59Z",
  delayMs: 8000,
};

let root: Root;
let container: HTMLDivElement;

function Probe({ promo }: { promo: Promo }) {
  return <p data-due={String(usePromoTrigger(promo))} />;
}

function due() {
  return container.querySelector("p")?.dataset.due === "true";
}

function render(promo: Promo = offer) {
  act(() => {
    root.render(<Probe promo={promo} />);
  });
}

function decide() {
  act(() => {
    saveConsent({ analytics: false });
  });
}

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(new Date("2026-11-30T10:00:00Z"));
  document.cookie = "nb_consent=; max-age=0; path=/";
  window.localStorage.clear();
  resetConsentStoreForTests();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  document.body.removeAttribute("data-scroll-locked");
  vi.useRealTimers();
});

describe("usePromoTrigger", () => {
  it("waits for the cookie choice, then the delay", () => {
    render();
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(due()).toBe(false);

    decide();
    act(() => {
      vi.advanceTimersByTime(7999);
    });
    expect(due()).toBe(false);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(due()).toBe(true);
  });

  it("never fires for a dismissed offer", () => {
    dismissPromo(offer.id);
    decide();
    render();
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(due()).toBe(false);
  });

  it("never fires after the end date", () => {
    vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
    decide();
    render();
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(due()).toBe(false);
  });

  it("waits for an open dialog to close", async () => {
    decide();
    render();
    document.body.setAttribute("data-scroll-locked", "1");
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(due()).toBe(false);

    await act(async () => {
      document.body.removeAttribute("data-scroll-locked");
      // MutationObserver callbacks run as microtasks.
      await Promise.resolve();
    });
    expect(due()).toBe(true);
  });
});
