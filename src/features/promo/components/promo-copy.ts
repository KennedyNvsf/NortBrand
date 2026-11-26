import type { ReactNode } from "react";

/**
 * The promo's strings (messages › Promo), translated on the server and passed in, so
 * the Promo namespace stays out of the client message bundle (CLIENT_MESSAGE_PATHS)
 * and only Home's HTML carries it.
 */
export type PromoCopy = {
  /** Eyebrow: "Limited offer". */
  label: string;
  /** "Ends 31 Dec" */
  until: string;
  /** The figure: "Free". */
  offer: string;
  /** "Website wireframe" */
  offerLabel: string;
  /** Rich headline with the red keyword and a line break. */
  title: ReactNode;
  body: string;
  terms: string;
  book: string;
  dismiss: string;
  /** Accessible name of the round close button. */
  close: string;
};
