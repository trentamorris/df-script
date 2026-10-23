declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.isBusinessDay tests...");


const df = $df.data([
    { date: "2024-02-29" }, // Thursday -> true
    { date: "2027-01-02" }, // Saturday -> false
    { date: null }
], { date: $df.Date });

const res = df.select([
    $df.col("date").dt.isBusinessDay().alias("is_biz"),
    $df.col("date").dt.isBusinessDay({ holidays: ["2024-02-29"] }).alias("is_biz_hol")
]).toDicts() as any[];

if (res[0].is_biz !== true) throw new Error("Thursday should be business day");
if (res[0].is_biz_hol !== false) throw new Error("Thursday with holiday should be false");
if (res[1].is_biz !== false) throw new Error("Saturday should not be business day");
if (res[2].is_biz !== null) throw new Error("Null date should evaluate to null");


console.log("✓ TemporalExpr.isBusinessDay tests passed!");
