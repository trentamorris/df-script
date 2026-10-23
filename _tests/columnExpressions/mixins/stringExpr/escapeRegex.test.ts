declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.escapeRegex tests...");


const df = $df.data([
    { raw: "hello.world*foo+bar?baz^1$2|3(4)[5]{6}/7-8\\9" },
    { raw: "plain text" },
    { raw: null }
]);

const res = df.select([
    $df.col("raw").str.escapeRegex().alias("escaped"),
    $df.col("raw").str.escapeRegex({ mode: "nonAlphanumericAscii" }).alias("escaped_ascii")
]).toDicts() as any[];

if (res[0].escaped !== "hello\\.world\\*foo\\+bar\\?baz\\^1\\$2\\|3\\(4\\)\\[5\\]\\{6\\}\\/7\\-8\\\\9") {
    throw new Error("escapeRegex failed: " + res[0].escaped);
}
if (res[1].escaped_ascii !== "plain\\ text") throw new Error("escapeRegex ascii failed");
if (res[2].escaped !== null) throw new Error("escapeRegex null failed");


console.log("✓ StringExpr.escapeRegex tests passed!");
