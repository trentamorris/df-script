declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.stripCharsEnd tests...");


const df = $df.data([
    { name: "  --Alice  " },
    { name: null }
]);

const res = df.select([$df.col("name").str.stripCharsEnd().alias("s")]).toDicts() as any[];
if (res[0].s !== "  --Alice") throw new Error("stripCharsEnd failed");
if (res[1].s !== null) throw new Error("stripCharsEnd null failed");


console.log("✓ StringExpr.stripCharsEnd tests passed!");
