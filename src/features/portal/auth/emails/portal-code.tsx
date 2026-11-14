import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "react-email";

import type { Locale } from "@/i18n/routing";
import { styles } from "@/lib/email/styles";

export type PortalCodeCopy = {
  preview: string;
  heading: string;
  intro: string;
  codeLabel: string;
  expiry: string;
  ignore: string;
  footer: string;
};

/*
 * The 6-digit sign-in code (#131). Supabase Auth sends it, not our Resend client, so
 * this component is rendered once into supabase/templates/portal-code.html
 * (render-template.ts) with Supabase's `{{ .Token }}` placeholder as the code.
 */
export function PortalCodeEmail({
  locale,
  studio,
  code,
  copy,
}: {
  locale: Locale;
  studio: string;
  code: string;
  copy: PortalCodeCopy;
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
          <Text style={styles.label}>{copy.codeLabel}</Text>
          <Text
            style={{
              ...styles.value,
              fontSize: "32px",
              fontWeight: 700,
              letterSpacing: "0.25em",
              lineHeight: "40px",
            }}
          >
            {code}
          </Text>
          <Text style={{ ...styles.text, marginTop: "16px" }}>
            {copy.expiry}
          </Text>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>{copy.ignore}</Text>
          <Text style={{ ...styles.footer, marginTop: "8px" }}>
            {copy.footer}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
