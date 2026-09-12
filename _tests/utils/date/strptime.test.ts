declare const process: any;
import { strptime } from "../../../src/utils/date";
import { ComputeError } from "../../../src/exceptions";

console.log("=========================================");
console.log("STARTING STRPTIME TESTS...");
console.log("=========================================");

let testsPassed = 0;

function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(`Assertion failed: ${msg}`);
    testsPassed++;
}

function assertEqual(actual: any, expected: any, msg: string) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) {
        throw new Error(`Assertion failed: ${msg}\n  Expected: ${e}\n  Actual:   ${a}`);
    }
    testsPassed++;
}

try {
    // Parsing year 0-99
    const parsedYear50 = strptime("0050-05-25 10:37:16.123", { format: "%Y-%m-%d %H:%M:%S.%ms" });
    assert(parsedYear50 !== null && parsedYear50.getUTCFullYear() === 50 && parsedYear50.getUTCMonth() === 4 && parsedYear50.getUTCDate() === 25, "parsed year 50");

    // Invalid timezone fallback
    const dInvalidTz = new Date("2026-05-25T10:37:16.123Z");
    const parsedInvalidTz = strptime("2026-05-25 10:37:16.123", { format: "%Y-%m-%d %H:%M:%S.%ms", strict: true, defaultTimeZone: "Invalid/TimeZone_Name" });
    assertEqual(parsedInvalidTz?.getTime(), dInvalidTz.getTime(), "invalid timezone fallback to UTC");

    // Standard format parsing
    const parsedStd = strptime("2026-05-20 15:07:09", { format: "%Y-%m-%d %H:%M:%S" });
    assertEqual(parsedStd?.toISOString(), "2026-05-20T15:07:09.000Z", "standard format parsing");

    // defaultTimeZone EST / EDT
    const parsedEST = strptime("2026-01-15 12:00:00", { format: "%Y-%m-%d %H:%M:%S", defaultTimeZone: "America/New_York" });
    assertEqual(parsedEST?.toISOString(), "2026-01-15T17:00:00.000Z", "EST defaultTimeZone");

    const parsedEDT = strptime("2026-07-15 12:00:00", { format: "%Y-%m-%d %H:%M:%S", defaultTimeZone: "America/New_York" });
    assertEqual(parsedEDT?.toISOString(), "2026-07-15T16:00:00.000Z", "EDT defaultTimeZone");

    // Explicit offset in string overrides defaultTimeZone
    const parsedExplicitOffset = strptime("2026-01-15 12:00:00 +0900", { format: "%Y-%m-%d %H:%M:%S %z", defaultTimeZone: "America/New_York" });
    assertEqual(parsedExplicitOffset?.toISOString(), "2026-01-15T03:00:00.000Z", "explicit offset overrides defaultTimeZone");

    // defaultTimeZone: "UTC"
    const parsedUTC = strptime("2026-01-15 12:00:00", { format: "%Y-%m-%d %H:%M:%S", defaultTimeZone: "UTC" });
    assertEqual(parsedUTC?.toISOString(), "2026-01-15T12:00:00.000Z", "UTC defaultTimeZone");

    // Invalid string syntax returns null
    assertEqual(strptime("not-a-date", { format: "%Y-%m-%d" }), null, "invalid date string returns null");
    assertEqual(strptime("2026-02-31", { format: "%Y-%m-%d", strict: true }), null, "strict rejects invalid calendar date Feb 31");

    // 10/10 EDGE CASE TESTS FOR STRPTIME
    // 1. Non-string inputs or non-string format return null
    assertEqual(strptime(null as any, { format: "%Y-%m-%d" }), null, "null input string returns null");
    assertEqual(strptime(12345 as any, { format: "%Y-%m-%d" }), null, "number input returns null");
    assertEqual(strptime("2026-05-20", { format: null as any }), null, "null format returns null");

    // 2. 2-digit year pivot (%y): >=69 -> 1900s, <69 -> 2000s
    const p69 = strptime("69-05-20", { format: "%y-%m-%d" });
    assertEqual(p69?.getUTCFullYear(), 1969, "%y: 69 maps to 1969");
    const p68 = strptime("68-05-20", { format: "%y-%m-%d" });
    assertEqual(p68?.getUTCFullYear(), 2068, "%y: 68 maps to 2068");
    const p00 = strptime("00-05-20", { format: "%y-%m-%d" });
    assertEqual(p00?.getUTCFullYear(), 2000, "%y: 00 maps to 2000");

    // 3. 12-hour clock with %I and %p: 12 AM is midnight (00), 12 PM is noon (12)
    const pMidnight = strptime("2026-05-20 12:00:00 AM", { format: "%Y-%m-%d %I:%M:%S %p" });
    assertEqual(pMidnight?.getUTCHours(), 0, "12 AM is parsed as hour 0");
    const pNoon = strptime("2026-05-20 12:00:00 PM", { format: "%Y-%m-%d %I:%M:%S %p" });
    assertEqual(pNoon?.getUTCHours(), 12, "12 PM is parsed as hour 12");
    const p1PM = strptime("2026-05-20 01:30:00 PM", { format: "%Y-%m-%d %I:%M:%S %p" });
    assertEqual(p1PM?.getUTCHours(), 13, "01 PM is parsed as hour 13");

    // 4. Ordinal day parsing (%j)
    const pOrd1 = strptime("2026 001", { format: "%Y %j" });
    assertEqual(pOrd1?.toISOString(), "2026-01-01T00:00:00.000Z", "%j day 1 of 2026");
    const pOrdLeap = strptime("2024 060", { format: "%Y %j" });
    assertEqual(pOrdLeap?.toISOString(), "2024-02-29T00:00:00.000Z", "%j day 60 in leap year 2024 is Feb 29");
    const pOrd365 = strptime("2026 365", { format: "%Y %j" });
    assertEqual(pOrd365?.toISOString(), "2026-12-31T00:00:00.000Z", "%j day 365 of 2026 is Dec 31");

    // 5. Milliseconds with %ms and %f
    const pMs = strptime("2026-05-20 10:00:00.5", { format: "%Y-%m-%d %H:%M:%S.%ms" });
    assertEqual(pMs?.getUTCMilliseconds(), 500, ".5 with %ms normalizes to 500ms");
    const pMicro = strptime("2026-05-20 10:00:00.123456", { format: "%Y-%m-%d %H:%M:%S.%f" });
    assertEqual(pMicro?.getUTCMilliseconds(), 123, "microsecond string with %f normalizes to 123ms");

    // 6. Timezone offset with colon vs without colon in %z
    const pZoneColon = strptime("2026-05-20 10:00:00 -04:00", { format: "%Y-%m-%d %H:%M:%S %z" });
    assertEqual(pZoneColon?.toISOString(), "2026-05-20T14:00:00.000Z", "-04:00 offset parsed accurately");
    const pZoneNoColon = strptime("2026-05-20 10:00:00 +0200", { format: "%Y-%m-%d %H:%M:%S %z" });
    assertEqual(pZoneNoColon?.toISOString(), "2026-05-20T08:00:00.000Z", "+0200 offset parsed accurately");

    // 7. Space-padded day (%e)
    const pSpaceDay = strptime("2026-05- 7", { format: "%Y-%m-%e" });
    assertEqual(pSpaceDay?.getUTCDate(), 7, "space padded %e parses single digit day");

    // 8. Literal percent sign %% in format
    const pPercent = strptime("2026%05%20", { format: "%Y%%%m%%%d" });
    assertEqual(pPercent?.toISOString(), "2026-05-20T00:00:00.000Z", "escaped %% matches literal %");

    // 9. Strict rejection on calendar overflow (leap day in non-leap year, month > 12, day > 31)
    assertEqual(strptime("2023-02-29", { format: "%Y-%m-%d", strict: true }), null, "strict rejects Feb 29 in non-leap year");
    assertEqual(strptime("2026-13-01", { format: "%Y-%m-%d", strict: true }), null, "strict rejects month 13");
    assertEqual(strptime("2026-04-31", { format: "%Y-%m-%d", strict: true }), null, "strict rejects April 31");

    // 11. Additional %z offset edge cases: short offsets (+05, -08), fractional offsets (+05:45, -03:30), zero offsets (+00:00, -0000)
    const pShortOffsetPlus = strptime("2026-05-20 12:00:00 +05", { format: "%Y-%m-%d %H:%M:%S %z" });
    assertEqual(pShortOffsetPlus?.toISOString(), "2026-05-20T07:00:00.000Z", "+05 short offset parses as 5 hours");

    const pShortOffsetMinus = strptime("2026-05-20 12:00:00 -08", { format: "%Y-%m-%d %H:%M:%S %z" });
    assertEqual(pShortOffsetMinus?.toISOString(), "2026-05-20T20:00:00.000Z", "-08 short offset parses as -8 hours");

    const pFractionalOffsetKathmandu = strptime("2026-05-20 12:00:00 +05:45", { format: "%Y-%m-%d %H:%M:%S %z" });
    assertEqual(pFractionalOffsetKathmandu?.toISOString(), "2026-05-20T06:15:00.000Z", "+05:45 Kathmandu fractional offset");

    const pFractionalOffsetNewfoundland = strptime("2026-05-20 12:00:00 -03:30", { format: "%Y-%m-%d %H:%M:%S %z" });
    assertEqual(pFractionalOffsetNewfoundland?.toISOString(), "2026-05-20T15:30:00.000Z", "-03:30 Newfoundland fractional offset");

    const pZeroOffsetIso = strptime("2026-05-20 12:00:00 +00:00", { format: "%Y-%m-%d %H:%M:%S %z" });
    assertEqual(pZeroOffsetIso?.toISOString(), "2026-05-20T12:00:00.000Z", "+00:00 zero offset");

    const pNegativeZeroOffset = strptime("2026-05-20 12:00:00 -0000", { format: "%Y-%m-%d %H:%M:%S %z" });
    assertEqual(pNegativeZeroOffset?.toISOString(), "2026-05-20T12:00:00.000Z", "-0000 zero offset");

    // 12. Combined full round-trip: %Y-%m-%dT%H:%M:%S.%ms%z
    const pFullIso = strptime("2026-12-31T23:59:59.999-0500", { format: "%Y-%m-%dT%H:%M:%S.%ms%z" });
    assertEqual(pFullIso?.toISOString(), "2027-01-01T04:59:59.999Z", "full ISO format with ms and offset");

    // 13. Combined shorthands: %F (equivalent to %Y-%m-%d) and %T (%H:%M:%S)
    const pShorthands = strptime("2026-05-20 15:30:45", { format: "%F %T" });
    assertEqual(pShorthands?.toISOString(), "2026-05-20T15:30:45.000Z", "%F %T shorthands parsing");

    const pShorthandR = strptime("2026-05-20 15:30", { format: "%F %R" });
    assertEqual(pShorthandR?.toISOString(), "2026-05-20T15:30:00.000Z", "%F %R shorthands parsing");

    const pShorthandD = strptime("05/20/26", { format: "%D" });
    assertEqual(pShorthandD?.toISOString(), "2026-05-20T00:00:00.000Z", "%D shorthand parsing");

    console.log(`SUCCESS: All strptime tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: strptime test failed!`, err);
    process.exit(1);
}
