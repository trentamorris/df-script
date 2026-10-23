declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.findMany tests...");

const df = $df.data([
    { text: "apple banana cherry" },
    { text: null }
]);

const res = df.select([
    $df.col("text").str.findMany(["apple", "banana", "missing"]).alias("indices")
]).toDicts() as any[];

if (JSON.stringify(res[0].indices) !== JSON.stringify(["0", "6", null]) && JSON.stringify(res[0].indices) !== JSON.stringify([0, 6, null])) {
    throw new Error("findMany failed: " + JSON.stringify(res[0].indices));
}
if (res[1].indices !== null) throw new Error("findMany null failed");

console.log("✓ StringExpr.findMany tests passed!");
