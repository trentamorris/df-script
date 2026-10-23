declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.toKebabCase tests...");


const df = $df.data([
    { raw: "hello_world" },
    { raw: null }
]);

const res = df.select([$df.col("raw").str.toKebabCase().alias("k")]).toDicts() as any[];
if (res[0].k !== "hello-world") throw new Error("toKebabCase failed");
if (res[1].k !== null) throw new Error("toKebabCase null failed");


console.log("✓ StringExpr.toKebabCase tests passed!");
