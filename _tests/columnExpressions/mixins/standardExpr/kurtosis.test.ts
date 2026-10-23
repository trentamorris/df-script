declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.kurtosis tests...");


const df = $df.data([{ val: 1 }, { val: 2 }, { val: 3 }, { val: 4 }, { val: 5 }]);
const res = df.select([$df.col("val").kurtosis().alias("k")]).toDicts() as any[];
if (typeof res[0].k !== "number") throw new Error("kurtosis failed");


console.log("✓ StandardExpr.kurtosis tests passed!");
