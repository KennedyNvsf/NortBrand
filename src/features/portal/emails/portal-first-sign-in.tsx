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

import { styles } from "@/lib/email/styles";

export type PortalFirstSignInCopy = {
  preview: string;
  heading: string;
  body: string;
  button: string;
  fallback: string;
  footer: string;
};

/**
 * To the project lead when a client signs in to the portal for the first time (#159;
 * Settings › "Tell me when a client signs in for the first time"). The team portal is
 * English only (ADR-009). No images, no tracking.
 */
export function PortalFirstSignInEmail({
  copy,
  studio,
  accessUrl,
}: {
  copy: PortalFirstSignInCopy;
  studio: string;
  accessUrl: string;
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
          <Text style={styles.message}>{copy.body}</Text>
          <Button href={accessUrl} style={styles.button}>
            {copy.button}
          </Button>
          <Text style={{ ...styles.label, marginTop: "24px" }}>
            {copy.fallback}
          </Text>
          <Text style={{ ...styles.value, wordBreak: "break-all" }}>
            <Link href={accessUrl} style={styles.link}>
              {accessUrl}
            </Link>
          </Text>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>{copy.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}
