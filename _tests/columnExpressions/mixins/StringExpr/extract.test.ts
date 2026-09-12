declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StringExpr.extract tests...");


const df = $df.data([
    { code: "id:100-name:alice" },
    { code: "val:200" },
    { code: null }
]);

const res = df.select([
    $df.col("code").str.extract(/(\w+):(\d+)/, { groupIndex: 2 }).alias("num"),
    $df.col("code").str.extract(/(?<id>\d+)/, { groupIndex: "id" }).alias("named"),
    $df.col("code").str.extract(/\d+/, { groupIndex: 0 }).alias("full")
]).toDicts() as any[];

if (res[0].num !== "100" || res[0].named !== "100" || res[0].full !== "100") throw new Error("extract row 0 failed");
if (res[1].full !== "200") throw new Error("extract row 1 failed");
if (res[2].num !== null) throw new Error("extract null failed");


const resNullPat = df.select([
    $df.col("code").str.extract(null as any).alias("null_pat")
]).toDicts() as any[];

if (resNullPat[0].null_pat !== null || resNullPat[1].null_pat !== null || resNullPat[2].null_pat !== null) {
    throw new Error("extract with null pattern should return all nulls");
}

console.log("✓ StringExpr.extract tests passed!");
