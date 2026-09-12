declare const process: any;
import { strftime } from "../../../src/utils/date";
import { ComputeError } from "../../../src/exceptions";

console.log("=========================================");
console.log("STARTING STRFTIME TESTS...");
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
    // Inline time formatting & basic replacement
    const dStrftime = new Date("2026-05-25T10:37:16.123Z");
    assertEqual(strftime(dStrftime, { format: "%Y-%m-%d %H:%M:%S.%ms %Z %z" }), "2026-05-25 10:37:16.123 UTC +0000", "strftime format correctness");

    // Year 0-99
    const dYear50 = new Date(0);
    dYear50.setUTCFullYear(50, 4, 25);
    dYear50.setUTCHours(10, 37, 16, 123);
    assertEqual(strftime(dYear50, { format: "%Y-%m-%d %H:%M:%S.%ms" }), "0050-05-25 10:37:16.123", "strftime year 50");

    // Invalid timezone fallback
    assertEqual(strftime(dStrftime, { format: "%Y-%m-%d %H:%M:%S.%ms %Z %z", timeZone: "Invalid/TimeZone_Name" }), "2026-05-25 10:37:16.123 UTC +0000", "fallback to UTC");

    // All directives
    const refDate = new Date("2026-05-20T15:07:09.045Z");
    const allDirectivesFormatted = strftime(refDate, {
        format: "%Y|%y|%m|%d|%e|%H|%I|%p|%M|%S|%ms|%f|%u|%w|%V|%G|%j|%%"
    });
    assertEqual(allDirectivesFormatted, "2026|26|05|20|20|15|03|PM|07|09|045|045000|3|3|21|2026|140|%", "all directives");

    // Shorthands
    assertEqual(strftime(refDate, { format: "%F %T %R %D" }), "2026-05-20 15:07:09 15:07 05/20/26", "shorthands");

    // ISO week & year edge cases
    const dDec30 = new Date("2024-12-30T00:00:00.000Z");
    assertEqual(strftime(dDec30, { format: "%G-W%V" }), "2025-W01", "2024-12-30 ISO week 1 of 2025");
    const dJan1 = new Date("2027-01-01T00:00:00.000Z");
    assertEqual(strftime(dJan1, { format: "%G-W%V" }), "2026-W53", "2027-01-01 ISO week 53 of 2026");

    // Timezone specific formatting
    const nyFormatted = strftime(refDate, { format: "%Y-%m-%d %H:%M:%S %Z %z", timeZone: "America/New_York" });
    assertEqual(nyFormatted, "2026-05-20 11:07:09 EDT -0400", "NY timezone format");

    // 10/10 EDGE CASE TESTS FOR STRFTIME
    // 1. Invalid date object returns ""
    assertEqual(strftime(new Date(NaN), { format: "%Y-%m-%d" }), "", "invalid date returns empty string");
    assertEqual(strftime("2026-01-01" as any, { format: "%Y-%m-%d" }), "", "non-date input returns empty string");

    // 2. Non-string format returns ""
    assertEqual(strftime(refDate, { format: null as any }), "", "null format returns empty string");
    assertEqual(strftime(refDate, { format: undefined as any }), "", "undefined format returns empty string");

    // 3. Empty format string
    assertEqual(strftime(refDate, { format: "" }), "", "empty format string returns empty string");

    // 4. Format with escaped percent signs only
    assertEqual(strftime(refDate, { format: "%%%%" }), "%%", "multiple escaped percent signs");

    // 5. Literal text without directives
    assertEqual(strftime(refDate, { format: "Hello World!" }), "Hello World!", "literal string without directives");

    // 6. Directive 'e' (space-padded day) single digit vs double digit
    const singleDigitDay = new Date("2026-05-07T09:04:05.000Z");
    assertEqual(strftime(singleDigitDay, { format: "%e" }), " 7", "single digit day with %e has leading space");
    assertEqual(strftime(refDate, { format: "%e" }), "20", "double digit day with %e has no leading space");

    // 7. Directive 'I' (12-hour format) edge cases: midnight (00 -> 12), noon (12 -> 12)
    const midnightDate = new Date("2026-05-20T00:00:00.000Z");
    const noonDate = new Date("2026-05-20T12:00:00.000Z");
    assertEqual(strftime(midnightDate, { format: "%I %p" }), "12 AM", "midnight is 12 AM in 12-hour format");
    assertEqual(strftime(noonDate, { format: "%I %p" }), "12 PM", "noon is 12 PM in 12-hour format");

    // 8. Directive 'u' (1-7, Mon=1, Sun=7) vs 'w' (0-6, Sun=0)
    const sundayDate = new Date("2026-05-24T12:00:00.000Z"); // Sunday
    assertEqual(strftime(sundayDate, { format: "%u|%w" }), "7|0", "Sunday: %u=7, %w=0");
    const mondayDate = new Date("2026-05-18T12:00:00.000Z"); // Monday
    assertEqual(strftime(mondayDate, { format: "%u|%w" }), "1|1", "Monday: %u=1, %w=1");

    // 9. Negative year formatting (BCE)
    const bceDate = new Date(0);
    bceDate.setUTCFullYear(-45, 2, 15);
    assertEqual(strftime(bceDate, { format: "%Y" }), "-0045", "negative year format");

    // 10. Locale-specific month and weekday names
    assertEqual(strftime(refDate, { format: "%B", locale: "fr-FR" }).toLowerCase().startsWith("mai"), true, "French month name for May");
    // 11. Timezone offset formatting across positive, negative, and fractional offsets (%z)
    const dTokyo = strftime(refDate, { format: "%z", timeZone: "Asia/Tokyo" });
    assertEqual(dTokyo, "+0900", "Tokyo %z format is +0900");

    const dKolkata = strftime(refDate, { format: "%z", timeZone: "Asia/Kolkata" });
    assertEqual(dKolkata, "+0530", "Kolkata %z format is +0530");

    const dKathmandu = strftime(refDate, { format: "%z", timeZone: "Asia/Kathmandu" });
    assertEqual(dKathmandu, "+0545", "Kathmandu %z format is +0545");

    const dUTC = strftime(refDate, { format: "%z", timeZone: "UTC" });
    assertEqual(dUTC, "+0000", "UTC %z format is +0000");

    // 12. Combined full ISO with fractional second (%f) and offset (%z)
    const fullIsoStr = strftime(refDate, { format: "%Y-%m-%dT%H:%M:%S.%f%z" });
    assertEqual(fullIsoStr, "2026-05-20T15:07:09.045000+0000", "full ISO format with 6-digit microsecond and basic offset");

    console.log(`SUCCESS: All strftime tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: strftime test failed!`, err);
    process.exit(1);
}
