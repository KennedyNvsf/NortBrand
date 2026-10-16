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

export type NewsletterConfirmationCopy = {
  preview: string;
  heading: string;
  intro: string;
  button: string;
  expiry: string;
  fallback: string;
  ignore: string;
  footer: string;
};

/** Double opt-in: the link to the confirm page. Copy is resolved by render.tsx. */
export function NewsletterConfirmationEmail({
  locale,
  copy,
  confirmUrl,
  studio,
}: {
  locale: Locale;
  copy: NewsletterConfirmationCopy;
  confirmUrl: string;
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
            {copy.heading}
          </Heading>
          <Text style={styles.text}>{copy.intro}</Text>
          <Button href={confirmUrl} style={styles.button}>
            {copy.button}
          </Button>
          <Text style={{ ...styles.text, marginTop: "16px" }}>
            {copy.expiry}
          </Text>
          <Text style={styles.label}>{copy.fallback}</Text>
          <Text style={{ ...styles.value, wordBreak: "break-all" }}>
            <Link href={confirmUrl} style={styles.link}>
              {confirmUrl}
            </Link>
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
