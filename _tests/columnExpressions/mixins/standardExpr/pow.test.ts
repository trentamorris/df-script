declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.pow tests...");


const df = $df.data([{ a: 2, b: 3 }, { a: 5, b: 2 }, { a: null, b: 2 }]);
const res = df.select([$df.col("a").pow($df.col("b")).alias("p")]).toDicts() as any[];
if (res[0].p !== 8 || res[1].p !== 25 || res[2].p !== null) throw new Error("pow failed");


console.log("✓ StandardExpr.pow tests passed!");
