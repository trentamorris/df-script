declare const process: any;
import { $df, Utf8 } from "../../../../src/index";

console.log("Running StringExpr.containsAny tests...");

const df = $df.data([
    { phrase: "DFScript is awesome!" },
    { phrase: "Hello world!" },
    { phrase: null }
]);

const res = df.select([
    $df.col("phrase").str.containsAny(["missing", "awesome"]).alias("c_any"),
    $df.col("phrase").str.containsAny(["foo", "bar"]).alias("c_none"),
    $df.col("phrase").str.containsAny([/notfound/, /awesome/i]).alias("c_regex_any"),
    $df.col("phrase").str.containsAny([]).alias("c_empty_arr"),
    $df.col("phrase").str.containsAny(null as any).alias("c_null_pat")
]).toDicts() as any[];

if (res[0].c_any !== true || res[0].c_none !== false) throw new Error("containsAny row 0 failed");
if (res[0].c_regex_any !== true) throw new Error("containsAny regex row 0 failed");
if (res[0].c_empty_arr !== false) throw new Error("containsAny empty search array should return false");
if (res[0].c_null_pat !== null) throw new Error("containsAny null pattern should return null");

if (res[1].c_any !== false) throw new Error("containsAny row 1 failed");
if (res[1].c_regex_any !== false) throw new Error("containsAny regex row 1 failed");
if (res[1].c_null_pat !== null) throw new Error("containsAny null pattern should return null for row 1");

if (res[2].c_any !== null) throw new Error("containsAny null failed");
if (res[2].c_null_pat !== null) throw new Error("containsAny null pattern should return null for null cell");

// 10/10 EXTREME EDGE CASES SUITE FOR CONTAINSANY
const dfEdge = $df.data([
    // Row 0: Mixed text with symbols and special characters
    { code: "ERR_404_NOT_FOUND (status: [FAIL])" },
    // Row 1: Multiline code block
    { code: "function test() {\n  return 42;\n}" },
    // Row 2: Empty string
    { code: "" },
    // Row 3: Null row
    { code: null }
], { code: Utf8 });

const edgeRes = dfEdge.select([
    // Edge 1: Mixed string literals and RegExp in the same array
    $df.col("code").str.containsAny(["SUCCESS", /ERR_\d+/, "OK"]).alias("mixed_patterns"),

    // Edge 2: Search array with regex symbols treated as literal strings
    $df.col("code").str.containsAny(["[FAIL]", "[WARN]"]).alias("literal_brackets"),

    // Edge 3: Multiple stateful global regexes (/pattern/g) in the array
    $df.col("code").str.containsAny([/not_found/gi, /return/g]).alias("multi_stateful"),

    // Edge 4: All patterns missing
    $df.col("code").str.containsAny(["MISSING_1", /MISSING_2/]).alias("all_missing"),

    // Edge 5: Search array containing an empty string (matches any non-null string)
    $df.col("code").str.containsAny(["", "dummy"]).alias("has_empty_in_array")
]).toDicts() as any[];

// Row 0:
if (edgeRes[0].mixed_patterns !== true) throw new Error("Edge 1 mixed patterns failed for row 0");
if (edgeRes[0].literal_brackets !== true) throw new Error("Edge 2 literal brackets failed for row 0");
if (edgeRes[0].multi_stateful !== true) throw new Error("Edge 3 multi-stateful failed for row 0");
if (edgeRes[0].all_missing !== false) throw new Error("Edge 4 all missing should be false for row 0");
if (edgeRes[0].has_empty_in_array !== true) throw new Error("Edge 5 should be true for row 0");

// Row 1:
if (edgeRes[1].mixed_patterns !== false) throw new Error("Edge 1 should be false for row 1");
if (edgeRes[1].multi_stateful !== true) throw new Error("Edge 3 (/return/g) should match row 1");

// Row 2 (Empty string):
if (edgeRes[2].has_empty_in_array !== true) throw new Error("Edge 5 should match empty string with empty pattern");
if (edgeRes[2].mixed_patterns !== false) throw new Error("Edge 1 should be false for empty string");

// Row 3 (Null row):
if (edgeRes[3].mixed_patterns !== null) throw new Error("Edge 1 row 3 must be null");
if (edgeRes[3].literal_brackets !== null) throw new Error("Edge 2 row 3 must be null");
if (edgeRes[3].has_empty_in_array !== null) throw new Error("Edge 5 row 3 must be null");

console.log("✓ StringExpr.containsAny tests passed! (All 10/10 edge cases passing)");
