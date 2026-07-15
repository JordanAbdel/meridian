import { describe, it, expect } from "vitest";
import { parseLeg, parseLegs } from "./flightLookup";

// Trimmed AeroDataBox /flights/number response entry.
const QF1 = {
  number: "QF 1",
  departure: {
    airport: {
      iata: "SYD",
      name: "Sydney Kingsford Smith",
      municipalityName: "Sydney",
      timeZone: "Australia/Sydney",
    },
    scheduledTime: { utc: "2026-07-11 11:55Z", local: "2026-07-11 21:55+10:00" },
  },
  arrival: {
    airport: {
      iata: "LHR",
      name: "London Heathrow",
      municipalityName: "London",
      timeZone: "Europe/London",
    },
    scheduledTime: { utc: "2026-07-12 05:25Z", local: "2026-07-12 06:25+01:00" },
  },
};

describe("parseLeg", () => {
  it("extracts route, IANA zones, and datetime-local values", () => {
    const leg = parseLeg(QF1, "QF1");
    expect(leg).not.toBeNull();
    expect(leg!.depIata).toBe("SYD");
    expect(leg!.depCity).toBe("Sydney");
    expect(leg!.depZone).toBe("Australia/Sydney");
    expect(leg!.depLocal).toBe("2026-07-11T21:55");
    expect(leg!.arrCity).toBe("London");
    expect(leg!.arrZone).toBe("Europe/London");
    expect(leg!.arrLocal).toBe("2026-07-12T06:25");
  });

  it("returns null when scheduled times or timezones are missing", () => {
    expect(parseLeg({ departure: { airport: { iata: "SYD" } } }, "QF1")).toBeNull();
    expect(parseLeg(null, "QF1")).toBeNull();
    expect(parseLeg({}, "QF1")).toBeNull();
  });
});

describe("parseLegs — one number covering several legs", () => {
  // Shape taken from a real AeroDataBox response: QF1 on one date is two entries,
  // SYD→SIN and SIN→LHR. Deliberately out of order to test the sort.
  const leg = (dep: string, arr: string, depTz: string, arrTz: string, depUtc: string, arrUtc: string) => ({
    departure: {
      airport: { iata: dep, municipalityName: dep, timeZone: depTz },
      scheduledTime: { utc: depUtc, local: depUtc.replace("Z", "+00:00") },
    },
    arrival: {
      airport: { iata: arr, municipalityName: arr, timeZone: arrTz },
      scheduledTime: { utc: arrUtc, local: arrUtc.replace("Z", "+00:00") },
    },
  });
  const QF1_RESPONSE = [
    leg("SIN", "LHR", "Asia/Singapore", "Europe/London", "2026-07-17 15:20Z", "2026-07-18 05:35Z"),
    leg("SYD", "SIN", "Australia/Sydney", "Asia/Singapore", "2026-07-17 04:45Z", "2026-07-17 13:15Z"),
  ];

  it("returns every leg ordered by departure so the trip spans first dep → last arr", () => {
    const legs = parseLegs(QF1_RESPONSE, "QF1");
    expect(legs).toHaveLength(2);
    expect(legs[0].depIata).toBe("SYD");
    expect(legs[1].arrIata).toBe("LHR");
    expect(legs[1].arrZone).toBe("Europe/London");
  });

  it("returns [] for non-array or all-invalid input", () => {
    expect(parseLegs({ error: "nope" }, "QF1")).toEqual([]);
    expect(parseLegs([{}, null], "QF1")).toEqual([]);
  });
});
