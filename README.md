# Meridian

A local-first jet-lag planning PWA. Give it a flight and your usual sleep schedule, and it
builds a day-by-day circadian adjustment plan — sleep windows, when to seek and avoid bright
light, a caffeine cutoff, and an optional melatonin timing window.

Everything computes on your device. No accounts, no backend — the app works fully offline
once it has been opened once. The only optional network feature is flight-number lookup
(below); plan generation itself never touches the network.

> **Disclaimer:** informational only, not medical advice. Melatonin entries are timing
> suggestions, not dosage recommendations.

## Screens

- **Now** (default once a plan exists) — the single instruction that applies right now,
  time remaining, and what's coming up next.
- **Full plan** — the day-by-day timeline, one 24-hour bar per day.
- **Trip setup** — flight, usual sleep, melatonin toggle, and how many days before the
  flight to start shifting. Generating a plan routes you to Now and persists the plan to
  localStorage, so it survives reloads.

## Flight-number lookup (optional)

Instead of typing the route and times, enter flight number(s) and the departure date in
the "Fill from flight number" card and the form fills itself — including exact airport
timezones. Connecting flights: list the legs in travel order (`QF11, AA100`); the plan
uses the first leg's departure and the last leg's arrival.

It uses the [AeroDataBox](https://rapidapi.com/aedbx-aedbx/api/aerodatabox) API:

1. Create a free RapidAPI account and subscribe to AeroDataBox's free tier.
2. Copy your RapidAPI key into the card's key field — it's stored only in your browser's
   localStorage, never committed or sent anywhere except RapidAPI.

For a personal build you can skip step 2: put `VITE_RAPIDAPI_KEY=<your key>` in a
`.env.local` file (gitignored) and the app uses it as the default key. Note the key is
baked into the built JS — anyone you give the build to can read it, so treat it as
shared-with-friends, not secret.

The lookup needs a connection; everything else keeps working offline. If you skip the key
entirely, manual entry works exactly as before.

## How the plan is computed

`src/lib/planGenerator.ts` is a pure module (unit-tested, no I/O):

1. Your core-body-temperature minimum (Tmin) is estimated at 2h before habitual wake.
2. The timezone shift decides direction: eastward → phase **advance**, westward → phase
   **delay**. Eastward shifts over 9h flip to the shorter delay around the clock.
3. The clock moves at most 1.0h/day (advance) or 1.5h/day (delay); shifting can start up
   to 3 days pre-flight, with any remainder handled after arrival.
4. Each day's blocks are derived from that day's Tmin: bright light after Tmin advances
   the clock, before Tmin delays it; light on the wrong side is avoided. Caffeine ends
   ~9h before target bedtime. Melatonin (if enabled) is ~5h before target bedtime when
   advancing, or shortly after wake when delaying.

## Run it

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm test           # generator unit tests (vitest)
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build
```

## Install it as an app (for friends)

1. Host the `dist/` folder anywhere static (or run `npm run preview` on a machine they
   can reach). Serve over HTTPS if it isn't localhost — service workers require it.
2. Open the URL in a browser once, so the service worker caches the app.
3. Install:
   - **iPhone/iPad (Safari):** Share → *Add to Home Screen*.
   - **Android (Chrome):** the *Install app* prompt, or ⋮ menu → *Add to Home screen*.
   - **Desktop (Chrome/Edge):** the install icon in the address bar.
4. From then on it opens like a native app and works with no connection. Plans are saved
   on the device.

## Project layout

```
src/
  lib/
    planGenerator.ts    pure plan generator (+ planGenerator.test.ts)
    nowState.ts         plan + current time -> "what should I do right now"
    timezones.ts        city list -> IANA zone, DST-correct offsets via Intl
    storage.ts          localStorage persistence
    time.ts, blocks.ts  small shared helpers
  screens/              Home (Now), FullPlan, TripSetup
  components/           NavBar, BlockIcon, Disclaimer
scripts/generateIcons.mjs   regenerates the PWA icons (no dependencies)
```

Times shown for each plan day are in that day's local wall clock — origin timezone until
you fly, destination timezone from arrival — so the app matches whatever your phone's
clock says wherever you are.
