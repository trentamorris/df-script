declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.unique tests...");


const df = $df.data([
    { tags: ["apple", "banana", "apple", "cherry"] },
    { tags: [] },
    { tags: null }
]);

const res = df.select([$df.col("tags").arr.unique().alias("u")]).toDicts() as any[];
if (res[0].u.length !== 3 || !res[0].u.includes("apple") || !res[0].u.includes("banana") || !res[0].u.includes("cherry")) {
    throw new Error("unique failed");
}
if (res[1].u.length !== 0) throw new Error("empty array unique failed");
if (res[2].u !== null) throw new Error("null array unique failed");


console.log("✓ ArrayExpr.unique tests passed!");
