declare const process: any;
import { strftime, strptime, toValidDate, dateDiff, getMonthOffset } from "../../src/utils/date";

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
    const formatted = strftime(dStrftime, { format: "%Y-%m-%d %H:%M:%S.%ms %Z %z" });
    if (formatted !== "2026-05-25 10:37:16.123 UTC +0000") {
        throw new Error(`Expected "2026-05-25 10:37:16.123 UTC +0000", got "${formatted}"`);
    }
    console.log("✓ strftime format correctness passed");

    // 5. Verify strftime lazy evaluation:
    // A format string without locale directives (like "%Y-%m-%d") should be orders of magnitude faster
    // than one with locale directives (like "%A %B") because toLocaleDateString is extremely slow.
    const startSimple = performance.now();
    for (let i = 0; i < 1000; i++) {
        strftime(dStrftime, { format: "%Y-%m-%d" });
    }
    const durationSimple = performance.now() - startSimple;

    const startLocale = performance.now();
    for (let i = 0; i < 1000; i++) {
        strftime(dStrftime, { format: "%A %B" });
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

    const formattedYear50 = strftime(dYear50, { format: "%Y-%m-%d %H:%M:%S.%ms" });
    if (formattedYear50 !== "0050-05-25 10:37:16.123") {
        throw new Error(`Expected "0050-05-25 10:37:16.123" for year 50, got "${formattedYear50}"`);
    }

    const parsedYear50 = strptime("0050-05-25 10:37:16.123", { format: "%Y-%m-%d %H:%M:%S.%ms" });
    if (!parsedYear50 || parsedYear50.getUTCFullYear() !== 50 || parsedYear50.getUTCMonth() !== 4 || parsedYear50.getUTCDate() !== 25) {
        throw new Error(`Expected parsed year 50, month 4, date 25, got "${parsedYear50 ? parsedYear50.toISOString() : "null"}"`);
    }
    console.log("✓ Parsing/formatting for years 0-99 (setUTCFullYear workaround) passed");

    // 7. Test invalid timezone gracefully falling back to UTC instead of throwing
    const dInvalidTz = new Date("2026-05-25T10:37:16.123Z");
    const formattedInvalidTz = strftime(dInvalidTz, { format: "%Y-%m-%d %H:%M:%S.%ms %Z %z", timeZone: "Invalid/TimeZone_Name" });
    if (formattedInvalidTz !== "2026-05-25 10:37:16.123 UTC +0000") {
        throw new Error(`Expected fallback to UTC offset (+0000) for invalid timezone, got "${formattedInvalidTz}"`);
    }

    const parsedInvalidTz = strptime("2026-05-25 10:37:16.123", { format: "%Y-%m-%d %H:%M:%S.%ms", strict: true, defaultTimeZone: "Invalid/TimeZone_Name" });
    if (!parsedInvalidTz || parsedInvalidTz.getTime() !== dInvalidTz.getTime()) {
        throw new Error(`Expected parsed date to match UTC input when default timezone is invalid, got "${parsedInvalidTz ? parsedInvalidTz.toISOString() : "null"}"`);
    }
    console.log("✓ Invalid timezone fallback to UTC passed");

    // 8. Test dateDiff utility
    const d1 = new Date("2026-05-15T12:00:00Z");
    const d2 = new Date("2026-06-17T18:00:00Z"); // 1 month, 2.25 days later

    // milliseconds
    const offsetMs = dateDiff(d1, d2, "ms");
    if (offsetMs !== d2.getTime() - d1.getTime()) {
        throw new Error(`Expected correct ms offset, got ${offsetMs}`);
    }

    // seconds
    const offsetS = dateDiff(d1, d2, "seconds");
    if (offsetS !== (d2.getTime() - d1.getTime()) / 1000) {
        throw new Error(`Expected correct seconds offset, got ${offsetS}`);
    }

    // days
    const offsetD = dateDiff(d1, d2, "d");
    if (offsetD !== (d2.getTime() - d1.getTime()) / 86400000) {
        throw new Error(`Expected correct days offset, got ${offsetD}`);
    }

    // weeks
    const offsetW = dateDiff(d1, d2, "weeks");
    if (offsetW !== (d2.getTime() - d1.getTime()) / 604800000) {
        throw new Error(`Expected correct weeks offset, got ${offsetW}`);
    }

    // months (May has 31 days. Day diff = (17 - 15) + (18 - 12)/24 = 2.25. 2.25 / 31 = 0.07258064516129032)
    const offsetMo = dateDiff(d1, d2, "months");
    const expectedMo = 1 + 2.25 / 31;
    if (Math.abs((offsetMo ?? 0) - expectedMo) > 1e-9) {
        throw new Error(`Expected correct months offset around ${expectedMo}, got ${offsetMo}`);
    }

    // quarters
    const offsetQ = dateDiff(d1, d2, "q");
    if (Math.abs((offsetQ ?? 0) - expectedMo / 3) > 1e-9) {
        throw new Error(`Expected correct quarters offset, got ${offsetQ}`);
    }

    // years
    const offsetY = dateDiff(d1, d2, "y");
    if (Math.abs((offsetY ?? 0) - expectedMo / 12) > 1e-9) {
        throw new Error(`Expected correct years offset, got ${offsetY}`);
    }

    // Negative difference
    const offsetNegMo = dateDiff(d2, d1, "months");
    // Going backward: April has 30 days. Day diff = (15 - 17) + (12 - 18)/24 = -2.25. -2.25 / 31 (previous month of June 17 is May, which has 31 days? Wait, target is d1 which is May 15. The previous month of May 15 is April which has 30 days)
    // Wait, let's verify what previous month dateDiff uses when going backward (dayDiff < 0):
    // d1 = June 17 (y2=2026, m2=5), d2 = May 15 (y1=2026, m1=4)
    // baseMonths = (2026 - 2026)*12 + (4 - 5) = -1
    // dayDiff = (15 - 17) + (12 - 18)/24 = -2.25
    // Since dayDiff < 0, we use new Date(Date.UTC(y2, m2, 0)).getUTCDate() where y2=2026, m2=4 (May).
    // Date.UTC(2026, 4, 0) is the last day of April (30 days). So daysInMonth = 30.
    // expectedNegMo = -1 + (-2.25) / 30 = -1.075
    const expectedNegMo = -1 - 2.25 / 30;
    if (Math.abs((offsetNegMo ?? 0) - expectedNegMo) > 1e-9) {
        throw new Error(`Expected correct negative months offset, got ${offsetNegMo}`);
    }

    // Invalid dates
    if (dateDiff(new Date("invalid"), d2, "ms") !== null) {
        throw new Error("Expected null offset for invalid date");
    }

    // Test rounding modes
    // Positive offsetMo = 1.07258...
    if (dateDiff(d1, d2, "months", { roundMode: "floor" }) !== 1) {
        throw new Error("Expected floor mode to return 1");
    }
    if (dateDiff(d1, d2, "months", { roundMode: "ceil" }) !== 2) {
        throw new Error("Expected ceil mode to return 2");
    }
    if (dateDiff(d1, d2, "months", { roundMode: "round" }) !== 1) {
        throw new Error("Expected round mode to return 1");
    }
    if (dateDiff(d1, d2, "months", { roundMode: "trunc" }) !== 1) {
        throw new Error("Expected trunc mode to return 1");
    }
    if (dateDiff(d1, d2, "months", { roundMode: "exact" }) !== offsetMo) {
        throw new Error("Expected exact mode to return offsetMo");
    }

    // Negative offsetNegMo = -1.075
    if (dateDiff(d2, d1, "months", { roundMode: "floor" }) !== -2) {
        throw new Error("Expected floor mode for negative offset to return -2");
    }
    if (dateDiff(d2, d1, "months", { roundMode: "ceil" }) !== -1) {
        throw new Error("Expected ceil mode for negative offset to return -1");
    }
    if (dateDiff(d2, d1, "months", { roundMode: "round" }) !== -1) {
        throw new Error("Expected round mode for negative offset to return -1");
    }
    if (dateDiff(d2, d1, "months", { roundMode: "trunc" }) !== -1) {
        throw new Error("Expected trunc mode for negative offset to return -1");
    }
    if (dateDiff(d2, d1, "months", { roundMode: "exact" }) !== offsetNegMo) {
        throw new Error("Expected exact mode for negative offset to return offsetNegMo");
    }

    console.log("✓ dateDiff utility correctness passed");

    // 9. Visualize and test getMonthOffset(d, 1, 0) for days_in_month
    console.log("\n--- VISUALIZING DAYS IN MONTH CALCULATION ---");
    const testDates = [
        new Date("2024-02-15T00:00:00Z"), // Leap year February
        new Date("2023-02-15T00:00:00Z"), // Non-leap year February
        new Date("2026-12-15T00:00:00Z"), // December (year boundary check)
        toValidDate("0050-02-15T00:00:00Z")!, // Historical year 50
    ];

    for (const d of testDates) {
        const nextMonthZeroIndexed = d.getUTCMonth() + 1;
        const endOfMonthDate = getMonthOffset(d, 1, 0);
        const days = endOfMonthDate ? endOfMonthDate.getUTCDate() : null;

        console.log(`Input Date: ${d.toISOString().substring(0, 10)}`);
        console.log(`  -> Next Month Index: ${nextMonthZeroIndexed} (base 0)`);
        console.log(`  -> Intermediate Rolled-back Date: ${endOfMonthDate ? endOfMonthDate.toISOString().substring(0, 10) : "null"}`);
        console.log(`  -> getUTCDate() / Days in Month: ${days}`);
        console.log("---------------------------------------------");

        // Assert correctness
        const expectedDays = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
        if (days !== expectedDays) {
            throw new Error(`Assertion failed for ${d.toISOString()}: expected ${expectedDays}, got ${days}`);
        }
    }
    console.log("✓ days_in_month visualization tests passed");

    console.log("\n🎉 ALL DATE UTILS ROBUSTNESS TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ DATE UTILS ROBUSTNESS TESTS FAILED:", err);
    process.exit(1);
}
