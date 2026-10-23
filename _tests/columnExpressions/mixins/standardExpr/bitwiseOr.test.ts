declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.bitwiseOr tests...");

const df = $df.data([{ a: 6 }, { a: 3 }, { a: null }]);
const res = df.select([$df.col("a").bitwiseOr().alias("res")]).toDicts() as any[];
if (res[0].res !== 7) throw new Error("bitwiseOr failed: " + res[0].res);

console.log("✓ StandardExpr.bitwiseOr tests passed!");
