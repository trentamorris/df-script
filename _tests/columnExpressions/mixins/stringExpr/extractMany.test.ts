declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.extractMany tests...");


const df = $df.data([
    { text: "user_123_item_456" },
    { text: null }
]);

const res = df.select([
    $df.col("text").str.extractMany([/\d+/, /item/, /missing/]).alias("many")
]).toDicts() as any[];

if (JSON.stringify(res[0].many) !== JSON.stringify(["123", "item", null])) throw new Error("extractMany failed");
if (res[1].many !== null) throw new Error("extractMany null failed");


console.log("✓ StringExpr.extractMany tests passed!");
