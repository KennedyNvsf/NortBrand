import type messages from "../../messages/en.json";
import type { routing } from "./routing";

// Type-safe locales and message keys for next-intl. en.json is the reference catalog.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
