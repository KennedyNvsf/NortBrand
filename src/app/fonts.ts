import { Instrument_Sans } from "next/font/google";

/* Shared by the locale layout and the root 404 fallback, so both render in brand type. */
export const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-instrument-sans",
});
