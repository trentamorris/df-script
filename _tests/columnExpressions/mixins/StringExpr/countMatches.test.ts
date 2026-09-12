declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.countMatches tests...");


const df = $df.data([
    { text: "banana" },
    { text: "apple.banana.cherry" },
    { text: "hello 123 world 456" },
    { text: null }
]);

const res = df.select([
    $df.col("text").str.countMatches("a").alias("count_a"),
    $df.col("text").str.countMatches(".", { literal: true }).alias("count_dot"),
    $df.col("text").str.countMatches(/\d+/g).alias("count_digits")
]).toDicts() as any[];

if (res[0].count_a !== 3) throw new Error("countMatches 'a' failed");
if (res[1].count_dot !== 2) throw new Error("countMatches literal dot failed");
if (res[2].count_digits !== 2) throw new Error("countMatches digits failed");
if (res[3].count_a !== null) throw new Error("countMatches null failed");


const resNullPat = df.select([
    $df.col("text").str.countMatches(null as any).alias("null_pat")
]).toDicts() as any[];

if (resNullPat[0].null_pat !== null || resNullPat[3].null_pat !== null) {
    throw new Error("countMatches with null pattern should return nulls");
}

console.log("✓ StringExpr.countMatches tests passed!");
