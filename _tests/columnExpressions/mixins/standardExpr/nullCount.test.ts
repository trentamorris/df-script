declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.nullCount tests...");


const df = $df.data([{ val: 10 }, { val: null }, { val: 30 }, { val: null }]);
const res = df.select([$df.col("val").nullCount().alias("nc")]).toDicts() as any[];
if (res[0].nc !== 2) throw new Error("nullCount failed: " + res[0].nc);


console.log("✓ StandardExpr.nullCount tests passed!");
