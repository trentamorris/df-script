declare const process: any;
import { toEpoch } from "../../../src/utils/date";
import { ComputeError } from "../../../src/exceptions";

console.log("=========================================");
console.log("STARTING TOEPOCH TESTS...");
console.log("=========================================");

let testsPassed = 0;

function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(`Assertion failed: ${msg}`);
    testsPassed++;
}

function assertEqual(actual: any, expected: any, msg: string) {
    if (actual !== expected) {
        throw new Error(`Assertion failed: ${msg}\n  Expected: ${expected}\n  Actual:   ${actual}`);
    }
    testsPassed++;
}

try {
    const epochDate = new Date("1970-01-01T00:00:01.500Z");
    assertEqual(toEpoch(epochDate, "s"), 1, "toEpoch s failed");
    assertEqual(toEpoch(epochDate, "ms"), 1500, "toEpoch ms failed");
    assertEqual(toEpoch(epochDate, "us"), 1500000n, "toEpoch us failed");
    assertEqual(toEpoch(epochDate, "ns"), 1500000000n, "toEpoch ns failed");

    // 10/10 EDGE CASE TESTS FOR TOEPOCH
    // 1. Epoch zero (1970-01-01T00:00:00.000Z)
    const zeroDate = new Date(0);
    assertEqual(toEpoch(zeroDate, "s"), 0, "epoch 0 seconds");
    assertEqual(toEpoch(zeroDate, "ms"), 0, "epoch 0 ms");
    assertEqual(toEpoch(zeroDate, "us"), 0n, "epoch 0 us");
    assertEqual(toEpoch(zeroDate, "ns"), 0n, "epoch 0 ns");

    // 2. Default unit parameter (defaults to "ms")
    assertEqual(toEpoch(epochDate), 1500, "toEpoch default unit is ms");

    // 3. Pre-1970 negative epoch dates
    const pre1970 = new Date("1969-12-31T23:59:59.500Z"); // -500 ms
    assertEqual(toEpoch(pre1970, "ms"), -500, "pre-1970 ms");
    assertEqual(toEpoch(pre1970, "s"), -1, "pre-1970 s Math.floor(-500 / 1000) === -1");
    assertEqual(toEpoch(pre1970, "us"), -500000n, "pre-1970 us");
    assertEqual(toEpoch(pre1970, "ns"), -500000000n, "pre-1970 ns");

    // 4. Exact 1 second before epoch (-1000 ms)
    const exactSecPre = new Date(-1000);
    assertEqual(toEpoch(exactSecPre, "s"), -1, "-1000ms s");
    assertEqual(toEpoch(exactSecPre, "ms"), -1000, "-1000ms ms");
    assertEqual(toEpoch(exactSecPre, "us"), -1000000n, "-1000ms us");
    assertEqual(toEpoch(exactSecPre, "ns"), -1000000000n, "-1000ms ns");

    // 5. Milliseconds rounding / truncation in "s" unit
    const fractionalSec = new Date(999);
    assertEqual(toEpoch(fractionalSec, "s"), 0, "999ms floors to 0s");
    const fractionalSecNeg = new Date(-1);
    assertEqual(toEpoch(fractionalSecNeg, "s"), -1, "-1ms floors to -1s");

    // 6. Far future date (e.g., Year 3000)
    const year3000 = new Date("3000-01-01T00:00:00.000Z");
    const ms3000 = year3000.getTime();
    assertEqual(toEpoch(year3000, "ms"), ms3000, "year 3000 ms");
    assertEqual(toEpoch(year3000, "us"), BigInt(ms3000) * 1000n, "year 3000 us");
    assertEqual(toEpoch(year3000, "ns"), BigInt(ms3000) * 1000000n, "year 3000 ns");

    // 7. Far past historical date (e.g., Year 1000)
    const year1000 = new Date(0);
    year1000.setUTCFullYear(1000, 0, 1);
    const ms1000 = year1000.getTime();
    assertEqual(toEpoch(year1000, "ms"), ms1000, "year 1000 ms");
    assertEqual(toEpoch(year1000, "us"), BigInt(ms1000) * 1000n, "year 1000 us");

    // 8. Leap seconds or 59.999s second boundary
    const boundaryDate = new Date("2026-12-31T23:59:59.999Z");
    assertEqual(toEpoch(boundaryDate, "s"), Math.floor(boundaryDate.getTime() / 1000), "boundary s");

    // 9. Return types: numbers for s/ms, bigints for us/ns
    assert(typeof toEpoch(epochDate, "s") === "number", "s returns number");
    assert(typeof toEpoch(epochDate, "ms") === "number", "ms returns number");
    assert(typeof toEpoch(epochDate, "us") === "bigint", "us returns bigint");
    assert(typeof toEpoch(epochDate, "ns") === "bigint", "ns returns bigint");

    // 10. Precision preservation between us and ns
    const dateSample = new Date("2026-05-20T12:00:00.123Z");
    const usVal = toEpoch(dateSample, "us") as bigint;
    const nsVal = toEpoch(dateSample, "ns") as bigint;
    assertEqual(usVal * 1000n, nsVal, "ns is exactly 1000 * us");

    console.log(`SUCCESS: All toEpoch tests passed! (${testsPassed} assertions)`);
} catch (err) {
    console.error(`FAILURE: toEpoch test failed!`, err);
    process.exit(1);
}
