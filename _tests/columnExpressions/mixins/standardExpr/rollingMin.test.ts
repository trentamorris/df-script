declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.rollingMin tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 15 }, { val: 30 }]);
const res = df.select([$df.col("val").rollingMin(2).alias("m")]).toDicts() as any[];
if (res[0].m !== 10 || res[1].m !== 10 || res[2].m !== 15 || res[3].m !== 15) throw new Error("rollingMin failed");


console.log("✓ StandardExpr.rollingMin tests passed!");
