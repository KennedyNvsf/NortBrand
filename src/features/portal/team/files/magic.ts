/*
 * What a file really is, from its first bytes (#140): the upload's name and declared
 * type are never trusted. Only the portal's allowed types are recognised; anything
 * else, including SVG (text, can carry script), is null and refused.
 */

export const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/zip",
] as const;
export type AllowedType = (typeof ALLOWED_TYPES)[number];

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** How many leading bytes detection needs. */
export const SNIFF_BYTES = 16;

const startsWith = (
  bytes: Uint8Array,
  signature: readonly number[],
  offset = 0,
) => signature.every((byte, index) => bytes[offset + index] === byte);

export function detectFileType(bytes: Uint8Array): AllowedType | null {
  // %PDF-
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]))
    return "application/pdf";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  // GIF87a / GIF89a
  if (
    startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }
  // RIFF....WEBP
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return "image/webp";
  }
  // PK\x03\x04 (local file header) or PK\x05\x06 (empty archive)
  if (
    startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])
  ) {
    return "application/zip";
  }
  return null;
}

export function isAllowedType(value: string): value is AllowedType {
  return (ALLOWED_TYPES as readonly string[]).includes(value);
}
