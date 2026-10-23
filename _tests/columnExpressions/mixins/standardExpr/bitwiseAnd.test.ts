declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.bitwiseAnd tests...");

const df = $df.data([{ a: 6 }, { a: 3 }, { a: null }]);
const res = df.select([$df.col("a").bitwiseAnd().alias("res")]).toDicts() as any[];
if (res[0].res !== 2) throw new Error("bitwiseAnd failed: " + res[0].res);

console.log("✓ StandardExpr.bitwiseAnd tests passed!");
