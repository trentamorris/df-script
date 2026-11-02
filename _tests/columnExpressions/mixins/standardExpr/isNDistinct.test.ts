declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.isNDistinct edge-case tests...");

// -------------------------------------------------------------
// Case 1: First distinct value (index = 0) and last distinct (index = -1)
// -------------------------------------------------------------
const dfBasic = $df.data([
    { a: 10 },
    { a: 20 },
    { a: 20 },
    { a: 30 }
]);
const resBasic = dfBasic.select([
    $df.col("a").isNDistinct(0).alias("first_dist"),
    $df.col("a").isNDistinct(1).alias("second_dist"),
    $df.col("a").isNDistinct(-1).alias("last_dist")
]).toDicts() as any[];

// Distinct values: [10, 20, 30]
if (resBasic[0].first_dist !== true || resBasic[1].first_dist !== false || resBasic[2].first_dist !== false || resBasic[3].first_dist !== false) {
    throw new Error("Case 1 failed: first distinct (index 0)");
}
if (resBasic[0].second_dist !== false || resBasic[1].second_dist !== true || resBasic[2].second_dist !== true || resBasic[3].second_dist !== false) {
    throw new Error("Case 1 failed: second distinct (index 1)");
}
if (resBasic[0].last_dist !== false || resBasic[1].last_dist !== false || resBasic[2].last_dist !== false || resBasic[3].last_dist !== true) {
    throw new Error("Case 1 failed: last distinct (index -1)");
}

// -------------------------------------------------------------
// Case 2: Out of bounds with default { nullOnOob: true }
// -------------------------------------------------------------
const resOob = dfBasic.select([
    $df.col("a").isNDistinct(99).alias("oob_pos"),
    $df.col("a").isNDistinct(-99, { nullOnOob: true }).alias("oob_neg")
]).toDicts() as any[];
if (resOob[0].oob_pos !== null || resOob[0].oob_neg !== null) {
    throw new Error("Case 2 failed: OOB nullOnOob=true should yield null");
}

// -------------------------------------------------------------
// Case 3: Out of bounds with { nullOnOob: false } throws error
// -------------------------------------------------------------
let oobErrorThrown = false;
try {
    dfBasic.select([$df.col("a").isNDistinct(99, { nullOnOob: false })]).toDicts();
} catch (e: any) {
    oobErrorThrown = true;
}
if (!oobErrorThrown) {
    throw new Error("Case 3 failed: OOB nullOnOob=false should throw error");
}

// -------------------------------------------------------------
// Case 4: Negative indexing (-2, -3)
// -------------------------------------------------------------
const resNeg = dfBasic.select([
    $df.col("a").isNDistinct(-2).alias("second_last"),
    $df.col("a").isNDistinct(-3).alias("third_last")
]).toDicts() as any[];
// Distinct: [10, 20, 30] -> -2 is 20, -3 is 10
if (resNeg[1].second_last !== true || resNeg[2].second_last !== true || resNeg[0].second_last !== false) {
    throw new Error("Case 4 failed: negative index -2");
}
if (resNeg[0].third_last !== true || resNeg[1].third_last !== false) {
    throw new Error("Case 4 failed: negative index -3");
}

// -------------------------------------------------------------
// Case 5: Null handling in column (null values in distinct set)
// -------------------------------------------------------------
const dfNulls = $df.data([
    { a: 10 },
    { a: null },
    { a: 20 }
]);
const resNulls = dfNulls.select([
    $df.col("a").isNDistinct(0).alias("first")
]).toDicts() as any[];
// In three-valued SQL logic, `col("a").eq(10)` yields null for null rows
if (resNulls[0].first !== true || resNulls[1].first !== null || resNulls[2].first !== false) {
    throw new Error("Case 5 failed: null handling in isNDistinct");
}

// -------------------------------------------------------------
// Case 6: Distinct strings (order of first appearance: zebra, apple, mango)
// -------------------------------------------------------------
const dfStrings = $df.data([
    { s: "zebra" },
    { s: "apple" },
    { s: "apple" },
    { s: "mango" }
]);
const resStrings = dfStrings.select([
    $df.col("s").isNDistinct(0).alias("first_str"),
    $df.col("s").isNDistinct(1).alias("second_str"),
    $df.col("s").isNDistinct(-1).alias("last_str")
]).toDicts() as any[];
// Distinct ordered by appearance: zebra (0), apple (1), mango (2 / -1)
if (resStrings[0].first_str !== true || resStrings[1].first_str !== false) {
    throw new Error("Case 6 failed: first distinct string (zebra)");
}
if (resStrings[1].second_str !== true || resStrings[2].second_str !== true || resStrings[0].second_str !== false) {
    throw new Error("Case 6 failed: second distinct string (apple)");
}
if (resStrings[3].last_str !== true || resStrings[0].last_str !== false) {
    throw new Error("Case 6 failed: last distinct string (mango)");
}

// -------------------------------------------------------------
// Case 7: All identical values
// -------------------------------------------------------------
const dfSame = $df.data([{ val: 5 }, { val: 5 }, { val: 5 }]);
const resSame = dfSame.select([
    $df.col("val").isNDistinct(0).alias("first"),
    $df.col("val").isNDistinct(1).alias("second")
]).toDicts() as any[];
if (resSame[0].first !== true || resSame[1].first !== true || resSame[2].first !== true) {
    throw new Error("Case 7 failed: single distinct matches all");
}
if (resSame[0].second !== null || resSame[1].second !== null || resSame[2].second !== null) {
    throw new Error("Case 7 failed: second distinct out of bounds null");
}

// -------------------------------------------------------------
// Case 8: Multi-column projection
// -------------------------------------------------------------
const dfMulti = $df.data([
    { a: 10, b: 100 },
    { a: 20, b: 200 }
]);
const resMulti = dfMulti.select([
    $df.col("a").isNDistinct(0).alias("a_dist"),
    $df.col("b").isNDistinct(0).alias("b_dist")
]).toDicts() as any[];
if (resMulti[0].a_dist !== true || resMulti[0].b_dist !== true || resMulti[1].a_dist !== false || resMulti[1].b_dist !== false) {
    throw new Error("Case 8 failed: multiple isNDistinct column expressions in select");
}

// -------------------------------------------------------------
// Case 9: Single-row DataFrame
// -------------------------------------------------------------
const dfSingle = $df.data([{ val: 42 }]);
const resSingle = dfSingle.select([$df.col("val").isNDistinct(0).alias("res")]).toDicts() as any[];
if (resSingle[0].res !== true) throw new Error("Case 9 failed: single row isNDistinct");

// -------------------------------------------------------------
// Case 10: Downstream expression chaining (.isNDistinct(0).not())
// -------------------------------------------------------------
const resChain = dfBasic.select([
    $df.col("a").isNDistinct(0).not().alias("not_first")
]).toDicts() as any[];
if (resChain[0].not_first !== false || resChain[1].not_first !== true) {
    throw new Error("Case 10 failed: expression chaining after isNDistinct");
}

console.log("✓ StandardExpr.isNDistinct tests passed!");
