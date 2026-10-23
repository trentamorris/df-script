declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.first tests...");


const df = $df.data([
    { tags: ["apple", "banana", "cherry"] },
    { tags: [] },
    { tags: null }
]);

const res = df.select([$df.col("tags").arr.first().alias("f")]).toDicts() as any[];
if (res[0].f !== "apple") throw new Error("Expected 'apple'");
if (res[1].f !== null) throw new Error("Expected null for empty array");
if (res[2].f !== null) throw new Error("Expected null for null array");


console.log("✓ ArrayExpr.first tests passed!");
