declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.countMatches tests...");


const df = $df.data([
    { tags: ["apple", "banana", "apple", "cherry"] },
    { tags: [] },
    { tags: null }
]);

const res = df.select([
    $df.col("tags").arr.countMatches("apple").alias("apple_count"),
    $df.col("tags").arr.countMatches("pear").alias("pear_count")
]).toDicts() as any[];

if (res[0].apple_count !== 2) throw new Error("Expected apple_count 2");
if (res[0].pear_count !== 0) throw new Error("Expected pear_count 0");
if (res[1].apple_count !== 0) throw new Error("Expected 0 for empty array");
if (res[2].apple_count !== null) throw new Error("Expected null for null array");


// Edge Case 1: Dynamic column expression as target operand
const dfExpr = $df.data([
    { list: [10, 20, 10, 30], target: 10 },
    { list: [10, 20, 10, 30], target: 20 },
    { list: [10, 20, 10, 30], target: 99 }
]);
const resExpr = dfExpr.select(
    $df.col("list").arr.countMatches($df.col("target")).alias("matches")
).toDicts() as any[];
if (resExpr[0].matches !== 2) throw new Error("Edge Case 1 failed: Expected 2 matches for target 10");
if (resExpr[1].matches !== 1) throw new Error("Edge Case 1 failed: Expected 1 match for target 20");
if (resExpr[2].matches !== 0) throw new Error("Edge Case 1 failed: Expected 0 matches for target 99");

// Edge Case 2: TypedArray nested cells
const dfTyped = $df.data([
    { arr: new Int32Array([5, 5, 2, 5, 1]) },
    { arr: new Float64Array([1.5, 2.5, 1.5, 3.5]) }
]);
const resTyped = dfTyped.select([
    $df.col("arr").arr.countMatches(5).alias("int_matches"),
    $df.col("arr").arr.countMatches(1.5).alias("float_matches")
]).toDicts() as any[];
if (resTyped[0].int_matches !== 3) throw new Error("Edge Case 2 failed: Expected 3 matches for Int32Array");
if (resTyped[1].float_matches !== 2) throw new Error("Edge Case 2 failed: Expected 2 matches for Float64Array");

// Edge Case 3: NaN element matching via SameValueZero Map semantics
const dfNaN = $df.data([
    { nums: [NaN, 1, NaN, 2, NaN] },
    { nums: [1, 2, 3] }
]);
const resNaN = dfNaN.select(
    $df.col("nums").arr.countMatches(NaN).alias("nan_count")
).toDicts() as any[];
if (resNaN[0].nan_count !== 3) throw new Error("Edge Case 3 failed: Expected 3 NaN matches");
if (resNaN[1].nan_count !== 0) throw new Error("Edge Case 3 failed: Expected 0 NaN matches");

// Edge Case 4: Arrays containing internal null elements
const dfWithNulls = $df.data([
    { items: [null, "apple", null, "apple", "banana"] },
    { items: [null, null] }
]);
const resWithNulls = dfWithNulls.select([
    $df.col("items").arr.countMatches("apple").alias("apple_count"),
    $df.col("items").arr.countMatches("banana").alias("banana_count"),
    $df.col("items").arr.countMatches("orange").alias("orange_count")
]).toDicts() as any[];
if (resWithNulls[0].apple_count !== 2) throw new Error("Edge Case 4 failed: Expected 2 apple matches with internal nulls");
if (resWithNulls[0].banana_count !== 1) throw new Error("Edge Case 4 failed: Expected 1 banana match with internal nulls");
if (resWithNulls[0].orange_count !== 0) throw new Error("Edge Case 4 failed: Expected 0 orange matches with internal nulls");
if (resWithNulls[1].apple_count !== 0) throw new Error("Edge Case 4 failed: Expected 0 matches for array of only nulls");

// Edge Case 5: Null target, null row, and empty array boundaries
const dfNulls = $df.data([
    { items: [1, 2, 3], target: null },
    { items: null, target: 2 },
    { items: [], target: 5 }
]);
const resNulls = dfNulls.select(
    $df.col("items").arr.countMatches($df.col("target")).alias("match_null")
).toDicts() as any[];
if (resNulls[0].match_null !== null) throw new Error("Edge Case 5 failed: Expected null when target is null");
if (resNulls[1].match_null !== null) throw new Error("Edge Case 5 failed: Expected null when array column is null");
if (resNulls[2].match_null !== 0) throw new Error("Edge Case 5 failed: Expected 0 when array is empty and target is valid");

console.log("✓ ArrayExpr.countMatches tests passed!");
