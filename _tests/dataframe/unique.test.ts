import { DataFrame } from "df-script";

console.log("Running unique tests...");

const df = new DataFrame([
    { a: 1, b: 2, c: 3 },
    { a: 1, b: 2, c: 4 }, // duplicated on (a, b) but not full row
    { a: 2, b: 3, c: 5 },
    { a: 1, b: 2, c: 3 }  // exact duplicate of first row
]);

// 1. Unique by full row
const dfUniqueAll = df.unique();
if (dfUniqueAll.height !== 3) {
    throw new Error(`Expected height 3, got ${dfUniqueAll.height}`);
}
const colAll = dfUniqueAll.toDicts();
// The last row should be omitted
if (colAll.filter(r => r.a === 1 && r.b === 2 && r.c === 3).length !== 1) {
    throw new Error("Full row duplicate not removed or too many removed");
}

// 2. Unique by specific column(s)
const dfUniqueAB = df.unique(["a", "b"]);
if (dfUniqueAB.height !== 2) {
    throw new Error(`Expected height 2, got ${dfUniqueAB.height}`);
}
const colAB = dfUniqueAB.toDicts();
// There should only be one row with a=1, b=2, and one with a=2, b=3
// 3. Edge Case: Empty DataFrame unique
const dfEmpty = new DataFrame([]);
const uniqueEmpty = dfEmpty.unique();
if (uniqueEmpty.height !== 0) throw new Error("Expected empty unique df height to be 0");

// 4. Edge Case: Non-existent column assertion
let threwMissing = false;
try {
    df.unique(["non_existent_col" as any]);
} catch (e: any) {
    threwMissing = e.message.includes('column key "non_existent_col" does not exist') || e.message.includes('does not exist');
}
if (!threwMissing) throw new Error("Expected unique() on missing column to throw");

// 5. Edge Case: Null and undefined values handling in uniqueness
const dfNulls = new DataFrame([
    { a: null, b: 1 },
    { a: null, b: 1 },
    { a: undefined, b: 1 },
    { a: 2, b: null }
]);
const uniqueNulls = dfNulls.unique();
if (uniqueNulls.height !== 2) {
    throw new Error(`Expected uniqueNulls height 2, got ${uniqueNulls.height}`);
}

// 6. Single string column argument (not array)
const dfSingleStr = df.unique("a");
if (dfSingleStr.height !== 2) {
    throw new Error(`Expected single column string unique height 2, got ${dfSingleStr.height}`);
}
// Check that first occurrence value for 'c' is retained (c === 3 from row 0)
const firstRowA1 = dfSingleStr.toDicts().find(r => r.a === 1);
if (!firstRowA1 || firstRowA1.c !== 3) {
    throw new Error(`Expected first occurrence of non-subset column 'c' to be 3, got ${firstRowA1?.c}`);
}

// 7. Explicit array of all columns
const dfAllExplicit = df.unique(["a", "b", "c"]);
if (dfAllExplicit.height !== 3) {
    throw new Error(`Expected explicit all columns unique height 3, got ${dfAllExplicit.height}`);
}

// 8. Unique with Dates
const d1 = new Date("2026-01-01T00:00:00Z");
const d2 = new Date("2026-01-01T00:00:00Z");
const d3 = new Date("2026-02-01T00:00:00Z");
const dfDates = new DataFrame([
    { date: d1, val: 10 },
    { date: d2, val: 20 },
    { date: d3, val: 30 }
]);
const uniqueDates = dfDates.unique("date");
if (uniqueDates.height !== 2) {
    throw new Error(`Expected uniqueDates height 2, got ${uniqueDates.height}`);
}
if (uniqueDates.toDicts()[0].val !== 10) {
    throw new Error(`Expected first val 10, got ${uniqueDates.toDicts()[0].val}`);
}

// 9. Unique with BigInts
const dfBigInts = new DataFrame([
    { id: 100n, label: "first" },
    { id: 100n, label: "second" },
    { id: 200n, label: "third" }
]);
const uniqueBigInts = dfBigInts.unique("id");
if (uniqueBigInts.height !== 2) {
    throw new Error(`Expected uniqueBigInts height 2, got ${uniqueBigInts.height}`);
}
if (uniqueBigInts.toDicts()[0].label !== "first") {
    throw new Error(`Expected first label "first", got ${uniqueBigInts.toDicts()[0].label}`);
}

// 10. Unique with NaNs
const dfNaNs = new DataFrame([
    { val: NaN, extra: 1 },
    { val: NaN, extra: 2 },
    { val: 123, extra: 3 }
]);
const uniqueNaNs = dfNaNs.unique("val");
if (uniqueNaNs.height !== 2) {
    throw new Error(`Expected uniqueNaNs height 2, got ${uniqueNaNs.height}`);
}
if (uniqueNaNs.toDicts()[0].extra !== 1) {
    throw new Error(`Expected first extra 1, got ${uniqueNaNs.toDicts()[0].extra}`);
}

// 11. Unique on 1-row DataFrame
const dfOne = new DataFrame([{ x: 42, y: "solo" }]);
const uniqueOne = dfOne.unique();
if (uniqueOne.height !== 1 || uniqueOne.toDicts()[0].x !== 42) {
    throw new Error("Expected single row DataFrame unique to return identical 1-row DataFrame");
}

console.log("✓ unique tests passed!");


