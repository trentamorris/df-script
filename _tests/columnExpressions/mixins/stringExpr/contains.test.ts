declare const process: any;
import { $df, Utf8 } from "../../../../src/index";

console.log("Running StringExpr.contains tests...");

const df = $df.data([
    { phrase: "DFScript is awesome!" },
    { phrase: "Hello world!" },
    { phrase: null }
]);

// Stateful global regex: tests that lastIndex is reset to 0 properly across consecutive rows
const statefulRegex = /is/g;

const res = df.select([
    $df.col("phrase").str.contains("awesome").alias("c_str"),
    $df.col("phrase").str.contains(/is/i).alias("c_regex"),
    $df.col("phrase").str.contains(statefulRegex).alias("c_stateful"),
    $df.col("phrase").str.contains("missing").alias("c_missing"),
    $df.col("phrase").str.contains("").alias("c_empty"),
    $df.col("phrase").str.contains(null as any).alias("c_null_pat")
]).toDicts() as any[];

if (res[0].c_str !== true || res[0].c_regex !== true) throw new Error("contains row 0 failed");
if (res[0].c_stateful !== true) throw new Error("contains stateful row 0 failed");
if (res[0].c_empty !== true) throw new Error("contains empty pattern failed");
if (res[0].c_null_pat !== null) throw new Error("contains null pattern should return null");

if (res[1].c_str !== false || res[1].c_missing !== false) throw new Error("contains row 1 failed");
if (res[1].c_stateful !== false) throw new Error("contains stateful row 1 failed");
if (res[1].c_null_pat !== null) throw new Error("contains null pattern should return null for row 1");

if (res[2].c_str !== null) throw new Error("contains null failed");
if (res[2].c_null_pat !== null) throw new Error("contains null pattern should return null for null cell");

// 10/10 EXTREME EDGE CASES SUITE FOR CONTAINS
const dfEdge = $df.data([
    // Row 0: Regex meta-characters in text: "[test] (item) $100 * ^"
    { text: "Price is [2026] (USD) $100 * ^special^." },
    // Row 1: Multiline text with newlines
    { text: "First line\nSecond line\r\nThird line" },
    // Row 2: Empty string
    { text: "" },
    // Row 3: Null text
    { text: null }
], { text: Utf8 });

const edgeRes = dfEdge.select([
    // Edge 1: Literal search of regex meta-characters (brackets, dollar, caret)
    $df.col("text").str.contains("[2026]").alias("has_brackets"),
    $df.col("text").str.contains("$100").alias("has_dollar"),
    $df.col("text").str.contains("^special^").alias("has_caret"),

    // Edge 2: Actual compiled regex with anchors and escape sequences
    $df.col("text").str.contains(/\[\d{4}\]/).alias("regex_digits"),
    $df.col("text").str.contains(/\$100/).alias("regex_escaped_dollar"),

    // Edge 3: Multiline regex flag (/^Second/m)
    $df.col("text").str.contains(/^Second/m).alias("multiline_match"),

    // Edge 4: Empty string search on empty string
    $df.col("text").str.contains("").alias("contains_empty")
]).toDicts() as any[];

// Row 0:
if (edgeRes[0].has_brackets !== true) throw new Error("Edge 1 brackets failed");
if (edgeRes[0].has_dollar !== true) throw new Error("Edge 1 dollar failed");
if (edgeRes[0].has_caret !== true) throw new Error("Edge 1 caret failed");
if (edgeRes[0].regex_digits !== true) throw new Error("Edge 2 regex digits failed");
if (edgeRes[0].regex_escaped_dollar !== true) throw new Error("Edge 2 escaped dollar failed");

// Row 1 (Multiline):
if (edgeRes[1].multiline_match !== true) throw new Error("Edge 3 multiline failed");
if (edgeRes[1].has_brackets !== false) throw new Error("Edge 1 brackets should be false for row 1");

// Row 2 (Empty):
if (edgeRes[2].contains_empty !== true) throw new Error("Edge 4 contains empty should be true for empty string");
if (edgeRes[2].regex_digits !== false) throw new Error("Edge 2 regex digits should be false for empty string");

// Row 3 (Null):
if (edgeRes[3].has_brackets !== null) throw new Error("Edge 1 row 3 must be null");
if (edgeRes[3].multiline_match !== null) throw new Error("Edge 3 row 3 must be null");

console.log("✓ StringExpr.contains tests passed! (All 10/10 edge cases passing)");
