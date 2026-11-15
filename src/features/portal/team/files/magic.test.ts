import { describe, expect, it } from "vitest";

import { detectFileType } from "./magic";

const bytes = (...values: number[]) =>
  new Uint8Array([...values, ...Array.from({ length: 16 }, () => 0)]);
const text = (value: string) => new TextEncoder().encode(value);

describe("detectFileType", () => {
  it("recognises the portal's types by their first bytes", () => {
    expect(detectFileType(text("%PDF-1.7\n"))).toBe("application/pdf");
    expect(
      detectFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe("image/png");
    expect(detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectFileType(text("GIF89a"))).toBe("image/gif");
    expect(detectFileType(text("GIF87a"))).toBe("image/gif");
    expect(detectFileType(text("RIFF\x00\x00\x00\x00WEBPVP8 "))).toBe(
      "image/webp",
    );
    expect(detectFileType(bytes(0x50, 0x4b, 0x03, 0x04))).toBe(
      "application/zip",
    );
    expect(detectFileType(bytes(0x50, 0x4b, 0x05, 0x06))).toBe(
      "application/zip",
    );
  });

  it("refuses anything else, whatever it's called", () => {
    // A text file renamed to .pdf, an SVG, an executable, an empty file.
    expect(detectFileType(text("Hello, I am not a PDF"))).toBeNull();
    expect(
      detectFileType(text('<svg xmlns="http://www.w3.org/2000/svg">')),
    ).toBeNull();
    expect(detectFileType(bytes(0x4d, 0x5a))).toBeNull();
    expect(detectFileType(new Uint8Array())).toBeNull();
    expect(detectFileType(text("RIFF\x00\x00\x00\x00WAVEfmt "))).toBeNull();
    expect(detectFileType(text("GIF88a"))).toBeNull();
  });
});
