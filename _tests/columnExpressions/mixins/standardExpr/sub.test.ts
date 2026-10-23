declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.sub tests...");


const df = $df.data([{ a: 10, b: 3 }, { a: -20, b: 5 }, { a: null, b: 3 }]);
const res = df.select([$df.col("a").sub($df.col("b")).alias("s")]).toDicts() as any[];
if (res[0].s !== 7 || res[1].s !== -25 || res[2].s !== null) throw new Error("sub failed");


console.log("✓ StandardExpr.sub tests passed!");
