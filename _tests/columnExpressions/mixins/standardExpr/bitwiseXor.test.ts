declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.bitwiseXor tests...");

const df = $df.data([{ a: 6 }, { a: 3 }, { a: null }]);
const res = df.select([$df.col("a").bitwiseXor().alias("res")]).toDicts() as any[];
if (res[0].res !== 5) throw new Error("bitwiseXor failed: " + res[0].res);

console.log("✓ StandardExpr.bitwiseXor tests passed!");
