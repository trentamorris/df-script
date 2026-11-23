declare const process: any;
import { $df } from "df-script";

console.log("Running StringExpr.toPascalCase tests...");


const df = $df.dataFrame([
    { raw: "hello_world" },
    { raw: null }
]);

const res = df.select([$df.col("raw").str.toPascalCase().alias("p")]).toDicts() as any[];
if (res[0].p !== "HelloWorld") throw new Error("toPascalCase failed");
if (res[1].p !== null) throw new Error("toPascalCase null failed");


console.log("✓ StringExpr.toPascalCase tests passed!");
