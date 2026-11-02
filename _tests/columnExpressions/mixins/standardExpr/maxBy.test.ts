declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.maxBy tests...");

// -------------------------------------------------------------
// Case 1: Basic maxBy with column expression ($df.col("score"))
// -------------------------------------------------------------
const dfBasic = $df.data([
    { name: "Alice", score: 80 },
    { name: "Bob", score: 95 },
    { name: "Charlie", score: 70 }
]);
const resBasic = dfBasic.select([
    $df.col("name").maxBy($df.col("score")).alias("top")
]).toDicts() as any[];
if (resBasic[0].top !== "Bob") {
    throw new Error("Case 1 failed: basic maxBy with column expression");
}

// -------------------------------------------------------------
// Case 2: maxBy with an array of values (literal series)
// -------------------------------------------------------------
const resArray = dfBasic.select([
    $df.col("name").maxBy([10, 20, 5]).alias("top_arr")
]).toDicts() as any[];
if (resArray[0].top_arr !== "Bob") {
    throw new Error("Case 2 failed: maxBy with array literal");
}

// -------------------------------------------------------------
// Case 3: GroupBy aggregation with maxBy
// -------------------------------------------------------------
const dfGrouped = $df.data([
    { dept: "Engineering", emp: "Alice", salary: 120 },
    { dept: "Engineering", emp: "Bob", salary: 150 },
    { dept: "Sales", emp: "Charlie", salary: 110 },
    { dept: "Sales", emp: "Diana", salary: 90 }
]);
const resGrouped = dfGrouped.groupBy("dept").agg([
    $df.col("emp").maxBy($df.col("salary")).alias("highest_paid")
]).sort({ by: "dept" }).toDicts() as any[];
if (resGrouped.length !== 2 || resGrouped[0].highest_paid !== "Bob" || resGrouped[1].highest_paid !== "Charlie") {
    throw new Error("Case 3 failed: grouped maxBy");
}

// -------------------------------------------------------------
// Case 4: Tie-breaking behavior (first maximum occurrence wins)
// -------------------------------------------------------------
const dfTies = $df.data([
    { item: "first_max", score: 100 },
    { item: "second_max", score: 100 },
    { item: "low", score: 50 }
]);
const resTies = dfTies.select([
    $df.col("item").maxBy($df.col("score")).alias("winner")
]).toDicts() as any[];
if (resTies[0].winner !== "first_max") {
    throw new Error("Case 4 failed: tie-breaking should pick first maximum");
}

// -------------------------------------------------------------
// Case 5: Null handling in `by` column (skips nulls in finding max)
// -------------------------------------------------------------
const dfNullsInBy = $df.data([
    { name: "Alice", score: 10 },
    { name: "Bob", score: null },
    { name: "Charlie", score: 25 },
    { name: "Diana", score: null }
]);
const resNullsInBy = dfNullsInBy.select([
    $df.col("name").maxBy($df.col("score")).alias("top")
]).toDicts() as any[];
if (resNullsInBy[0].top !== "Charlie") {
    throw new Error("Case 5 failed: maxBy should ignore nulls in by column");
}

// -------------------------------------------------------------
// Case 6: Null handling in target column
// (evalBinaryOp treats null target as null pair, so maxBy selects highest non-null pair)
// -------------------------------------------------------------
const dfNullTarget = $df.data([
    { name: "Alice", score: 10 },
    { name: null, score: 99 },
    { name: "Charlie", score: 25 }
]);
const resNullTarget = dfNullTarget.select([
    $df.col("name").maxBy($df.col("score")).alias("top")
]).toDicts() as any[];
if (resNullTarget[0].top !== "Charlie") {
    throw new Error("Case 6 failed: maxBy should pick highest non-null target pair");
}

// -------------------------------------------------------------
// Case 7: All `by` values are null (returns null)
// -------------------------------------------------------------
const dfAllNullBy = $df.data([
    { name: "Alice", score: null },
    { name: "Bob", score: null }
]);
const resAllNull = dfAllNullBy.select([
    $df.col("name").maxBy($df.col("score")).alias("top")
]).toDicts() as any[];
if (resAllNull[0].top !== null) {
    throw new Error("Case 7 failed: all null by column should return null");
}

// -------------------------------------------------------------
// Case 8: Lexicographical string ordering in `by` column
// -------------------------------------------------------------
const dfStrBy = $df.data([
    { id: 1, code: "bravo" },
    { id: 2, code: "zulu" },
    { id: 3, code: "alpha" }
]);
const resStrBy = dfStrBy.select([
    $df.col("id").maxBy($df.col("code")).alias("max_str_id")
]).toDicts() as any[];
if (resStrBy[0].max_str_id !== 2) {
    throw new Error("Case 8 failed: string ordering in by column");
}

// -------------------------------------------------------------
// Case 9: Date ordering in `by` column
// -------------------------------------------------------------
const d1 = new Date("2024-01-01");
const d2 = new Date("2025-06-15");
const d3 = new Date("2023-12-31");
const dfDateBy = $df.data([
    { event: "launch", date: d1 },
    { event: "v2", date: d2 },
    { event: "concept", date: d3 }
]);
const resDateBy = dfDateBy.select([
    $df.col("event").maxBy($df.col("date")).alias("latest")
]).toDicts() as any[];
if (resDateBy[0].latest !== "v2") {
    throw new Error("Case 9 failed: date ordering in by column");
}

// -------------------------------------------------------------
// Case 10: Single-row DataFrame & negative numeric values
// -------------------------------------------------------------
const dfNeg = $df.data([
    { tag: "neg_twenty", temp: -20 },
    { tag: "neg_five", temp: -5 },
    { tag: "neg_fifty", temp: -50 }
]);
const resNeg = dfNeg.select([
    $df.col("tag").maxBy($df.col("temp")).alias("warmest")
]).toDicts() as any[];
if (resNeg[0].warmest !== "neg_five") {
    throw new Error("Case 10 failed: negative values in by column");
}

const dfSingle = $df.data([{ label: "only", score: 42 }]);
const resSingle = dfSingle.select([
    $df.col("label").maxBy($df.col("score")).alias("top")
]).toDicts() as any[];
if (resSingle[0].top !== "only") {
    throw new Error("Case 10b failed: single-row DataFrame maxBy");
}

console.log("✓ StandardExpr.maxBy tests passed!");
