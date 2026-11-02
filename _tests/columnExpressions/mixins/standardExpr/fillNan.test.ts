declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.fillNan tests...");

// -------------------------------------------------------------
// Case 1: Basic scalar replacement with { value: ... }
// -------------------------------------------------------------
const dfBasic = $df.data([
    { a: 10, b: 100 },
    { a: NaN, b: 200 },
    { a: 30, b: 300 }
]);

const resBasic = dfBasic.select([
    $df.col("a").fillNan({ value: 99 }).alias("f_val"),
    $df.col("a").fillNan({ value: $df.col("b") }).alias("f_col"),
    $df.col("a").fillNan({ strategy: "zero" }).alias("f_zero"),
    $df.col("a").fillNan({ strategy: "one" }).alias("f_one"),
    $df.col("a").fillNan({ strategy: "forward" }).alias("f_fwd"),
    $df.col("a").fillNan({ strategy: "backward" }).alias("f_bwd")
]).toDicts() as any[];

if (resBasic[0].f_val !== 10 || resBasic[1].f_val !== 99 || resBasic[2].f_val !== 30) throw new Error("Case 1 failed: fillNan scalar value");
if (resBasic[1].f_col !== 200) throw new Error("Case 1 failed: fillNan column expr value");
if (resBasic[1].f_zero !== 0) throw new Error("Case 1 failed: fillNan strategy zero");
if (resBasic[1].f_one !== 1) throw new Error("Case 1 failed: fillNan strategy one");
if (resBasic[1].f_fwd !== 10) throw new Error("Case 1 failed: fillNan strategy forward");
if (resBasic[1].f_bwd !== 30) throw new Error("Case 1 failed: fillNan strategy backward");

// -------------------------------------------------------------
// Case 2: Only NaN is replaced; null, 0, -0, valid numbers are preserved
// -------------------------------------------------------------
const dfMixed = $df.data([
    { val: NaN },
    { val: null },
    { val: 0 },
    { val: -0 },
    { val: 42 }
]);

const resMixed = dfMixed.select([
    $df.col("val").fillNan({ value: 999 }).alias("filled")
]).toDicts() as any[];

if (resMixed[0].filled !== 999) throw new Error("Case 2 failed: NaN not replaced");
if (resMixed[1].filled !== null) throw new Error("Case 2 failed: null was altered");
if (resMixed[2].filled !== 0) throw new Error("Case 2 failed: 0 was altered");
if (Object.is(resMixed[3].filled, -0) !== true && resMixed[3].filled !== 0) throw new Error("Case 2 failed: -0 was altered");
if (resMixed[4].filled !== 42) throw new Error("Case 2 failed: valid number altered");

// -------------------------------------------------------------
// Case 3: Statistical strategies ("min", "max", "mean")
// -------------------------------------------------------------
const dfStats = $df.data([
    { x: 10 },
    { x: NaN },
    { x: 20 },
    { x: NaN },
    { x: 30 }
]);

const resStats = dfStats.select([
    $df.col("x").fillNan({ strategy: "min" }).alias("s_min"),
    $df.col("x").fillNan({ strategy: "max" }).alias("s_max"),
    $df.col("x").fillNan({ strategy: "mean" }).alias("s_mean")
]).toDicts() as any[];

if (resStats[1].s_min !== 10 || resStats[3].s_min !== 10) throw new Error("Case 3 failed: min strategy");
if (resStats[1].s_max !== 30 || resStats[3].s_max !== 30) throw new Error("Case 3 failed: max strategy");
if (resStats[1].s_mean !== 20 || resStats[3].s_mean !== 20) throw new Error("Case 3 failed: mean strategy");

// -------------------------------------------------------------
// Case 4: Directional strategies ("forward", "backward") with limit
// -------------------------------------------------------------
const dfLimit = $df.data([
    { v: 100 },
    { v: NaN },
    { v: NaN },
    { v: NaN },
    { v: 500 }
]);

const resLimit = dfLimit.select([
    $df.col("v").fillNan({ strategy: "forward", limit: 1 }).alias("fwd_lim1"),
    $df.col("v").fillNan({ strategy: "backward", limit: 1 }).alias("bwd_lim1")
]).toDicts() as any[];

if (resLimit[1].fwd_lim1 !== 100) throw new Error("Case 4 failed: fwd limit index 1");
if (!Number.isNaN(resLimit[2].fwd_lim1)) throw new Error("Case 4 failed: fwd limit exceeded at index 2");
if (!Number.isNaN(resLimit[3].fwd_lim1)) throw new Error("Case 4 failed: fwd limit exceeded at index 3");

if (!Number.isNaN(resLimit[1].bwd_lim1)) throw new Error("Case 4 failed: bwd limit exceeded at index 1");
if (!Number.isNaN(resLimit[2].bwd_lim1)) throw new Error("Case 4 failed: bwd limit exceeded at index 2");
if (resLimit[3].bwd_lim1 !== 500) throw new Error("Case 4 failed: bwd limit index 3");

// -------------------------------------------------------------
// Case 5: Empty DataFrame with schema preserved via filter
// -------------------------------------------------------------
const dfEmpty = $df.data([{ a: 1 }]).filter($df.col("a").eq(999));
const resEmpty = dfEmpty.select([
    $df.col("a").fillNan({ value: 0 }).alias("a")
]).toDicts();
if (resEmpty.length !== 0) throw new Error("Case 5 failed: empty DataFrame");

// -------------------------------------------------------------
// Case 6: All NaNs column
// -------------------------------------------------------------
const dfAllNan = $df.data([
    { a: NaN },
    { a: NaN },
    { a: NaN }
]);

const resAllNan = dfAllNan.select([
    $df.col("a").fillNan({ value: 77 }).alias("val"),
    $df.col("a").fillNan({ strategy: "forward" }).alias("fwd"),
    $df.col("a").fillNan({ strategy: "backward" }).alias("bwd")
]).toDicts() as any[];

if (resAllNan[0].val !== 77 || resAllNan[1].val !== 77 || resAllNan[2].val !== 77) throw new Error("Case 6 failed: all NaNs scalar");
if (!Number.isNaN(resAllNan[0].fwd) || !Number.isNaN(resAllNan[1].fwd) || !Number.isNaN(resAllNan[2].fwd)) {
    throw new Error("Case 6 failed: forward on all NaNs should remain NaN");
}
if (!Number.isNaN(resAllNan[0].bwd) || !Number.isNaN(resAllNan[1].bwd) || !Number.isNaN(resAllNan[2].bwd)) {
    throw new Error("Case 6 failed: backward on all NaNs should remain NaN");
}

// -------------------------------------------------------------
// Case 7: Multi-column projection via col(["a", "b"])
// -------------------------------------------------------------
const dfMulti = $df.data([
    { a: NaN, b: 1, c: 99 },
    { a: 2, b: NaN, c: 99 }
]);

const resMulti = dfMulti.select([
    $df.col(["a", "b"]).fillNan({ value: 0 })
]).toDicts() as any[];

if (resMulti[0].a !== 0 || resMulti[0].b !== 1) throw new Error("Case 7 failed: multi col row 0");
if (resMulti[1].a !== 2 || resMulti[1].b !== 0) throw new Error("Case 7 failed: multi col row 1");

// -------------------------------------------------------------
// Case 8: Expression chaining after fillNan
// -------------------------------------------------------------
const dfChain = $df.data([
    { a: 5 },
    { a: NaN },
    { a: 10 }
]);

const resChain = dfChain.select([
    $df.col("a").fillNan({ value: 2 }).mul(10).alias("chained")
]).toDicts() as any[];

if (resChain[0].chained !== 50 || resChain[1].chained !== 20 || resChain[2].chained !== 100) {
    throw new Error("Case 8 failed: expression chaining after fillNan");
}

// -------------------------------------------------------------
// Case 9: Single-row DataFrame
// -------------------------------------------------------------
const dfSingle = $df.data([{ v: NaN }]);
const resSingle = dfSingle.select([
    $df.col("v").fillNan({ value: 42 }).alias("v")
]).toDicts() as any[];
if (resSingle[0].v !== 42) throw new Error("Case 9 failed: single row");

// -------------------------------------------------------------
// Case 10: fillNan with null replacement value
// -------------------------------------------------------------
const dfNullFill = $df.data([{ v: NaN }, { v: 10 }]);
const resNullFill = dfNullFill.select([
    $df.col("v").fillNan({ value: null }).alias("v")
]).toDicts() as any[];
if (resNullFill[0].v !== null || resNullFill[1].v !== 10) throw new Error("Case 10 failed: null replacement value");

console.log("✓ StandardExpr.fillNan tests passed!");
