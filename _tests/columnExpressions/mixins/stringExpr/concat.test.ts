declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.concat tests...");


const df = $df.data([
    { a: "hello", b: " world" },
    { a: "foo", b: "bar" },
    { a: null, b: "baz" }
]);

const res = df.select([
    $df.col("a").str.concat($df.col("b")).alias("c1"),
    $df.col("a").str.concat("!").alias("c2")
]).toDicts() as any[];

if (res[0].c1 !== "hello world" || res[0].c2 !== "hello!") throw new Error("concat failed");
if (res[1].c1 !== "foobar") throw new Error("concat 1 failed");
if (res[2].c1 !== null) throw new Error("concat null failed");


console.log("✓ StringExpr.concat tests passed!");
