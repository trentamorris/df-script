declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.degrees tests...");


const df = $df.data([{ val: Math.PI }, { val: null }]);
const res = df.select([$df.col("val").degrees().alias("d")]).toDicts() as any[];
if (Math.abs(res[0].d - 180) > 1e-6 || res[1].d !== null) throw new Error("degrees failed");


console.log("✓ StandardExpr.degrees tests passed!");
