declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.decode tests...");


const df = $df.data([
    { hex: "68656c6c6f20776f726c64", b64: "aGVsbG8gd29ybGQ=" },
    { hex: "4446536372697074", b64: "WUVTIQ==" },
    { hex: null, b64: null }
]);

const res = df.select([
    $df.col("hex").str.decode({ encoding: "hex" }).alias("dec_hex"),
    $df.col("b64").str.decode({ encoding: "base64" }).alias("dec_b64")
]).toDicts() as any[];

if (res[0].dec_hex !== "hello world" || res[0].dec_b64 !== "hello world") throw new Error("decode row 0 failed");
if (res[1].dec_hex !== "DFScript" || res[1].dec_b64 !== "YES!") throw new Error("decode row 1 failed");
if (res[2].dec_hex !== null) throw new Error("decode null failed");


console.log("✓ StringExpr.decode tests passed!");
