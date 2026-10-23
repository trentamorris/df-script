declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.toCamelCase tests...");


const df = $df.data([
    { raw: "hello_world" },
    { raw: "Hello World" },
    { raw: null }
]);

const res = df.select([$df.col("raw").str.toCamelCase().alias("c")]).toDicts() as any[];
if (res[0].c !== "helloWorld" || res[1].c !== "helloWorld") throw new Error("toCamelCase failed");
if (res[2].c !== null) throw new Error("toCamelCase null failed");


console.log("✓ StringExpr.toCamelCase tests passed!");
