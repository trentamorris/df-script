declare const process: any;
import { strftime, strptime, toValidDate } from "../../src/utils/date";

console.log("=========================================");
console.log("STARTING DATE UTILS ROBUSTNESS TESTS...");
console.log("=========================================");

try {
    // 1. Test inline time formatting (split/slice) with standard UTC date
    const dUTC = new Date("2026-05-25T10:37:16.123Z");
    const tUTC = dUTC.toISOString().split("T")[1].slice(0, 12);
    if (tUTC !== "10:37:16.123") {
        throw new Error(`Expected "10:37:16.123", got "${tUTC}"`);
    }
    console.log("✓ Inline time formatting standard date passed");

    // 2. Test inline time formatting with extended year (5 digits positive)
    const dExtPos = new Date();
    dExtPos.setUTCFullYear(12026);
    dExtPos.setUTCMonth(4); // May
    dExtPos.setUTCDate(25);
    dExtPos.setUTCHours(10, 37, 16, 123);
    const tExtPos = dExtPos.toISOString().split("T")[1].slice(0, 12);
    if (tExtPos !== "10:37:16.123") {
        throw new Error(`Expected "10:37:16.123" for extended year, got "${tExtPos}"`);
    }
    console.log("✓ Inline time formatting positive extended year passed");

    // 3. Test inline time formatting with negative extended year (BC/negative year representation)
    const dExtNeg = new Date();
    dExtNeg.setUTCFullYear(-100);
    dExtNeg.setUTCMonth(4);
    dExtNeg.setUTCDate(25);
    dExtNeg.setUTCHours(10, 37, 16, 123);
    const tExtNeg = dExtNeg.toISOString().split("T")[1].slice(0, 12);
    if (tExtNeg !== "10:37:16.123") {
        throw new Error(`Expected "10:37:16.123" for negative year, got "${tExtNeg}"`);
    }
    console.log("✓ Inline time formatting negative extended year passed");

    // 4. Verify strftime handles basic replacement correctly
    const dStrftime = new Date("2026-05-25T10:37:16.123Z");
    const formatted = strftime(dStrftime, "%Y-%m-%d %H:%M:%S.%ms %Z %z");
    if (formatted !== "2026-05-25 10:37:16.123 UTC +0000") {
        throw new Error(`Expected "2026-05-25 10:37:16.123 UTC +0000", got "${formatted}"`);
    }
    console.log("✓ strftime format correctness passed");

    // 5. Verify strftime lazy evaluation:
    // A format string without locale directives (like "%Y-%m-%d") should be orders of magnitude faster
    // than one with locale directives (like "%A %B") because toLocaleDateString is extremely slow.
    const startSimple = performance.now();
    for (let i = 0; i < 1000; i++) {
        strftime(dStrftime, "%Y-%m-%d");
    }
    const durationSimple = performance.now() - startSimple;

    const startLocale = performance.now();
    for (let i = 0; i < 1000; i++) {
        strftime(dStrftime, "%A %B");
    }
    const durationLocale = performance.now() - startLocale;

    console.log(`Simple format duration: ${durationSimple.toFixed(2)}ms`);
    console.log(`Locale format duration: ${durationLocale.toFixed(2)}ms`);
    if (durationLocale < durationSimple * 1.5) {
        console.warn("Warning: Simple and locale formats took similar time. Check if lazy evaluation is active.");
    } else {
        console.log("✓ strftime lazy evaluation performance gain confirmed!");
    }

    // 6. Test parsing and formatting of year 0-99 (handling JavaScript Date.UTC 0-99 gotcha)
    const dYear50 = new Date(0);
    dYear50.setUTCFullYear(50, 4, 25); // 0050-05-25
    dYear50.setUTCHours(10, 37, 16, 123);

    const formattedYear50 = strftime(dYear50, "%Y-%m-%d %H:%M:%S.%ms");
    if (formattedYear50 !== "0050-05-25 10:37:16.123") {
        throw new Error(`Expected "0050-05-25 10:37:16.123" for year 50, got "${formattedYear50}"`);
    }

    const parsedYear50 = strptime("0050-05-25 10:37:16.123", "%Y-%m-%d %H:%M:%S.%ms");
    if (!parsedYear50 || parsedYear50.getUTCFullYear() !== 50 || parsedYear50.getUTCMonth() !== 4 || parsedYear50.getUTCDate() !== 25) {
        throw new Error(`Expected parsed year 50, month 4, date 25, got "${parsedYear50 ? parsedYear50.toISOString() : "null"}"`);
    }
    console.log("✓ Parsing/formatting for years 0-99 (setUTCFullYear workaround) passed");

    // 7. Test invalid timezone gracefully falling back to UTC instead of throwing
    const dInvalidTz = new Date("2026-05-25T10:37:16.123Z");
    const formattedInvalidTz = strftime(dInvalidTz, "%Y-%m-%d %H:%M:%S.%ms %Z %z", undefined, "Invalid/TimeZone_Name");
    if (formattedInvalidTz !== "2026-05-25 10:37:16.123 UTC +0000") {
        throw new Error(`Expected fallback to UTC offset (+0000) for invalid timezone, got "${formattedInvalidTz}"`);
    }

    const parsedInvalidTz = strptime("2026-05-25 10:37:16.123", "%Y-%m-%d %H:%M:%S.%ms", true, "Invalid/TimeZone_Name");
    if (!parsedInvalidTz || parsedInvalidTz.getTime() !== dInvalidTz.getTime()) {
        throw new Error(`Expected parsed date to match UTC input when default timezone is invalid, got "${parsedInvalidTz ? parsedInvalidTz.toISOString() : "null"}"`);
    }
    console.log("✓ Invalid timezone fallback to UTC passed");

    console.log("\n🎉 ALL DATE UTILS ROBUSTNESS TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ DATE UTILS ROBUSTNESS TESTS FAILED:", err);
    process.exit(1);
}
