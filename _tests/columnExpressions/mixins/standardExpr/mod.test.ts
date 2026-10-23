declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.mod tests...");


const df = $df.data([{ a: 10, b: 3 }, { a: 10, b: 0 }, { a: null, b: 3 }]);
const res = df.select([$df.col("a").mod($df.col("b")).alias("m")]).toDicts() as any[];
if (res[0].m !== 1 || res[1].m !== null || res[2].m !== null) throw new Error("mod failed");


console.log("✓ StandardExpr.mod tests passed!");
