declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.cumProd tests...");


const df = $df.data([{ val: 2 }, { val: 3 }, { val: 4 }]);
const res = df.select([$df.col("val").cumProd().alias("c")]).toDicts() as any[];
if (res[0].c !== 2 || res[1].c !== 6 || res[2].c !== 24) throw new Error("cumProd failed");


console.log("✓ StandardExpr.cumProd tests passed!");
