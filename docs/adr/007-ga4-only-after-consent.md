# ADR-007: GA4 loads only after analytics consent

- Status: Accepted
- Date: 2026-10-05
- Source: Technical Architecture Brief, "Security and privacy"

## Context

Visitors are EU residents, so ePrivacy rules and GDPR apply. The handover designs a cookie
banner with equal-weight Accept and Reject actions and a preferences panel. Analytics is
useful, but the site works without it.

## Decision

- The Google tag is not requested at all until the visitor accepts analytics. If the visitor
  declines, no request reaches Google.
- The choice is stored in a first-party cookie for 6 months and can be changed from the
  footer.
- GA4 settings: IP-based granular location off, ads personalization off, Google Signals off,
  data retention 2 months.

## Alternatives considered

- **Consent Mode advanced (cookieless pings before consent).** Rejected: it still sends
  requests to Google before the visitor has made a choice.

## Consequences

- The default is fully compliant.
- Analytics undercounts visitors who decline or ignore the banner.
- The sticky CTA waits until the visitor has made a consent choice (handover behaviour
  rule).
- The Privacy Policy must list the `_ga` and `_ga_<ID>` cookies and the possible transfer of
  analytics data to the US.
