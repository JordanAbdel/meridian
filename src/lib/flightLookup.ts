// Flight-number lookup via AeroDataBox (RapidAPI free tier). This is the one feature
// that needs a connection — plan generation itself stays fully offline. The response
// parsing is pure and unit-tested; only fetchLeg touches the network.

export interface FlightLeg {
  flightNo: string;
  depIata: string;
  depCity: string;
  depZone: string; // IANA
  depLocal: string; // "YYYY-MM-DDTHH:MM" in the departure airport's wall clock
  depUtc: string; // ISO for ordering connecting legs
  arrIata: string;
  arrCity: string;
  arrZone: string;
  arrLocal: string;
  arrUtc: string;
}

const HOST = "aerodatabox.p.rapidapi.com";

/** "2026-07-11 21:55+10:00" (or with 'T') -> "2026-07-11T21:55" */
function toLocalInput(s: string): string {
  return s.replace(" ", "T").slice(0, 16);
}

/** Parse one AeroDataBox /flights/number response entry into a FlightLeg. */
export function parseLeg(entry: unknown, flightNo: string): FlightLeg | null {
  const e = entry as {
    departure?: {
      airport?: { iata?: string; municipalityName?: string; name?: string; timeZone?: string };
      scheduledTime?: { local?: string; utc?: string };
    };
    arrival?: {
      airport?: { iata?: string; municipalityName?: string; name?: string; timeZone?: string };
      scheduledTime?: { local?: string; utc?: string };
    };
  };
  const dep = e?.departure;
  const arr = e?.arrival;
  if (
    !dep?.airport?.timeZone ||
    !arr?.airport?.timeZone ||
    !dep.scheduledTime?.local ||
    !arr.scheduledTime?.local
  ) {
    return null;
  }
  return {
    flightNo,
    depIata: dep.airport.iata ?? "",
    depCity: dep.airport.municipalityName ?? dep.airport.name ?? "",
    depZone: dep.airport.timeZone,
    depLocal: toLocalInput(dep.scheduledTime.local),
    depUtc: dep.scheduledTime.utc ?? "",
    arrIata: arr.airport.iata ?? "",
    arrCity: arr.airport.municipalityName ?? arr.airport.name ?? "",
    arrZone: arr.airport.timeZone,
    arrLocal: toLocalInput(arr.scheduledTime.local),
    arrUtc: arr.scheduledTime.utc ?? "",
  };
}

/**
 * Parse every valid entry and order them by departure. One flight number can cover
 * several legs (e.g. QF1 is SYD→SIN→LHR, returned as two entries).
 */
export function parseLegs(json: unknown, flightNo: string): FlightLeg[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((entry) => parseLeg(entry, flightNo))
    .filter((l): l is FlightLeg => l !== null)
    .sort((a, b) => a.depUtc.localeCompare(b.depUtc));
}

async function fetchLegs(flightNo: string, dateYMD: string, apiKey: string): Promise<FlightLeg[]> {
  const no = flightNo.replace(/\s+/g, "").toUpperCase();
  const url = `https://${HOST}/flights/number/${encodeURIComponent(no)}/${dateYMD}?dateLocalRole=Departure&withAircraftImage=false&withLocation=false`;
  const res = await fetch(url, {
    headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": HOST },
  });
  if (res.status === 404) return [];
  if (res.status === 401 || res.status === 403) {
    throw new Error("The API key was rejected — check your RapidAPI key.");
  }
  if (res.status === 429) {
    throw new Error("Rate limit hit on the flight API — try again in a minute.");
  }
  if (!res.ok) throw new Error(`Flight lookup failed (HTTP ${res.status}).`);
  return parseLegs(await res.json(), no);
}

function nextDay(dateYMD: string): string {
  const [y, m, d] = dateYMD.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().slice(0, 10);
}

/**
 * Look up an itinerary: one or more flight numbers in travel order, starting on dateYMD.
 * Connecting legs may depart the day after the previous leg lands, so each later leg is
 * tried on the previous leg's arrival date and the day after, keeping the first departure
 * that follows the previous arrival.
 */
export async function lookupTrip(
  flightNos: string[],
  dateYMD: string,
  apiKey: string,
): Promise<FlightLeg[]> {
  const legs: FlightLeg[] = [];
  let searchDate = dateYMD;
  let prevArrUtc: string | null = null;

  // A group is all legs flown under one number on one date (QF1 = SYD→SIN→LHR is two).
  const startsAfterPrev = (group: FlightLeg[]) =>
    group.length > 0 && (!prevArrUtc || !group[0].depUtc || group[0].depUtc >= prevArrUtc);

  for (const no of flightNos) {
    let group = await fetchLegs(no, searchDate, apiKey);
    if (!startsAfterPrev(group)) {
      const alt = nextDay(searchDate);
      group = await fetchLegs(no, alt, apiKey);
      if (startsAfterPrev(group)) searchDate = alt;
      else group = [];
    }
    if (!group.length) {
      throw new Error(
        `No flight found for ${no.toUpperCase()} around ${searchDate}. Check the number and date.`,
      );
    }
    legs.push(...group);
    const last = group[group.length - 1];
    prevArrUtc = last.arrUtc || null;
    searchDate = last.arrLocal.slice(0, 10);
  }
  return legs;
}
