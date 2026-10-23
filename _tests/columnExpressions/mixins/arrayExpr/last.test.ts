declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.last tests...");


const df = $df.data([
    { tags: ["apple", "banana", "cherry"] },
    { tags: [] },
    { tags: null }
]);

const res = df.select([$df.col("tags").arr.last().alias("l")]).toDicts() as any[];
if (res[0].l !== "cherry") throw new Error("Expected 'cherry'");
if (res[1].l !== null) throw new Error("Expected null for empty array");
if (res[2].l !== null) throw new Error("Expected null for null array");


console.log("✓ ArrayExpr.last tests passed!");
