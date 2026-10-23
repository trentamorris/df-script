declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.weekday tests...");


const df = $df.data([
    { date: "2024-02-29" }, // Thursday -> 4
    { date: "2027-01-02" }, // Saturday -> 6
    { date: null }
], { date: $df.Date });

const res = df.select([$df.col("date").dt.weekday().alias("wd")]).toDicts() as any[];
if (res[0].wd !== 4) throw new Error("Thursday expected weekday 4");
if (res[1].wd !== 6) throw new Error("Saturday expected weekday 6");
if (res[2].wd !== null) throw new Error("null expected null");


console.log("✓ TemporalExpr.weekday tests passed!");
