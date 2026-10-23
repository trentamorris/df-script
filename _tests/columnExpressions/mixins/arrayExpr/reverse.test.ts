declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.reverse tests...");


const df = $df.data([
    { tags: ["apple", "banana", "cherry"] },
    { tags: [] },
    { tags: null }
]);

const res = df.select([$df.col("tags").arr.reverse().alias("r")]).toDicts() as any[];
if (res[0].r[0] !== "cherry" || res[0].r[2] !== "apple") throw new Error("reverse failed");
if (res[1].r.length !== 0) throw new Error("empty array reverse failed");
if (res[2].r !== null) throw new Error("null array reverse failed");


console.log("✓ ArrayExpr.reverse tests passed!");
