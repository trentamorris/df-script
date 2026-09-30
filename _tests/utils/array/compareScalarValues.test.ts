declare const process: any;
import { compareScalarValues } from "../../../src/utils/array";

try {
    if (compareScalarValues(1, 2) >= 0) throw new Error("1 smaller than 2 failed");
    if (compareScalarValues(2, 1) <= 0) throw new Error("2 greater than 1 failed");
    if (compareScalarValues(5, 5) !== 0) throw new Error("5 === 5 failed");

    if (compareScalarValues("a", "b") >= 0) throw new Error("'a' smaller than 'b' failed");
    if (compareScalarValues("b", "a") <= 0) throw new Error("'b' greater than 'a' failed");

    // By default, nullsLast is true, so null is placed after non-null
    if (compareScalarValues(null, 1) <= 0) throw new Error("null should be greater than 1 with nullsLast: true");
    if (compareScalarValues(1, null) >= 0) throw new Error("1 should be less than null with nullsLast: true");
    if (compareScalarValues(null, null) !== 0) throw new Error("null === null failed");

    // With nullsLast: false
    if (compareScalarValues(null, 1, { nullsLast: false }) >= 0) throw new Error("null should be less than 1 with nullsLast: false");
    if (compareScalarValues(1, null, { nullsLast: false }) <= 0) throw new Error("1 should be greater than null with nullsLast: false");

    // Undefined handling (matches null behavior)
    if (compareScalarValues(undefined, 1) <= 0) throw new Error("undefined should be greater than 1 with nullsLast: true");
    if (compareScalarValues(undefined, undefined) !== 0) throw new Error("undefined === undefined failed");
    if (compareScalarValues(null, undefined) !== 0) throw new Error("null === undefined failed");

    // NaN handling
    if (compareScalarValues(NaN, NaN) !== 0) throw new Error("NaN === NaN should return 0");
    if (compareScalarValues(NaN, 10) <= 0) throw new Error("NaN should be placed last by default with nullsLast: true");
    if (compareScalarValues(10, NaN) >= 0) throw new Error("10 should precede NaN with nullsLast: true");
    if (compareScalarValues(NaN, 10, { nullsLast: false }) >= 0) throw new Error("NaN should precede 10 with nullsLast: false");

    // BigInt comparison
    if (compareScalarValues(10n, 20n) >= 0) throw new Error("10n < 20n failed");
    if (compareScalarValues(20n, 10n) <= 0) throw new Error("20n > 10n failed");
    if (compareScalarValues(15n, 15n) !== 0) throw new Error("15n === 15n failed");

    // Date comparison
    const d1 = new Date("2024-01-01T00:00:00Z");
    const d2 = new Date("2024-01-02T00:00:00Z");
    const d3 = new Date("2024-01-01T00:00:00Z");
    if (compareScalarValues(d1, d2) >= 0) throw new Error("d1 < d2 failed");
    if (compareScalarValues(d2, d1) <= 0) throw new Error("d2 > d1 failed");
    if (compareScalarValues(d1, d3) !== 0) throw new Error("d1 === d3 failed");

    // Descending flag check
    if (compareScalarValues(1, 2, { descending: true }) <= 0) throw new Error("1 should be greater than 2 when descending");
    if (compareScalarValues("a", "b", { descending: true }) <= 0) throw new Error("'a' should be greater than 'b' when descending");
    if (compareScalarValues(d1, d2, { descending: true }) <= 0) throw new Error("d1 should be greater than d2 when descending");

    // Custom comparator
    const customComp = (a: any, b: any) => a.length - b.length;
    if (compareScalarValues("apple", "banana", { customComp }) >= 0) throw new Error("apple should be smaller than banana by length");
    if (compareScalarValues("apple", "banana", { customComp, descending: true }) <= 0) throw new Error("descending custom comparator failed");

    // Mixed types (lexicographic type order)
    if (compareScalarValues(10, "10") >= 0) throw new Error("number should sort before string in mixed type comparison");

    console.log("✓ compareScalarValues tests passed!");
} catch (err: any) {
    console.error(`❌ compareScalarValues test failed: ${err.message}`);
    process.exit(1);
}
