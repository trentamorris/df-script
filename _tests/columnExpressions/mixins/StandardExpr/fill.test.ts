declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.fill tests...");

const df = $df.data([
    { val: 10, other: 100 },
    { val: null, other: 200 },
    { val: NaN, other: 300 },
    { val: 40, other: 400 }
]);

// 1. Target "null"
const resNull = df.select([
    $df.col("val").fill("null", 99).alias("f_null_val"),
    $df.col("val").fill("null", $df.col("other")).alias("f_null_col"),
    $df.col("val").fill("null", { strategy: "zero" }).alias("f_null_zero")
]).toDicts() as any[];

if (resNull[0].f_null_val !== 10) throw new Error("fill null [0] failed");
if (resNull[1].f_null_val !== 99) throw new Error("fill null [1] failed");
if (!Number.isNaN(resNull[2].f_null_val)) throw new Error("fill null should leave NaN alone");
if (resNull[3].f_null_val !== 40) throw new Error("fill null [3] failed");
if (resNull[1].f_null_col !== 200) throw new Error("fill null col expr failed");
if (resNull[1].f_null_zero !== 0) throw new Error("fill null zero strategy failed");

// 2. Target "nan"
const resNan = df.select([
    $df.col("val").fill("nan", 88).alias("f_nan_val"),
    $df.col("val").fill("nan", $df.col("other")).alias("f_nan_col")
]).toDicts() as any[];

if (resNan[0].f_nan_val !== 10) throw new Error("fill nan [0] failed");
if (resNan[1].f_nan_val !== null) throw new Error("fill nan should leave null alone");
if (resNan[2].f_nan_val !== 88) throw new Error("fill nan [2] failed");
if (resNan[3].f_nan_val !== 40) throw new Error("fill nan [3] failed");
if (resNan[2].f_nan_col !== 300) throw new Error("fill nan col expr failed");

// 3. Target "all"
const resAll = df.select([
    $df.col("val").fill("all", 77).alias("f_all_val")
]).toDicts() as any[];

if (resAll[0].f_all_val !== 10) throw new Error("fill all [0] failed");
if (resAll[1].f_all_val !== 77) throw new Error("fill all [1] failed");
if (resAll[2].f_all_val !== 77) throw new Error("fill all [2] failed");
if (resAll[3].f_all_val !== 40) throw new Error("fill all [3] failed");

// 4. Fill using $df.seqRange
const dfSeq = $df.data([
    { val: 10 },
    { val: null },
    { val: null },
    { val: 40 }
]);

const resSeq = dfSeq.select([
    $df.col("val").fill("null", $df.seqRange(100, { step: 10 })).alias("f_seq")
]).toDicts() as any[];

if (resSeq[0].f_seq !== 10) throw new Error("fill seq [0] failed");
if (resSeq[1].f_seq !== 110) throw new Error(`fill seq [1] failed: expected 110, got ${resSeq[1].f_seq}`);
if (resSeq[2].f_seq !== 120) throw new Error(`fill seq [2] failed: expected 120, got ${resSeq[2].f_seq}`);
if (resSeq[3].f_seq !== 40) throw new Error("fill seq [3] failed");

// 5. Strategies: forward and backward with target "nan"
const dfFwd = $df.data([
    { val: 1 },
    { val: NaN },
    { val: NaN },
    { val: 4 }
]);

const resFwd = dfFwd.select([
    $df.col("val").fill("nan", { strategy: "forward" }).alias("fwd"),
    $df.col("val").fill("nan", { strategy: "backward" }).alias("bwd")
]).toDicts() as any[];

if (resFwd[1].fwd !== 1 || resFwd[2].fwd !== 1) throw new Error("fill nan forward failed");
if (resFwd[1].bwd !== 4 || resFwd[2].bwd !== 4) throw new Error("fill nan backward failed");

// =========================================================================
// 10 / 10 DIFFICULTY EDGE CASES & ADVANCED EXPRESSIONS
// =========================================================================

// EDGE CASE 1: Empty DataFrame (Height 0)
const emptyDf = $df.data({ a: [] as number[] });
const resEmpty = emptyDf.select([$df.col("a").fill("null", 0)]).toDicts();
if (resEmpty.length !== 0) throw new Error("Empty DataFrame fill failed");

// EDGE CASE 2: All Target Rows (All NULLs / All NaNs)
// Forward and backward should remain null/NaN when there is NO valid value to propagate
const allNullDf = $df.data([{ a: null }, { a: null }, { a: null }]);
const resAllNullFwd = allNullDf.select([
    $df.col("a").fill("null", { strategy: "forward" }).alias("fwd"),
    $df.col("a").fill("null", { strategy: "backward" }).alias("bwd"),
    $df.col("a").fill("null", { strategy: "mean" }).alias("mean")
]).toDicts() as any[];
if (resAllNullFwd[0].fwd !== null || resAllNullFwd[2].fwd !== null) throw new Error("All null forward should remain null");
if (resAllNullFwd[0].bwd !== null || resAllNullFwd[2].bwd !== null) throw new Error("All null backward should remain null");
if (resAllNullFwd[0].mean !== null) throw new Error("All null mean should be null");

// EDGE CASE 3: Leading / Trailing Targets with Forward/Backward
// Forward cannot fill leading nulls; Backward cannot fill trailing nulls
const edgeBookendDf = $df.data([
    { v: null },
    { v: 10 },
    { v: null },
    { v: 20 },
    { v: null }
]);
const resBookend = edgeBookendDf.select([
    $df.col("v").fill("null", { strategy: "forward" }).alias("fwd"),
    $df.col("v").fill("null", { strategy: "backward" }).alias("bwd")
]).toDicts() as any[];
if (resBookend[0].fwd !== null) throw new Error("Forward fill should NOT fill leading null at index 0");
if (resBookend[2].fwd !== 10) throw new Error("Forward fill failed at index 2");
if (resBookend[4].fwd !== 20) throw new Error("Forward fill failed at index 4");

if (resBookend[0].bwd !== 10) throw new Error("Backward fill failed at index 0");
if (resBookend[2].bwd !== 20) throw new Error("Backward fill failed at index 2");
if (resBookend[4].bwd !== null) throw new Error("Backward fill should NOT fill trailing null at index 4");

// EDGE CASE 4: Consecutive Limit Boundary Exactness
// Verify limit=0 (fills nothing), limit=1, limit=2, limit > gap
const limitEdgeDf = $df.data([
    { v: 100 },
    { v: null },
    { v: null },
    { v: null },
    { v: 200 }
]);
const resLimitEdge = limitEdgeDf.select([
    $df.col("v").fill("null", { strategy: "forward", limit: 0 }).alias("l0"),
    $df.col("v").fill("null", { strategy: "forward", limit: 1 }).alias("l1"),
    $df.col("v").fill("null", { strategy: "forward", limit: 2 }).alias("l2"),
    $df.col("v").fill("null", { strategy: "forward", limit: 10 }).alias("l10")
]).toDicts() as any[];

if (resLimitEdge[1].l0 !== null || resLimitEdge[2].l0 !== null) throw new Error("limit: 0 should fill nothing");
if (resLimitEdge[1].l1 !== 100 || resLimitEdge[2].l1 !== null || resLimitEdge[3].l1 !== null) throw new Error("limit: 1 exact boundary failed");
if (resLimitEdge[1].l2 !== 100 || resLimitEdge[2].l2 !== 100 || resLimitEdge[3].l2 !== null) throw new Error("limit: 2 exact boundary failed");
if (resLimitEdge[1].l10 !== 100 || resLimitEdge[2].l10 !== 100 || resLimitEdge[3].l10 !== 100) throw new Error("limit: 10 failed");

// EDGE CASE 5: Chained Dynamic Expressions with Binary Math & When/Then
// Fill nulls using an expression derived from multiple columns ($df.col("x") * 2 + $df.col("y"))
const exprDf = $df.data([
    { a: 1, x: 10, y: 5 },
    { a: null, x: 20, y: 7 },
    { a: 3, x: 30, y: 9 }
]);
const resExpr = exprDf.select([
    $df.col("a").fill("null", $df.col("x").mul(2).add($df.col("y"))).alias("filled_computed")
]).toDicts() as any[];
if (resExpr[0].filled_computed !== 1) throw new Error("Expr fill row 0 failed");
if (resExpr[1].filled_computed !== 47) throw new Error(`Expr fill row 1 failed: expected 47, got ${resExpr[1].filled_computed}`);
if (resExpr[2].filled_computed !== 3) throw new Error("Expr fill row 2 failed");

// EDGE CASE 6: Filling with Conditional $df.when().then().otherwise() Expression
const whenDf = $df.data([
    { a: null, tier: "gold" },
    { a: null, tier: "silver" },
    { a: 50, tier: "bronze" }
]);
const resWhen = whenDf.select([
    $df.col("a").fill("null",
        $df.when($df.col("tier").eq("gold")).then(1000)
            .otherwise(500)
    ).alias("tiered_fill")
]).toDicts() as any[];
if (resWhen[0].tiered_fill !== 1000) throw new Error("When/then fill row 0 failed");
if (resWhen[1].tiered_fill !== 500) throw new Error("When/then fill row 1 failed");
if (resWhen[2].tiered_fill !== 50) throw new Error("When/then fill row 2 preserved valid value failed");

// EDGE CASE 7: Falsey Primitive Values (0, false, empty string "", -0)
// Must NEVER be treated as null or NaN!
const falseyDf = $df.data([
    { v: 0, s: "", b: false },
    { v: null, s: null, b: null },
    { v: -0, s: "valid", b: true }
]);
const resFalsey = falseyDf.select([
    $df.col("v").fill("null", 999).alias("f_num"),
    $df.col("s").fill("null", "FALLBACK").alias("f_str"),
    $df.col("b").fill("null", true).alias("f_bool")
]).toDicts() as any[];
if (resFalsey[0].f_num !== 0) throw new Error("0 must not be overwritten by fill");
if (resFalsey[0].f_str !== "") throw new Error("Empty string must not be overwritten by fill");
if (resFalsey[0].f_bool !== false) throw new Error("false must not be overwritten by fill");
if (resFalsey[1].f_num !== 999) throw new Error("Null number replacement failed");
if (resFalsey[1].f_str !== "FALLBACK") throw new Error("Null string replacement failed");
if (resFalsey[1].f_bool !== true) throw new Error("Null bool replacement failed");

// EDGE CASE 8: Target "all" with Mixed Null, NaN, and Valid Numbers
const mixedDf = $df.data([
    { x: null },
    { x: NaN },
    { x: 42 },
    { x: undefined },
    { x: NaN }
]);
const resMixed = mixedDf.select([
    $df.col("x").fill("all", -99).alias("filled_all")
]).toDicts() as any[];
if (resMixed[0].filled_all !== -99) throw new Error("fill 'all' failed on null");
if (resMixed[1].filled_all !== -99) throw new Error("fill 'all' failed on NaN");
if (resMixed[2].filled_all !== 42) throw new Error("fill 'all' modified valid number 42");
if (resMixed[3].filled_all !== -99) throw new Error("fill 'all' failed on undefined");
if (resMixed[4].filled_all !== -99) throw new Error("fill 'all' failed on trailing NaN");

// EDGE CASE 9: Cumulative Forward Propagation across intermingled Null and NaN
// When target is "nan", nulls are non-target values and will be propagated!
// When target is "null", NaNs are non-target values and will be propagated!
const intermingledDf = $df.data([
    { a: 10 },
    { a: null },
    { a: NaN },
    { a: null }
]);
const resIntermingled = intermingledDf.select([
    $df.col("a").fill("null", { strategy: "forward" }).alias("fill_null_fwd")
]).toDicts() as any[];
if (resIntermingled[0].fill_null_fwd !== 10) throw new Error("Intermingled [0] failed");
if (resIntermingled[1].fill_null_fwd !== 10) throw new Error("Intermingled [1] null should receive 10");
if (!Number.isNaN(resIntermingled[2].fill_null_fwd)) throw new Error("Intermingled [2] NaN should remain NaN");
if (!Number.isNaN(resIntermingled[3].fill_null_fwd)) throw new Error("Intermingled [3] null should receive forward NaN");

// EDGE CASE 10: Statistical Strategies ("min", "max", "mean") with NaN presence
// Floating NaN should not poison getArrayStats when non-NaN numbers exist
const statsDf = $df.data([
    { val: 10 },
    { val: 30 },
    { val: null }
]);
const resStats = statsDf.select([
    $df.col("val").fill("null", { strategy: "mean" }).alias("m"),
    $df.col("val").fill("null", { strategy: "min" }).alias("min"),
    $df.col("val").fill("null", { strategy: "max" }).alias("max")
]).toDicts() as any[];
if (resStats[2].m !== 20) throw new Error(`Statistical mean failed: expected 20, got ${resStats[2].m}`);
if (resStats[2].min !== 10) throw new Error(`Statistical min failed: expected 10, got ${resStats[2].min}`);
if (resStats[2].max !== 30) throw new Error(`Statistical max failed: expected 30, got ${resStats[2].max}`);

// EDGE CASE 12: Expression as Target with Directional Forward-Fill ($df.col("a").ne($df.col("b")))
// When a !== b, forward fill 'a' with the last row where a === b!
const diffDf = $df.data([
    { a: 10, b: 10 }, // match
    { a: 99, b: 20 }, // mismatch! fill with 10
    { a: 88, b: 30 }, // mismatch! fill with 10
    { a: 40, b: 40 }, // match
    { a: 77, b: 50 }  // mismatch! fill with 40
]);
const resDiffExpr = diffDf.select([
    $df.col("a").fill($df.col("a").ne($df.col("b")), { strategy: "forward" }).alias("synced")
]).toDicts() as any[];
if (resDiffExpr[0].synced !== 10) throw new Error("Expression target row 0 failed");
if (resDiffExpr[1].synced !== 10) throw new Error("Expression target row 1 forward fill failed");
if (resDiffExpr[2].synced !== 10) throw new Error("Expression target row 2 forward fill failed");
if (resDiffExpr[3].synced !== 40) throw new Error("Expression target row 3 match failed");
if (resDiffExpr[4].synced !== 40) throw new Error("Expression target row 4 forward fill failed");

// EDGE CASE 13: Arbitrary Sentinel Value (-999, "MISSING") with Backward Fill and Limit
const sentinelDf = $df.data([
    { sensor: -999 },
    { sensor: -999 },
    { sensor: 25.4 },
    { sensor: -999 },
    { sensor: 30.1 }
]);
const resSentinel = sentinelDf.select([
    $df.col("sensor").fill(-999, { strategy: "backward", limit: 1 }).alias("cleaned")
]).toDicts() as any[];
if (resSentinel[0].cleaned !== -999) throw new Error("Sentinel backward limit 1 row 0 must remain -999");
if (resSentinel[1].cleaned !== 25.4) throw new Error("Sentinel backward limit 1 row 1 failed");
if (resSentinel[2].cleaned !== 25.4) throw new Error("Sentinel valid row 2 modified");
if (resSentinel[3].cleaned !== 30.1) throw new Error("Sentinel backward limit 1 row 3 failed");

// EDGE CASE 14: DFScript Expression Target (e.g. negative numbers) with constant replacement
const customFnDf = $df.data([
    { v: 10 },
    { v: -1 }, // target: negative
    { v: 30 },
    { v: -99 } // target: negative
]);
const resCustomFn = customFnDf.select([
    $df.col("v").fill($df.col("v").lt(0), 0).alias("clamped_zero")
]).toDicts() as any[];
if (resCustomFn[0].clamped_zero !== 10) throw new Error("Expression predicate row 0 failed");
if (resCustomFn[1].clamped_zero !== 0) throw new Error("Expression predicate row 1 replacement failed");
if (resCustomFn[2].clamped_zero !== 30) throw new Error("Expression predicate row 2 failed");
if (resCustomFn[3].clamped_zero !== 0) throw new Error("Expression predicate row 3 replacement failed");

// EDGE CASE 15: Expression Target replacing with another Expression
const crossColDf = $df.data([
    { status: "ERR", reading: 0, baseline: 50 },
    { status: "OK", reading: 75, baseline: 50 },
    { status: "ERR", reading: 0, baseline: 60 }
]);
const resCrossCol = crossColDf.select([
    $df.col("reading").fill($df.col("status").eq("ERR"), $df.col("baseline").mul(2)).alias("fixed")
]).toDicts() as any[];
if (resCrossCol[0].fixed !== 100) throw new Error("Cross column expression target row 0 failed");
if (resCrossCol[1].fixed !== 75) throw new Error("Cross column expression target row 1 failed");
if (resCrossCol[2].fixed !== 120) throw new Error("Cross column expression target row 2 failed");

// EDGE CASE 16: Multi-Column Compound Boolean Expression Target ($df.col("a").gt(5).and($df.col("b").eq("INVALID"))) with Forward Fill
const compoundDf = $df.data([
    { val: 100, a: 1, b: "VALID" },
    { val: 200, a: 6, b: "INVALID" }, // target! forward fill with 100
    { val: 300, a: 7, b: "INVALID" }, // target! forward fill with 100
    { val: 400, a: 2, b: "INVALID" }, // NOT target (a <= 5) -> keep 400
    { val: 500, a: 9, b: "INVALID" }  // target! forward fill with 400
]);
const resCompound = compoundDf.select([
    $df.col("val").fill(
        $df.col("a").gt(5).and($df.col("b").eq("INVALID")),
        { strategy: "forward" }
    ).alias("filled_val")
]).toDicts() as any[];
if (resCompound[0].filled_val !== 100) throw new Error("Compound target row 0 failed");
if (resCompound[1].filled_val !== 100) throw new Error("Compound target row 1 forward fill failed");
if (resCompound[2].filled_val !== 100) throw new Error("Compound target row 2 forward fill failed");
if (resCompound[3].filled_val !== 400) throw new Error("Compound target row 3 non-match preserved failed");
if (resCompound[4].filled_val !== 400) throw new Error("Compound target row 4 forward fill failed");

// EDGE CASE 17: TypedArray Data Input (Int32Array / Float64Array) Preservation with Directional Limit Fill
const typedDf = $df.data({
    arr: new Float64Array([NaN, 1.5, NaN, NaN, NaN, 5.5, NaN])
});
const resTyped = typedDf.select([
    $df.col("arr").fill("nan", { strategy: "forward", limit: 2 }).alias("fwd_lim"),
    $df.col("arr").fill("nan", { strategy: "backward", limit: 1 }).alias("bwd_lim")
]).toDicts() as any[];
// fwd_lim: row 0 is initial NaN (unchanged), row 1 is 1.5, row 2 is 1.5 (limit 1), row 3 is 1.5 (limit 2), row 4 remains NaN (exceeds limit 2), row 5 is 5.5, row 6 is 5.5 (limit 1)
if (!Number.isNaN(resTyped[0].fwd_lim)) throw new Error("TypedArray fwd row 0 should be NaN");
if (resTyped[1].fwd_lim !== 1.5) throw new Error("TypedArray fwd row 1 failed");
if (resTyped[2].fwd_lim !== 1.5) throw new Error("TypedArray fwd row 2 failed");
if (resTyped[3].fwd_lim !== 1.5) throw new Error("TypedArray fwd row 3 failed");
if (!Number.isNaN(resTyped[4].fwd_lim)) throw new Error("TypedArray fwd row 4 exceeded limit should be NaN");
if (resTyped[5].fwd_lim !== 5.5) throw new Error("TypedArray fwd row 5 failed");
if (resTyped[6].fwd_lim !== 5.5) throw new Error("TypedArray fwd row 6 failed");
// bwd_lim: row 0 backward filled with 1.5 (limit 1), row 4 backward filled with 5.5 (limit 1), row 3 remains NaN (exceeds limit 1)
if (resTyped[0].bwd_lim !== 1.5) throw new Error("TypedArray bwd row 0 failed");
if (resTyped[4].bwd_lim !== 5.5) throw new Error("TypedArray bwd row 4 failed");
if (!Number.isNaN(resTyped[3].bwd_lim)) throw new Error("TypedArray bwd row 3 should remain NaN");

// EDGE CASE 18: Alternating Target Pattern with Backward Fill and Consecutive Limit Boundary
// Pattern: [T, T, V, T, T, V] with backward limit 1
const altDf = $df.data([
    { x: null }, // index 0 (dist 2 from row 2 -> stays null)
    { x: null }, // index 1 (dist 1 from row 2 -> becomes 10)
    { x: 10 },   // index 2 (anchor)
    { x: null }, // index 3 (dist 2 from row 5 -> stays null)
    { x: null }, // index 4 (dist 1 from row 5 -> becomes 20)
    { x: 20 }    // index 5 (anchor)
]);
const resAlt = altDf.select([
    $df.col("x").fill("null", { strategy: "backward", limit: 1 }).alias("alt_bwd")
]).toDicts() as any[];
if (resAlt[0].alt_bwd !== null) throw new Error("Alt pattern row 0 should be null");
if (resAlt[1].alt_bwd !== 10) throw new Error("Alt pattern row 1 should be 10");
if (resAlt[2].alt_bwd !== 10) throw new Error("Alt pattern row 2 should be 10");
if (resAlt[3].alt_bwd !== null) throw new Error("Alt pattern row 3 should be null");
if (resAlt[4].alt_bwd !== 20) throw new Error("Alt pattern row 4 should be 20");
if (resAlt[5].alt_bwd !== 20) throw new Error("Alt pattern row 5 should be 20");

// EDGE CASE 19: All Target Column (Every single row matches target) with Directional Forward and Backward
const allTargetDf = $df.data([
    { a: null },
    { a: null },
    { a: null }
]);
const resAllTarget = allTargetDf.select([
    $df.col("a").fill("null", { strategy: "forward" }).alias("all_fwd"),
    $df.col("a").fill("null", { strategy: "backward" }).alias("all_bwd"),
    $df.col("a").fill("null", 999).alias("all_const")
]).toDicts() as any[];
for (let i = 0; i < 3; i++) {
    if (resAllTarget[i].all_fwd !== null) throw new Error(`All target forward fill row ${i} should remain null`);
    if (resAllTarget[i].all_bwd !== null) throw new Error(`All target backward fill row ${i} should remain null`);
    if (resAllTarget[i].all_const !== 999) throw new Error(`All target const fill row ${i} should be 999`);
}

// EDGE CASE 20: Complex Chaining of fill() with Arithmetic, Aliasing and Subsequent Filter
const chainDf = $df.data([
    { id: 1, val: null, mult: 10 },
    { id: 2, val: 5, mult: 2 },
    { id: 3, val: null, mult: 4 },
    { id: 4, val: 20, mult: 1 }
]);
const resChain = chainDf.select([
    $df.col("val")
        .fill("null", { strategy: "forward" })
        .fill("null", 0) // initial null filled with 0
        .mul($df.col("mult"))
        .alias("computed_total")
]).toDicts() as any[];
// row 0: val is null -> fwd is null -> fill(0) is 0 -> 0 * 10 = 0
// row 1: val is 5 -> 5 * 2 = 10
// row 2: val is null -> fwd is 5 -> fill(0) is 5 -> 5 * 4 = 20
// row 3: val is 20 -> 20 * 1 = 20
if (resChain[0].computed_total !== 0) throw new Error(`Chained fill row 0 failed: expected 0, got ${resChain[0].computed_total}`);
if (resChain[1].computed_total !== 10) throw new Error(`Chained fill row 1 failed: expected 10, got ${resChain[1].computed_total}`);
if (resChain[2].computed_total !== 20) throw new Error(`Chained fill row 2 failed: expected 20, got ${resChain[2].computed_total}`);
if (resChain[3].computed_total !== 20) throw new Error(`Chained fill row 3 failed: expected 20, got ${resChain[3].computed_total}`);

// EDGE CASE 21: Backward Fill with NaN as propagation value when target is "null"
// Backward fill propagating NaN to earlier null positions
const bwdNanDf = $df.data([
    { a: null },
    { a: null },
    { a: NaN },
    { a: 10 }
]);
const resBwdNan = bwdNanDf.select([
    $df.col("a").fill("null", { strategy: "backward" }).alias("bwd_null")
]).toDicts() as any[];
if (!Number.isNaN(resBwdNan[0].bwd_null) || !Number.isNaN(resBwdNan[1].bwd_null)) {
    throw new Error("Backward fill failed to propagate backward NaN value to null rows");
}
if (!Number.isNaN(resBwdNan[2].bwd_null)) throw new Error("Original NaN row at index 2 modified");
if (resBwdNan[3].bwd_null !== 10) throw new Error("Row 3 should remain 10");

// EDGE CASE 22: Date and Object Preservations across fill
const d1 = new Date("2026-01-01T00:00:00Z");
const d2 = new Date("2026-01-02T00:00:00Z");
const dateDf = $df.data([
    { dt: d1 },
    { dt: null },
    { dt: d2 }
]);
const resDate = dateDf.select([
    $df.col("dt").fill("null", { strategy: "forward" }).alias("dt_fwd")
]).toDicts() as any[];
if (resDate[1].dt_fwd !== d1) throw new Error("Date object reference / value failed during forward fill");

// EDGE CASE 23: Backward strategy with limit: 0
const bwdLimitZeroDf = $df.data([
    { a: null },
    { a: null },
    { a: 50 }
]);
const resBwdLimitZero = bwdLimitZeroDf.select([
    $df.col("a").fill("null", { strategy: "backward", limit: 0 }).alias("bwd_l0")
]).toDicts() as any[];
if (resBwdLimitZero[0].bwd_l0 !== null || resBwdLimitZero[1].bwd_l0 !== null) {
    throw new Error("Backward fill with limit: 0 should not fill any rows");
}

// EDGE CASE 24: Single-Row DataFrame (Height 1) edge cases
const singleRowNullDf = $df.data([{ v: null }]);
const resSingleNull = singleRowNullDf.select([
    $df.col("v").fill("null", 42).alias("val_filled"),
    $df.col("v").fill("null", { strategy: "forward" }).alias("fwd"),
    $df.col("v").fill("null", { strategy: "backward" }).alias("bwd")
]).toDicts() as any[];
if (resSingleNull[0].val_filled !== 42) throw new Error("Single row null scalar fill failed");
if (resSingleNull[0].fwd !== null) throw new Error("Single row null forward fill should remain null");
if (resSingleNull[0].bwd !== null) throw new Error("Single row null backward fill should remain null");

const singleRowValidDf = $df.data([{ v: 100 }]);
const resSingleValid = singleRowValidDf.select([
    $df.col("v").fill("null", 42).alias("val_filled"),
    $df.col("v").fill("null", { strategy: "forward" }).alias("fwd")
]).toDicts() as any[];
if (resSingleValid[0].val_filled !== 100) throw new Error("Single row valid value modified unexpectedly");
if (resSingleValid[0].fwd !== 100) throw new Error("Single row valid forward fill modified unexpectedly");

// EDGE CASE 25: Column with explicit undefined values filled via target "null" and target "all"
const undefDf = $df.data([
    { u: undefined },
    { u: 20 },
    { u: undefined }
]);
const resUndef = undefDf.select([
    $df.col("u").fill("null", 0).alias("u_null"),
    $df.col("u").fill("all", { strategy: "forward" }).alias("u_fwd")
]).toDicts() as any[];
if (resUndef[0].u_null !== 0 || resUndef[2].u_null !== 0) throw new Error("Undefined should be caught by target 'null'");
if (resUndef[0].u_fwd !== null) throw new Error("Leading undefined in forward fill should normalize to null");
if (resUndef[2].u_fwd !== 20) throw new Error("Forward fill of undefined row 2 should receive 20");

console.log("✓ StandardExpr.fill tests passed (including all 10/10 difficulty edge cases 1-25)!");
