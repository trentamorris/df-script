declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.stripCharsStart tests...");


const df = $df.data([
    { name: "  --Alice  " },
    { name: null }
]);

const res = df.select([$df.col("name").str.stripCharsStart().alias("s")]).toDicts() as any[];
if (res[0].s !== "--Alice  ") throw new Error("stripCharsStart failed");
if (res[1].s !== null) throw new Error("stripCharsStart null failed");


console.log("✓ StringExpr.stripCharsStart tests passed!");
