import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";

import type { Locale } from "@/i18n/routing";

import { styles } from "@/lib/email/styles";

export type ConsultationConfirmationCopy = {
  preview: string;
  greeting: string;
  intro: string;
  summaryTitle: string;
  rows: { label: string; value: string }[];
  messageLabel: string;
  signoff: string;
  team: string;
  footer: string;
};

/** Visitor confirmation, in the request's locale. Copy is resolved by render.ts. */
export function ConsultationConfirmationEmail({
  locale,
  copy,
  message,
  studio,
}: {
  locale: Locale;
  copy: ConsultationConfirmationCopy;
  message: string;
  studio: string;
}) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.wordmark}>{studio}</Text>
          <Heading as="h1" style={styles.heading}>
            {copy.greeting}
          </Heading>
          <Text style={styles.text}>{copy.intro}</Text>
          <Hr style={styles.hr} />
          <Section>
            <Text style={{ ...styles.text, fontWeight: 600 }}>
              {copy.summaryTitle}
            </Text>
            {copy.rows.map(({ label, value }) => (
              <div key={label}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
              </div>
            ))}
            <Text style={styles.label}>{copy.messageLabel}</Text>
            <Text style={styles.message}>{message}</Text>
          </Section>
          <Text style={styles.text}>
            {copy.signoff}
            <br />
            {copy.team}
          </Text>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>{copy.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}
