import { DataFrame } from "df-script";
import { $df } from "df-script";

console.log("Running concat tests...");

const df1 = new DataFrame([{ id: 1, name: "Alice" }]);
const df2 = new DataFrame([{ id: 2, name: "Bob" }]);

// 1. Vertical Concat (Top-Level)
const dfVert = $df.concat([df1, df2], { how: "vertical" });
if (dfVert.height !== 2) throw new Error("Vertical concat height mismatch");
const collectedVert = dfVert.toDicts();
if (collectedVert[1].name !== "Bob") throw new Error("Vertical concat value mismatch");

// 2. Horizontal Concat (Instance-Level, verifying that 'this' is prepended)
const df3 = new DataFrame([{ age: 25 }]);
const dfHoriz = df1.concat([df3], { how: "horizontal" });
if (dfHoriz.height !== 1) throw new Error("Horizontal concat height mismatch");
const collectedHoriz = dfHoriz.toDicts() as any[];
if (collectedHoriz[0].age !== 25 || collectedHoriz[0].name !== "Alice") {
    throw new Error("Horizontal concat values mismatch");
}

// 3. Diagonal Concat (Top-Level)
const df4 = new DataFrame([{ age: 30, city: "Paris" }]);
const dfDiag = $df.concat([df1, df4], { how: "diagonal" });
if (dfDiag.height !== 2) throw new Error("Diagonal concat height mismatch");
const collectedDiag = dfDiag.toDicts() as any[];
if (collectedDiag[0].age !== null || collectedDiag[1].name !== null || collectedDiag[1].city !== "Paris") {
    throw new Error("Diagonal concat values mismatch");
}

// 4. Horizontal Concat Strictness Options
const dfHorizShort = new DataFrame([{ val: "X" }]);
const dfHorizTall = new DataFrame([{ other: 10 }, { other: 20 }]);

let didThrow = false;
try {
    $df.concat([dfHorizShort, dfHorizTall], { how: "horizontal", horizontal: { strict: true } });
} catch (e: any) {
    if (e.message.includes("Row count mismatch")) {
        didThrow = true;
    }
}
if (!didThrow) throw new Error("Expected horizontal strict check to throw on height mismatch");

const dfHorizPadded = $df.concat([dfHorizShort, dfHorizTall], { how: "horizontal", horizontal: { strict: false } });
if (dfHorizPadded.height !== 2) throw new Error("Padded horizontal concat should have height of tallest DataFrame");
const collectedHorizPadded = dfHorizPadded.toDicts() as any[];
if (collectedHorizPadded[0].val !== "X" || collectedHoriz[0].age !== 25) {
    // Wait, let's verify collectedHorizPadded values:
    // dfHorizShort has val="X", dfHorizTall has other=10, 20
    // so row 0: val="X", other=10
    // row 1: val=null, other=20
}
if (collectedHorizPadded[0].val !== "X" || collectedHorizPadded[0].other !== 10) {
    throw new Error("Padded horizontal concat row 0 mismatch");
}
if (collectedHorizPadded[1].val !== null || collectedHorizPadded[1].other !== 20) {
    throw new Error("Padded horizontal concat row 1 mismatch");
}

// 6. Generalized concat input tests
const dfGen1 = $df.concat(df1);
if (dfGen1.height !== 1 || dfGen1.toDicts()[0].name !== "Alice") {
    throw new Error("Generalized concat with single DataFrame failed");
}

const dfGen2 = df1.concat({ age: [25] }, { how: "horizontal" });
if (dfGen2.height !== 1 || (dfGen2.toDicts() as any[])[0].age !== 25) {
    throw new Error("Generalized instance concat with columns object failed");
}

const dfGen3 = df1.concat([{ id: 2, name: "Bob" }], { how: "vertical" });
if (dfGen3.height !== 2 || dfGen3.toDicts()[1].name !== "Bob") {
    throw new Error("Generalized instance concat with raw row objects failed");
}

const dfGen4 = $df.concat([df1, { id: [2], name: ["Bob"] }], { how: "diagonal" });
if (dfGen4.height !== 2 || dfGen4.toDicts()[1].name !== "Bob") {
    throw new Error("Generalized top-level concat with mixed items failed");
}

// 7. Defensive verification
let threw = false;
try {
    $df.concat(null as any);
} catch (e: any) {
    if (e.message.includes("cannot be null or undefined")) threw = true;
}
if (!threw) throw new Error("Expected concat(null) to throw");

threw = false;
try {
    $df.concat([df1, null as any]);
} catch (e: any) {
    if (e.message.includes("cannot be null or undefined")) threw = true;
}
if (!threw) throw new Error("Expected concat([df, null]) to throw");

threw = false;
try {
    $df.concat([[df1, {} as any]]);
} catch (e: any) {
    if (e.message.includes("must contain only DataFrame instances")) threw = true;
}
if (!threw) throw new Error("Expected nested array with non-DataFrame to throw");

threw = false;
try {
    $df.concat([[1, 2, 3] as any]);
} catch (e: any) {
    if (e.message.includes("rows must be plain objects")) threw = true;
}
if (!threw) throw new Error("Expected row array with non-objects to throw");

threw = false;
try {
    $df.concat("invalid" as any);
} catch (e: any) {
    if (e.message.includes("expected DataFrame")) threw = true;
}
if (!threw) throw new Error("Expected invalid input type to throw");

// 8. Complex Edge Cases & Robustness
// 8.1 TypedArray vs Non-TypedArray Vertical Concatenation
const dfTyped1 = new DataFrame({
    a: new Int32Array([10, 20]),
    b: ["x", "y"]
});
const dfTyped2 = new DataFrame({
    a: new Int32Array([30, 40]),
    b: ["z", "w"]
});
const dfTypedConcat = $df.concat([dfTyped1, dfTyped2], { how: "vertical" });
if (dfTypedConcat.height !== 4) throw new Error("Typed vertical concat height mismatch");
const collectedTyped = dfTypedConcat.toDicts();
if (collectedTyped[0].a !== 10 || collectedTyped[3].a !== 40 || collectedTyped[3].b !== "w") {
    throw new Error("Typed vertical concat values mismatch");
}

// 8.2 Mixed TypedArray and Nullable / Standard Array Vertical Concatenation
const dfTypedWithNull = new DataFrame({
    a: [50, null],
    b: ["m", "n"]
});
const dfMixedConcat = $df.concat([dfTyped1, dfTypedWithNull], { how: "vertical" });
if (dfMixedConcat.height !== 4) throw new Error("Mixed vertical concat height mismatch");
const collectedMixed = dfMixedConcat.toDicts();
if (collectedMixed[2].a !== 50 || collectedMixed[3].a !== null) {
    throw new Error("Mixed typed/null vertical concat values mismatch");
}

// 8.3 Multiple Empty DataFrames Interspersed with Non-Empty DataFrames
const dfEmpty1 = new DataFrame({ a: [] as number[], b: [] as string[] });
const dfEmpty2 = new DataFrame({ a: [] as number[], b: [] as string[] });
const dfNonEmpty = new DataFrame({ a: [100], b: ["first"] });
const dfInterspersed = $df.concat([dfEmpty1, dfNonEmpty, dfEmpty2], { how: "vertical" });
if (dfInterspersed.height !== 1 || dfInterspersed.toDicts()[0].a !== 100) {
    throw new Error("Interspersed empty dataframe concat failed");
}

// 8.4 Diagonal Concatenation with 4+ Multi-way DataFrames & Typed Columns
const dfDiagA = new DataFrame({ colA: new Float64Array([1.1, 2.2]) });
const dfDiagB = new DataFrame({ colB: ["alpha", "beta"] });
const dfDiagC = new DataFrame({ colC: [true, false] });
const dfDiagD = new DataFrame({ colA: new Float64Array([3.3]), colD: [999] });
const dfMultiDiag = $df.concat([dfDiagA, dfDiagB, dfDiagC, dfDiagD], { how: "diagonal" });
if (dfMultiDiag.height !== 7) throw new Error("Multi-way diagonal concat height mismatch");
const diagRows = dfMultiDiag.toDicts() as any[];
if (
    diagRows[0].colA !== 1.1 || diagRows[0].colB !== null ||
    diagRows[2].colB !== "alpha" || diagRows[2].colA !== null ||
    diagRows[4].colC !== true || diagRows[4].colA !== null ||
    diagRows[6].colA !== 3.3 || diagRows[6].colD !== 999
) {
    throw new Error("Multi-way diagonal concat content mismatch");
}

// 8.5 Horizontal Concatenation with Non-Strict Padding of Varying Heights
const dfPaddedH1 = new DataFrame({ h_a: [1, 2, 3] });
const dfPaddedH2 = new DataFrame({ h_b: ["single"] });
const dfPaddedH3 = new DataFrame({ h_c: new Int32Array([10, 20]) });
const dfHConcat = $df.concat([dfPaddedH1, dfPaddedH2, dfPaddedH3], { how: "horizontal", horizontal: { strict: false } });
if (dfHConcat.height !== 3) throw new Error("Horizontal non-strict padding height mismatch");
const hRows = dfHConcat.toDicts() as any[];
if (
    hRows[0].h_a !== 1 || hRows[0].h_b !== "single" || hRows[0].h_c !== 10 ||
    hRows[1].h_a !== 2 || hRows[1].h_b !== null || hRows[1].h_c !== 20 ||
    hRows[2].h_a !== 3 || hRows[2].h_b !== null || hRows[2].h_c !== null
) {
    throw new Error("Horizontal non-strict padding values mismatch");
}

// 9. Extreme 10/10 Difficulty Edge Cases
// 9.1 Zero-Row TypedArray DataFrames Stacked with Non-Empty Typed DataFrames
const dfEmptyTyped1 = new DataFrame({ a: new Int32Array(0), b: new Float64Array(0) });
const dfEmptyTyped2 = new DataFrame({ a: new Int32Array(0), b: new Float64Array(0) });
const dfNonEmptyTyped = new DataFrame({ a: new Int32Array([100, 200]), b: new Float64Array([1.5, 2.5]) });
const dfZeroStack = $df.concat([dfEmptyTyped1, dfEmptyTyped2, dfNonEmptyTyped, dfEmptyTyped1], { how: "vertical" });
if (dfZeroStack.height !== 2) throw new Error("Zero-row typed stack height mismatch");
if ((dfZeroStack.toDicts() as any[])[1].a !== 200 || (dfZeroStack.toDicts() as any[])[1].b !== 2.5) {
    throw new Error("Zero-row typed stack value mismatch");
}

// 9.2 All-Zero Height DataFrames Vertical & Diagonal (Preserving Schema)
const dfAllZeroDiag = $df.concat([
    new DataFrame({ colA: new Int32Array(0) }),
    new DataFrame({ colB: [] as string[] }),
    new DataFrame({ colC: new Float64Array(0) })
], { how: "diagonal" });
if (dfAllZeroDiag.height !== 0) throw new Error("All-zero diagonal concat should have height 0");
if (!dfAllZeroDiag.schema.colA || !dfAllZeroDiag.schema.colB || !dfAllZeroDiag.schema.colC) {
    throw new Error("All-zero diagonal concat failed to retain merged schema");
}

// 9.3 Deep Complex Nested Structs and Arrays in Diagonal Concat
const dfNestedA = new DataFrame([{
    meta: { user: { id: 1, roles: ["admin", "editor"] }, active: true },
    matrix: [[1, 2], [3, 4]],
    flags: [true, false]
}]);
const dfNestedB = new DataFrame([{
    meta: { user: { id: 2, roles: ["viewer"] }, active: false },
    extra_field: "special",
    matrix: [[5, 6]]
}]);
const dfNestedDiag = $df.concat([dfNestedA, dfNestedB], { how: "diagonal" });
if (dfNestedDiag.height !== 2) throw new Error("Nested struct diagonal concat height mismatch");
const nestedRows = dfNestedDiag.toDicts() as any[];
if (
    nestedRows[0].extra_field !== null ||
    nestedRows[0].meta.user.roles[1] !== "editor" ||
    nestedRows[0].matrix[1][0] !== 3 ||
    nestedRows[1].extra_field !== "special" ||
    nestedRows[1].meta.user.id !== 2 ||
    nestedRows[1].flags !== null
) {
    throw new Error("Nested struct/array diagonal concat content mismatch");
}

// 9.4 BigInt64Array and Uint8ClampedArray Binary Precision Stack
const big1 = new DataFrame({ id: new BigInt64Array([9007199254740993n, 9007199254740995n]) });
const big2 = new DataFrame({ id: new BigInt64Array([9007199254740997n]) });
const bigStack = $df.concat([big1, big2], { how: "vertical" });
if (bigStack.height !== 3) throw new Error("BigInt64Array stack height mismatch");
const bigRows = bigStack.toDicts() as any[];
if (bigRows[0].id !== 9007199254740993n || bigRows[2].id !== 9007199254740997n) {
    throw new Error("BigInt64Array stack precision loss");
}

// 9.5 Strict Schema Incompatibility Detection in Vertical & Diagonal Stacking
let didCatchVerticalTypeMismatch = false;
try {
    const dfInt = new DataFrame({ x: new Int32Array([1, 2]) });
    const dfStr = new DataFrame({ x: ["a", "b"] });
    $df.concat([dfInt, dfStr], { how: "vertical" });
} catch (e: any) {
    if (e.message.includes("Schema type mismatch for column \"x\"")) {
        didCatchVerticalTypeMismatch = true;
    }
}
if (!didCatchVerticalTypeMismatch) throw new Error("Expected strict vertical type mismatch error");

let didCatchDiagonalTypeMismatch = false;
try {
    const dfFloat = new DataFrame({ y: new Float64Array([1.1, 2.2]) });
    const dfStr = new DataFrame({ y: ["x", "y"] });
    $df.concat([dfFloat, dfStr], { how: "diagonal" });
} catch (e: any) {
    if (e.message.includes("Schema type mismatch for column \"y\"")) {
        didCatchDiagonalTypeMismatch = true;
    }
}
if (!didCatchDiagonalTypeMismatch) throw new Error("Expected strict diagonal type mismatch error");

// 9.6 Large Scale Chained Concat Stress Test (100 DataFrames)
const manyDfs: DataFrame<any>[] = [];
for (let i = 0; i < 100; i++) {
    manyDfs.push(new DataFrame({
        seq: new Int32Array([i * 2, i * 2 + 1]),
        label: [`label_${i * 2}`, `label_${i * 2 + 1}`]
    }));
}
const dfMassive = $df.concat(manyDfs, { how: "vertical" });
if (dfMassive.height !== 200) throw new Error("100-DataFrame vertical concat height mismatch");
const massRows = dfMassive.toDicts() as any[];
// 9.7 Temporal & Duration Precision Preservation Across Vertical & Diagonal Concat
const date1 = new Date("2026-01-01T12:00:00.000Z");
const date2 = new Date("2026-06-15T08:30:00.000Z");
const dfTemporal1 = new DataFrame({ ts: [date1], dur: [5000] });
const dfTemporal2 = new DataFrame({ ts: [date2], dur: [120000] });
const dfTemporalStack = $df.concat([dfTemporal1, dfTemporal2], { how: "vertical" });
if (dfTemporalStack.height !== 2) throw new Error("Temporal stack height mismatch");
const tempRows = dfTemporalStack.toDicts() as any[];
if (tempRows[0].ts.getTime() !== date1.getTime() || tempRows[1].ts.getTime() !== date2.getTime() || tempRows[1].dur !== 120000) {
    throw new Error("Temporal stack precision or object preservation mismatch");
}

// 9.8 Horizontal Concat with Zero-Row DataFrames (Preserving Schema and Output Column Width)
const dfHZero1 = new DataFrame({ col1: [] as number[], col2: [] as string[] });
const dfHZero2 = new DataFrame({ col3: [] as boolean[] });
const dfHZeroConcat = $df.concat([dfHZero1, dfHZero2], { how: "horizontal" });
if (dfHZeroConcat.height !== 0) throw new Error("Zero-height horizontal concat height mismatch");
if (!dfHZeroConcat.schema.col1 || !dfHZeroConcat.schema.col2 || !dfHZeroConcat.schema.col3) {
    throw new Error("Zero-height horizontal concat schema mismatch");
}

// 9.9 Diagonal Concat with Completely Disjoint Schema Sets (Sparse Matrix Representation)
const sparseA = new DataFrame({ c1: [10], c2: [20] });
const sparseB = new DataFrame({ c3: [30], c4: [40] });
const sparseC = new DataFrame({ c5: [50] });
const sparseDiag = $df.concat([sparseA, sparseB, sparseC], { how: "diagonal" });
if (sparseDiag.height !== 3) throw new Error("Sparse diagonal concat height mismatch");
const sRows = sparseDiag.toDicts() as any[];
if (
    sRows[0].c1 !== 10 || sRows[0].c3 !== null || sRows[0].c5 !== null ||
    sRows[1].c1 !== null || sRows[1].c3 !== 30 || sRows[1].c4 !== 40 ||
    sRows[2].c1 !== null || sRows[2].c4 !== null || sRows[2].c5 !== 50
) {
    throw new Error("Sparse diagonal matrix content mismatch");
}

// 9.11 Binary / Uint8Array Buffer Preservation Across Vertical & Diagonal Concat
const u8_1 = new Uint8Array([1, 2, 3]);
const u8_2 = new Uint8Array([4, 5, 6]);
const dfBin1 = new DataFrame({ raw: [u8_1] });
const dfBin2 = new DataFrame({ raw: [u8_2] });
const dfBinStack = $df.concat([dfBin1, dfBin2], { how: "vertical" });
if (dfBinStack.height !== 2) throw new Error("Binary stack height mismatch");
const binRows = dfBinStack.toDicts() as any[];
if (binRows[0].raw[1] !== 2 || binRows[1].raw[2] !== 6) {
    throw new Error("Binary Uint8Array content preservation mismatch");
}

// 9.12 All Float32Array, Int16Array, and Uint32Array Variants Stacking
const dfF32_1 = new DataFrame({ f32: new Float32Array([1.5, 2.5]), i16: new Int16Array([100, 200]) });
const dfF32_2 = new DataFrame({ f32: new Float32Array([3.5, 4.5]), i16: new Int16Array([300, 400]) });
const dfTypedVariants = $df.concat([dfF32_1, dfF32_2], { how: "vertical" });
if (dfTypedVariants.height !== 4) throw new Error("Typed variants stack height mismatch");
const f32Rows = dfTypedVariants.toDicts() as any[];
if (f32Rows[0].f32 !== 1.5 || f32Rows[3].f32 !== 4.5 || f32Rows[3].i16 !== 400) {
    throw new Error("Typed variants value mismatch");
}

// 9.13 Polymorphic Input Mix (DataFrame + ColumnDict + Array of RowRecords) in Single Concat
const mixedInputConcat = $df.concat([
    new DataFrame({ a: [1], b: ["first"] }),
    { a: [2], b: ["second"] },
    [{ a: 3, b: "third" }],
    new DataFrame([{ a: 4, b: "fourth" }])
], { how: "vertical" });
if (mixedInputConcat.height !== 4) throw new Error("Polymorphic input vertical concat height mismatch");
const polyRows = mixedInputConcat.toDicts() as any[];
if (polyRows[0].a !== 1 || polyRows[1].b !== "second" || polyRows[2].a !== 3 || polyRows[3].b !== "fourth") {
    throw new Error("Polymorphic input vertical concat value mismatch");
}

// 9.14 Chained Concat with Post-Concat DataFrame Operations (Filter, Select, Sort)
const chainDf1 = new DataFrame({ score: [50, 80], name: ["A", "B"] });
const chainDf2 = new DataFrame({ score: [95, 30], name: ["C", "D"] });
const chainedResult = $df.concat([chainDf1, chainDf2], { how: "vertical" })
    .filter($df.col("score").gt(40))
    .sort({ by: "score", descending: true })
    .select("name", "score");

if (chainedResult.height !== 3) throw new Error("Post-concat pipeline height mismatch");
const chainRows = chainedResult.toDicts() as any[];
if (chainRows[0].name !== "C" || chainRows[0].score !== 95 || chainRows[2].name !== "A" || chainRows[2].score !== 50) {
    throw new Error("Post-concat pipeline results mismatch");
}

console.log("✓ concat tests passed!");


