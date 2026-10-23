declare const process: any;
import { $df } from "../../../../src/index";

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

console.log("✓ StringExpr.containsAny tests passed!");
