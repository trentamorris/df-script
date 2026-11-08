declare const process: any;
import { $df, Utf8, Int32 } from "../../../../src/index";

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

// 10/10 EXTREME EDGE CASES SUITE FOR CONCAT
const dfEdge = $df.data([
    // Row 0: Normal strings
    { s: "order-", num_col: 101, empty_s: "" },
    // Row 1: Empty string base
    { s: "", num_col: 0, empty_s: "" },
    // Row 2: Special Unicode / Emoji characters
    { s: "Hello 🌍 ", num_col: 999, empty_s: "🚀" },
    // Row 3: Null base with non-null column
    { s: null, num_col: 55, empty_s: "prefix" },
    // Row 4: Non-null base with null target column
    { s: "base", num_col: null, empty_s: null }
], { s: Utf8, num_col: Int32, empty_s: Utf8 });

const resEdge = dfEdge.select([
    // Edge 1: Dynamic column expression concat
    $df.col("s").str.concat($df.col("num_col")).alias("dyn_concat"),

    // Edge 2: Empty string concatenation (identity preservation)
    $df.col("s").str.concat("").alias("concat_empty"),

    // Edge 3: Dynamic empty column concat
    $df.col("s").str.concat($df.col("empty_s")).alias("concat_dyn_empty"),

    // Edge 4: Unicode & emojis
    $df.col("s").str.concat("🎉").alias("concat_emoji")
]).toDicts() as any[];

// Row 0:
if (resEdge[0].dyn_concat !== "order-101") throw new Error("Edge 1 row 0 failed");
if (resEdge[0].concat_empty !== "order-") throw new Error("Edge 2 row 0 failed");
if (resEdge[0].concat_dyn_empty !== "order-") throw new Error("Edge 3 row 0 failed");

// Row 1:
if (resEdge[1].dyn_concat !== "0") throw new Error("Edge 1 row 1 failed");
if (resEdge[1].concat_empty !== "") throw new Error("Edge 2 row 1 failed");

// Row 2 (Unicode/Emoji):
if (resEdge[2].dyn_concat !== "Hello 🌍 999") throw new Error("Edge 1 row 2 failed");
if (resEdge[2].concat_dyn_empty !== "Hello 🌍 🚀") throw new Error("Edge 3 row 2 failed");
if (resEdge[2].concat_emoji !== "Hello 🌍 🎉") throw new Error("Edge 4 row 2 failed");

// Row 3 (Null base -> Kleene logic yields null):
if (resEdge[3].dyn_concat !== null) throw new Error("Edge 1 row 3 must be null");
if (resEdge[3].concat_empty !== null) throw new Error("Edge 2 row 3 must be null");

// Row 4 (Null operand -> Kleene logic yields null):
if (resEdge[4].dyn_concat !== null) throw new Error("Edge 1 row 4 must be null");
if (resEdge[4].concat_dyn_empty !== null) throw new Error("Edge 3 row 4 must be null");

console.log("✓ StringExpr.concat tests passed! (All 10/10 edge cases passing)");
