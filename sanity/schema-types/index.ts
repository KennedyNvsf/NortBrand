import { author } from "./author";
import { category } from "./category";
import { post } from "./post";

/* Blog content only (ADR-003): services, FAQ and page copy stay in src/content/. */
export const schemaTypes = [post, author, category];
