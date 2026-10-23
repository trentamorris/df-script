declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.isDuplicated tests...");


const df = $df.data([{ val: 10 }, { val: 20 }, { val: 10 }, { val: 30 }]);
const res = df.select([$df.col("val").isDuplicated().alias("d")]).toDicts() as any[];
if (res[0].d !== true || res[1].d !== false || res[2].d !== true || res[3].d !== false) throw new Error("isDuplicated failed");


console.log("✓ StandardExpr.isDuplicated tests passed!");
