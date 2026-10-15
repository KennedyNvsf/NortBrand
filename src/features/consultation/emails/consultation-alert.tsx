import {
  Body,
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

import { styles } from "./styles";

export type ConsultationAlertCopy = {
  preview: string;
  heading: string;
  footer: string;
  rows: { label: string; value: string; href?: string }[];
  messageLabel: string;
};

/** Team alert, always in English (to NOTIFY_TO_EMAIL). Copy is resolved by render.ts. */
export function ConsultationAlertEmail({
  copy,
  message,
  studio,
}: {
  copy: ConsultationAlertCopy;
  message: string;
  studio: string;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.wordmark}>{studio}</Text>
          <Heading as="h1" style={styles.heading}>
            {copy.heading}
          </Heading>
          <Section>
            {copy.rows.map(({ label, value, href }) => (
              <div key={label}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>
                  {href ? (
                    <Link href={href} style={styles.link}>
                      {value}
                    </Link>
                  ) : (
                    value
                  )}
                </Text>
              </div>
            ))}
            <Text style={styles.label}>{copy.messageLabel}</Text>
            <Text style={styles.message}>{message}</Text>
          </Section>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>{copy.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}
