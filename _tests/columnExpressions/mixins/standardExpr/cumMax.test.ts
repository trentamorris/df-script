declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.cumMax tests...");


const df = $df.data([{ val: 10 }, { val: 50 }, { val: 20 }, { val: 60 }]);
const res = df.select([$df.col("val").cumMax().alias("c")]).toDicts() as any[];
if (res[0].c !== 10 || res[1].c !== 50 || res[2].c !== 50 || res[3].c !== 60) throw new Error("cumMax failed");


console.log("✓ StandardExpr.cumMax tests passed!");
