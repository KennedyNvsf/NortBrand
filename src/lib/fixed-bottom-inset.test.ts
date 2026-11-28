// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { bottomInsetOf, setFixedBottomInset } from "./fixed-bottom-inset";

const inset = () =>
  document.documentElement.style.getPropertyValue("--fixed-bottom-inset");

describe("fixed bottom inset (#177)", () => {
  afterEach(() => {
    for (const id of ["a", "b"]) setFixedBottomInset(id, 0);
  });

  it("uses the tallest layer shown, rounded up", () => {
    setFixedBottomInset("a", 84);
    setFixedBottomInset("b", 303.4);
    expect(inset()).toBe("304px");
  });

  it("falls back to the next layer, then to 0, as layers leave", () => {
    setFixedBottomInset("a", 84);
    setFixedBottomInset("b", 304);
    setFixedBottomInset("b", 0);
    expect(inset()).toBe("84px");
    setFixedBottomInset("a", 0);
    expect(inset()).toBe("0px");
  });

  it("counts a hidden layer as 0", () => {
    const element = document.createElement("div");
    element.style.visibility = "hidden";
    document.body.append(element);
    expect(bottomInsetOf(element)).toBe(0);
    element.remove();
  });
});
