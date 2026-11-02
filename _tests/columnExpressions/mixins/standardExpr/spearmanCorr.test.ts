declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.spearmanCorr edge-case tests...");

// -------------------------------------------------------------
// Case 1: Perfect positive monotonic correlation (+1.0)
// -------------------------------------------------------------
const dfPerfPos = $df.data([
    { a: 1, b: 2 },
    { a: 2, b: 20 },
    { a: 3, b: 200 }
]);
const resPerfPos = dfPerfPos.select([
    $df.col("a").spearmanCorr($df.col("b")).alias("c")
]).toDicts() as any[];
if (Math.abs(resPerfPos[0].c - 1) > 1e-6) {
    throw new Error("Case 1 failed: perfect positive monotonic correlation");
}

// -------------------------------------------------------------
// Case 2: Perfect negative monotonic correlation (-1.0)
// -------------------------------------------------------------
const dfPerfNeg = $df.data([
    { a: 1, b: 100 },
    { a: 2, b: 50 },
    { a: 3, b: 10 }
]);
const resPerfNeg = dfPerfNeg.select([
    $df.col("a").spearmanCorr($df.col("b")).alias("c")
]).toDicts() as any[];
if (Math.abs(resPerfNeg[0].c - (-1)) > 1e-6) {
    throw new Error("Case 2 failed: perfect negative monotonic correlation");
}

// -------------------------------------------------------------
// Case 3: Numeric raw array / vector argument
// -------------------------------------------------------------
const resArray = dfPerfPos.select([
    $df.col("a").spearmanCorr([100, 50, 10]).alias("c")
]).toDicts() as any[];
if (Math.abs(resArray[0].c - (-1)) > 1e-6) {
    throw new Error("Case 3 failed: vector array spearmanCorr");
}

// -------------------------------------------------------------
// Case 4: Tied ranks (fractional rank assignment)
// -------------------------------------------------------------
const dfTies = $df.data([
    { a: 1, b: 10 },
    { a: 2, b: 20 },
    { a: 2, b: 20 },
    { a: 3, b: 30 }
]);
const resTies = dfTies.select([
    $df.col("a").spearmanCorr($df.col("b")).alias("c")
]).toDicts() as any[];
if (Math.abs(resTies[0].c - 1) > 1e-6) {
    throw new Error("Case 4 failed: tied ranks correlation");
}

// -------------------------------------------------------------
// Case 5: Zero variance (constant column yields null)
// -------------------------------------------------------------
const dfConst = $df.data([
    { a: 5, b: 10 },
    { a: 5, b: 20 },
    { a: 5, b: 30 }
]);
const resConst = dfConst.select([
    $df.col("a").spearmanCorr($df.col("b")).alias("c")
]).toDicts() as any[];
if (resConst[0].c !== null) {
    throw new Error("Case 5 failed: zero variance should yield null");
}

// -------------------------------------------------------------
// Case 6: Null values dropped via pairwise deletion
// -------------------------------------------------------------
const dfNulls = $df.data([
    { a: 1, b: 10 },
    { a: null, b: 50 }, // dropped
    { a: 2, b: null }, // dropped
    { a: 3, b: 30 },
    { a: 4, b: 40 }
]);
const resNulls = dfNulls.select([
    $df.col("a").spearmanCorr($df.col("b")).alias("c")
]).toDicts() as any[];
// Clean pairs: (1,10), (3,30), (4,40) -> rank correlation = 1.0
if (Math.abs(resNulls[0].c - 1) > 1e-6) {
    throw new Error("Case 6 failed: null pair deletion in spearmanCorr");
}

// -------------------------------------------------------------
// Case 7: Fewer than 2 valid pairs yields null
// -------------------------------------------------------------
const dfInsufficient = $df.data([
    { a: 1, b: 10 },
    { a: null, b: 20 }
]);
const resInsufficient = dfInsufficient.select([
    $df.col("a").spearmanCorr($df.col("b")).alias("c")
]).toDicts() as any[];
if (resInsufficient[0].c !== null) {
    throw new Error("Case 7 failed: fewer than 2 valid pairs should return null");
}

// -------------------------------------------------------------
// Case 8: GroupBy aggregation with spearmanCorr
// -------------------------------------------------------------
const dfGroup = $df.data([
    { grp: "pos", a: 1, b: 10 },
    { grp: "pos", a: 2, b: 20 },
    { grp: "pos", a: 3, b: 30 },
    { grp: "neg", a: 1, b: 30 },
    { grp: "neg", a: 2, b: 20 },
    { grp: "neg", a: 3, b: 10 }
]);
const resGroup = dfGroup.groupBy("grp").agg(
    $df.col("a").spearmanCorr($df.col("b")).alias("corr")
).sort({ by: "grp" }).toDicts() as any[];
// grp: "neg" -> -1.0, grp: "pos" -> +1.0
if (Math.abs(resGroup[0].corr - (-1)) > 1e-6 || Math.abs(resGroup[1].corr - 1) > 1e-6) {
    throw new Error("Case 8 failed: groupBy spearmanCorr");
}

// -------------------------------------------------------------
// Case 9: Empty DataFrame with schema preserved
// -------------------------------------------------------------
const dfEmpty = $df.data([{ a: 1, b: 1 }]).filter($df.col("a").eq(999));
const resEmpty = dfEmpty.select([
    $df.col("a").spearmanCorr($df.col("b")).alias("c")
]).toDicts() as any[];
if (resEmpty.length !== 1 || resEmpty[0].c !== null) {
    throw new Error("Case 9 failed: empty DataFrame spearmanCorr should yield null");
}

// -------------------------------------------------------------
// Case 10: Downstream expression chaining after spearmanCorr
// -------------------------------------------------------------
const resChained = dfPerfPos.select([
    $df.col("a").spearmanCorr($df.col("b")).mul(100).round().alias("c_pct")
]).toDicts() as any[];
if (resChained[0].c_pct !== 100) {
    throw new Error("Case 10 failed: chaining after spearmanCorr");
}

console.log("✓ StandardExpr.spearmanCorr tests passed!");
