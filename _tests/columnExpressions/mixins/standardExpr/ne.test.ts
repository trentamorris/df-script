declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.ne edge-case tests...");

// -------------------------------------------------------------
// Case 1: Column vs Column inequality
// -------------------------------------------------------------
const dfCol = $df.data([
    { a: 10, b: 10 },
    { a: 10, b: 20 },
    { a: null, b: null }
]);
const resCol = dfCol.select([
    $df.col("a").ne($df.col("b")).alias("n")
]).toDicts() as any[];
if (resCol[0].n !== false || resCol[1].n !== true || resCol[2].n !== null) {
    throw new Error("Case 1 failed: col vs col ne");
}

// -------------------------------------------------------------
// Case 2: Numeric scalar comparison
// -------------------------------------------------------------
const resScalar = dfCol.select([
    $df.col("a").ne(10).alias("n")
]).toDicts() as any[];
if (resScalar[0].n !== false || resScalar[1].n !== false || resScalar[2].n !== null) {
    throw new Error("Case 2 failed: numeric scalar ne");
}

// -------------------------------------------------------------
// Case 3: Array / vector argument
// -------------------------------------------------------------
const resArr = dfCol.select([
    $df.col("a").ne([10, 99, 10]).alias("n")
]).toDicts() as any[];
if (resArr[0].n !== false || resArr[1].n !== true || resArr[2].n !== null) {
    throw new Error("Case 3 failed: vector array ne");
}

// -------------------------------------------------------------
// Case 4: Date objects inequality
// -------------------------------------------------------------
const d1 = new Date("2026-01-01T00:00:00.000Z");
const d2 = new Date("2026-06-01T00:00:00.000Z");
const dfDate = $df.data([{ d: d1 }, { d: d2 }]);
const resDate = dfDate.select([
    $df.col("d").ne(d1).alias("n")
]).toDicts() as any[];
if (resDate[0].n !== false || resDate[1].n !== true) {
    throw new Error("Case 4 failed: date ne");
}

// -------------------------------------------------------------
// Case 5: String and BigInt comparisons
// -------------------------------------------------------------
const dfMisc = $df.data([
    { s: "hello", b: 10n },
    { s: "world", b: 20n }
]);
const resMisc = dfMisc.select([
    $df.col("s").ne("hello").alias("s_ne"),
    $df.col("b").ne(10n).alias("b_ne")
]).toDicts() as any[];
if (resMisc[0].s_ne !== false || resMisc[1].s_ne !== true) throw new Error("Case 5 failed: string ne");
if (resMisc[0].b_ne !== false || resMisc[1].b_ne !== true) throw new Error("Case 5 failed: bigint ne");

// -------------------------------------------------------------
// Case 6: Null and undefined propagation (SQL standard: comparison with null yields null)
// -------------------------------------------------------------
const dfNulls = $df.data([{ a: 10 }, { a: null }]);
const resNulls = dfNulls.select([
    $df.col("a").ne(null).alias("n_null"),
    $df.col("a").ne(undefined).alias("n_undef")
]).toDicts() as any[];
if (resNulls[0].n_null !== null || resNulls[1].n_null !== null) throw new Error("Case 6 failed: null yields null");
if (resNulls[0].n_undef !== null || resNulls[1].n_undef !== null) throw new Error("Case 6 failed: undef yields null");

// -------------------------------------------------------------
// Case 7: IEEE 754 NaN handling (NaN !== NaN is true, null propagation)
// -------------------------------------------------------------
const dfNaN = $df.data([
    { a: NaN, b: NaN },
    { a: NaN, b: 10 },
    { a: 10, b: NaN },
    { a: NaN, b: null }
]);
const resNaN = dfNaN.select([$df.col("a").ne($df.col("b")).alias("n")]).toDicts() as any[];
if (resNaN[0].n !== true) throw new Error("Case 7 failed: NaN ne NaN should be true");
if (resNaN[1].n !== true) throw new Error("Case 7 failed: NaN ne 10 should be true");
if (resNaN[2].n !== true) throw new Error("Case 7 failed: 10 ne NaN should be true");
if (resNaN[3].n !== null) throw new Error("Case 7 failed: NaN ne null should be null");

// -------------------------------------------------------------
// Case 8: Multi-column projection ($df.col(["a", "b"]).ne(10))
// -------------------------------------------------------------
const dfMulti = $df.data([
    { a: 10, b: 20 },
    { a: 30, b: 10 }
]);
const resMulti = dfMulti.select([
    $df.col(["a", "b"]).ne(10)
]).toDicts() as any[];
if (resMulti[0].a !== false || resMulti[0].b !== true) throw new Error("Case 8 failed: multi-col row 0");
if (resMulti[1].a !== true || resMulti[1].b !== false) throw new Error("Case 8 failed: multi-col row 1");

// -------------------------------------------------------------
// Case 9: Single-row DataFrame
// -------------------------------------------------------------
const dfSingle = $df.data([{ a: 42 }]);
const resSingle = dfSingle.select([$df.col("a").ne(42).alias("n")]).toDicts() as any[];
if (resSingle[0].n !== false) throw new Error("Case 9 failed: single row ne");

// -------------------------------------------------------------
// Case 10: Downstream expression chaining (.ne().not())
// -------------------------------------------------------------
const resChain = dfCol.select([
    $df.col("a").ne(10).not().alias("eq_again")
]).toDicts() as any[];
if (resChain[0].eq_again !== true || resChain[1].eq_again !== true || resChain[2].eq_again !== null) {
    throw new Error("Case 10 failed: chaining after ne");
}

console.log("✓ StandardExpr.ne tests passed!");
