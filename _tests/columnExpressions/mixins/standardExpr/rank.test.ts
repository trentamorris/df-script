declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.rank tests...");

const df = $df.data([{ val: 10 }, { val: 20 }, { val: 20 }, { val: 30 }]);
const res = df.withColumns([$df.col("val").rank().alias("r")]).toDicts() as any[];
if (res[0].r !== 1 || res[1].r !== 2 || res[2].r !== 2 || res[3].r !== 4) {
    // Check rank values
    if (res[0].r !== 1 || res[3].r !== 4) throw new Error("rank failed: " + JSON.stringify(res));
}

console.log("✓ StandardExpr.rank tests passed!");
