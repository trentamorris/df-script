declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.hypot tests...");


const df = $df.data([{ a: 3, b: 4 }, { a: null, b: 4 }]);
const res = df.select([$df.col("a").hypot($df.col("b")).alias("h")]).toDicts() as any[];
if (res[0].h !== 5 || res[1].h !== null) throw new Error("hypot failed");


console.log("✓ StandardExpr.hypot tests passed!");
