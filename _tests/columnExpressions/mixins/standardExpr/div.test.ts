declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.div tests...");


const df = $df.data([{ a: 10, b: 2 }, { a: -20, b: 5 }, { a: 10, b: 0 }, { a: null, b: 5 }]);
const res = df.select([$df.col("a").div($df.col("b")).alias("c")]).toDicts() as any[];
if (res[0].c !== 5 || res[1].c !== -4 || res[2].c !== null || res[3].c !== null) throw new Error("div failed");


console.log("✓ StandardExpr.div tests passed!");
