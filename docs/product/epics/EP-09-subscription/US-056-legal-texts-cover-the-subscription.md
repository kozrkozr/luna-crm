# US-056 — The terms and the privacy policy cover the subscription

- **Parent epic:** [EP-09 — Subscription](EP-09.md)
- **Subproject:** 001-luna-crm
- **Status:** draft
- **Size:** S

## Story
As **someone deciding to subscribe**,
I want **the terms to say what I pay, how it renews and how to stop**,
so that **I know what I agree to**.

## Context
`ADR-023` Consequences. The terms (`US-049`, `ADR-017`) still describe a free testing period.

## Acceptance criteria

### AC-1 — The terms, both languages
- **Then** they describe the subscription: the price, the 14-day free trial, monthly automatic
  renewal, cancelling in the Apple ID's settings, refunds through Apple, and what happens without
  access — view mode, links still working, nothing deleted
- **And** the "testing period" section is replaced

### AC-2 — The privacy policy, both languages
- **Then** it names RevenueCat (`ADR-023`) and Apple's payment processing, and
  what the provider receives

### AC-3 — Before the public release
- **Then** both are published before the first build that sells the subscription goes to the App
  Store

### AC-4 — Drafted by the build
- The texts are drafted by the build, ready to publish as they are, and reviewed by the lawyer
  afterwards — as `US-049` AC-2 (owner, 2026-10-08). Points for the lawyer go into luna-crm's
  `docs/legal-review.md`.

## Dependencies
`ADR-023`.

## Open questions
None.
