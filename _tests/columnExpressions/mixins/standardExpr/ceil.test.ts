declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.ceil tests...");


const df = $df.data([{ val: -5.5 }, { val: 4.88 }, { val: null }]);
const res = df.select([$df.col("val").ceil().alias("c")]).toDicts() as any[];
if (res[0].c !== -5 || res[1].c !== 5 || res[2].c !== null) throw new Error("ceil failed");


console.log("✓ StandardExpr.ceil tests passed!");
