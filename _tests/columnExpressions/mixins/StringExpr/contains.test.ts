declare const process: any;
import { $df } from "../../../../src/index";

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

console.log("✓ StringExpr.contains tests passed!");
