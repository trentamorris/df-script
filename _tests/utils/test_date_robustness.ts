declare const process: any;
import { strftime } from "../../utils/date";

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

    console.log("\n🎉 ALL DATE UTILS ROBUSTNESS TESTS PASSED SUCCESSFULLY!");
} catch (err) {
    console.error("\n❌ DATE UTILS ROBUSTNESS TESTS FAILED:", err);
    process.exit(1);
}
