import { DataFrame } from "../../src/dataframe";

console.log("Running sort tests...");

const df = new DataFrame([
    { name: "Alice", age: 30 },
    { name: "Bob", age: 25 },
    { name: "Charlie", age: null },
    { name: "Dave", age: 35 }
]);

// 1. Sort by age ascending (nulls last by default)
const dfSortedAsc = df.sort({ by: "age", descending: false });
const collectedAsc = dfSortedAsc.toDicts();
if (
    collectedAsc[0].name !== "Bob" || // age 25
    collectedAsc[1].name !== "Alice" || // age 30
    collectedAsc[2].name !== "Dave" || // age 35
    collectedAsc[3].name !== "Charlie" // age null (nulls last)
) {
    throw new Error("Sort ascending with nulls last failed");
}

// 2. Sort by age descending (nulls last by default)
const dfSortedDesc = df.sort({ by: "age", descending: true });
const collectedDesc = dfSortedDesc.toDicts();
if (
    collectedDesc[0].name !== "Dave" || // age 35
    collectedDesc[1].name !== "Alice" || // age 30
    collectedDesc[2].name !== "Bob" || // age 25
    collectedDesc[3].name !== "Charlie" // age null (nulls last)
) {
    throw new Error("Sort descending with nulls last failed");
}

// 3. Sort by age ascending, nulls first (nullsLast: false)
const dfNullsFirst = df.sort({ by: "age", descending: false, nullsLast: false });
const collectedNullsFirst = dfNullsFirst.toDicts();
if (
    collectedNullsFirst[0].name !== "Charlie" || // age null
    collectedNullsFirst[1].name !== "Bob" ||
    collectedNullsFirst[2].name !== "Alice" ||
    collectedNullsFirst[3].name !== "Dave"
) {
    throw new Error("Sort ascending with nulls first failed");
}

// 4. Custom comparator: sort names by length ascending
const dfCustom = df.sort({
    by: "name",
    customComp: {
        name: (a: string, b: string) => a.length - b.length
    }
});
const collectedCustom = dfCustom.toDicts();
if (
    collectedCustom[0].name !== "Bob" || // length 3
    collectedCustom[1].name !== "Dave" || // length 4
    collectedCustom[2].name !== "Alice" || // length 5
    collectedCustom[3].name !== "Charlie" // length 7
) {
    throw new Error("Custom comparator sort failed");
}

// 5. Custom comparator passed directly as function
const dfCustomFn = df.sort({
    by: "name",
    customComp: (a: string, b: string) => a.length - b.length
});
const collectedCustomFn = dfCustomFn.toDicts();
if (collectedCustomFn[0].name !== "Bob" || collectedCustomFn[3].name !== "Charlie") {
    throw new Error("Direct custom comparator function sort failed");
}

// 6. Multi-Column Tie Breaking with Mixed Direction Flags
const dfMulti = new DataFrame([
    { group: "B", score: 10, val: "b1" },
    { group: "A", score: 20, val: "a1" },
    { group: "A", score: 10, val: "a2" },
    { group: "B", score: 20, val: "b2" },
    { group: "A", score: 20, val: "a3" }
]);
// Sort by group ASC, score DESC
const dfMultiSorted = dfMulti.sort({
    by: ["group", "score"],
    descending: [false, true]
});
const multiRows = dfMultiSorted.toDicts();
if (
    multiRows[0].val !== "a1" || // A, 20
    multiRows[1].val !== "a3" || // A, 20
    multiRows[2].val !== "a2" || // A, 10
    multiRows[3].val !== "b2" || // B, 20
    multiRows[4].val !== "b1"    // B, 10
) {
    throw new Error("Multi-column tie breaking with mixed directions failed");
}

// 7. Expressions as Sort Keys
import { $df } from "../../src";
const dfExprSort = dfMulti.sort({
    by: [$df.col("score").mul(2), $df.col("group")],
    descending: [true, false]
});
const exprRows = dfExprSort.toDicts();
if (exprRows[0].score !== 20 || exprRows[0].group !== "A" || exprRows[4].score !== 10) {
    throw new Error("Expression-based sort key failed");
}

// 8. 64-bit BigInt Sorting
const dfBigInt = new DataFrame({
    id: [3n, 1n, 9007199254740993n, 2n, null],
    label: ["three", "one", "huge", "two", "none"]
});
const sortedBigInt = dfBigInt.sort({ by: "id", descending: false, nullsLast: true });
const bigIntRows = sortedBigInt.toDicts();
if (
    bigIntRows[0].id !== 1n ||
    bigIntRows[1].id !== 2n ||
    bigIntRows[2].id !== 3n ||
    bigIntRows[3].id !== 9007199254740993n ||
    bigIntRows[4].id !== null
) {
    throw new Error("BigInt sorting failed");
}

// 9. Temporal Date and Datetime Sorting
const dfDates = new DataFrame({
    ts: [
        new Date("2026-12-31T23:59:59.999Z"),
        new Date("2020-01-01T00:00:00.000Z"),
        null,
        new Date("2024-06-15T12:00:00.000Z")
    ],
    tag: ["future", "past", "missing", "present"]
});
const sortedDates = dfDates.sort({ by: "ts", descending: false, nullsLast: false });
const dateRows = sortedDates.toDicts();
if (
    dateRows[0].tag !== "missing" || // nulls first
    dateRows[1].tag !== "past" ||
    dateRows[2].tag !== "present" ||
    dateRows[3].tag !== "future"
) {
    throw new Error("Temporal Date/Datetime sorting failed");
}

// 10. IEEE 754 Floating-Point Extreme Boundaries (NaN, -0, Infinity, -Infinity)
const dfFloats = new DataFrame({
    f: [Infinity, -Infinity, 0, -0, 100]
});
const sortedFloats = dfFloats.sort({ by: "f", descending: false });
const floatRows = sortedFloats.toDicts();
if (
    floatRows[0].f !== -Infinity ||
    floatRows[4].f !== Infinity
) {
    throw new Error("IEEE 754 Floating point boundary sorting failed");
}

// 11. Degenerate DataFrames (0 rows, 1 row, all-null columns)
const dfEmpty = new DataFrame([]);
const sortedEmpty = dfEmpty.sort({ by: "any" as any });
if (sortedEmpty.height !== 0) throw new Error("Empty DataFrame sort failed");

const dfSingle = new DataFrame([{ a: 42, b: "solo" }]);
const sortedSingle = dfSingle.sort({ by: "a" });
if (sortedSingle.height !== 1 || sortedSingle.item(0, "a") !== 42) {
    throw new Error("Single row DataFrame sort failed");
}

const dfAllNulls = new DataFrame({
    x: [null, null, null],
    y: [1, 2, 3]
});
const sortedAllNulls = dfAllNulls.sort({ by: "x" });
if (sortedAllNulls.height !== 3) throw new Error("All-null column sort height mismatch");

// 12. Non-existent column error propagation from select
let threwOnMissing = false;
try {
    dfMulti.sort({ by: "non_existent_column" as any });
} catch (e: any) {
    threwOnMissing = true;
}
if (!threwOnMissing) {
    throw new Error("Sorting on a non-existent column should throw ColumnNotFoundError");
}

// 13. TypedArray Int32Array & Float64Array Column Sorting
const dfTyped = new DataFrame({
    vals: new Int32Array([50, -20, 100, 0, -500]),
    name: ["e", "b", "d", "c", "a"]
});
const sortedTyped = dfTyped.sort({ by: "vals", descending: false });
const typedRows = sortedTyped.toDicts();
if (typedRows[0].vals !== -500 || typedRows[0].name !== "a" || typedRows[4].vals !== 100 || typedRows[4].name !== "d") {
    throw new Error("TypedArray column sorting failed");
}

// 14. Unicode Accents & Natural String Ordering
const dfUnicode = new DataFrame({
    word: ["éclair", "apple", "banana", "écho", "cat"]
});
const sortedUnicode = dfUnicode.sort({ by: "word", descending: false });
const unicodeRows = sortedUnicode.toDicts();
if (unicodeRows[0].word !== "apple" || unicodeRows[4].word !== "éclair") {
    throw new Error("Unicode string sorting order mismatch");
}

// 15. Nested Arithmetic and When/Then Expressions as Sort Keys
const dfComplexExpr = new DataFrame({
    score: [10, 50, 20, 80],
    bonus: [5, 0, 15, 2]
});
const sortedExpr = dfComplexExpr.sort({
    by: [$df.col("score").add($df.col("bonus"))],
    descending: true
});
const exprResults = sortedExpr.toDicts();
if (exprResults[0].score !== 80 || exprResults[1].score !== 50 || exprResults[2].score !== 20 || exprResults[3].score !== 10) {
    throw new Error("Complex expression sort failed");
}

// 16. Fast-path single column sort with BigInt
const dfBigIntFast = new DataFrame({
    id: [300n, 100n, 200n],
    label: ["c", "a", "b"]
});
const sortedBigIntFast = dfBigIntFast.sort({ by: "id" });
const bigIntRowsFast = sortedBigIntFast.toDicts();
if (bigIntRowsFast[0].id !== 100n || bigIntRowsFast[1].id !== 200n || bigIntRowsFast[2].id !== 300n) {
    throw new Error("BigInt column sort failed");
}

// 17. Single-column sort with NaNs and nullsLast: false
const dfNaNs = new DataFrame({
    val: [10, NaN, 5, null]
});
const sortedNaNsNullsFirst = dfNaNs.sort({ by: "val", nullsLast: false });
const nanRowsFirst = sortedNaNsNullsFirst.toArray("val");
// null and NaN should be first
if (nanRowsFirst[2] !== 5 || nanRowsFirst[3] !== 10) {
    throw new Error("NaN/null nullsLast: false sorting failed");
}

// 18. Single-column Date sorting
const dateValA = new Date("2024-03-01");
const dateValB = new Date("2024-01-01");
const dateValC = new Date("2024-02-01");
const dfDatesFast = new DataFrame({
    dt: [dateValA, dateValB, dateValC],
    v: [3, 1, 2]
});
const sortedDatesFast = dfDatesFast.sort({ by: "dt", descending: false });
const dateRowsFast = sortedDatesFast.toDicts();
if (dateRowsFast[0].v !== 1 || dateRowsFast[1].v !== 2 || dateRowsFast[2].v !== 3) {
    throw new Error("Date column sort failed");
}

console.log("✓ sort tests passed!");
