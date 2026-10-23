declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.minBy tests...");


const df = $df.data([
    { name: "Alice", score: 80 },
    { name: "Bob", score: 95 },
    { name: "Charlie", score: 70 }
]);
const res = df.select([$df.col("name").minBy($df.col("score")).alias("low")]).toDicts() as any[];
if (res[0].low !== "Charlie") throw new Error("minBy failed: " + res[0].low);


console.log("✓ StandardExpr.minBy tests passed!");
