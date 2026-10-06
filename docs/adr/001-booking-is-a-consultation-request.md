# ADR-001: Booking is a consultation request form, not self-service scheduling

- Status: Accepted
- Date: 2026-10-05
- Source: Technical Architecture Brief, "Architecture decisions"

## Context

"Booking" on the NortBrand website means a visitor asking for a free 30-minute
consultation. Launch is 10 November 2026, five weeks after the build starts. The approved
Figma design shows a request form with idle, validation, sending, success and send-failed
states. It does not show a calendar or availability picker.

## Decision

Booking is a consultation request form. The visitor submits name, email, optional phone,
service, message, locale and consent. The team replies within one business day with
proposed call times. There is no self-service scheduling in this release.

## Alternatives considered

- **Embedded third-party scheduler.** Rejected: not in the design, adds a third-party
  surface and cookies, and does not match the visual system.
- **Custom availability engine.** Rejected: needs design, calendar integration and
  timezone handling that do not fit the five-week schedule.

## Consequences

- Ships on time from the existing design.
- The request flow stays simple to secure and test (see ADR-002).
- Scheduling becomes a Phase 2 feature and needs its own design work.
- Replies are manual, so response time depends on the team.
