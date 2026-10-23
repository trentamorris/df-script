declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.floordiv tests...");


const df = $df.data([{ a: 10, b: 3 }, { a: -20, b: 5 }, { a: 10, b: 0 }]);
const res = df.select([$df.col("a").floordiv($df.col("b")).alias("f")]).toDicts() as any[];
if (res[0].f !== 3 || res[1].f !== -4 || res[2].f !== null) throw new Error("floordiv failed");


console.log("✓ StandardExpr.floordiv tests passed!");
