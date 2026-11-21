declare const process: any;
import { DataFrame } from "df-script";
import { $df } from "df-script";

console.log("Running DataFrame.unstack tests...");

// 1. Horizontal unstack on a single column (step=3)
const dfWords = new DataFrame({
    a: ["a", "brown", "fox", "jumps", "over", "a", "lazy", "dog's", "head", "quietly"]
});

const unstackedHoriz = dfWords.unstack("a", { step: 3, how: "horizontal", fillValues: "(no word)" });
const dictsH = unstackedHoriz.toDicts();

if (unstackedHoriz.height !== 4) throw new Error(`Expected height 4, got ${unstackedHoriz.height}`);
if (unstackedHoriz.width !== 3) throw new Error(`Expected width 3, got ${unstackedHoriz.width}`);
if (dictsH[0].a_0 !== "a" || dictsH[0].a_1 !== "brown" || dictsH[0].a_2 !== "fox") throw new Error("Row 0 mismatch in horizontal unstack");
if (dictsH[1].a_0 !== "jumps" || dictsH[1].a_1 !== "over" || dictsH[1].a_2 !== "a") throw new Error("Row 1 mismatch in horizontal unstack");
if (dictsH[2].a_0 !== "lazy" || dictsH[2].a_1 !== "dog's" || dictsH[2].a_2 !== "head") throw new Error("Row 2 mismatch in horizontal unstack");
if (dictsH[3].a_0 !== "quietly" || dictsH[3].a_1 !== "(no word)" || dictsH[3].a_2 !== "(no word)") throw new Error("Row 3 fillValues mismatch in horizontal unstack");

// 2. Vertical unstack (default how="vertical")
const unstackedVert = dfWords.unstack("a", { step: 3 });
const dictsV = unstackedVert.toDicts();

// Total items = 10, step = 3 => newHeight = ceil(10 / 3) = 4
// Col 0: a[0..3] => ["a", "brown", "fox", "jumps"]
// Col 1: a[4..7] => ["over", "a", "lazy", "dog's"]
// Col 2: a[8..11] => ["head", "quietly", null, null]
if (unstackedVert.height !== 4) throw new Error(`Expected vertical height 4, got ${unstackedVert.height}`);
if (dictsV[0].a_0 !== "a" || dictsV[0].a_1 !== "over" || dictsV[0].a_2 !== "head") throw new Error("Vertical row 0 mismatch");
if (dictsV[1].a_0 !== "brown" || dictsV[1].a_1 !== "a" || dictsV[1].a_2 !== "quietly") throw new Error("Vertical row 1 mismatch");
if (dictsV[2].a_0 !== "fox" || dictsV[2].a_1 !== "lazy" || dictsV[2].a_2 !== null) throw new Error("Vertical row 2 mismatch");
if (dictsV[3].a_0 !== "jumps" || dictsV[3].a_1 !== "dog's" || dictsV[3].a_2 !== null) throw new Error("Vertical row 3 mismatch");

// 3. Unstacking multiple columns simultaneously
const dfMulti = new DataFrame({
    x: [1, 2, 3, 4],
    y: [10, 20, 30, 40]
});

const unstackedMulti = dfMulti.unstack(["x", "y"], { step: 2, how: "horizontal" });
const dictsMulti = unstackedMulti.toDicts();

if (unstackedMulti.width !== 4) throw new Error("Expected width 4 for two unstacked columns");
if (unstackedMulti.height !== 2) throw new Error("Expected height 2 for step=2 over 4 rows");
if (dictsMulti[0].x_0 !== 1 || dictsMulti[0].x_1 !== 2 || dictsMulti[0].y_0 !== 10 || dictsMulti[0].y_1 !== 20) {
    throw new Error("Multi-column row 0 mismatch");
}
if (dictsMulti[1].x_0 !== 3 || dictsMulti[1].x_1 !== 4 || dictsMulti[1].y_0 !== 30 || dictsMulti[1].y_1 !== 40) {
    throw new Error("Multi-column row 1 mismatch");
}

// 4. Expression selector support ($df.col("x"))
const unstackedExpr = dfMulti.unstack([$df.col("x")], { step: 2 });
if (unstackedExpr.width !== 2) throw new Error("Expected width 2 with expression selector");

// 5. Edge case: Empty DataFrame
const dfEmpty = new DataFrame([] as { a: number }[]);
const unstackedEmpty = dfEmpty.unstack("a", { step: 2 });
if (unstackedEmpty.height !== 0) throw new Error("Expected empty dataframe output for empty input");
if (unstackedEmpty.width !== 0) throw new Error("Expected 0 width for empty dataframe output");

// 6. Edge case: step = 1 (identity reshape)
const dfSingle = new DataFrame({ val: [100, 200, 300] });
const unstackedStep1 = dfSingle.unstack("val", { step: 1 });
if (unstackedStep1.height !== 3 || unstackedStep1.width !== 1) {
    throw new Error(`Step=1 shape mismatch: expected (3, 1), got (${unstackedStep1.height}, ${unstackedStep1.width})`);
}
const s1Dicts = unstackedStep1.toDicts();
if (s1Dicts[0].val_0 !== 100 || s1Dicts[1].val_0 !== 200 || s1Dicts[2].val_0 !== 300) {
    throw new Error("Step=1 values mismatch");
}

// 7. Edge case: step === origHeight (single row wide output)
const unstackedExact = dfSingle.unstack("val", { step: 3, how: "horizontal" });
if (unstackedExact.height !== 1 || unstackedExact.width !== 3) {
    throw new Error(`step === origHeight shape mismatch: (${unstackedExact.height}, ${unstackedExact.width})`);
}
const exactDicts = unstackedExact.toDicts();
if (exactDicts[0].val_0 !== 100 || exactDicts[0].val_1 !== 200 || exactDicts[0].val_2 !== 300) {
    throw new Error("step === origHeight values mismatch");
}

// 8. Edge case: step > origHeight (pads remaining step columns with fillValues in single row)
const unstackedOver = dfSingle.unstack("val", { step: 5, fillValues: -1, how: "horizontal" });
if (unstackedOver.height !== 1 || unstackedOver.width !== 5) {
    throw new Error(`step > origHeight shape mismatch: (${unstackedOver.height}, ${unstackedOver.width})`);
}
const overDicts = unstackedOver.toDicts();
if (overDicts[0].val_0 !== 100 || overDicts[0].val_1 !== 200 || overDicts[0].val_2 !== 300 || overDicts[0].val_3 !== -1 || overDicts[0].val_4 !== -1) {
    throw new Error("step > origHeight fill values mismatch");
}

// 9. Edge case: step > origHeight with vertical
const unstackedOverVert = dfSingle.unstack("val", { step: 5, fillValues: 999, how: "vertical" });
if (unstackedOverVert.height !== 1 || unstackedOverVert.width !== 5) {
    throw new Error("step > origHeight vertical shape mismatch");
}
const overVertDicts = unstackedOverVert.toDicts();
if (overVertDicts[0].val_0 !== 100 || overVertDicts[0].val_1 !== 200 || overVertDicts[0].val_2 !== 300 || overVertDicts[0].val_3 !== 999 || overVertDicts[0].val_4 !== 999) {
    throw new Error("step > origHeight vertical fill values mismatch");
}

// 10. Edge case: Diverse fillValues types (falsy values: 0, false, empty string, object)
const dfTwo = new DataFrame({ a: [1, 2, 3] });
const unstackedZeroFill = dfTwo.unstack("a", { step: 2, fillValues: 0, how: "horizontal" });
if (unstackedZeroFill.toDicts()[1].a_1 !== 0) throw new Error("Falsy 0 fillValue failed");

const unstackedFalseFill = dfTwo.unstack("a", { step: 2, fillValues: false, how: "horizontal" });
if (unstackedFalseFill.toDicts()[1].a_1 !== false) throw new Error("Falsy false fillValue failed");

const unstackedEmptyStrFill = dfTwo.unstack("a", { step: 2, fillValues: "", how: "horizontal" });
if (unstackedEmptyStrFill.toDicts()[1].a_1 !== "") throw new Error("Falsy empty string fillValue failed");

const customObj = { custom: true };
const unstackedObjFill = dfTwo.unstack("a", { step: 2, fillValues: customObj, how: "horizontal" });
if (unstackedObjFill.toDicts()[1].a_1 !== customObj) throw new Error("Object fillValue failed");

// 11. Edge case: Non-integer float step is truncated (e.g. 2.9 -> 2)
const unstackedTrunc = dfTwo.unstack("a", { step: 2.9, how: "horizontal" });
if (unstackedTrunc.width !== 2) throw new Error("Truncated float step failed");

// 12. Edge case: Column selector variations (single string vs array vs $df.col)
const dfCols = new DataFrame({ c1: [1, 2, 3, 4], c2: [5, 6, 7, 8] });
const uStr = dfCols.unstack("c1", { step: 2 });
const uArr = dfCols.unstack(["c1"], { step: 2 });
const uExpr = dfCols.unstack($df.col("c1"), { step: 2 });
if (uStr.width !== 2 || uArr.width !== 2 || uExpr.width !== 2) {
    throw new Error("Selector variations failed");
}

// 13. Error handling: invalid step (<= 0, NaN, non-number, missing options, Infinity, step in (0, 1))
let threwCount = 0;
const invalidCases = [
    { step: 0 },
    { step: -1 },
    { step: -5.5 },
    { step: NaN },
    { step: Infinity },
    { step: -Infinity },
    { step: 0.5 },
    { step: "2" as any },
    undefined as any,
    null as any
];

for (const opt of invalidCases) {
    try {
        dfWords.unstack("a", opt);
    } catch {
        threwCount++;
    }
}
if (threwCount !== invalidCases.length) {
    throw new Error(`Expected all ${invalidCases.length} invalid options to throw, but only ${threwCount} threw`);
}

// 14. Error handling: missing column name
let missingColThrew = false;
try {
    dfWords.unstack("non_existent_col", { step: 2 });
} catch {
    missingColThrew = true;
}
if (!missingColThrew) throw new Error("Expected missing column to throw error");

// 15. Preserving existing nulls vs fillValues
const dfWithNull = new DataFrame({ a: [1, null, 3] });
const unstackedNullPreserve = dfWithNull.unstack("a", { step: 2, fillValues: "EMPTY", how: "horizontal" });
const nullDicts = unstackedNullPreserve.toDicts();

if (nullDicts[0].a_0 !== 1) throw new Error("Expected 1");
if (nullDicts[0].a_1 !== null) throw new Error("Existing null was replaced by fillValue!");
if (nullDicts[1].a_0 !== 3) throw new Error("Expected 3");
if (nullDicts[1].a_1 !== "EMPTY") throw new Error("Missing cell was not filled with fillValue");

// 16. DataFrame with length 1
const dfOne = new DataFrame({ a: [42] });
const uOneStep1 = dfOne.unstack("a", { step: 1 });
if (uOneStep1.height !== 1 || uOneStep1.width !== 1 || uOneStep1.toDicts()[0].a_0 !== 42) {
    throw new Error("Height=1, step=1 failed");
}

const uOneStep2 = dfOne.unstack("a", { step: 2, fillValues: null, how: "horizontal" });
if (uOneStep2.height !== 1 || uOneStep2.width !== 2) {
    throw new Error("Height=1, step=2 failed");
}
if (uOneStep2.toDicts()[0].a_0 !== 42 || uOneStep2.toDicts()[0].a_1 !== null) {
    throw new Error("Height=1, step=2 values failed");
}

// 17. Schema Type Preservation across unstacked columns
const dfSchema = new DataFrame({ id: [1, 2, 3, 4] });
const unstackedSchema = dfSchema.unstack("id", { step: 2 });
if (unstackedSchema.schema["id_0"] !== dfSchema.schema["id"] || 
    unstackedSchema.schema["id_1"] !== dfSchema.schema["id"]) {
    throw new Error("Schema metadata was not preserved in output columns");
}

// 18. Duplicate Column Selection deduplication
const dfDupCol = new DataFrame({ a: [1, 2, 3, 4] });
const unstackedDup = dfDupCol.unstack(["a", "a"], { step: 2 });
if (unstackedDup.width !== 2) {
    throw new Error("Deduplication of target column selectors failed");
}

// 19. Invalid 'how' option rejection
let invalidHowThrew = false;
try {
    dfWords.unstack("a", { step: 2, how: "invalid" as any });
} catch {
    invalidHowThrew = true;
}
if (!invalidHowThrew) throw new Error("Expected invalid 'how' option to throw");

// 20. Edge case: Column containing all nulls/undefined
const dfNullsOnly = new DataFrame({ missing: [null, null, null] });
const unstackedNulls = dfNullsOnly.unstack("missing", { step: 2, fillValues: "EMPTY" });
const nullsDicts = unstackedNulls.toDicts();
if (nullsDicts[0].missing_0 !== null || nullsDicts[0].missing_1 !== null || nullsDicts[1].missing_0 !== null || nullsDicts[1].missing_1 !== "EMPTY") {
    throw new Error("All-null column unstack failed to preserve existing nulls vs fillValues");
}

// 21. Edge case: Empty column array selection returns empty DataFrame
const dfEmptySel = new DataFrame({ a: [1, 2, 3] });
const uEmptySel = dfEmptySel.unstack([], { step: 2 });
if (uEmptySel.height !== 0 || uEmptySel.width !== 0) {
    throw new Error("Empty target columns selection should return empty DataFrame");
}

// 22. Edge case: Multi-column vertical unstack schema and value alignment
const dfMultiTypes = new DataFrame({
    nums: [1, 2, 3, 4, 5],
    strs: ["a", "b", "c", "d", "e"]
});
const uMultiVert = dfMultiTypes.unstack(["nums", "strs"], { step: 2, how: "vertical", fillValues: null });
if (uMultiVert.height !== 3 || uMultiVert.width !== 4) {
    throw new Error("Multi-column vertical unstack shape mismatch");
}
const mVDicts = uMultiVert.toDicts();
if (mVDicts[0].nums_0 !== 1 || mVDicts[1].nums_0 !== 2 || mVDicts[2].nums_0 !== 3 ||
    mVDicts[0].nums_1 !== 4 || mVDicts[1].nums_1 !== 5 || mVDicts[2].nums_1 !== null) {
    throw new Error("Multi-column vertical unstack nums values mismatch");
}
if (mVDicts[0].strs_0 !== "a" || mVDicts[1].strs_0 !== "b" || mVDicts[2].strs_0 !== "c" ||
    mVDicts[0].strs_1 !== "d" || mVDicts[1].strs_1 !== "e" || mVDicts[2].strs_1 !== null) {
    throw new Error("Multi-column vertical unstack strs values mismatch");
}
if (uMultiVert.schema["nums_0"] !== dfMultiTypes.schema["nums"] ||
    uMultiVert.schema["strs_1"] !== dfMultiTypes.schema["strs"]) {
    throw new Error("Multi-column schema mismatch");
}

console.log("✓ DataFrame.unstack tests passed!");


