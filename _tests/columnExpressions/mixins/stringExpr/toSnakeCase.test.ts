declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.toSnakeCase tests...");


const df = $df.data([
    { raw: "HelloWorld" },
    { raw: null }
]);

const res = df.select([$df.col("raw").str.toSnakeCase().alias("s")]).toDicts() as any[];
if (res[0].s !== "hello_world") throw new Error("toSnakeCase failed");
if (res[1].s !== null) throw new Error("toSnakeCase null failed");


console.log("✓ StringExpr.toSnakeCase tests passed!");
