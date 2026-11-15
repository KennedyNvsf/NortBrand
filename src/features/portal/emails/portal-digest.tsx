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
  Section,
  Text,
} from "react-email";

import type { Locale } from "@/i18n/routing";
import { emailTokens, styles } from "@/lib/email/styles";

export type PortalDigestCopy = {
  preview: string;
  heading: string;
  needsYou: string;
  milestone: string;
  button: string;
  fallback: string;
  footer: string;
};

export type DigestEntry = {
  meta: string;
  body: string;
  needsYou: boolean;
  milestone: boolean;
};

/**
 * The client's daily digest (#139): today's posts on one project, oldest first, with
 * "Needs you" and milestone tags as text (colour is never the only signal). No images,
 * no tracking. The team's words are kept as written (React escapes them).
 */
export function PortalDigestEmail({
  locale,
  copy,
  studio,
  entries,
  portalUrl,
}: {
  locale: Locale;
  copy: PortalDigestCopy;
  studio: string;
  entries: DigestEntry[];
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
          {entries.map((entry, index) => (
            <Section
              key={index}
              style={{
                borderTop: `1px solid ${emailTokens.borderDefault}`,
                padding: "16px 0",
              }}
            >
              {entry.needsYou || entry.milestone ? (
                <Text
                  style={{
                    ...styles.label,
                    color: entry.needsYou
                      ? emailTokens.textAccent
                      : emailTokens.textPrimary,
                    fontWeight: 600,
                    margin: "0 0 6px",
                  }}
                >
                  {entry.needsYou ? copy.needsYou : copy.milestone}
                </Text>
              ) : null}
              <Text style={{ ...styles.message, margin: "0 0 6px" }}>
                {entry.body}
              </Text>
              <Text style={styles.label}>{entry.meta}</Text>
            </Section>
          ))}
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
