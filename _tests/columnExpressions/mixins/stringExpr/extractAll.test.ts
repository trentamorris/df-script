declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.extractAll tests...");


const df = $df.data([
    { text: "user_123_item_456" },
    { text: "no numbers" },
    { text: null }
]);

const res = df.select([
    $df.col("text").str.extractAll(/\d+/).alias("nums"),
    $df.col("text").str.extractAll(/([a-z]+)_(\d+)/, { groupIndex: 2 }).alias("g2")
]).toDicts() as any[];

if (JSON.stringify(res[0].nums) !== JSON.stringify(["123", "456"])) throw new Error("extractAll nums failed");
if (JSON.stringify(res[0].g2) !== JSON.stringify(["123", "456"])) throw new Error("extractAll g2 failed");
if (JSON.stringify(res[1].nums) !== JSON.stringify([])) throw new Error("extractAll empty failed");
if (res[2].nums !== null) throw new Error("extractAll null failed");


console.log("✓ StringExpr.extractAll tests passed!");
