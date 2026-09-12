declare const process: any;
import { getTimeZoneOffset } from "../../../src/utils/date";
import { ComputeError } from "../../../src/exceptions";

console.log("=========================================");
console.log("STARTING GETTIMEZONEOFFSET TESTS...");
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
    const janDate = new Date("2026-01-15T12:00:00.000Z");
    const julDate = new Date("2026-07-15T12:00:00.000Z");

    // Total offset for New York: -300 min (EST) / -240 min (EDT)
    assertEqual(getTimeZoneOffset(janDate, "America/New_York", { format: "minutes" }), -300, "Jan NY total minutes");
    assertEqual(getTimeZoneOffset(julDate, "America/New_York", { format: "minutes" }), -240, "Jul NY total minutes");

    // DST offset: 0 in winter, 60 in summer
    assertEqual(getTimeZoneOffset(janDate, "America/New_York", { type: "daylightSavingTime", format: "minutes" }), 0, "Jan NY DST");
    assertEqual(getTimeZoneOffset(julDate, "America/New_York", { type: "daylightSavingTime", format: "minutes" }), 60, "Jul NY DST");

    // Base (standard) offset: -300 for both
    assertEqual(getTimeZoneOffset(janDate, "America/New_York", { type: "base", format: "minutes" }), -300, "Jan NY base");
    assertEqual(getTimeZoneOffset(julDate, "America/New_York", { type: "base", format: "minutes" }), -300, "Jul NY base");

    // UTC should always be 0
    assertEqual(getTimeZoneOffset(janDate, "UTC", { format: "minutes" }), 0, "UTC should be 0");

    // ISO format output
    assertEqual(getTimeZoneOffset(janDate, "America/New_York", { format: "iso" }), "-05:00", "iso format");

    // Basic format output
    assertEqual(getTimeZoneOffset(janDate, "America/New_York", { format: "basic" }), "-0500", "basic format");

    // 10/10 EDGE CASE TESTS FOR GETTIMEZONEOFFSET
    // 1. Invalid timeZone fallback to UTC
    assertEqual(getTimeZoneOffset(janDate, "Invalid_Timezone/Bad_Name", { format: "minutes" }), 0, "invalid timezone fallback to UTC");
    assertEqual(getTimeZoneOffset(janDate, "Invalid_Timezone/Bad_Name", { format: "iso" }), "+00:00", "invalid timezone iso format");

    // 2. format: "hours"
    assertEqual(getTimeZoneOffset(janDate, "America/New_York", { format: "hours" }), -5, "Jan NY format: 'hours'");
    assertEqual(getTimeZoneOffset(julDate, "America/New_York", { format: "hours" }), -4, "Jul NY format: 'hours'");

    // 3. format: "milliseconds" (default format)
    assertEqual(getTimeZoneOffset(janDate, "America/New_York"), -300 * 60 * 1000, "default format is milliseconds");
    assertEqual(getTimeZoneOffset(janDate, "America/New_York", { format: "milliseconds" }), -300 * 60 * 1000, "explicit milliseconds format");

    // 4. Positive offset timezone: Tokyo (+09:00, no DST)
    assertEqual(getTimeZoneOffset(janDate, "Asia/Tokyo", { format: "minutes" }), 540, "Tokyo total minutes");
    assertEqual(getTimeZoneOffset(janDate, "Asia/Tokyo", { format: "iso" }), "+09:00", "Tokyo iso format");
    assertEqual(getTimeZoneOffset(janDate, "Asia/Tokyo", { format: "basic" }), "+0900", "Tokyo basic format");
    assertEqual(getTimeZoneOffset(janDate, "Asia/Tokyo", { type: "daylightSavingTime", format: "minutes" }), 0, "Tokyo DST is 0");

    // 5. Half-hour offset timezone: Kolkata (+05:30)
    assertEqual(getTimeZoneOffset(janDate, "Asia/Kolkata", { format: "minutes" }), 330, "Kolkata total minutes");
    assertEqual(getTimeZoneOffset(janDate, "Asia/Kolkata", { format: "iso" }), "+05:30", "Kolkata iso format");
    assertEqual(getTimeZoneOffset(janDate, "Asia/Kolkata", { format: "basic" }), "+0530", "Kolkata basic format");

    // 6. 45-minute offset timezone: Kathmandu (+05:45)
    assertEqual(getTimeZoneOffset(janDate, "Asia/Kathmandu", { format: "minutes" }), 345, "Kathmandu total minutes");
    assertEqual(getTimeZoneOffset(janDate, "Asia/Kathmandu", { format: "iso" }), "+05:45", "Kathmandu iso format");

    // 7. Southern hemisphere DST (Sydney: +11:00 in Jan DST, +10:00 in Jul base)
    assertEqual(getTimeZoneOffset(janDate, "Australia/Sydney", { format: "minutes" }), 660, "Sydney Jan total minutes (DST)");
    assertEqual(getTimeZoneOffset(julDate, "Australia/Sydney", { format: "minutes" }), 600, "Sydney Jul total minutes (Standard)");
    assertEqual(getTimeZoneOffset(janDate, "Australia/Sydney", { type: "daylightSavingTime", format: "minutes" }), 60, "Sydney Jan DST minutes");
    assertEqual(getTimeZoneOffset(julDate, "Australia/Sydney", { type: "daylightSavingTime", format: "minutes" }), 0, "Sydney Jul DST minutes");

    // 8. UTC with empty or undefined options
    assertEqual(getTimeZoneOffset(janDate, "UTC"), 0, "UTC default format returns 0");
    assertEqual(getTimeZoneOffset(janDate, "UTC", { format: "iso" }), "+00:00", "UTC iso format");
    assertEqual(getTimeZoneOffset(janDate, "UTC", { format: "basic" }), "+0000", "UTC basic format");

    // 9. 'local' timezone keyword resolves to system timezone
    const localResult = getTimeZoneOffset(janDate, "local", { format: "minutes" });
    assert(typeof localResult === "number", "'local' resolves to numeric offset");

    // 10. Negative zero / boundary signs in iso format
    const utcIso = getTimeZoneOffset(janDate, "UTC", { format: "iso" }) as string;
    assertEqual(utcIso.startsWith("+"), true, "UTC iso prefix is '+' not '-'");

    console.log(`SUCCESS: All getTimeZoneOffset tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: getTimeZoneOffset test failed!`, err);
    process.exit(1);
}
