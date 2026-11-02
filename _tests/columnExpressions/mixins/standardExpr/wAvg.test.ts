declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.wAvg edge-case tests...");

// -------------------------------------------------------------
// Case 1: Basic column weights in select aggregation
// -------------------------------------------------------------
const dfBasic = $df.data([
    { val: 10, weight: 1 },
    { val: 20, weight: 2 },
    { val: 30, weight: 3 }
]);
const resBasic = dfBasic.select([
    $df.col("val").wAvg($df.col("weight")).alias("w")
]).toDicts() as any[];
if (Math.abs(resBasic[0].w - 23.333333) > 1e-4) {
    throw new Error("Case 1 failed: basic wAvg with column weights");
}

// -------------------------------------------------------------
// Case 2: Array / Vector weights
// -------------------------------------------------------------
const resArray = dfBasic.select([
    $df.col("val").wAvg([1, 2, 3]).alias("w")
]).toDicts() as any[];
if (Math.abs(resArray[0].w - 23.333333) > 1e-4) {
    throw new Error("Case 2 failed: array weights");
}

// -------------------------------------------------------------
// Case 3: Constant numeric scalar weight (reduces to standard mean)
// -------------------------------------------------------------
const resScalar = dfBasic.select([
    $df.col("val").wAvg(2).alias("w")
]).toDicts() as any[];
if (resScalar[0].w !== 20) {
    throw new Error("Case 3 failed: scalar constant weight");
}

// -------------------------------------------------------------
// Case 4: GroupBy aggregation with wAvg
// -------------------------------------------------------------
const dfGroup = $df.data([
    { grp: "A", val: 10, w: 1 },
    { grp: "A", val: 20, w: 3 }, // (10*1 + 20*3)/4 = 70/4 = 17.5
    { grp: "B", val: 30, w: 2 },
    { grp: "B", val: 50, w: 2 }  // (30*2 + 50*2)/4 = 160/4 = 40
]);
const resGroup = dfGroup.groupBy("grp").agg(
    $df.col("val").wAvg($df.col("w")).alias("weighted_mean")
).sort({ by: "grp" }).toDicts() as any[];
if (resGroup[0].weighted_mean !== 17.5 || resGroup[1].weighted_mean !== 40) {
    throw new Error("Case 4 failed: groupBy wAvg");
}

// -------------------------------------------------------------
// Case 5: Single-row DataFrame
// -------------------------------------------------------------
const dfSingle = $df.data([{ val: 42, w: 5 }]);
const resSingle = dfSingle.select([
    $df.col("val").wAvg($df.col("w")).alias("w")
]).toDicts() as any[];
if (resSingle[0].w !== 42) {
    throw new Error("Case 5 failed: single-row wAvg");
}

// -------------------------------------------------------------
// Case 6: Zero weights handling (zero sum of weights should yield NaN or 0/null)
// -------------------------------------------------------------
const dfZeroWeight = $df.data([
    { val: 10, w: 0 },
    { val: 20, w: 0 }
]);
const resZeroWeight = dfZeroWeight.select([
    $df.col("val").wAvg($df.col("w")).alias("w")
]).toDicts() as any[];
if (!Number.isNaN(resZeroWeight[0].w) && resZeroWeight[0].w !== null) {
    throw new Error("Case 6 failed: all zero weights should yield NaN or null");
}

// -------------------------------------------------------------
// Case 7: Null values in value column or weight column
// -------------------------------------------------------------
const dfNulls = $df.data([
    { val: 10, w: 1 },
    { val: null, w: 5 }, // skipped pair
    { val: 20, w: null }, // skipped pair
    { val: 30, w: 2 }
]);
const resNulls = dfNulls.select([
    $df.col("val").wAvg($df.col("w")).alias("w")
]).toDicts() as any[];
// Clean pairs: (10, 1), (30, 2) -> (10 + 60) / 3 = 70 / 3 = 23.333333
if (Math.abs(resNulls[0].w - 23.333333) > 1e-4) {
    throw new Error("Case 7 failed: null pair handling in wAvg");
}

// -------------------------------------------------------------
// Case 8: NaN values in value column or weight column
// -------------------------------------------------------------
const dfNans = $df.data([
    { val: 10, w: 1 },
    { val: NaN, w: 2 },
    { val: 20, w: 3 }
]);
const resNans = dfNans.select([
    $df.col("val").wAvg($df.col("w")).alias("w")
]).toDicts() as any[];
if (!Number.isNaN(resNans[0].w)) {
    // NaN propagates in arithmetic sum unless explicitly cleaned
    if (Math.abs(resNans[0].w - 17.5) > 1e-4) {
        throw new Error("Case 8 failed: NaN in wAvg");
    }
}

// -------------------------------------------------------------
// Case 9: Empty DataFrame (schema preserved)
// -------------------------------------------------------------
const dfEmpty = $df.data([{ val: 1, w: 1 }]).filter($df.col("val").eq(999));
const resEmpty = dfEmpty.select([
    $df.col("val").wAvg($df.col("w")).alias("w")
]).toDicts() as any[];
if (resEmpty.length !== 1 || resEmpty[0].w !== null) {
    throw new Error("Case 9 failed: empty DataFrame wAvg should produce 1 row with null in global agg");
}

// -------------------------------------------------------------
// Case 10: Downstream expression chaining on wAvg
// -------------------------------------------------------------
const resChained = dfBasic.select([
    $df.col("val").wAvg($df.col("weight")).mul(2).alias("w_doubled")
]).toDicts() as any[];
if (Math.abs(resChained[0].w_doubled - 46.666666) > 1e-4) {
    throw new Error("Case 10 failed: chaining mul(2) on wAvg");
}

console.log("✓ StandardExpr.wAvg tests passed!");
