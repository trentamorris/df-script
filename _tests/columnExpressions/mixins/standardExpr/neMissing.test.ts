declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.neMissing edge-case tests...");

// -------------------------------------------------------------
// Case 1: Column vs Column difference treating null as equal
// -------------------------------------------------------------
const dfCol = $df.data([
    { a: 10, b: 10 },
    { a: 10, b: 20 },
    { a: null, b: null },
    { a: 10, b: null },
    { a: null, b: 20 }
]);
const resCol = dfCol.select([
    $df.col("a").neMissing($df.col("b")).alias("n")
]).toDicts() as any[];
if (resCol[0].n !== false || resCol[1].n !== true || resCol[2].n !== false || resCol[3].n !== true || resCol[4].n !== true) {
    throw new Error("Case 1 failed: col vs col neMissing");
}

// -------------------------------------------------------------
// Case 2: Literal null comparison (checking for non-nullness without SQL null absorption)
// -------------------------------------------------------------
const resNullLit = dfCol.select([
    $df.col("a").neMissing(null).alias("not_null")
]).toDicts() as any[];
// a = [10, 10, null, 10, null] -> not_null = [true, true, false, true, false]
if (resNullLit[0].not_null !== true || resNullLit[1].not_null !== true || resNullLit[2].not_null !== false || resNullLit[3].not_null !== true || resNullLit[4].not_null !== false) {
    throw new Error("Case 2 failed: literal null neMissing");
}

// -------------------------------------------------------------
// Case 3: Literal undefined comparison (treated as missing/null)
// -------------------------------------------------------------
const resUndefLit = dfCol.select([
    $df.col("a").neMissing(undefined).alias("not_undef")
]).toDicts() as any[];
if (resUndefLit[2].not_undef !== false || resUndefLit[0].not_undef !== true) {
    throw new Error("Case 3 failed: literal undefined neMissing");
}

// -------------------------------------------------------------
// Case 4: Numeric scalar comparison
// -------------------------------------------------------------
const resScalar = dfCol.select([
    $df.col("a").neMissing(10).alias("n")
]).toDicts() as any[];
if (resScalar[0].n !== false || resScalar[1].n !== false || resScalar[2].n !== true) {
    throw new Error("Case 4 failed: numeric scalar neMissing");
}

// -------------------------------------------------------------
// Case 5: Array / vector argument
// -------------------------------------------------------------
const resArr = dfCol.select([
    $df.col("a").neMissing([10, 20, null, 99, 100]).alias("n")
]).toDicts() as any[];
// a = [10, 10, null, 10, null] vs [10, 20, null, 99, 100] -> [false, true, false, true, true]
if (resArr[0].n !== false || resArr[1].n !== true || resArr[2].n !== false || resArr[3].n !== true || resArr[4].n !== true) {
    throw new Error("Case 5 failed: vector array neMissing");
}

// -------------------------------------------------------------
// Case 6: Date objects neMissing
// -------------------------------------------------------------
const d1 = new Date("2026-01-01T00:00:00.000Z");
const d2 = new Date("2026-06-01T00:00:00.000Z");
const dfDate = $df.data([{ d: d1 }, { d: d2 }, { d: null }]);
const resDate = dfDate.select([
    $df.col("d").neMissing(d1).alias("n1"),
    $df.col("d").neMissing(null).alias("n2")
]).toDicts() as any[];
if (resDate[0].n1 !== false || resDate[1].n1 !== true || resDate[2].n1 !== true) throw new Error("Case 6 failed: date neMissing");
if (resDate[0].n2 !== true || resDate[1].n2 !== true || resDate[2].n2 !== false) throw new Error("Case 6 failed: date null neMissing");

// -------------------------------------------------------------
// Case 7: String and BigInt comparisons
// -------------------------------------------------------------
const dfMisc = $df.data([
    { s: "hello", b: 10n },
    { s: null, b: null }
]);
const resMisc = dfMisc.select([
    $df.col("s").neMissing("hello").alias("s_ne"),
    $df.col("s").neMissing(null).alias("s_null"),
    $df.col("b").neMissing(10n).alias("b_ne"),
    $df.col("b").neMissing(null).alias("b_null")
]).toDicts() as any[];
if (resMisc[0].s_ne !== false || resMisc[1].s_ne !== true) throw new Error("Case 7 failed: string neMissing");
if (resMisc[0].s_null !== true || resMisc[1].s_null !== false) throw new Error("Case 7 failed: string null neMissing");
if (resMisc[0].b_ne !== false || resMisc[1].b_ne !== true) throw new Error("Case 7 failed: bigint neMissing");
if (resMisc[0].b_null !== true || resMisc[1].b_null !== false) throw new Error("Case 7 failed: bigint null neMissing");

// -------------------------------------------------------------
// Case 8: NaN comparison in neMissing (NaN !== NaN is true, NaN !== null is true)
// -------------------------------------------------------------
const dfNaN = $df.data([
    { a: NaN, b: NaN },
    { a: NaN, b: 10 },
    { a: NaN, b: null }
]);
const resNaN = dfNaN.select([
    $df.col("a").neMissing($df.col("b")).alias("n")
]).toDicts() as any[];
if (resNaN[0].n !== true) throw new Error("Case 8 failed: NaN neMissing NaN should be true");
if (resNaN[1].n !== true) throw new Error("Case 8 failed: NaN neMissing 10 should be true");
if (resNaN[2].n !== true) throw new Error("Case 8 failed: NaN neMissing null should be true");

// -------------------------------------------------------------
// Case 9: Multi-column projection ($df.col(["a", "b"]).neMissing(null))
// -------------------------------------------------------------
const dfMulti = $df.data([
    { a: 1, b: null },
    { a: null, b: 2 }
]);
const resMulti = dfMulti.select([
    $df.col(["a", "b"]).neMissing(null)
]).toDicts() as any[];
if (resMulti[0].a !== true || resMulti[0].b !== false) throw new Error("Case 9 failed: multi-col row 0");
if (resMulti[1].a !== false || resMulti[1].b !== true) throw new Error("Case 9 failed: multi-col row 1");

// -------------------------------------------------------------
// Case 10: Downstream expression chaining (.neMissing().not())
// -------------------------------------------------------------
const resChain = dfCol.select([
    $df.col("a").neMissing(null).not().alias("is_null")
]).toDicts() as any[];
if (resChain[0].is_null !== false || resChain[2].is_null !== true) {
    throw new Error("Case 10 failed: chaining after neMissing");
}

console.log("✓ StandardExpr.neMissing tests passed!");
