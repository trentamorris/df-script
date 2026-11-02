declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.ge edge-case tests...");

// -------------------------------------------------------------
// Case 1: Column vs Column comparison
// -------------------------------------------------------------
const dfCol = $df.data([
    { a: 10, b: 10 },
    { a: 15, b: 10 },
    { a: 5, b: 10 }
]);
const resCol = dfCol.select([$df.col("a").ge($df.col("b")).alias("g")]).toDicts() as any[];
if (resCol[0].g !== true || resCol[1].g !== true || resCol[2].g !== false) {
    throw new Error("Case 1 failed: col vs col");
}

// -------------------------------------------------------------
// Case 2: Numeric scalar comparison
// -------------------------------------------------------------
const resScalar = dfCol.select([$df.col("a").ge(10).alias("g")]).toDicts() as any[];
if (resScalar[0].g !== true || resScalar[1].g !== true || resScalar[2].g !== false) {
    throw new Error("Case 2 failed: numeric scalar");
}

// -------------------------------------------------------------
// Case 3: Array / Vector comparison
// -------------------------------------------------------------
const resArr = dfCol.select([$df.col("a").ge([10, 20, 0]).alias("g")]).toDicts() as any[];
if (resArr[0].g !== true || resArr[1].g !== false || resArr[2].g !== true) {
    throw new Error("Case 3 failed: vector array comparison");
}

// -------------------------------------------------------------
// Case 4: Date objects comparison
// -------------------------------------------------------------
const d1 = new Date("2026-01-01T00:00:00.000Z");
const d2 = new Date("2026-06-01T00:00:00.000Z");
const d3 = new Date("2026-12-31T00:00:00.000Z");
const dfDate = $df.data([{ d: d1 }, { d: d2 }, { d: d3 }]);
const resDate = dfDate.select([$df.col("d").ge(d2).alias("g")]).toDicts() as any[];
if (resDate[0].g !== false || resDate[1].g !== true || resDate[2].g !== true) {
    throw new Error("Case 4 failed: date comparison");
}

// -------------------------------------------------------------
// Case 5: Lexicographical String comparison
// -------------------------------------------------------------
const dfStr = $df.data([{ s: "apple" }, { s: "banana" }, { s: "cherry" }]);
const resStr = dfStr.select([$df.col("s").ge("banana").alias("g")]).toDicts() as any[];
if (resStr[0].g !== false || resStr[1].g !== true || resStr[2].g !== true) {
    throw new Error("Case 5 failed: string comparison");
}

// -------------------------------------------------------------
// Case 6: BigInt comparison
// -------------------------------------------------------------
const dfBig = $df.data([{ n: 10n }, { n: 20n }, { n: 5n }]);
const resBig = dfBig.select([$df.col("n").ge(10n).alias("g")]).toDicts() as any[];
if (resBig[0].g !== true || resBig[1].g !== true || resBig[2].g !== false) {
    throw new Error("Case 6 failed: bigint comparison");
}

// -------------------------------------------------------------
// Case 7: Null handling in column and argument
// -------------------------------------------------------------
const dfNull = $df.data([{ a: 10 }, { a: null }, { a: 20 }]);
const resNull1 = dfNull.select([$df.col("a").ge(null).alias("g")]).toDicts() as any[];
const resNull2 = dfNull.select([$df.col("a").ge(15).alias("g")]).toDicts() as any[];
if (resNull1[0].g !== null || resNull1[1].g !== null || resNull1[2].g !== null) {
    throw new Error("Case 7 failed: ge(null) should return null");
}
if (resNull2[0].g !== false || resNull2[1].g !== null || resNull2[2].g !== true) {
    throw new Error("Case 7 failed: null in column should yield null");
}

// -------------------------------------------------------------
// Case 8: NaN edge cases (IEEE 754: any comparison with NaN is false, except null propagation)
// -------------------------------------------------------------
const dfNaN = $df.data([
    { a: NaN, b: 10 },
    { a: 10, b: NaN },
    { a: NaN, b: NaN },
    { a: NaN, b: null }
]);
const resNaN = dfNaN.select([$df.col("a").ge($df.col("b")).alias("g")]).toDicts() as any[];
if (resNaN[0].g !== false) throw new Error("Case 8 failed: NaN ge 10 should be false");
if (resNaN[1].g !== false) throw new Error("Case 8 failed: 10 ge NaN should be false");
if (resNaN[2].g !== false) throw new Error("Case 8 failed: NaN ge NaN should be false");
if (resNaN[3].g !== null) throw new Error("Case 8 failed: NaN ge null should be null");

// -------------------------------------------------------------
// Case 9: Multi-column projection via col(["a", "b"]).ge(10)
// -------------------------------------------------------------
const dfMulti = $df.data([
    { a: 5, b: 15 },
    { a: 10, b: 10 }
]);
const resMulti = dfMulti.select([$df.col(["a", "b"]).ge(10)]).toDicts() as any[];
if (resMulti[0].a !== false || resMulti[0].b !== true) throw new Error("Case 9 failed: multi-col row 0");
if (resMulti[1].a !== true || resMulti[1].b !== true) throw new Error("Case 9 failed: multi-col row 1");

// -------------------------------------------------------------
// Case 10: Chaining after ge (.ge().not(), etc.)
// -------------------------------------------------------------
const resChain = dfCol.select([$df.col("a").ge(10).not().alias("g")]).toDicts() as any[];
if (resChain[0].g !== false || resChain[1].g !== false || resChain[2].g !== true) {
    throw new Error("Case 10 failed: chaining after ge");
}

console.log("✓ StandardExpr.ge tests passed!");
