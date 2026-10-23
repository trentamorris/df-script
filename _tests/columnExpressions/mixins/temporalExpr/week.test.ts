declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.week tests...");


const df = $df.data([
    { date: "2024-02-29" },
    { date: "2023-03-15" },
    { date: "2027-01-02" },
    { date: null }
], { date: $df.Date });

const res = df.select([$df.col("date").dt.week().alias("w")]).toDicts() as any[];
if (res[0].w !== 9) throw new Error("2024-02-29 expected week 9");
if (res[1].w !== 11) throw new Error("2023-03-15 expected week 11");
if (res[2].w !== 53) throw new Error("2027-01-02 expected week 53");
if (res[3].w !== null) throw new Error("null expected null");


console.log("✓ TemporalExpr.week tests passed!");
