declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.find tests...");

const df = $df.data([
    { text: "hello world" },
    { text: null }
]);

const res = df.select([
    $df.col("text").str.find("world").alias("idx_str"),
    $df.col("text").str.find(/world/).alias("idx_regex"),
    $df.col("text").str.find("missing").alias("idx_missing")
]).toDicts() as any[];

if (res[0].idx_str !== 6 || res[0].idx_regex !== 6 || res[0].idx_missing !== null) throw new Error("find failed");
if (res[1].idx_str !== null) throw new Error("find null failed");

console.log("✓ StringExpr.find tests passed!");
