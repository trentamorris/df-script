declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running ArrayExpr.join tests...");


const df = $df.data([
    { tags: ["apple", "banana", "cherry"] },
    { numbers: [1, null, 2] },
    { tags: null }
]);

const res = df.select([
    $df.col("tags").arr.join(", ").alias("joined_tags"),
    $df.col("numbers").arr.join("-", { ignoreNulls: true }).alias("joined_nums_ignore")
]).toDicts() as any[];

if (res[0].joined_tags !== "apple, banana, cherry") throw new Error("join tags failed");
if (res[1].joined_nums_ignore !== "1-2") throw new Error("join ignore nulls failed");
if (res[2].joined_tags !== null) throw new Error("join null array failed");


console.log("✓ ArrayExpr.join tests passed!");
