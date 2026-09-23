import { DataFrame } from "../../../src/dataframe";
import { $df } from "../../../src/api";

console.log("Running GroupedData.agg tests...");

// 1. Basic aggregation
const df = new DataFrame([
    { dept: "HR", salary: 1000 },
    { dept: "HR", salary: 2000 },
    { dept: "IT", salary: 4000 },
]);

const dfAgg = df.groupBy("dept").agg(
    $df.col("salary").mean().alias("avg_salary")
);

if (dfAgg.height !== 2) throw new Error("groupBy aggregation height mismatch");
const collected = dfAgg.toDicts();

const hrRow = collected.find(r => r.dept === "HR");
const itRow = collected.find(r => r.dept === "IT");

if (!hrRow || hrRow.avg_salary !== 1500) throw new Error("HR average salary mismatch");
if (!itRow || itRow.avg_salary !== 4000) throw new Error("IT average salary mismatch");

// 2. null key aggregation
const dfNull = new DataFrame([
    { cat: null, val: 10 },
    { cat: null, val: 20 },
    { cat: "A",  val: 5  },
]);

const dfNullAgg = dfNull.groupBy("cat").agg($df.col("val").sum().alias("total"));
if (dfNullAgg.height !== 2) throw new Error("null key should form its own group, expected 2 groups");

const nullGroup = (dfNullAgg.toDicts() as any[]).find(r => r.cat === null);
const aGroup    = (dfNullAgg.toDicts() as any[]).find(r => r.cat === "A");

if (!nullGroup || nullGroup.total !== 30) throw new Error("null group sum wrong");
if (!aGroup || aGroup.total !== 5) throw new Error("'A' group wrong");

// 3. Multi-key aggregation
const dfMulti = new DataFrame([
    { a: 1, b: null, val: 10 },
    { a: 1, b: null, val: 20 },
    { a: 1, b: 2,    val: 5  },
]);

const dfMultiAgg = dfMulti.groupBy(["a", "b"]).agg($df.col("val").sum().alias("total"));
if (dfMultiAgg.height !== 2) throw new Error("Multi-key: (1,null) and (1,2) should be distinct groups");

// 4. Delegated Shorthand Aggregations (.sum, .mean, .min, .max, .first, .last)
const dfShorthand = new DataFrame([
    { dept: "HR", salary: 1000, bonus: 100 },
    { dept: "HR", salary: 2000, bonus: 200 },
    { dept: "IT", salary: 4000, bonus: 400 },
]);

const sumDf = dfShorthand.groupBy("dept").sum();
if (sumDf.height !== 2) throw new Error("Delegated sum() height mismatch");
const sumRows = sumDf.toDicts();
const hrSum = sumRows.find((r: any) => r.dept === "HR");
const itSum = sumRows.find((r: any) => r.dept === "IT");
if (!hrSum || hrSum.salary !== 3000 || hrSum.bonus !== 300) throw new Error("HR sum() values mismatch");
if (!itSum || itSum.salary !== 4000 || itSum.bonus !== 400) throw new Error("IT sum() values mismatch");

const meanDf = dfShorthand.groupBy("dept").mean();
const meanRows = meanDf.toDicts();
const hrMean = meanRows.find((r: any) => r.dept === "HR");
if (!hrMean || hrMean.salary !== 1500 || hrMean.bonus !== 150) throw new Error("HR mean() mismatch");

const minDf = dfShorthand.groupBy("dept").min();
const minRows = minDf.toDicts();
const hrMin = minRows.find((r: any) => r.dept === "HR");
if (!hrMin || hrMin.salary !== 1000 || hrMin.bonus !== 100) throw new Error("HR min() mismatch");

const maxDf = dfShorthand.groupBy("dept").max();
const maxRows = maxDf.toDicts();
const hrMax = maxRows.find((r: any) => r.dept === "HR");
if (!hrMax || hrMax.salary !== 2000 || hrMax.bonus !== 200) throw new Error("HR max() mismatch");

const firstDf = dfShorthand.groupBy("dept").first();
const firstRows = firstDf.toDicts();
const hrFirst = firstRows.find((r: any) => r.dept === "HR");
if (!hrFirst || hrFirst.salary !== 1000) throw new Error("HR first() mismatch");

const lastDf = dfShorthand.groupBy("dept").last();
const lastRows = lastDf.toDicts();
const hrLast = lastRows.find((r: any) => r.dept === "HR");
if (!hrLast || hrLast.salary !== 2000) throw new Error("HR last() mismatch");

// 5. Edge Case: Empty DataFrame grouping
const emptyDf = new DataFrame([] as { grp: string; num: number }[], { grp: $df.Utf8, num: $df.Float64 });
const emptyAgg = emptyDf.groupBy("grp").sum();
if (emptyAgg.height !== 0) throw new Error("Empty DataFrame groupBy should produce height 0");
if (emptyAgg.width !== 2) throw new Error("Empty DataFrame groupBy should preserve schema columns");

// 6. Edge Case: Single-row group and single-item dataset
const singleDf = new DataFrame([{ g: "Z", score: 99 }]);
const singleSum = singleDf.groupBy("g").sum();
if (singleSum.height !== 1 || singleSum.toDicts()[0].score !== 99) throw new Error("Single row groupBy mismatch");

// 7. Edge Case: Group with all null values
const allNullValsDf = new DataFrame([
    { grp: "G1", v: null },
    { grp: "G1", v: null },
    { grp: "G2", v: 42 },
]);
const allNullSum = allNullValsDf.groupBy("grp").sum().toDicts();
const g1Sum = allNullSum.find((r: any) => r.grp === "G1");
const g2Sum = allNullSum.find((r: any) => r.grp === "G2");
if (!g1Sum || g1Sum.v !== null) throw new Error("All-null group sum should be null");
if (!g2Sum || g2Sum.v !== 42) throw new Error("G2 group sum should be 42");

// 8. Edge Case: Floating-point NaN handling (NaN is skipped like null in standard sum; all-NaN yields null)
const nanDf = new DataFrame([
    { grp: "N", val: 10 },
    { grp: "N", val: NaN },
    { grp: "AllNaN", val: NaN },
]);
const nanSum = nanDf.groupBy("grp").sum().toDicts();
const nRow = nanSum.find((r: any) => r.grp === "N");
const allNaNRow = nanSum.find((r: any) => r.grp === "AllNaN");
if (!nRow || nRow.val !== 10) throw new Error("NaN should be skipped in sum aggregation, expected 10");
if (!allNaNRow || allNaNRow.val !== null) throw new Error("All-NaN group sum should be null");

// 9. Edge Case: Delegated count() with and without includeNulls
const countTestDf = new DataFrame([
    { grp: "A", val: 1 },
    { grp: "A", val: null },
    { grp: "A", val: 3 },
    { grp: "B", val: null },
]);
const defaultCount = countTestDf.groupBy("grp").count().toDicts();
const aDefault = defaultCount.find((r: any) => r.grp === "A");
const bDefault = defaultCount.find((r: any) => r.grp === "B");
if (!aDefault || aDefault.val !== 2) throw new Error("Default count() should exclude nulls, expected 2 for group A");
if (!bDefault || bDefault.val !== 0) throw new Error("Default count() should exclude nulls, expected 0 for group B");

const includeNullCount = countTestDf.groupBy("grp").count({ includeNulls: true }).toDicts();
const aInc = includeNullCount.find((r: any) => r.grp === "A");
const bInc = includeNullCount.find((r: any) => r.grp === "B");
if (!aInc || aInc.val !== 3) throw new Error("count({ includeNulls: true }) should count all rows, expected 3 for group A");
if (!bInc || bInc.val !== 1) throw new Error("count({ includeNulls: true }) should count all rows, expected 1 for group B");

// 10. Edge Case: Delegated nUnique() uniqueness
const nUniqueDf = new DataFrame([
    { grp: "A", val: "foo" },
    { grp: "A", val: "bar" },
    { grp: "A", val: "foo" },
    { grp: "B", val: "baz" },
]);
const nUniqueRows = nUniqueDf.groupBy("grp").nUnique().toDicts();
const aUniq = nUniqueRows.find((r: any) => r.grp === "A") as any;
const bUniq = nUniqueRows.find((r: any) => r.grp === "B") as any;
if (!aUniq || aUniq.val !== 2) throw new Error("nUnique() should count distinct values, expected 2 for group A");
if (!bUniq || bUniq.val !== 1) throw new Error("nUnique() should count distinct values, expected 1 for group B");

// 11. Edge Case: Delegated variance() and std()
const statsDf = new DataFrame([
    { grp: "A", val: 10 },
    { grp: "A", val: 20 },
    { grp: "A", val: 30 },
    { grp: "Single", val: 5 },
]);
const varRows = statsDf.groupBy("grp").variance().toDicts();
const aVar = varRows.find((r: any) => r.grp === "A");
const singleVar = varRows.find((r: any) => r.grp === "Single");
if (!aVar || aVar.val !== 100) throw new Error("variance() calculation mismatch for group A, expected 100");
if (!singleVar || singleVar.val !== 0) throw new Error("variance() for single-item group should be 0 or null");

const stdRows = statsDf.groupBy("grp").std().toDicts();
const aStd = stdRows.find((r: any) => r.grp === "A");
if (!aStd || aStd.val !== 10) throw new Error("std() calculation mismatch for group A, expected 10");

// 12. Edge Case: Delegated median() with odd and even length groups
const medianDf = new DataFrame([
    { grp: "Odd", val: 1 },
    { grp: "Odd", val: 9 },
    { grp: "Odd", val: 5 },
    { grp: "Even", val: 10 },
    { grp: "Even", val: 20 },
]);
const medianRows = medianDf.groupBy("grp").median().toDicts();
const oddMedian = medianRows.find((r: any) => r.grp === "Odd");
const evenMedian = medianRows.find((r: any) => r.grp === "Even");
if (!oddMedian || oddMedian.val !== 5) throw new Error("median() odd group should be 5");
if (!evenMedian || evenMedian.val !== 15) throw new Error("median() even group should be 15");

// 13. Edge Case: Delegated all() boolean reduction
const allTestDf = new DataFrame([
    { grp: "T", flag: true },
    { grp: "T", flag: true },
    { grp: "F", flag: true },
    { grp: "F", flag: false },
]);
const allRows = allTestDf.groupBy("grp").all().toDicts();
const tAll = allRows.find((r: any) => r.grp === "T");
const fAll = allRows.find((r: any) => r.grp === "F");
if (!tAll || tAll.flag !== true) throw new Error("all() on all true should be true");
if (!fAll || fAll.flag !== false) throw new Error("all() on mixed values should be false");

// 14. Edge Case: Delegated skew() and kurtosis() options
const distDf = new DataFrame([
    { grp: "D", val: 1 },
    { grp: "D", val: 2 },
    { grp: "D", val: 3 },
    { grp: "D", val: 4 },
    { grp: "D", val: 5 },
]);
const skewDf = distDf.groupBy("grp").skew({ bias: true });
if (skewDf.height !== 1) throw new Error("skew() should succeed with options");
const kurtDf = distDf.groupBy("grp").kurtosis({ fisher: true, bias: true });
if (kurtDf.height !== 1) throw new Error("kurtosis() should succeed with options");

// 15. Edge Case: Multi-expression agg() mixing calculations & aliases
const multiAggDf = new DataFrame([
    { k: "A", x: 10, y: 100 },
    { k: "A", x: 20, y: 200 },
    { k: "B", x: 5,  y: 50 },
]);
const aggResult = multiAggDf.groupBy("k").agg(
    $df.col("x").sum().alias("sum_x"),
    $df.col("x").min().alias("min_x"),
    $df.col("y").max().alias("max_y"),
    $df.col("y").mean().alias("avg_y")
).toDicts();

const aAgg = aggResult.find((r: any) => r.k === "A");
if (!aAgg || aAgg.sum_x !== 30 || aAgg.min_x !== 10 || aAgg.max_y !== 200 || aAgg.avg_y !== 150) {
    throw new Error("Multi-expression agg mismatch on group A");
}

// 16. Compile-Time Type Assertion: Prove that GroupedData parameter types strictly match ColumnExpr
{
    type Assert<T extends true> = T;
    type Extends<A, B> = [A] extends [B] ? true : false;
    type Exact<A, B> = Extends<A, B> extends true ? (Extends<B, A> extends true ? true : false) : false;

    type GroupedOps = import("../../../src/dataframe/types").GroupedAggDelegatedOps;
    type ColExpr = import("../../../src/columnExpressions").ColumnExpr<any>;

    // 1. Exact parameter parity across every delegated method
    type _TestSum = Assert<Exact<Parameters<GroupedOps["sum"]>, Parameters<ColExpr["sum"]>>>;
    type _TestMean = Assert<Exact<Parameters<GroupedOps["mean"]>, Parameters<ColExpr["mean"]>>>;
    type _TestCount = Assert<Exact<Parameters<GroupedOps["count"]>, Parameters<ColExpr["count"]>>>;
    type _TestSkew = Assert<Exact<Parameters<GroupedOps["skew"]>, Parameters<ColExpr["skew"]>>>;
    type _TestKurtosis = Assert<Exact<Parameters<GroupedOps["kurtosis"]>, Parameters<ColExpr["kurtosis"]>>>;
    type _TestNUnique = Assert<Exact<Parameters<GroupedOps["nUnique"]>, Parameters<ColExpr["nUnique"]>>>;

    // 2. Proving invalid arguments are rejected at compile time:
    const dummyOps = 0 as any as GroupedOps;
    // @ts-expect-error sum accepts 0 arguments
    () => dummyOps.sum("invalid");
    // @ts-expect-error count only accepts { includeNulls?: boolean }
    () => dummyOps.count({ invalidOption: 123 });
    // @ts-expect-error skew rejects invalid option keys
    () => dummyOps.skew({ nonExistentKey: true });
    // @ts-expect-error nUnique rejects invalid option types
    () => dummyOps.nUnique({ nullsEqual: "not-a-boolean" });

    void (0 as any as [
        _TestSum,
        _TestMean,
        _TestCount,
        _TestSkew,
        _TestKurtosis,
        _TestNUnique
    ]);
}

// 17. Edge Case: Non-aggregation expression inside agg (e.g. literal, arithmetic on key, scalar expr)
const literalExprDf = new DataFrame([
    { grp: "A", val: 10 },
    { grp: "A", val: 20 },
    { grp: "B", val: 30 },
]);
const literalAggRes = literalExprDf.groupBy("grp").agg(
    $df.col("val").sum().alias("sum_val"),
    $df.lit(42).alias("constant_val"),
    $df.col("grp").alias("group_copy")
).toDicts();

const litA = literalAggRes.find((r: any) => r.grp === "A");
const litB = literalAggRes.find((r: any) => r.grp === "B");
if (!litA || litA.sum_val !== 30 || litA.constant_val !== 42 || litA.group_copy !== "A") {
    throw new Error("Non-agg literal and column expression inside agg failed for group A");
}
if (!litB || litB.sum_val !== 30 || litB.constant_val !== 42 || litB.group_copy !== "B") {
    throw new Error("Non-agg literal and column expression inside agg failed for group B");
}

// 18. Edge Case: Post-aggregation scalar arithmetic (e.g. $df.col("score").sum().add(100))
const postAggTestDf = new DataFrame([
    { grp: "A", score: 10 },
    { grp: "A", score: 20 },
    { grp: "B", score: 50 },
]);
const postAggRes = postAggTestDf.groupBy("grp").agg(
    $df.col("score").sum().add(100).alias("sum_plus_100"),
    $df.col("score").max().alias("max_score")
).toDicts();

const postA = postAggRes.find((r: any) => r.grp === "A");
const postB = postAggRes.find((r: any) => r.grp === "B");
if (!postA || postA.sum_plus_100 !== 130 || postA.max_score !== 20) {
    throw new Error("Post-aggregation expression failed for group A");
}
if (!postB || postB.sum_plus_100 !== 150 || postB.max_score !== 50) {
    throw new Error("Post-aggregation expression failed for group B");
}

// 19. Edge Case: Grouping with complex types (Date, BigInt, Boolean keys)
const complexKeyDf = new DataFrame([
    { dateKey: new Date("2025-01-01T00:00:00Z"), big: 100n, flag: true, val: 5 },
    { dateKey: new Date("2025-01-01T00:00:00Z"), big: 100n, flag: true, val: 15 },
    { dateKey: new Date("2025-01-02T00:00:00Z"), big: 200n, flag: false, val: 50 },
]);
const complexAgg = complexKeyDf.groupBy(["dateKey", "big", "flag"]).agg(
    $df.col("val").sum().alias("total")
);
if (complexAgg.height !== 2) throw new Error("Complex key grouping height mismatch, expected 2");
const complexRows = complexAgg.toDicts();
const d1 = complexRows.find((r: any) => r.big === 100n);
const d2 = complexRows.find((r: any) => r.big === 200n);
if (!d1 || d1.total !== 20 || d1.flag !== true) throw new Error("Complex key group 1 failed");
if (!d2 || d2.total !== 50 || d2.flag !== false) throw new Error("Complex key group 2 failed");

// 20. Edge Case: Nested and array/implode aggregations inside agg()
const arrayAggDf = new DataFrame([
    { grp: "X", item: "apple" },
    { grp: "X", item: "banana" },
    { grp: "Y", item: "cherry" },
]);
const arrayAggRes = arrayAggDf.groupBy("grp").agg(
    $df.col("item").implode().alias("items"),
    $df.col("item").first().alias("first_item"),
    $df.col("item").last().alias("last_item")
).toDicts();

const xGroup = arrayAggRes.find((r: any) => r.grp === "X");
const yGroup = arrayAggRes.find((r: any) => r.grp === "Y");
if (!xGroup || !Array.isArray(xGroup.items) || xGroup.items.length !== 2 || xGroup.first_item !== "apple" || xGroup.last_item !== "banana") {
    throw new Error("Array/implode aggregation failed for group X");
}
if (!yGroup || !Array.isArray(yGroup.items) || yGroup.items.length !== 1 || yGroup.first_item !== "cherry" || yGroup.last_item !== "cherry") {
    throw new Error("Array/implode aggregation failed for group Y");
}

// 21. Edge Case: Zero matching rows / empty groups filter condition
const sparseDf = new DataFrame([
    { cat: "A", num: 1 },
    { cat: "A", num: 2 },
    { cat: "B", num: 10 },
]);
const filteredPreAgg = sparseDf.groupBy("cat").agg(
    $df.when($df.col("num").gt(5)).then($df.col("num")).otherwise(null).sum().alias("sum_gt_5")
).toDicts();
const aFiltered = filteredPreAgg.find((r: any) => r.cat === "A");
const bFiltered = filteredPreAgg.find((r: any) => r.cat === "B");
if (!aFiltered || aFiltered.sum_gt_5 !== null) throw new Error("All-filtered-out group should sum to null");
if (!bFiltered || bFiltered.sum_gt_5 !== 10) throw new Error("Group B sum_gt_5 should be 10");

// 23. Edge Case: Duplicate output column aliases (last expression wins)
const dupAliasDf = new DataFrame([
    { grp: "A", val: 10 },
    { grp: "A", val: 20 },
]);
const dupAliasRes = dupAliasDf.groupBy("grp").agg(
    $df.col("val").min().alias("res"),
    $df.col("val").max().alias("res")
).toDicts();
if (dupAliasRes[0].res !== 20) {
    throw new Error("Duplicate output alias in agg() should overwrite with last evaluated value");
}

// 24. Edge Case: Grouping by entire dataset as a single group vs unique per row
const uniformDf = new DataFrame([
    { id: 1, v: 100 },
    { id: 2, v: 200 },
    { id: 3, v: 300 },
]);
const allDistinctRes = uniformDf.groupBy("id").agg($df.col("v").sum().alias("v_sum"));
if (allDistinctRes.height !== 3) throw new Error("Unique key per row should produce N groups");

const constKeyDf = new DataFrame([
    { grp: 1, v: 10 },
    { grp: 1, v: 20 },
    { grp: 1, v: 30 },
]);
const singleGroupRes = constKeyDf.groupBy("grp").agg(
    $df.col("v").sum().alias("v_sum"),
    $df.col("v").count().alias("v_count"),
    $df.col("v").mean().alias("v_mean")
).toDicts();
if (singleGroupRes.length !== 1 || singleGroupRes[0].v_sum !== 60 || singleGroupRes[0].v_count !== 3 || singleGroupRes[0].v_mean !== 20) {
    throw new Error("Single monolithic group aggregation failed");
}

// 25. Edge Case: String operations on grouped partitions
const strAggDf = new DataFrame([
    { cat: "A", str: "hello" },
    { cat: "A", str: "world" },
    { cat: "B", str: "foo" },
]);
const strAggRes = strAggDf.groupBy("cat").agg(
    $df.col("str").first().str.toUpperCase().alias("first_upper")
).toDicts();
const aStr = strAggRes.find((r: any) => r.cat === "A");
const bStr = strAggRes.find((r: any) => r.cat === "B");
if (!aStr || aStr.first_upper !== "HELLO" || !bStr || bStr.first_upper !== "FOO") {
    throw new Error("String transformation on grouped result failed");
}

// 26. Edge Case: Dictionary aggregation mapping (via _normalizeArgs)
const dictAggDf = new DataFrame([
    { dept: "Eng", salary: 100 },
    { dept: "Eng", salary: 150 },
    { dept: "Sales", salary: 80 },
]);
const dictAggRes = dictAggDf.groupBy("dept").agg({
    total_salary: $df.col("salary").sum(),
    avg_salary: $df.col("salary").mean(),
    dept_label: "department_summary"
}).toDicts();

const engGroup = dictAggRes.find((r: any) => r.dept === "Eng");
const salesGroup = dictAggRes.find((r: any) => r.dept === "Sales");
if (!engGroup || engGroup.total_salary !== 250 || engGroup.avg_salary !== 125 || engGroup.dept_label !== "department_summary") {
    throw new Error("Dictionary aggregation failed for Eng group");
}
if (!salesGroup || salesGroup.total_salary !== 80 || salesGroup.avg_salary !== 80 || salesGroup.dept_label !== "department_summary") {
    throw new Error("Dictionary aggregation failed for Sales group");
}

console.log("✓ GroupedData.agg tests passed!");



