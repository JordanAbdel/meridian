import { describe, it, expect } from "vitest";
import { parseLeg } from "./flightLookup";

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
