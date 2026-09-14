declare const process: any;

import { DataFrame } from "../../src/dataframe";
import { $df } from "../../src";

console.log("Running insertColumn tests...");

const df = new DataFrame([
    { a: 1, c: 3 },
    { a: 2, c: 4 }
]);

// 1. Insert scalar literal at index 1
const res = df.insertColumn(1, "b", $df.lit(99));
if (res.columns[0] !== "a" || res.columns[1] !== "b" || res.columns[2] !== "c") {
    throw new Error(`Columns order incorrect: ${JSON.stringify(res.columns)}`);
}
const rows = res.toDicts();
if (rows[0].b !== 99 || rows[1].b !== 99) {
    throw new Error("Inserted column values mismatch");
}

// 2. Insert scalar at index 0 (start)
const resStart = df.insertColumn(0, "first", $df.lit("tag"));
if (resStart.columns[0] !== "first" || resStart.columns[1] !== "a") {
    throw new Error("Insert at start mismatch");
}
if (resStart.toDicts()[0].first !== "tag") {
    throw new Error("Insert at start value mismatch");
}

// 3. Insert computed expression at end
const resEnd = df.insertColumn(2, "last", $df.col("a").add(100));
if (resEnd.columns[2] !== "last") {
    throw new Error("Insert at end mismatch");
}
if (resEnd.toDicts()[0].last !== 101 || resEnd.toDicts()[1].last !== 102) {
    throw new Error("Insert computed expression value mismatch");
}

// 4. Edge Case: Negative index wrapping (-1, -2, and out-of-bounds clamping)
// df has columns: ["a", "c"] (len = 2)
// index -1 -> len + (-1) = 1 (inserts between "a" and "c")
const resNeg1 = df.insertColumn(-1, "neg_one", $df.lit(10));
if (resNeg1.columns[0] !== "a" || resNeg1.columns[1] !== "neg_one" || resNeg1.columns[2] !== "c") {
    throw new Error(`Negative index -1 mismatch: ${JSON.stringify(resNeg1.columns)}`);
}

// index -2 -> len + (-2) = 0 (inserts at start)
const resNeg2 = df.insertColumn(-2, "neg_two", $df.lit(20));
if (resNeg2.columns[0] !== "neg_two" || resNeg2.columns[1] !== "a" || resNeg2.columns[2] !== "c") {
    throw new Error(`Negative index -2 mismatch: ${JSON.stringify(resNeg2.columns)}`);
}

// Out-of-bounds negative index (e.g. -10) clamps to 0 (start)
const resNeg = df.insertColumn(-10, "negClamped", $df.lit("start"));
if (resNeg.columns[0] !== "negClamped" || resNeg.columns[1] !== "a" || resNeg.columns[2] !== "c") {
    throw new Error(`Negative index -10 should clamp to 0, got: ${JSON.stringify(resNeg.columns)}`);
}

// 5. Edge Case: Out-of-bounds positive index > width clamps to end
const resBeyond = df.insertColumn(999, "beyondClamped", $df.lit("end"));
if (resBeyond.columns[resBeyond.columns.length - 1] !== "beyondClamped") {
    throw new Error(`Beyond index should clamp to width, got: ${JSON.stringify(resBeyond.columns)}`);
}

// 6. Edge Case: Inserting a column with an existing column's name replaces and repositions it
const dfExisting = new DataFrame([
    { x: 10, y: 20, z: 30 },
    { x: 40, y: 50, z: 60 }
]);
const resReplace = dfExisting.insertColumn(0, "z", $df.col("x").mul(2));
if (resReplace.columns[0] !== "z" || resReplace.columns[1] !== "x" || resReplace.columns[2] !== "y" || resReplace.width !== 3) {
    throw new Error(`Replaced column ordering mismatch: ${JSON.stringify(resReplace.columns)}`);
}
const replaceRows = resReplace.toDicts();
if (replaceRows[0].z !== 20 || replaceRows[1].z !== 80) {
    throw new Error(`Replaced column values mismatch: ${JSON.stringify(replaceRows)}`);
}

// 7. Edge Case: Inserting unique values using sequence / step ($df.seqRange)
const df3 = new DataFrame([
    { name: "alice" },
    { name: "bob" },
    { name: "charlie" }
]);
const resSeq = df3.insertColumn(0, "unique_id", $df.seqRange(101, { step: 1 }));
const seqRows = resSeq.toDicts();
if (resSeq.columns[0] !== "unique_id" || resSeq.columns[1] !== "name") {
    throw new Error("Unique sequence column position mismatch");
}
if (seqRows[0].unique_id !== 101 || seqRows[1].unique_id !== 102 || seqRows[2].unique_id !== 103) {
    throw new Error(`Unique sequence column values mismatch: ${JSON.stringify(seqRows)}`);
}

// 8. Edge Case: Inserting unique values derived from existing column (e.g. string formatting / transformation)
const resUnique = df3.insertColumn(1, "tag", $df.col("name").str.slice(0, 3).str.toUpperCase());
const uniqueRows = resUnique.toDicts();
if (uniqueRows[0].tag !== "ALI" || uniqueRows[1].tag !== "BOB" || uniqueRows[2].tag !== "CHA") {
    throw new Error(`Derived unique values mismatch: ${JSON.stringify(uniqueRows)}`);
}

// 9. Edge Case: Inserting into a single-row DataFrame
const dfSingle = new DataFrame([{ col1: "only" }]);
const resSingle = dfSingle.insertColumn(0, "prefix", $df.lit("A"));
if (resSingle.width !== 2 || resSingle.height !== 1 || resSingle.columns[0] !== "prefix") {
    throw new Error("Single row insertColumn failed");
}

// 10. Edge Case: Inserting into an empty DataFrame
const dfEmpty = new DataFrame<{ a: number }>([], { a: $df.Int32 });
const resEmpty = dfEmpty.insertColumn(0, "b", $df.lit(123));
if (resEmpty.width !== 2 || resEmpty.height !== 0 || resEmpty.columns[0] !== "b" || resEmpty.columns[1] !== "a") {
    throw new Error(`Empty DataFrame insertColumn failed: ${JSON.stringify(resEmpty.columns)}`);
}

// 11. Edge Case: Completely empty DataFrame (no columns, 0 rows)
const dfZero = new DataFrame([]);
const resZero = dfZero.insertColumn(0, "col0", $df.lit(1));
if (resZero.width !== 1 || resZero.columns[0] !== "col0") {
    throw new Error(`Zero-dimension DataFrame insertColumn failed: ${JSON.stringify(resZero.columns)}`);
}

// 12. Edge Case: Passing a raw array of unique numbers
const dfArrayTest = new DataFrame([
    { id: 1, val: "one" },
    { id: 2, val: "two" },
    { id: 3, val: "three" }
]);
const resRawNum = dfArrayTest.insertColumn(1, "unique_codes", [10, 30, 50]);
if (resRawNum.columns[1] !== "unique_codes" || resRawNum.width !== 3) {
    throw new Error(`Raw array column insertion position mismatch: ${JSON.stringify(resRawNum.columns)}`);
}
const rawNumRows = resRawNum.toDicts();
if (rawNumRows[0].unique_codes !== 10 || rawNumRows[1].unique_codes !== 30 || rawNumRows[2].unique_codes !== 50) {
    throw new Error(`Raw array values mismatch: ${JSON.stringify(rawNumRows)}`);
}

// 13. Edge Case: Passing a raw array of unique strings
const resRawStr = dfArrayTest.insertColumn(0, "category", ["alpha", "beta", "gamma"]);
const rawStrRows = resRawStr.toDicts();
if (resRawStr.columns[0] !== "category" || rawStrRows[0].category !== "alpha" || rawStrRows[2].category !== "gamma") {
    throw new Error(`Raw string array values mismatch: ${JSON.stringify(rawStrRows)}`);
}

// 14. Edge Case: Passing a TypedArray (Int32Array, Float64Array)
const typedArr = new Int32Array([1001, 1002, 1003]);
const resTyped = dfArrayTest.insertColumn(2, "typed_col", typedArr);
const typedRows = resTyped.toDicts();
if (resTyped.columns[2] !== "typed_col" || typedRows[0].typed_col !== 1001 || typedRows[2].typed_col !== 1003) {
    throw new Error(`Typed array column values mismatch: ${JSON.stringify(typedRows)}`);
}

// 15. Edge Case: Passing a raw array of dates / objects / nulls (heterogeneous types)
const date1 = new Date(2025, 0, 1);
const date2 = new Date(2025, 5, 1);
const date3 = new Date(2025, 11, 31);
const resDates = dfArrayTest.insertColumn(1, "created_at", [date1, date2, date3]);
const dateRows = resDates.toDicts();
if (dateRows[0].created_at.getTime() !== date1.getTime() || dateRows[2].created_at.getTime() !== date3.getTime()) {
    throw new Error("Date objects array insertion mismatch");
}

// 16. Edge Case: Passing array with mismatched length throws ShapeError
let threwShapeError = false;
try {
    dfArrayTest.insertColumn(0, "invalid_len", [1, 2]); // height is 3, array is 2
} catch (e: any) {
    threwShapeError = true;
}
if (!threwShapeError) {
    throw new Error("Expected ShapeError when inserting array with mismatched length");
}

// -------------------------------------------------------------
// 5 Dedicated Negative Indexing Edge Case Tests
// -------------------------------------------------------------

const dfWide = new DataFrame([
    { c0: "zero", c1: "one", c2: "two", c3: "three" },
    { c0: "0", c1: "1", c2: "2", c3: "3" }
]);

// 17. Neg Index Edge Case 1: Insert at index -1 in 4-column DataFrame
// len = 4. index -1 -> 4 + (-1) = 3 (inserts immediately before the last column c3)
const resNegWide1 = dfWide.insertColumn(-1, "before_last", $df.lit("BL"));
const expNegWide1 = ["c0", "c1", "c2", "before_last", "c3"];
if (JSON.stringify(resNegWide1.columns) !== JSON.stringify(expNegWide1)) {
    throw new Error(`Neg index -1 expected ${JSON.stringify(expNegWide1)}, got ${JSON.stringify(resNegWide1.columns)}`);
}
if (resNegWide1.toDicts()[0].before_last !== "BL") {
    throw new Error("Neg index -1 value mismatch");
}

// 18. Neg Index Edge Case 2: Insert at index -3 in 4-column DataFrame
// len = 4. index -3 -> 4 + (-3) = 1 (inserts between c0 and c1)
const resNegWide2 = dfWide.insertColumn(-3, "second_slot", $df.lit("S2"));
const expNegWide2 = ["c0", "second_slot", "c1", "c2", "c3"];
if (JSON.stringify(resNegWide2.columns) !== JSON.stringify(expNegWide2)) {
    throw new Error(`Neg index -3 expected ${JSON.stringify(expNegWide2)}, got ${JSON.stringify(resNegWide2.columns)}`);
}
if (resNegWide2.toDicts()[0].second_slot !== "S2") {
    throw new Error("Neg index -3 value mismatch");
}

// 19. Neg Index Edge Case 3: Insert at exact boundary -len (-4)
// len = 4. index -4 -> 4 + (-4) = 0 (inserts at the very beginning)
const resNegBoundary = dfWide.insertColumn(-4, "boundary_start", $df.lit("START"));
const expNegBoundary = ["boundary_start", "c0", "c1", "c2", "c3"];
if (JSON.stringify(resNegBoundary.columns) !== JSON.stringify(expNegBoundary)) {
    throw new Error(`Neg index -len expected ${JSON.stringify(expNegBoundary)}, got ${JSON.stringify(resNegBoundary.columns)}`);
}
if (resNegBoundary.toDicts()[0].boundary_start !== "START") {
    throw new Error("Neg boundary start value mismatch");
}

// 20. Neg Index Edge Case 4: Negative indexing with raw array of distinct values
// len = 4. index -2 -> 4 + (-2) = 2 (inserts at index 2) with raw array [999, 888]
const resNegArray = dfWide.insertColumn(-2, "raw_neg", [999, 888]);
const expNegArray = ["c0", "c1", "raw_neg", "c2", "c3"];
if (JSON.stringify(resNegArray.columns) !== JSON.stringify(expNegArray)) {
    throw new Error(`Neg index with array expected ${JSON.stringify(expNegArray)}, got ${JSON.stringify(resNegArray.columns)}`);
}
const negArrayRows = resNegArray.toDicts();
if (negArrayRows[0].raw_neg !== 999 || negArrayRows[1].raw_neg !== 888) {
    throw new Error("Neg index with array value mismatch");
}

// 21. Neg Index Edge Case 5: Negative indexing replacing an existing column
// dfWide has ["c0", "c1", "c2", "c3"]. Replacing "c3" at negative index -2:
// selectList without "c3" is ["c0", "c1", "c2"] (len = 3).
// index -2 -> 3 + (-2) = 1 (inserts "c3" at index 1!)
const resNegReplace = dfWide.insertColumn(-2, "c3", $df.lit("moved"));
const expNegReplace = ["c0", "c3", "c1", "c2"];
if (JSON.stringify(resNegReplace.columns) !== JSON.stringify(expNegReplace)) {
    throw new Error(`Neg index replacing column expected ${JSON.stringify(expNegReplace)}, got ${JSON.stringify(resNegReplace.columns)}`);
}
if (resNegReplace.toDicts()[0].c3 !== "moved") {
    throw new Error("Neg index replacing column value mismatch");
}

console.log("✓ insertColumn tests passed!");