// @vitest-environment jsdom
import type { ComponentProps } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resetConsentStoreForTests,
  saveConsent,
} from "@/features/consent/consent-store";

import { StickyCta } from "./sticky-cta";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props} />
  ),
}));

// Minimal IntersectionObserver that lets the test decide what is on screen.
type Callback = (
  entries: Pick<IntersectionObserverEntry, "isIntersecting" | "target">[],
) => void;
const observers: { callback: Callback; targets: Element[] }[] = [];

class FakeIntersectionObserver {
  private readonly record: { callback: Callback; targets: Element[] };
  constructor(callback: Callback) {
    this.record = { callback, targets: [] };
    observers.push(this.record);
  }
  observe(target: Element) {
    this.record.targets.push(target);
  }
  disconnect() {
    this.record.targets = [];
  }
}

function setOnScreen(target: Element, isIntersecting: boolean) {
  act(() => {
    for (const { callback, targets } of observers) {
      if (targets.includes(target)) callback([{ target, isIntersecting }]);
    }
  });
}

const messages = {
  StickyCta: {
    label: "Book a free consultation",
    title: "Free consultation",
    meta: "30 minutes · No pressure",
    action: "Book now",
  },
};

let container: HTMLDivElement;
let root: Root;
let hero: HTMLElement;
let band: HTMLElement;

function bar() {
  const element = container.querySelector('[data-slot="sticky-cta"]');
  if (!element) throw new Error("sticky CTA not rendered");
  return element;
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  observers.length = 0;
  // A cookie choice already made, so only the hero and blockers decide (see below).
  document.cookie = "nb_consent=v1.0; Path=/";
  resetConsentStoreForTests();

  hero = document.createElement("section");
  hero.setAttribute("data-sticky-cta-trigger", "");
  band = document.createElement("section");
  band.setAttribute("data-sticky-cta-hide", "");
  document.body.append(hero, band);

  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <StickyCta />
      </NextIntlClientProvider>,
    );
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("StickyCta", () => {
  it("starts hidden and inert while the hero is on screen", () => {
    expect(bar().hasAttribute("data-visible")).toBe(false);
    expect(bar().hasAttribute("inert")).toBe(true);
  });

  it("shows once the hero has left the screen", () => {
    setOnScreen(hero, false);
    expect(bar().getAttribute("data-visible")).toBe("true");
    expect(bar().hasAttribute("inert")).toBe(false);
  });

  it("hides again while a CTA band is on screen", () => {
    setOnScreen(hero, false);
    setOnScreen(band, true);
    expect(bar().hasAttribute("data-visible")).toBe(false);

    setOnScreen(band, false);
    expect(bar().getAttribute("data-visible")).toBe("true");
  });

  it("waits until a cookie choice is made", () => {
    document.cookie = "nb_consent=; Max-Age=0; Path=/";
    resetConsentStoreForTests();
    act(() => {
      root.render(
        <NextIntlClientProvider locale="en" messages={messages}>
          <StickyCta />
        </NextIntlClientProvider>,
      );
    });
    setOnScreen(hero, false);
    expect(bar().hasAttribute("data-visible")).toBe(false);

    act(() => {
      saveConsent({ analytics: false });
    });
    expect(bar().getAttribute("data-visible")).toBe("true");
  });

  it("links to the consultation page", () => {
    expect(bar().querySelector("a")?.getAttribute("href")).toBe("/contact");
  });
});
