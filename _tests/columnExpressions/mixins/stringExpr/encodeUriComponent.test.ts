declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.encodeUriComponent tests...");


const df = $df.data([
    { text: "hello world!" },
    { text: null }
]);

const res = df.select([$df.col("text").str.encodeUriComponent().alias("enc")]).toDicts() as any[];
if (res[0].enc !== "hello%20world!") throw new Error("encodeUriComponent failed: " + res[0].enc);
if (res[1].enc !== null) throw new Error("encodeUriComponent null failed");


console.log("✓ StringExpr.encodeUriComponent tests passed!");
