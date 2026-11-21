import { DataFrame, $df } from "df-script";

console.log("Running fillNull tests...");

const df = new DataFrame({
    a: [1, null, 3, null, 5],
    b: [null, "x", null, "y", null],
    c: [true, null, false, true, null]
});

// 1. Constant value filling
const resConst = df.fillNull({ value: 99 });
const dictsConst = resConst.toDicts();
if (dictsConst[1].a !== 99 || dictsConst[0].b !== "99" || dictsConst[1].c !== "99") {
    throw new Error("Constant value fillNull failed");
}

// 2. Strategies: "zero" and "one"
const resZero = df.fillNull({ strategy: "zero" });
const dictsZero = resZero.toDicts();
if (dictsZero[1].a !== 0 || dictsZero[0].b !== "0" || dictsZero[1].c !== "0") {
    throw new Error("Zero strategy fillNull failed");
}

const resOne = df.fillNull({ strategy: "one" });
const dictsOne = resOne.toDicts();
if (dictsOne[1].a !== 1 || dictsOne[0].b !== "1" || dictsOne[1].c !== "1") {
    throw new Error("One strategy fillNull failed");
}

// 3. Aggregate strategies: "min", "max", and "mean"
const dfNumeric = new DataFrame({
    a: [2, null, 6, null, 10] // min: 2, max: 10, mean: 6
});

const resMin = dfNumeric.fillNull({ strategy: "min" });
if (resMin.item(1, "a") !== 2 || resMin.item(3, "a") !== 2) {
    throw new Error("Min strategy fillNull failed");
}

const resMax = dfNumeric.fillNull({ strategy: "max" });
if (resMax.item(1, "a") !== 10 || resMax.item(3, "a") !== 10) {
    throw new Error("Max strategy fillNull failed");
}

const resMean = dfNumeric.fillNull({ strategy: "mean" });
if (resMean.item(1, "a") !== 6 || resMean.item(3, "a") !== 6) {
    throw new Error("Mean strategy fillNull failed");
}

// 4. Sequence propagation: "forward" and "backward"
const dfSeq = new DataFrame({
    a: [1, null, null, 4, null]
});

// Forward-fill without limit
const resFwd = dfSeq.fillNull({ strategy: "forward" });
if (
    resFwd.item(1, "a") !== 1 ||
    resFwd.item(2, "a") !== 1 ||
    resFwd.item(4, "a") !== 4
) {
    throw new Error("Forward strategy fillNull without limit failed");
}

// Forward-fill with limit = 1
const resFwdLimit = dfSeq.fillNull({ strategy: "forward", limit: 1 });
if (
    resFwdLimit.item(1, "a") !== 1 ||
    resFwdLimit.item(2, "a") !== null || // limited
    resFwdLimit.item(4, "a") !== 4
) {
    throw new Error("Forward strategy fillNull with limit failed");
}

// Backward-fill without limit
const resBwd = dfSeq.fillNull({ strategy: "backward" });
if (
    resBwd.item(1, "a") !== 4 ||
    resBwd.item(2, "a") !== 4 ||
    resBwd.item(4, "a") !== null // no next value
) {
    throw new Error("Backward strategy fillNull without limit failed");
}

// Backward-fill with limit = 1
const resBwdLimit = dfSeq.fillNull({ strategy: "backward", limit: 1 });
if (
    resBwdLimit.item(1, "a") !== null || // limited (distance is 2 index steps backward to 4)
    resBwdLimit.item(2, "a") !== 4 || // within limit of 1
    resBwdLimit.item(4, "a") !== null
) {
    throw new Error("Backward strategy fillNull with limit failed");
}

// 6. Comprehensive ColumnExpr and DataFrame edge cases
const dfEdge = new DataFrame({
    nums: [null, 10, null, null, 20, null],
    leading_nulls: [null, null, 100, 200, 300, 400],
    trailing_nulls: [100, 200, 300, 400, null, null],
    all_nulls: [null, null, null, null, null, null],
    no_nulls: [1, 2, 3, 4, 5, 6],
    strings: [null, "alpha", null, "beta", null, "gamma"]
});

// Expression level fillNull with literal and expressions
const resExpr = dfEdge.select([
    $df.col("nums").fillNull({ value: -1 }).alias("nums_val"),
    $df.col("nums").fillNull({ strategy: "zero" }).alias("nums_zero"),
    $df.col("nums").fillNull({ strategy: "one" }).alias("nums_one"),
    $df.col("nums").fillNull({ strategy: "min" }).alias("nums_min"),
    $df.col("nums").fillNull({ strategy: "max" }).alias("nums_max"),
    $df.col("nums").fillNull({ strategy: "mean" }).alias("nums_mean"),
    $df.col("nums").fillNull({ strategy: "forward" }).alias("nums_fwd"),
    $df.col("nums").fillNull({ strategy: "backward" }).alias("nums_bwd"),
    $df.col("leading_nulls").fillNull({ strategy: "forward" }).alias("leading_fwd"),
    $df.col("leading_nulls").fillNull({ strategy: "backward" }).alias("leading_bwd"),
    $df.col("trailing_nulls").fillNull({ strategy: "forward" }).alias("trailing_fwd"),
    $df.col("trailing_nulls").fillNull({ strategy: "backward" }).alias("trailing_bwd"),
    $df.col("all_nulls").fillNull({ strategy: "forward" }).alias("all_null_fwd"),
    $df.col("all_nulls").fillNull({ strategy: "backward" }).alias("all_null_bwd"),
    $df.col("all_nulls").fillNull({ strategy: "mean" }).alias("all_null_mean"),
    $df.col("no_nulls").fillNull({ strategy: "forward" }).alias("no_null_fwd"),
    $df.col("strings").fillNull({ strategy: "forward" }).alias("str_fwd"),
    $df.col("strings").fillNull({ strategy: "backward" }).alias("str_bwd"),
    $df.col("strings").fillNull({ value: "default" }).alias("str_val")
]);

// Verify leading nulls forward fill retains leading nulls
if (resExpr.item(0, "leading_fwd") !== null || resExpr.item(1, "leading_fwd") !== null || resExpr.item(2, "leading_fwd") !== 100) {
    throw new Error("Leading nulls forward fill failed");
}

// Verify leading nulls backward fill propagates 100 backwards
if (resExpr.item(0, "leading_bwd") !== 100 || resExpr.item(1, "leading_bwd") !== 100 || resExpr.item(2, "leading_bwd") !== 100) {
    throw new Error("Leading nulls backward fill failed");
}

// Verify trailing nulls forward fill propagates 400 forward
if (resExpr.item(4, "trailing_fwd") !== 400 || resExpr.item(5, "trailing_fwd") !== 400) {
    throw new Error("Trailing nulls forward fill failed");
}

// Verify trailing nulls backward fill retains trailing nulls
if (resExpr.item(4, "trailing_bwd") !== null || resExpr.item(5, "trailing_bwd") !== null) {
    throw new Error("Trailing nulls backward fill failed");
}

// Verify all-null columns remain null across forward, backward, mean
if (resExpr.item(0, "all_null_fwd") !== null || resExpr.item(0, "all_null_bwd") !== null || resExpr.item(0, "all_null_mean") !== null) {
    throw new Error("All-null column fillNull failed");
}

// Verify no-null columns remain unchanged
if (resExpr.item(0, "no_null_fwd") !== 1 || resExpr.item(1, "no_null_fwd") !== 2 || resExpr.item(2, "no_null_fwd") !== 3) {
    throw new Error("No-null column fillNull failed");
}

// Verify strings fillNull
if (resExpr.item(0, "str_val") !== "default" || resExpr.item(1, "str_val") !== "alpha" || resExpr.item(2, "str_val") !== "default") {
    throw new Error("String fillNull with value failed");
}
if (resExpr.item(0, "str_fwd") !== null || resExpr.item(2, "str_fwd") !== "alpha" || resExpr.item(4, "str_fwd") !== "beta") {
    throw new Error("String forward fill failed");
}
if (resExpr.item(0, "str_bwd") !== "alpha" || resExpr.item(2, "str_bwd") !== "beta" || resExpr.item(4, "str_bwd") !== "gamma") {
    throw new Error("String backward fill failed");
}

// Verify nums stats calculations (10 and 20 -> min: 10, max: 20, mean: 15)
if (resExpr.item(0, "nums_min") !== 10 || resExpr.item(2, "nums_min") !== 10 || resExpr.item(4, "nums_min") !== 20) {
    throw new Error("Nums min fillNull failed");
}
if (resExpr.item(0, "nums_max") !== 20 || resExpr.item(2, "nums_max") !== 20 || resExpr.item(4, "nums_max") !== 20) {
    throw new Error("Nums max fillNull failed");
}
if (resExpr.item(0, "nums_mean") !== 15 || resExpr.item(2, "nums_mean") !== 15 || resExpr.item(4, "nums_mean") !== 20) {
    throw new Error("Nums mean fillNull failed");
}

// 7. Invalid strategy throws InvalidArgumentError
let threwInvalid = false;
try {
    dfEdge.fillNull({ strategy: "unsupported_strategy" as any });
} catch (e: any) {
    threwInvalid = true;
}
if (!threwInvalid) {
    throw new Error("Invalid strategy should throw an error");
}

// 8. Expression-based filling ($df.col("b").fillNull({ value: $df.col("a") }))
const dfFallback = new DataFrame({
    primary: [null, 2, null, 4],
    fallback: [10, 20, 30, 40]
});
const resFallback = dfFallback.withColumns($df.col("primary").fillNull({ value: $df.col("fallback") }).alias("coalesced"));
if (
    resFallback.item(0, "coalesced") !== 10 ||
    resFallback.item(1, "coalesced") !== 2 ||
    resFallback.item(2, "coalesced") !== 30 ||
    resFallback.item(3, "coalesced") !== 4
) {
    throw new Error("Expression-based fillNull failed");
}

console.log("✓ fillNull tests passed!");

