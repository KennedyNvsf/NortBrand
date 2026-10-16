// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  closeConsentPreferences,
  openConsentPreferences,
  resetConsentStoreForTests,
  saveConsent,
  useConsent,
  useConsentPreferencesOpen,
} from "./consent-store";

// React only acts synchronously in tests with this flag (react.dev, act()).
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  const consent = useConsent();
  const open = useConsentPreferencesOpen();
  return (
    <p data-open={open}>
      {consent.status === "decided"
        ? `decided:${String(consent.consent.analytics)}`
        : consent.status}
    </p>
  );
}

let root: Root;
let container: HTMLDivElement;

function render() {
  act(() => {
    root.render(<Probe />);
  });
  return container.querySelector("p");
}

function clearCookies() {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
}

beforeEach(() => {
  clearCookies();
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
});

describe("consent store", () => {
  it("is undecided without a cookie, decided after a save", () => {
    const probe = render();
    expect(probe?.textContent).toBe("undecided");

    act(() => {
      saveConsent({ analytics: true });
    });
    expect(probe?.textContent).toBe("decided:true");
    expect(document.cookie).toContain("nb_consent=v1.1");
  });

  it("reads a choice saved on an earlier visit", () => {
    document.cookie = "nb_consent=v1.0; Path=/";
    expect(render()?.textContent).toBe("decided:false");
  });

  it("opens the preferences, and saving closes them", () => {
    const probe = render();
    act(openConsentPreferences);
    expect(probe?.dataset.open).toBe("true");
    act(closeConsentPreferences);
    expect(probe?.dataset.open).toBe("false");

    act(openConsentPreferences);
    act(() => {
      saveConsent({ analytics: false });
    });
    expect(probe?.dataset.open).toBe("false");
  });
});
