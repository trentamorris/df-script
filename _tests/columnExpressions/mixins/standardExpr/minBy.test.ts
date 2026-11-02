declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.minBy tests...");

// -------------------------------------------------------------
// Case 1: Basic minBy with column expression ($df.col("score"))
// -------------------------------------------------------------
const dfBasic = $df.data([
    { name: "Alice", score: 80 },
    { name: "Bob", score: 95 },
    { name: "Charlie", score: 70 }
]);
const resBasic = dfBasic.select([
    $df.col("name").minBy($df.col("score")).alias("lowest")
]).toDicts() as any[];
if (resBasic[0].lowest !== "Charlie") {
    throw new Error("Case 1 failed: basic minBy with column expression");
}

// -------------------------------------------------------------
// Case 2: minBy with an array of values (literal series)
// -------------------------------------------------------------
const resArray = dfBasic.select([
    $df.col("name").minBy([10, 20, 5]).alias("lowest_arr")
]).toDicts() as any[];
if (resArray[0].lowest_arr !== "Charlie") {
    throw new Error("Case 2 failed: minBy with array literal");
}

// -------------------------------------------------------------
// Case 3: GroupBy aggregation with minBy
// -------------------------------------------------------------
const dfGrouped = $df.data([
    { dept: "Engineering", emp: "Alice", salary: 120 },
    { dept: "Engineering", emp: "Bob", salary: 150 },
    { dept: "Sales", emp: "Charlie", salary: 110 },
    { dept: "Sales", emp: "Diana", salary: 90 }
]);
const resGrouped = dfGrouped.groupBy("dept").agg([
    $df.col("emp").minBy($df.col("salary")).alias("lowest_paid")
]).sort({ by: "dept" }).toDicts() as any[];
if (resGrouped.length !== 2 || resGrouped[0].lowest_paid !== "Alice" || resGrouped[1].lowest_paid !== "Diana") {
    throw new Error("Case 3 failed: grouped minBy");
}

// -------------------------------------------------------------
// Case 4: Tie-breaking behavior (first minimum occurrence wins)
// -------------------------------------------------------------
const dfTies = $df.data([
    { item: "first_min", score: 10 },
    { item: "second_min", score: 10 },
    { item: "high", score: 50 }
]);
const resTies = dfTies.select([
    $df.col("item").minBy($df.col("score")).alias("winner")
]).toDicts() as any[];
if (resTies[0].winner !== "first_min") {
    throw new Error("Case 4 failed: tie-breaking should pick first minimum");
}

// -------------------------------------------------------------
// Case 5: Null handling in `by` column (skips nulls in finding min)
// -------------------------------------------------------------
const dfNullsInBy = $df.data([
    { name: "Alice", score: null },
    { name: "Bob", score: 20 },
    { name: "Charlie", score: 15 },
    { name: "Diana", score: null }
]);
const resNullsInBy = dfNullsInBy.select([
    $df.col("name").minBy($df.col("score")).alias("lowest")
]).toDicts() as any[];
if (resNullsInBy[0].lowest !== "Charlie") {
    throw new Error("Case 5 failed: minBy should ignore nulls in by column");
}

// -------------------------------------------------------------
// Case 6: Null handling in target column
// (evalBinaryOp treats null target as null pair, so minBy selects lowest non-null pair)
// -------------------------------------------------------------
const dfNullTarget = $df.data([
    { name: "Alice", score: 100 },
    { name: null, score: 5 },
    { name: "Charlie", score: 25 }
]);
const resNullTarget = dfNullTarget.select([
    $df.col("name").minBy($df.col("score")).alias("lowest")
]).toDicts() as any[];
if (resNullTarget[0].lowest !== "Charlie") {
    throw new Error("Case 6 failed: minBy should pick lowest non-null target pair");
}

// -------------------------------------------------------------
// Case 7: All `by` values are null (returns null)
// -------------------------------------------------------------
const dfAllNullBy = $df.data([
    { name: "Alice", score: null },
    { name: "Bob", score: null }
]);
const resAllNull = dfAllNullBy.select([
    $df.col("name").minBy($df.col("score")).alias("lowest")
]).toDicts() as any[];
if (resAllNull[0].lowest !== null) {
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
    $df.col("id").minBy($df.col("code")).alias("min_str_id")
]).toDicts() as any[];
if (resStrBy[0].min_str_id !== 3) {
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
    $df.col("event").minBy($df.col("date")).alias("earliest")
]).toDicts() as any[];
if (resDateBy[0].earliest !== "concept") {
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
    $df.col("tag").minBy($df.col("temp")).alias("coldest")
]).toDicts() as any[];
if (resNeg[0].coldest !== "neg_fifty") {
    throw new Error("Case 10 failed: negative values in by column");
}

const dfSingle = $df.data([{ label: "only", score: 42 }]);
const resSingle = dfSingle.select([
    $df.col("label").minBy($df.col("score")).alias("lowest")
]).toDicts() as any[];
if (resSingle[0].lowest !== "only") {
    throw new Error("Case 10b failed: single-row DataFrame minBy");
}

console.log("✓ StandardExpr.minBy tests passed!");
