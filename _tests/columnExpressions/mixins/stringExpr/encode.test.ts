declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.encode tests...");


const df = $df.data([
    { text: "hello world" },
    { text: "DFScript 🚀" },
    { text: null }
]);

const res = df.select([
    $df.col("text").str.encode({ encoding: "hex" }).alias("hex"),
    $df.col("text").str.encode({ encoding: "base64" }).alias("b64")
]).toDicts() as any[];

if (res[0].hex !== "68656c6c6f20776f726c64" || res[0].b64 !== "aGVsbG8gd29ybGQ=") throw new Error("encode row 0 failed");
if (res[2].hex !== null) throw new Error("encode null failed");


console.log("✓ StringExpr.encode tests passed!");
