declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.maxBy tests...");


const df = $df.data([
    { name: "Alice", score: 80 },
    { name: "Bob", score: 95 },
    { name: "Charlie", score: 70 }
]);
const res = df.select([$df.col("name").maxBy($df.col("score")).alias("top")]).toDicts() as any[];
if (res[0].top !== "Bob") throw new Error("maxBy failed: " + res[0].top);


console.log("✓ StandardExpr.maxBy tests passed!");
