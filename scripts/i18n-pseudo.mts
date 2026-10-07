/**
 * pnpm i18n:pseudo [--reset]
 *
 * Regenerates messages/pt.json from messages/en.json. Real translations already in
 * pt.json are kept; every other key becomes a pseudo string. --reset replaces every
 * key, including real translations.
 */
import { readFileSync, writeFileSync } from "node:fs";

import {
  buildPseudoMessages,
  findPseudoKeys,
  flattenKeys,
  type MessageTree,
} from "../src/i18n/pseudo.ts";

const enPath = new URL("../messages/en.json", import.meta.url);
const ptPath = new URL("../messages/pt.json", import.meta.url);
const reset = process.argv.includes("--reset");

const read = (file: URL) =>
  JSON.parse(readFileSync(file, "utf8")) as MessageTree;

const pt = buildPseudoMessages(read(enPath), read(ptPath), { reset });
writeFileSync(ptPath, `${JSON.stringify(pt, null, 2)}\n`);

const total = flattenKeys(pt).length;
const pseudo = findPseudoKeys(pt).length;
console.log(
  `messages/pt.json: ${total} keys, ${pseudo} pseudo, ${total - pseudo} translated${reset ? " (reset)" : ""}.`,
);
