declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.trunc tests...");


const df = $df.data([{ val: -5.5 }, { val: 4.88 }, { val: null }]);
const res = df.select([$df.col("val").trunc().alias("t")]).toDicts() as any[];
if (res[0].t !== -5 || res[1].t !== 4 || res[2].t !== null) throw new Error("trunc failed");


console.log("✓ StandardExpr.trunc tests passed!");
