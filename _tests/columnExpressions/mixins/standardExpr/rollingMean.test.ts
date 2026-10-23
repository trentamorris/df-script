declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.rollingMean tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }, { val: 40 }]);
const res = df.select([$df.col("val").rollingMean(2).alias("m")]).toDicts() as any[];
if (res[0].m !== 10 || res[1].m !== 15 || res[2].m !== 25 || res[3].m !== 35) throw new Error("rollingMean failed");


console.log("✓ StandardExpr.rollingMean tests passed!");
