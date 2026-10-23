declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.decodeUriComponent tests...");


const df = $df.data([
    { url: "hello%20world%21" },
    { url: null }
]);

const res = df.select([$df.col("url").str.decodeUriComponent().alias("dec")]).toDicts() as any[];
if (res[0].dec !== "hello world!") throw new Error("decodeUriComponent failed");
if (res[1].dec !== null) throw new Error("decodeUriComponent null failed");


console.log("✓ StringExpr.decodeUriComponent tests passed!");
