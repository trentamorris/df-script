declare const process: any;
import { $df } from "../../../src/index";

console.log("Running ExprBase.alias edge-case tests...");

// 1. Basic alias renaming
const df = $df.data({ a: [1, 2, 3] });
const res1 = df.select([
    $df.col("a").alias("renamed_a")
]).toDicts() as any[];

if (res1.length !== 3) throw new Error("1. alias failed row count");
if (!("renamed_a" in res1[0])) throw new Error("1. alias failed key presence");
if (res1[0].renamed_a !== 1 || res1[1].renamed_a !== 2 || res1[2].renamed_a !== 3) {
    throw new Error("1. alias values mismatch");
}

// 2. Chained operations with alias
const res2 = df.select([
    $df.col("a").add(10).alias("added_ten")
]).toDicts() as any[];

if (res2[0].added_ten !== 11 || res2[1].added_ten !== 12 || res2[2].added_ten !== 13) {
    throw new Error("2. alias on chained expression failed");
}

// 3. Overriding previous alias (multiple alias calls in sequence)
const res3 = df.select([
    $df.col("a").alias("first_name").alias("final_name")
]).toDicts() as any[];

if ("first_name" in res3[0]) throw new Error("3. previous alias should be replaced");
if (res3[0].final_name !== 1 || res3[1].final_name !== 2 || res3[2].final_name !== 3) {
    throw new Error("3. final alias values failed");
}

// 4. Aliasing with special characters, spaces, and punctuation
const specialKey = "col with spaces & (symbols) #1!";
const res4 = df.select([
    $df.col("a").alias(specialKey)
]).toDicts() as any[];

if (!(specialKey in res4[0]) || res4[0][specialKey] !== 1) {
    throw new Error("4. alias with special characters failed");
}

// 5. Aliasing empty DataFrame (preserves schema/column name)
const emptyDf = $df.data({ a: [] as number[] });
const resEmpty = emptyDf.select([
    $df.col("a").alias("b")
]).toDicts() as any[];

if (resEmpty.length !== 0) throw new Error("5. empty DataFrame alias should return empty rows");

// 6. Aliasing aggregation result in select and groupBy
const dfGroup = $df.data({ g: ["x", "x", "y"], val: [10, 20, 30] });
const resAgg = dfGroup.groupBy("g").agg([
    $df.col("val").sum().alias("total_val"),
    $df.col("val").mean().alias("avg_val")
]).toDicts() as any[];

if (!("total_val" in resAgg[0]) || !("avg_val" in resAgg[0])) {
    throw new Error("6. groupBy agg alias failed");
}

// 7. Aliasing literal expressions
const resLit = df.select([
    $df.lit(42).alias("answer"),
    $df.lit("hello").alias("greeting")
]).toDicts() as any[];

if (resLit[0].answer !== 42 || resLit[0].greeting !== "hello") {
    throw new Error("7. lit alias failed");
}

// 8. Multiple aliased expressions with same source column
const resMulti = df.select([
    $df.col("a").alias("a1"),
    $df.col("a").alias("a2"),
    $df.col("a").mul(2).alias("a_doubled")
]).toDicts() as any[];

if (resMulti[0].a1 !== 1 || resMulti[0].a2 !== 1 || resMulti[0].a_doubled !== 2) {
    throw new Error("8. multiple aliases from single column failed");
}

console.log("✓ StandardExpr.alias tests passed! (8 edge cases)");
