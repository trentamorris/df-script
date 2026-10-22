declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.filter tests...");

// 1. Standalone expression evaluation & withColumns masking
const colData = [10, 20, 30, 40, 50];
const cols = { a: colData };
const expr = $df.col("a").filter($df.col("a").gt(25));
const dfStandalone = $df.data({ a: colData });
const resStandalone = dfStandalone.select([expr.alias("res")]).toDicts() as any[];
if (resStandalone.length !== 5 || resStandalone[0].res !== null || resStandalone[1].res !== null || resStandalone[2].res !== 30 || resStandalone[3].res !== 40 || resStandalone[4].res !== 50) {
    throw new Error(`1. StandardExpr.filter standalone evaluation failed: ${JSON.stringify(resStandalone)}`);
}

// 2. Filter in select with aggregation (.sum(), .mean(), .min(), .max(), .count())
const df1 = $df.data({ a: [10, 20, 30, 40, 50] });
const resAgg = df1.select([
    $df.col("a").filter($df.col("a").gt(25)).sum().alias("sum_gt_25"),
    $df.col("a").filter($df.col("a").lt(35)).mean().alias("mean_lt_35"),
    $df.col("a").filter($df.col("a").ge(20)).min().alias("min_ge_20"),
    $df.col("a").filter($df.col("a").le(40)).max().alias("max_le_40"),
    $df.col("a").filter($df.col("a").gt(30)).count().alias("cnt_gt_30")
]).toDicts() as any[];

if (resAgg[0].sum_gt_25 !== 120 || resAgg[0].mean_lt_35 !== 20 || resAgg[0].min_ge_20 !== 20 || resAgg[0].max_le_40 !== 40 || resAgg[0].cnt_gt_30 !== 2) {
    throw new Error(`2. StandardExpr.filter in select agg failed: ${JSON.stringify(resAgg)}`);
}

// 3. Filter with nulls / isNotNull in aggregation
const df2 = $df.data({ a: [10, null, 30, null, 50] });
const resNullAgg = df2.select([
    $df.col("a").filter($df.col("a").isNotNull()).sum().alias("sum_clean"),
    $df.col("a").filter($df.col("a").isNotNull()).count().alias("count_clean")
]).toDicts() as any[];

if (resNullAgg[0].sum_clean !== 90 || resNullAgg[0].count_clean !== 3) {
    throw new Error(`3. StandardExpr.filter isNotNull failed: ${JSON.stringify(resNullAgg)}`);
}

// 4. Filter with NaNs / isNotNan in aggregation
const dfNans = $df.data({ a: [10, NaN, 30, NaN, 50] });
const resNanAgg = dfNans.select([
    $df.col("a").filter($df.col("a").isNotNan()).sum().alias("sum_no_nan"),
    $df.col("a").filter($df.col("a").isNotNan()).mean().alias("mean_no_nan")
]).toDicts() as any[];

if (resNanAgg[0].sum_no_nan !== 90 || resNanAgg[0].mean_no_nan !== 30) {
    throw new Error(`4. StandardExpr.filter isNotNan failed: ${JSON.stringify(resNanAgg)}`);
}

// 5. Conditional aggregation in groupBy across multiple categories
const dfGroup = $df.data({
    dept: ["Sales", "Sales", "Sales", "Eng", "Eng", "Eng"],
    type: ["FT", "Contractor", "FT", "FT", "Contractor", "Contractor"],
    salary: [100, 50, 120, 200, 80, 90]
});
const resGroup = dfGroup.groupBy("dept").agg(
    $df.col("salary").filter($df.col("type").eq("FT")).mean().alias("avg_ft"),
    $df.col("salary").filter($df.col("type").eq("Contractor")).mean().alias("avg_contractor")
).toDicts() as any[];

const salesRow = resGroup.find(r => r.dept === "Sales");
const engRow = resGroup.find(r => r.dept === "Eng");

if (salesRow.avg_ft !== 110 || salesRow.avg_contractor !== 50) {
    throw new Error(`5. StandardExpr.filter conditional aggregation for Sales failed: ${JSON.stringify(salesRow)}`);
}
if (engRow.avg_ft !== 200 || engRow.avg_contractor !== 85) {
    throw new Error(`5. StandardExpr.filter conditional aggregation for Eng failed: ${JSON.stringify(engRow)}`);
}

// 6. withColumns element-wise masking
const dfWithCol = $df.data({ val: [10, 20, 30, 40] });
const resWithCol = dfWithCol.withColumns(
    $df.col("val").filter($df.col("val").ge(25)).alias("masked")
).toDicts() as any[];
if (resWithCol[0].masked !== null || resWithCol[1].masked !== null || resWithCol[2].masked !== 30 || resWithCol[3].masked !== 40) {
    throw new Error(`6. withColumns masking failed: ${JSON.stringify(resWithCol)}`);
}

// 7. All elements match (full retention)
const resAllMatch = dfWithCol.select([
    $df.col("val").filter($df.col("val").gt(0)).sum().alias("all_sum")
]).toDicts() as any[];
if (resAllMatch[0].all_sum !== 100) throw new Error("7. All match filter failed");

// 8. No elements match (all nullified -> sum returns 0 or null)
const resNoMatch = dfWithCol.select([
    $df.col("val").filter($df.col("val").gt(1000)).count().alias("zero_cnt")
]).toDicts() as any[];
if (resNoMatch[0].zero_cnt !== 0) throw new Error("8. No match count failed");

// 9. Boolean literal predicate ($df.lit(true))
const resLitTrue = dfWithCol.select([
    $df.col("val").filter($df.lit(true)).sum().alias("s")
]).toDicts() as any[];
if (resLitTrue[0].s !== 100) throw new Error("9. Lit true filter failed");

// 10. Boolean literal predicate ($df.lit(false))
const resLitFalse = dfWithCol.select([
    $df.col("val").filter($df.lit(false)).count().alias("cnt")
]).toDicts() as any[];
if (resLitFalse[0].cnt !== 0) throw new Error("10. Lit false filter failed");

// 11. String column filtering with .str namespace
const dfStrings = $df.data({
    name: ["Alice", "Bob", "Alex", "Charlie", "Anna"],
    score: [85, 90, 75, 95, 80]
});
const resStrFilter = dfStrings.select([
    $df.col("score").filter($df.col("name").str.startsWith("A")).mean().alias("avg_a_names")
]).toDicts() as any[];
// Alice (85) + Alex (75) + Anna (80) = 240 / 3 = 80
if (resStrFilter[0].avg_a_names !== 80) throw new Error("11. String filter failed");

// 12. Negative numbers filtering
const dfNeg = $df.data({ v: [-10, -5, 0, 5, 10] });
const resNeg = dfNeg.select([
    $df.col("v").filter($df.col("v").lt(0)).sum().alias("neg_sum")
]).toDicts() as any[];
if (resNeg[0].neg_sum !== -15) throw new Error("12. Negative filter failed");

// 13. Zero and signed zero preservation
const dfZeros = $df.data({ v: [0, -0, +0, 10] });
const resZeros = dfZeros.select([
    $df.col("v").filter($df.col("v").eq(0)).count().alias("zero_count")
]).toDicts() as any[];
if (resZeros[0].zero_count !== 3) throw new Error("13. Zero count filter failed");

// 14. Boolean column filtering (false !== null)
const dfBools = $df.data({ b: [true, false, true, false, null] });
const resBools = dfBools.select([
    $df.col("b").filter($df.col("b").eq(false)).count().alias("false_count")
]).toDicts() as any[];
if (resBools[0].false_count !== 2) throw new Error("14. False boolean count failed");

// 15. Empty string column filtering with implode
const dfEmptyStr = $df.data({ s: ["", "abc", "", "def", null] });
const resEmptyStr = dfEmptyStr.select([
    $df.col("s").filter($df.col("s").eq("")).implode().alias("empty_str_list")
]).toDicts() as any[];
if (JSON.stringify(resEmptyStr[0].empty_str_list) !== JSON.stringify(["", null, "", null, null])) {
    throw new Error("15. Empty string list failed");
}

// 16. Multiple condition combining with .and()
const dfMulti = $df.data({ a: [1, 2, 3, 4, 5], b: [10, 20, 30, 40, 50] });
const resAnd = dfMulti.select([
    $df.col("b").filter($df.col("a").gt(1).and($df.col("a").lt(5))).sum().alias("b_sum")
]).toDicts() as any[];
// Rows a=2,3,4 -> b=20,30,40 -> sum=90
if (resAnd[0].b_sum !== 90) throw new Error("16. .and() filter failed");

// 17. Multiple condition combining with .or()
const resOr = dfMulti.select([
    $df.col("b").filter($df.col("a").eq(1).or($df.col("a").eq(5))).sum().alias("b_sum")
]).toDicts() as any[];
// Rows a=1,5 -> b=10,50 -> sum=60
if (resOr[0].b_sum !== 60) throw new Error("17. .or() filter failed");

// 18. Not condition with .not()
const resNot = dfMulti.select([
    $df.col("b").filter($df.col("a").eq(3).not()).sum().alias("b_sum")
]).toDicts() as any[];
// Exclude a=3 (b=30) -> 150 - 30 = 120
if (resNot[0].b_sum !== 120) throw new Error("18. .not() filter failed");

// 19. Chained mathematical transformations after filter
const dfMath = $df.data({ a: [-8, 8, 27, 64] });
const resMath = dfMath.select([
    $df.col("a").filter($df.col("a").gt(0)).cbrt().sum().alias("cbrt_sum")
]).toDicts() as any[];
// a=8(cbrt=2) + 27(cbrt=3) + 64(cbrt=4) = 9
if (Math.abs(resMath[0].cbrt_sum - 9) > 1e-6) throw new Error("19. Chained math after filter failed");

// 20. Large scale 10,000 row aggregation
const largeArr = Array.from({ length: 10000 }, (_, i) => i);
const dfLarge = $df.data({ id: largeArr });
const resLarge = dfLarge.select([
    $df.col("id").filter($df.col("id").ge(9000)).count().alias("count_top_1000")
]).toDicts() as any[];
if (resLarge[0].count_top_1000 !== 1000) throw new Error("20. Large scale filter count failed");

// 21. Imploding filtered values in groupBy
const dfEvents = $df.data({
    userId: [1, 1, 1, 2, 2],
    event: ["click", "error", "buy", "click", "error"],
    isError: [false, true, false, false, true]
});
const resImplode = dfEvents.groupBy("userId").agg(
    $df.col("event").filter($df.col("isError").eq(true)).implode().alias("errors")
).toDicts() as any[];

const user1 = resImplode.find(r => r.userId === 1);
const user2 = resImplode.find(r => r.userId === 2);
if (JSON.stringify(user1.errors) !== JSON.stringify([null, "error", null]) || JSON.stringify(user2.errors) !== JSON.stringify([null, "error"])) {
    throw new Error(`21. StandardExpr.filter implode in groupBy failed: ${JSON.stringify(resImplode)}`);
}

// 22. Cumulative aggregation on filtered values (nulls skipped in cumSum)
const dfCum = $df.data({ val: [10, 20, 30, 40] });
const resCum = dfCum.withColumns(
    $df.col("val").filter($df.col("val").ne(20)).cumSum().alias("cum_sum_no_20")
).toDicts() as any[];
if (resCum[0].cum_sum_no_20 !== 10 || resCum[1].cum_sum_no_20 !== 10 || resCum[2].cum_sum_no_20 !== 40 || resCum[3].cum_sum_no_20 !== 80) {
    throw new Error(`22. Filtered cumSum failed: ${JSON.stringify(resCum)}`);
}

console.log("✓ StandardExpr.filter tests passed!");
