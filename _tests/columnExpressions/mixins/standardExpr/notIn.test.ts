declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.notIn tests...");


const df = $df.data([{ val: 10 }, { val: 25 }, { val: null }]);
const res = df.select([$df.col("val").notIn([10, 20, 30]).alias("n")]).toDicts() as any[];
if (res[0].n !== false || res[1].n !== true || res[2].n !== null) throw new Error("notIn failed");


console.log("✓ StandardExpr.notIn tests passed!");
