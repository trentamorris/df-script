import { DataFrame } from "../../src";

console.log("Running transpose tests...");

// Helper for checking exceptions
function assertThrows(fn: () => void, expectedPhrase: string) {
    try {
        fn();
        throw new Error("Expected function to throw, but it succeeded.");
    } catch (e: any) {
        if (!e.message.includes(expectedPhrase)) {
            throw new Error(`Expected error containing "${expectedPhrase}", but got: "${e.message}"`);
        }
    }
}

// 1. Basic Transpose (Sequential Column Names)
const df = new DataFrame({
    a: [1, 2, 3],
    b: [4, 5, 6]
});
const t = df.transpose();
if (t.height !== 2) throw new Error("Expected height 2");
if (t.columns.length !== 3) throw new Error("Expected 3 columns");
if (t.columns[0] !== "column_0" || t.columns[1] !== "column_1" || t.columns[2] !== "column_2") {
    throw new Error("Expected sequential column names");
}
if (t.item(0, "column_0") !== 1) throw new Error("Expected 1");
if (t.item(0, "column_1") !== 2) throw new Error("Expected 2");
if (t.item(0, "column_2") !== 3) throw new Error("Expected 3");
if (t.item(1, "column_0") !== 4) throw new Error("Expected 4");
if (t.item(1, "column_1") !== 5) throw new Error("Expected 5");
if (t.item(1, "column_2") !== 6) throw new Error("Expected 6");

// 2. Transpose with includeHeader & headerName
const t2 = df.transpose({ includeHeader: true, headerName: "original_names" });
if (t2.height !== 2) throw new Error("Expected height 2");
if (t2.columns.length !== 4) throw new Error("Expected 4 columns");
if (t2.columns[0] !== "original_names") throw new Error("Expected column 0 to be original_names");
if (t2.item(0, "original_names") !== "a") throw new Error("Expected 'a'");
if (t2.item(1, "original_names") !== "b") throw new Error("Expected 'b'");
if (t2.item(0, "column_0") !== 1) throw new Error("Expected 1");
if (t2.item(1, "column_0") !== 4) throw new Error("Expected 4");

// 3. Transpose with columnNames pointing to existing column
const df2 = new DataFrame({
    id: ["i", "j", "k"],
    a: [1, 2, 3],
    b: [4, 5, 6]
});
const t3 = df2.transpose({ columnNames: "id" });
if (t3.height !== 2) throw new Error("Expected height 2");
if (t3.columns.length !== 3) throw new Error("Expected 3 columns");
if (t3.columns[0] !== "i" || t3.columns[1] !== "j" || t3.columns[2] !== "k") {
    throw new Error("Expected column names from 'id' column values");
}
if (t3.item(0, "i") !== 1) throw new Error("Expected 1");
if (t3.item(0, "k") !== 3) throw new Error("Expected 3");
if (t3.item(1, "i") !== 4) throw new Error("Expected 4");
if (t3.item(1, "k") !== 6) throw new Error("Expected 6");

// 4. Transpose with columnNames pointing to existing column and includeHeader: true
const t4 = df2.transpose({ columnNames: "id", includeHeader: true, headerName: "my_header" });
if (t4.height !== 2) throw new Error("Expected height 2");
if (t4.columns.length !== 4) throw new Error("Expected 4 columns");
if (t4.columns[0] !== "my_header") throw new Error("Expected 'my_header'");
if (t4.item(0, "my_header") !== "a") throw new Error("Expected 'a'");
if (t4.item(1, "my_header") !== "b") throw new Error("Expected 'b'");
if (t4.item(0, "i") !== 1) throw new Error("Expected 1");

// 5. Transpose with columnNames as explicit array
const t5 = df.transpose({ columnNames: ["rowA", "rowB", "rowC"] });
if (t5.columns.length !== 3) throw new Error("Expected 3 columns");
if (t5.columns[0] !== "rowA" || t5.columns[1] !== "rowB" || t5.columns[2] !== "rowC") {
    throw new Error("Expected explicit column names");
}
if (t5.item(0, "rowA") !== 1) throw new Error("Expected 1");
if (t5.item(1, "rowC") !== 6) throw new Error("Expected 6");

// 6. Duplicate column names checks
assertThrows(() => {
    df.transpose({ columnNames: ["colA", "colA", "colB"] });
}, "Duplicate column name in transposed DataFrame");

assertThrows(() => {
    df.transpose({ includeHeader: true, headerName: "column_0" });
}, "Duplicate column name in transposed DataFrame");

// 7. Error boundaries & parameter validation
assertThrows(() => {
    df2.transpose({ columnNames: "non_existent" });
}, "does not exist");

assertThrows(() => {
    df2.transpose({ columnNames: ["only_one"] });
}, "columnNames length (1) must match the height of the DataFrame (3)");

// 8. Null validation in key column
const dfWithNull = new DataFrame({
    id: ["i", null, "k"],
    a: [1, 2, 3]
});
assertThrows(() => {
    dfWithNull.transpose({ columnNames: "id" });
}, "contains null/undefined");

// 9. Empty DataFrame transposing
const emptyDf = new DataFrame({
    a: []
});
const emptyT = emptyDf.transpose({ includeHeader: true, headerName: "h" });
if (emptyT.height !== 0) throw new Error("Expected empty transposed height to be 0");
if (emptyT.columns.length !== 1 || emptyT.columns[0] !== "h") {
    throw new Error("Expected only header column for empty transpose with header");
}

const emptyT2 = emptyDf.transpose();
if (emptyT2.height !== 0) throw new Error("Expected empty transposed height to be 0");
if (emptyT2.columns.length !== 0) throw new Error("Expected empty transpose to have 0 columns");

// 10. Type coercion check
const mixDf = new DataFrame({
    a: [1, 2],
    b: ["three", "four"]
});
const mixT = mixDf.transpose();
const schema = mixT.schema;
if (schema["column_0"].name !== "Utf8") {
    throw new Error(`Expected column_0 to be Utf8, got ${schema["column_0"].name}`);
}
if (schema["column_1"].name !== "Utf8") {
    throw new Error(`Expected column_1 to be Utf8, got ${schema["column_1"].name}`);
}
if (mixT.item(0, "column_0") !== "1") throw new Error("Expected '1'");
if (mixT.item(1, "column_0") !== "three") throw new Error("Expected 'three'");
if (mixT.item(0, "column_1") !== "2") throw new Error("Expected '2'");
if (mixT.item(1, "column_1") !== "four") throw new Error("Expected 'four'");

// 11. Custom iterables for columnNames (Set and Generator)
// 12. Edge Case: 10/10 BigInt64Array & TypedArrays transposition
const dfBigInt = new DataFrame({
    a: new BigInt64Array([100n, 200n]),
    b: new BigInt64Array([300n, 400n])
});
const tBigInt = dfBigInt.transpose();
if (tBigInt.height !== 2 || tBigInt.columns.length !== 2) {
    throw new Error("BigInt transpose height/cols mismatch");
}
if (tBigInt.item(0, "column_0") !== 100n || tBigInt.item(0, "column_1") !== 200n) {
    throw new Error("BigInt row 0 mismatch");
}
if (tBigInt.item(1, "column_0") !== 300n || tBigInt.item(1, "column_1") !== 400n) {
    throw new Error("BigInt row 1 mismatch");
}

// 13. Edge Case: IEEE 754 Floating point specials (NaN, -0, Infinity, -Infinity)
const dfFloats = new DataFrame({
    a: [NaN, -Infinity],
    b: [-0, Infinity]
});
const tFloats = dfFloats.transpose();
if (!Number.isNaN(tFloats.item(0, "column_0"))) throw new Error("Expected NaN at (0, 0)");
if (tFloats.item(0, "column_1") !== -Infinity) throw new Error("Expected -Infinity at (0, 1)");
if (Object.is(tFloats.item(1, "column_0"), -0) !== true) throw new Error("Expected -0 preservation at (1, 0)");
if (tFloats.item(1, "column_1") !== Infinity) throw new Error("Expected Infinity at (1, 1)");

// 14. Edge Case: Homogeneous nested arrays & structs transposition
const dfArrays = new DataFrame({
    a: [["x", "y"], ["z"]],
    b: [["1", "2"], ["3"]]
});
const tArrays = dfArrays.transpose({ includeHeader: true, headerName: "orig" });
if (tArrays.height !== 2 || tArrays.columns.length !== 3) {
    throw new Error("Arrays transpose shape mismatch");
}
if (tArrays.item(0, "orig") !== "a" || tArrays.item(1, "orig") !== "b") {
    throw new Error("Arrays transpose header mismatch");
}
if (tArrays.item(0, "column_0")[0] !== "x" || tArrays.item(1, "column_0")[0] !== "1") {
    throw new Error("Arrays transpose values mismatch");
}

const dfStructs = new DataFrame({
    row1: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
    row2: [{ x: 50, y: 60 }, { x: 70, y: 80 }]
});
const tStructs = dfStructs.transpose({ includeHeader: true, headerName: "row_id" });
if (tStructs.height !== 2 || tStructs.columns.length !== 3) {
    throw new Error("Structs transpose shape mismatch");
}
if (tStructs.item(0, "column_0").x !== 10 || tStructs.item(1, "column_0").x !== 50) {
    throw new Error("Structs transpose values mismatch");
}

// 15. Edge Case: Transposing single 1x1 DataFrame
const dfSingle = new DataFrame({ x: [42] });
const tSingle = dfSingle.transpose({ includeHeader: true, headerName: "orig" });
if (tSingle.height !== 1 || tSingle.columns.length !== 2) {
    throw new Error("1x1 transpose shape mismatch");
}
if (tSingle.item(0, "orig") !== "x" || tSingle.item(0, "column_0") !== 42) {
    throw new Error("1x1 transpose value mismatch");
}

// 16. Edge Case: Collision between headerName and generated columnNames
assertThrows(() => {
    df.transpose({ includeHeader: true, headerName: "column_0" });
}, "Duplicate column name in transposed DataFrame");

// 17. Edge Case: All-Null / Heterogeneous Null sparse matrix
const dfAllNull = new DataFrame({
    col_a: [null, null, null],
    col_b: [null, null, null]
});
const tNull = dfAllNull.transpose({ includeHeader: true, headerName: "h" });
if (tNull.height !== 2 || tNull.columns.length !== 4) {
    throw new Error("All-null transpose shape mismatch");
}
if (tNull.schema.column_0.name !== "Null" || tNull.schema.column_1.name !== "Null" || tNull.schema.column_2.name !== "Null") {
    throw new Error("Expected all columns in all-null transpose to be Null type");
}
if (tNull.item(0, "column_0") !== null || tNull.item(1, "column_2") !== null) {
    throw new Error("All-null transpose item mismatch");
}

// 18. Edge Case: Binary (Uint8Array) Column Transposition
const b1 = new Uint8Array([1, 2, 3]);
const b2 = new Uint8Array([4, 5]);
const b3 = new Uint8Array([6]);
const b4 = new Uint8Array([7, 8, 9, 10]);
const dfBinary = new DataFrame({
    row1: [b1, b2],
    row2: [b3, b4]
});
const tBinary = dfBinary.transpose({ includeHeader: true, headerName: "bin_field" });
if (tBinary.height !== 2 || tBinary.columns.length !== 3) {
    throw new Error("Binary transpose shape mismatch");
}
if (tBinary.schema.column_0.name !== "Binary" || tBinary.schema.column_1.name !== "Binary") {
    throw new Error("Binary column schema mismatch");
}
if (tBinary.item(0, "column_0")[0] !== 1 || tBinary.item(1, "column_0")[0] !== 6) {
    throw new Error("Binary column 0 item values mismatch");
}
if (tBinary.item(0, "column_1")[0] !== 4 || tBinary.item(1, "column_1")[3] !== 10) {
    throw new Error("Binary column 1 item values mismatch");
}

// 19. Edge Case: Pure Temporal (Date & Datetime) Transposition
const d1 = new Date("2026-01-01T00:00:00.000Z");
const d2 = new Date("2026-06-01T00:00:00.000Z");
const d3 = new Date("2027-01-01T00:00:00.000Z");
const d4 = new Date("2027-06-01T00:00:00.000Z");
const dfDates = new DataFrame({
    t1: [d1, d2],
    t2: [d3, d4]
});
const tDates = dfDates.transpose({ includeHeader: true, headerName: "date_col" });
if (tDates.schema.column_0.name !== "Datetime" || tDates.schema.column_1.name !== "Datetime") {
    throw new Error("Temporal transpose schema mismatch");
}
if ((tDates.item(0, "column_0") as Date).getTime() !== d1.getTime() || (tDates.item(1, "column_0") as Date).getTime() !== d3.getTime()) {
    throw new Error("Temporal column 0 item values mismatch");
}

// 20. Edge Case: Boolean Falsy & Truthy boundary matrix
const dfBool = new DataFrame({
    b1: [false, false],
    b2: [true, false]
});
const tBool = dfBool.transpose();
if (tBool.schema.column_0.name !== "Boolean" || tBool.schema.column_1.name !== "Boolean") {
    throw new Error("Boolean transpose schema mismatch");
}
if (tBool.item(0, "column_0") !== false || tBool.item(1, "column_0") !== true) {
    throw new Error("Boolean column 0 values mismatch");
}
if (tBool.item(0, "column_1") !== false || tBool.item(1, "column_1") !== false) {
    throw new Error("Boolean column 1 values mismatch");
}

// 21. Edge Case: Degenerate Transpose - Only columnNames column (0 data columns left)
const dfNamesOnly = new DataFrame({
    col_names_only: ["A", "B", "C"]
});
const tNamesOnly = dfNamesOnly.transpose({ columnNames: "col_names_only" });
if (tNamesOnly.height !== 0) throw new Error("Expected height 0 when transposing single column used as columnNames");
if (tNamesOnly.columns.length !== 3 || tNamesOnly.columns[0] !== "A" || tNamesOnly.columns[2] !== "C") {
    throw new Error("Expected column names [A, B, C]");
}

// 22. Edge Case: Transposition Inversion Property (Double Transpose)
// (df.transpose().transpose() should preserve values and shape)
const origMatrix = new DataFrame({
    a: [10, 20, 30],
    b: [40, 50, 60]
});
const doubleTransposed = origMatrix.transpose().transpose();
if (doubleTransposed.height !== origMatrix.height) throw new Error("Double transpose height mismatch");
if (doubleTransposed.columns.length !== origMatrix.columns.length) throw new Error("Double transpose columns mismatch");
for (let r = 0; r < 3; r++) {
    if (doubleTransposed.item(r, "column_0") !== origMatrix.item(r, "a")) throw new Error("Double transpose 'a' mismatch");
    if (doubleTransposed.item(r, "column_1") !== origMatrix.item(r, "b")) throw new Error("Double transpose 'b' mismatch");
}

// 23. Edge Case: Column names containing special characters, whitespace, and numbers
const dfSpecial = new DataFrame({
    x: [1, 2],
    y: [3, 4]
});
const tSpecial = dfSpecial.transpose({ columnNames: [" col with spaces ", "🚀 emoji #1! "] });
if (tSpecial.columns[0] !== " col with spaces " || tSpecial.columns[1] !== "🚀 emoji #1! ") {
    throw new Error("Special character column names mismatch");
}
if (tSpecial.item(0, " col with spaces ") !== 1 || tSpecial.item(1, "🚀 emoji #1! ") !== 4) {
    throw new Error("Special character column values mismatch");
}

// 24. Edge Case: Transposing with Generator / Custom Set Iterable columnNames
function* nameGen() {
    yield "alpha";
    yield "beta";
}
const dfGen = new DataFrame({ x: [10, 20], y: [30, 40] });
const tGen = dfGen.transpose({ columnNames: nameGen() });
if (tGen.columns[0] !== "alpha" || tGen.columns[1] !== "beta") {
    throw new Error("Generator columnNames transpose failed");
}
if (tGen.item(0, "alpha") !== 10 || tGen.item(1, "beta") !== 40) {
    throw new Error("Generator columnNames values mismatch");
}

const tSet = dfGen.transpose({ columnNames: new Set(["first_col", "second_col"]) });
if (tSet.columns[0] !== "first_col" || tSet.columns[1] !== "second_col") {
    throw new Error("Set columnNames transpose failed");
}

// 25. Edge Case: Transposing with numeric keys in columnNames column
const dfNumericKeys = new DataFrame({
    year: [2024, 2025, 2026],
    revenue: [1000, 1500, 2200],
    profit: [200, 350, 500]
});
const tNumericKeys = dfNumericKeys.transpose({ columnNames: "year", includeHeader: true, headerName: "metric" });
if (tNumericKeys.height !== 2 || tNumericKeys.columns.length !== 4) {
    throw new Error("Numeric keys transpose shape mismatch");
}
// Note: In JavaScript, integer-like object keys are iterated first by Object.keys()
if (!tNumericKeys.columns.includes("metric") || !tNumericKeys.columns.includes("2024") || !tNumericKeys.columns.includes("2025") || !tNumericKeys.columns.includes("2026")) {
    throw new Error("Numeric keys column names mismatch");
}
if (tNumericKeys.item(0, "metric") !== "revenue" || tNumericKeys.item(1, "metric") !== "profit") {
    throw new Error("Numeric keys metric column mismatch");
}
if (tNumericKeys.item(0, "2024") !== 1000 || tNumericKeys.item(1, "2026") !== 500) {
    throw new Error("Numeric keys values mismatch");
}

// 26. Edge Case: Duplicate check with numeric-to-string keys in columnNames column
const dfDupNumeric = new DataFrame({
    k: [100, 100],
    v: [1, 2]
});
assertThrows(() => {
    dfDupNumeric.transpose({ columnNames: "k" });
}, "Duplicate column name in transposed DataFrame");

// 27. Edge Case: Type promotion across heterogeneous numeric columns (Int -> Float)
const dfMixedNumbers = new DataFrame({
    ints: [10, 20],
    floats: [1.5, 2.5]
});
const tMixedNumbers = dfMixedNumbers.transpose();
if (tMixedNumbers.schema.column_0.name !== "Float64" || tMixedNumbers.schema.column_1.name !== "Float64") {
    throw new Error("Heterogeneous numeric transpose type promotion failed");
}
if (tMixedNumbers.item(0, "column_0") !== 10 || tMixedNumbers.item(1, "column_0") !== 1.5) {
    throw new Error("Heterogeneous numeric values mismatch");
}

// 28. Edge Case: Transposing high-cardinality wide to tall DataFrame (1 row, 500 columns)
const wideObj: Record<string, number[]> = {};
for (let i = 0; i < 500; i++) {
    wideObj[`col_${i}`] = [i * 2];
}
const dfWide = new DataFrame(wideObj);
const tWide = dfWide.transpose({ includeHeader: true, headerName: "feat_name" });
if (tWide.height !== 500 || tWide.columns.length !== 2) {
    throw new Error("Wide transpose shape mismatch: expected (500, 2), got " + tWide.shape);
}
if (tWide.item(0, "feat_name") !== "col_0" || tWide.item(499, "feat_name") !== "col_499") {
    throw new Error("Wide transpose feature names mismatch");
}
if (tWide.item(0, "column_0") !== 0 || tWide.item(499, "column_0") !== 998) {
    throw new Error("Wide transpose cell values mismatch");
}

// 29. Edge Case: Transposing mixed objects, dates, and booleans with Utf8 coercion
const dfComplexTypes = new DataFrame({
    flag: [true, false],
    date: [new Date("2020-01-01"), new Date("2021-01-01")],
    val: [100n, 200n]
});
const tComplexTypes = dfComplexTypes.transpose({ includeHeader: true, headerName: "feature" });
if (tComplexTypes.height !== 3 || tComplexTypes.width !== 3) {
    throw new Error(`29. Complex types transpose shape mismatch: got ${tComplexTypes.shape}`);
}
if (tComplexTypes.item(0, "feature") !== "flag" || tComplexTypes.item(1, "feature") !== "date" || tComplexTypes.item(2, "feature") !== "val") {
    throw new Error("29. Feature header column mismatch");
}
if (tComplexTypes.item(0, "column_0") !== "true" || tComplexTypes.item(0, "column_1") !== "false") {
    throw new Error("29. Boolean row transpose mismatch");
}
if (tComplexTypes.item(2, "column_0") !== "100" || tComplexTypes.item(2, "column_1") !== "200") {
    throw new Error("29. BigInt row transpose mismatch");
}

// 30. Edge Case: Transpose columnNames from a boolean / number key column coerced to strings
const dfKeyTypes = new DataFrame({
    key: [true, false],
    v1: [10, 20],
    v2: [30, 40]
});
const tKeyTypes = dfKeyTypes.transpose({ columnNames: "key" });
if (tKeyTypes.columns[0] !== "true" || tKeyTypes.columns[1] !== "false") {
    throw new Error("30. Boolean column names transpose string coercion failed");
}
if (tKeyTypes.item(0, "true") !== 10 || tKeyTypes.item(1, "false") !== 40) {
    throw new Error("30. Boolean key values transpose mismatch");
}

// 31. Edge Case: Transpose single column DataFrame to single row with includeHeader
const dfSingleCol = new DataFrame({
    single_metric: [42, 84, 126]
});
const tSingleCol = dfSingleCol.transpose({ includeHeader: true, headerName: "metric_id" });
if (tSingleCol.height !== 1 || tSingleCol.width !== 4) {
    throw new Error("31. Single column transpose shape mismatch");
}
if (tSingleCol.item(0, "metric_id") !== "single_metric" || tSingleCol.item(0, "column_0") !== 42 || tSingleCol.item(0, "column_2") !== 126) {
    throw new Error("31. Single column transpose values mismatch");
}

// 32. Edge Case: Transpose with Generator/Iterable providing column names
function* nameGen32() {
    yield "alpha";
    yield "beta";
    yield "gamma";
}
const dfGenNames = new DataFrame({
    x: [1, 2, 3],
    y: [4, 5, 6]
});
const tGenNames = dfGenNames.transpose({ columnNames: nameGen32() });
if (tGenNames.columns[0] !== "alpha" || tGenNames.columns[1] !== "beta" || tGenNames.columns[2] !== "gamma") {
    throw new Error("32. Generator columnNames transpose failed");
}
if (tGenNames.item(0, "alpha") !== 1 || tGenNames.item(1, "gamma") !== 6) {
    throw new Error("32. Generator columnNames cell values mismatch");
}

console.log("✓ transpose tests passed!");
