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

export type PortalWelcomeCopy = {
  preview: string;
  heading: string;
  intro: string;
  idLabel: string;
  howTo: string;
  button: string;
  fallback: string;
  footer: string;
};

/**
 * The welcome email a client gets when they're invited to a project (#136): the sign-in
 * link and the Project ID, in the client's language. No images, no tracking. Copy is
 * resolved by render.tsx.
 */
export function PortalWelcomeEmail({
  locale,
  copy,
  studio,
  projectId,
  signInUrl,
}: {
  locale: Locale;
  copy: PortalWelcomeCopy;
  studio: string;
  projectId: string;
  signInUrl: string;
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
          <Text style={styles.text}>{copy.intro}</Text>
          <Section
            style={{
              backgroundColor: emailTokens.bgPrimary,
              border: `1px solid ${emailTokens.borderDefault}`,
              borderRadius: "12px",
              margin: "0 0 16px",
              padding: "16px 18px",
            }}
          >
            <Text style={styles.label}>{copy.idLabel}</Text>
            <Text
              style={{
                ...styles.value,
                fontSize: "26px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                lineHeight: "34px",
                margin: 0,
              }}
            >
              {projectId}
            </Text>
          </Section>
          <Text style={styles.text}>{copy.howTo}</Text>
          <Button href={signInUrl} style={styles.button}>
            {copy.button}
          </Button>
          <Text style={{ ...styles.label, marginTop: "24px" }}>
            {copy.fallback}
          </Text>
          <Text style={{ ...styles.value, wordBreak: "break-all" }}>
            <Link href={signInUrl} style={styles.link}>
              {signInUrl}
            </Link>
          </Text>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>{copy.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}
