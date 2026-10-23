declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.stripChars tests...");


const df = $df.data([
    { name: "  --Alice  " },
    { name: null }
]);

const res = df.select([
    $df.col("name").str.stripChars().alias("s_ws"),
    $df.col("name").str.stripChars(" -").alias("s_chars")
]).toDicts() as any[];

if (res[0].s_ws !== "--Alice" || res[0].s_chars !== "Alice") throw new Error("stripChars failed");
if (res[1].s_ws !== null) throw new Error("stripChars null failed");


console.log("✓ StringExpr.stripChars tests passed!");
