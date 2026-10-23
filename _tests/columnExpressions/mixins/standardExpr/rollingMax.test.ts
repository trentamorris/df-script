declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.rollingMax tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 15 }, { val: 30 }]);
const res = df.select([$df.col("val").rollingMax(2).alias("m")]).toDicts() as any[];
if (res[0].m !== 10 || res[1].m !== 20 || res[2].m !== 20 || res[3].m !== 30) throw new Error("rollingMax failed");


console.log("✓ StandardExpr.rollingMax tests passed!");
