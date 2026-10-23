declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.explode tests...");


const df = $df.data([
    { digits: "42" },
    { digits: "7" },
    { digits: null }
]);

const res = df.select([$df.col("digits").str.explode().alias("exp")]).toDicts() as any[];
if (JSON.stringify(res[0].exp) !== JSON.stringify(["4", "2"])) throw new Error("explode row 0 failed");
if (JSON.stringify(res[1].exp) !== JSON.stringify(["7"])) throw new Error("explode row 1 failed");
if (res[2].exp !== null) throw new Error("explode null failed");


console.log("✓ StringExpr.explode tests passed!");
