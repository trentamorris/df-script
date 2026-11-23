declare const process: any;
import { $df } from "df-script";

console.log("Running StringExpr.jsonDecode tests...");


const df = $df.dataFrame([
    { json: '{"a": 1, "b": "foo"}' },
    { json: null }
]);

const res = df.select([$df.col("json").str.jsonDecode().alias("obj")]).toDicts() as any[];
if (res[0].obj?.a !== 1 || res[0].obj?.b !== "foo") throw new Error("jsonDecode failed");
if (res[1].obj !== null) throw new Error("jsonDecode null failed");


console.log("✓ StringExpr.jsonDecode tests passed!");
