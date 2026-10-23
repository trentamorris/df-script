declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.sign tests...");


const df = $df.data([{ val: -5.5 }, { val: 4.88 }, { val: 0 }, { val: null }]);
const res = df.select([$df.col("val").sign().alias("s")]).toDicts() as any[];
if (res[0].s !== -1 || res[1].s !== 1 || res[2].s !== 0 || res[3].s !== null) throw new Error("sign failed");


console.log("✓ StandardExpr.sign tests passed!");
