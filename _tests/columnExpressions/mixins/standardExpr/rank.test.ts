declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.rank edge-case tests...");

// -------------------------------------------------------------
// Case 1: Standard default ranking (with gaps for ties: 1, 2, 2, 4)
// -------------------------------------------------------------
const dfTies = $df.data([
    { val: 10 },
    { val: 20 },
    { val: 20 },
    { val: 30 }
]);
const resTies = dfTies.withColumns([
    $df.col("val").rank().alias("r")
]).toDicts() as any[];
if (resTies[0].r !== 1 || resTies[1].r !== 2 || resTies[2].r !== 2 || resTies[3].r !== 4) {
    throw new Error("Case 1 failed: standard rank with gaps");
}

// -------------------------------------------------------------
// Case 2: Dense ranking ({ dense: true }: 1, 2, 2, 3)
// -------------------------------------------------------------
const resDense = dfTies.withColumns([
    $df.col("val").rank({ dense: true }).alias("r_dense")
]).toDicts() as any[];
if (resDense[0].r_dense !== 1 || resDense[1].r_dense !== 2 || resDense[2].r_dense !== 2 || resDense[3].r_dense !== 3) {
    throw new Error("Case 2 failed: dense rank without gaps");
}

// -------------------------------------------------------------
// Case 3: Partitioned / window ranking (over partitionBy)
// -------------------------------------------------------------
const dfPartitioned = $df.data([
    { grp: "A", val: 50 },
    { grp: "A", val: 10 },
    { grp: "B", val: 100 },
    { grp: "B", val: 50 }
]);
const resPartitioned = dfPartitioned.withColumns([
    $df.col("val").rank().over("grp").alias("r")
]).toDicts() as any[];
if (resPartitioned[0].r !== 2 || resPartitioned[1].r !== 1 || resPartitioned[2].r !== 2 || resPartitioned[3].r !== 1) {
    throw new Error("Case 3 failed: window partitionBy ranking");
}

// -------------------------------------------------------------
// Case 4: Null values handling in ranking
// -------------------------------------------------------------
const dfNulls = $df.data([
    { val: 10 },
    { val: null },
    { val: 20 }
]);
const resNulls = dfNulls.withColumns([
    $df.col("val").rank().alias("r")
]).toDicts() as any[];
if (resNulls[0].r !== 1 || resNulls[1].r !== null || resNulls[2].r !== 2) {
    throw new Error("Case 4 failed: null handling in rank");
}

// -------------------------------------------------------------
// Case 5: All identical values
// -------------------------------------------------------------
const dfSame = $df.data([
    { val: 42 },
    { val: 42 },
    { val: 42 }
]);
const resSame = dfSame.withColumns([
    $df.col("val").rank().alias("r_std"),
    $df.col("val").rank({ dense: true }).alias("r_dense")
]).toDicts() as any[];
if (resSame[0].r_std !== 1 || resSame[1].r_std !== 1 || resSame[2].r_std !== 1) {
    throw new Error("Case 5 failed: all identical standard rank");
}
if (resSame[0].r_dense !== 1 || resSame[1].r_dense !== 1 || resSame[2].r_dense !== 1) {
    throw new Error("Case 5 failed: all identical dense rank");
}

// -------------------------------------------------------------
// Case 6: Negative and floating point numbers
// -------------------------------------------------------------
const dfFloats = $df.data([
    { val: -10.5 },
    { val: -20.0 },
    { val: 0.0 },
    { val: 1.5 }
]);
const resFloats = dfFloats.withColumns([
    $df.col("val").rank().alias("r")
]).toDicts() as any[];
// Sorted: -20 (1), -10.5 (2), 0 (3), 1.5 (4)
if (resFloats[0].r !== 2 || resFloats[1].r !== 1 || resFloats[2].r !== 3 || resFloats[3].r !== 4) {
    throw new Error("Case 6 failed: negative and float values rank");
}

// -------------------------------------------------------------
// Case 7: Lexicographical String column ranking
// -------------------------------------------------------------
const dfStrings = $df.data([
    { s: "zebra" },
    { s: "apple" },
    { s: "mango" },
    { s: "apple" }
]);
const resStrings = dfStrings.withColumns([
    $df.col("s").rank().alias("r_std"),
    $df.col("s").rank({ dense: true }).alias("r_dense")
]).toDicts() as any[];
// Sorted: apple(1), apple(1), mango(3, dense 2), zebra(4, dense 3)
if (resStrings[1].r_std !== 1 || resStrings[3].r_std !== 1 || resStrings[2].r_std !== 3 || resStrings[0].r_std !== 4) {
    throw new Error("Case 7 failed: string standard rank");
}
if (resStrings[1].r_dense !== 1 || resStrings[3].r_dense !== 1 || resStrings[2].r_dense !== 2 || resStrings[0].r_dense !== 3) {
    throw new Error("Case 7 failed: string dense rank");
}

// -------------------------------------------------------------
// Case 8: Single-row DataFrame
// -------------------------------------------------------------
const dfSingle = $df.data([{ val: 100 }]);
const resSingle = dfSingle.withColumns([$df.col("val").rank().alias("r")]).toDicts() as any[];
if (resSingle[0].r !== 1) throw new Error("Case 8 failed: single row rank");

// -------------------------------------------------------------
// Case 9: Empty DataFrame with schema preserved
// -------------------------------------------------------------
const dfEmpty = $df.data([{ val: 1 }]).filter($df.col("val").eq(999));
const resEmpty = dfEmpty.withColumns([$df.col("val").rank().alias("r")]).toDicts();
if (resEmpty.length !== 0) throw new Error("Case 9 failed: empty DataFrame rank");

// -------------------------------------------------------------
// Case 10: Downstream expression chaining after rank (.rank().mul(10))
// -------------------------------------------------------------
const resChained = dfTies.withColumns([
    $df.col("val").rank().mul(10).alias("r_x10")
]).toDicts() as any[];
if (resChained[0].r_x10 !== 10 || resChained[1].r_x10 !== 20 || resChained[2].r_x10 !== 20 || resChained[3].r_x10 !== 40) {
    throw new Error("Case 10 failed: chaining mul(10) on rank");
}

console.log("✓ StandardExpr.rank tests passed!");
