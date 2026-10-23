declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.denseRank tests...");

const df = $df.data([{ val: 10 }, { val: 20 }, { val: 20 }, { val: 30 }]);
const res = df.withColumns([$df.col("val").denseRank().alias("r")]).toDicts() as any[];
if (res[0].r !== 1 || res[1].r !== 2 || res[2].r !== 2 || res[3].r !== 3) throw new Error("denseRank failed: " + JSON.stringify(res));

console.log("✓ StandardExpr.denseRank tests passed!");
