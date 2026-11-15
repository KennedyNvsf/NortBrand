import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from "react-email";

import type { Locale } from "@/i18n/routing";
import { styles } from "@/lib/email/styles";

export type PortalUpdateCopy = {
  preview: string;
  heading: string;
  byline: string;
  button: string;
  fallback: string;
  footer: string;
};

/**
 * An update from the team to the client (#138: health, launch date and finished stages;
 * #139 reuses it for every post). The body is the team's own words, kept as written
 * (React escapes it). No images, no tracking.
 */
export function PortalUpdateEmail({
  locale,
  copy,
  studio,
  body,
  portalUrl,
}: {
  locale: Locale;
  copy: PortalUpdateCopy;
  studio: string;
  body: string;
  portalUrl: string;
}) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.wordmark}>{studio}</Text>
          <Heading as="h1" style={styles.heading}>
            {copy.heading}
          </Heading>
          <Text style={styles.message}>{body}</Text>
          <Text style={{ ...styles.label, margin: "0 0 24px" }}>
            {copy.byline}
          </Text>
          <Button href={portalUrl} style={styles.button}>
            {copy.button}
          </Button>
          <Text style={{ ...styles.label, marginTop: "24px" }}>
            {copy.fallback}
          </Text>
          <Text style={{ ...styles.value, wordBreak: "break-all" }}>
            <Link href={portalUrl} style={styles.link}>
              {portalUrl}
            </Link>
          </Text>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>{copy.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}
