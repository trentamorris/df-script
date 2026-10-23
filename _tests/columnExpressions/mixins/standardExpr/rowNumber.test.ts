declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.rowNumber tests...");

const df = $df.data([{ val: "a" }, { val: "b" }, { val: "c" }]);
const res = df.withColumns([$df.col("val").rowNumber().alias("rn")]).toDicts() as any[];
if (Number(res[0].rn) !== 1 || Number(res[1].rn) !== 2 || Number(res[2].rn) !== 3) {
    throw new Error("rowNumber failed: " + JSON.stringify(res));
}

console.log("✓ StandardExpr.rowNumber tests passed!");
