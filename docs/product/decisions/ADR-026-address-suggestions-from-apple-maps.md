# ADR-026 — Address suggestions from Apple Maps on the iPhone

- **Date:** 2026-10-17
- **Status:** accepted
- **Phase:** 02-product, revisited post-handoff
- **Deciders:** owner (chat, 2026-10-17), agent (recommendation)

## Context
`US-067` suggests addresses and venues as the creator types the shoot's address. Two services do
this. Development runs at $0 (`04-tech/architecture.md`, Stage 1), the app is iOS first
(`ADR-016`), and the web app (`EP-10`, `ADR-024`) has a shoot form of its own.

## Options considered
### Option A — Apple Maps (`MKLocalSearchCompleter`) in the iOS app
- **Pros:** part of the iOS SDK — no key, no account, no bill; Apple only throttles one device that
  asks too often. Native results in the phone's language
- **Cons:** iOS only; React Native cannot call it directly, so it needs a small Expo native module
  in Swift; venue coverage in Ukraine is unverified (assumption: thinner than Google's)

### Option B — Google Places Autocomplete
- **Pros:** one service for iOS and the web; the fullest venue data in Ukraine (assumption)
- **Cons:** a billing account with a card; a free monthly allowance, then paid per request; an API
  key in a client app and a public web app has to be restricted against misuse

### Option C — defer
- **Pros:** nothing to build
- **Cons:** the address stays typed by hand

## Decision
Option A: Apple Maps on the iPhone, because it costs nothing and needs no key, and the iPhone is
where shoots are created today.

## Consequences
- **Accepted cost:** the web app gets no suggestions; a native module to maintain across Expo SDK
  upgrades.
- **Now easier:** `US-067` ships with no account, key or cost.
- **Now harder:** suggestions in the web app need a second service later (MapKit JS or Google).
  Reversal is cheap — nothing is stored but text (`US-067` AC-6).
- **Revisit when:** Apple does not find the owner's venues (`US-067` open question 1), or the web
  app needs suggestions.

## Open questions
| # | Question | What decision it blocks |
|---|---|---|
| 1 | Apple's coverage of Ukrainian venues, checked on maps.apple.com | Keeping this decision |
