declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.mul tests...");


const df = $df.data([{ a: 10, b: 3 }, { a: -20, b: 5 }, { a: null, b: 3 }]);
const res = df.select([$df.col("a").mul($df.col("b")).alias("m")]).toDicts() as any[];
if (res[0].m !== 30 || res[1].m !== -100 || res[2].m !== null) throw new Error("mul failed");


console.log("✓ StandardExpr.mul tests passed!");
