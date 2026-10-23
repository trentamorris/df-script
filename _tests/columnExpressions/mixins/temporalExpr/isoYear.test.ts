declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.isoYear tests...");


const df = $df.data([
    { date: "2024-02-29" },
    { date: "2023-03-15" },
    { date: "2027-01-02" }, // Gregorian 2027 is ISO year 2026
    { date: null }
], { date: $df.Date });

const res = df.select([$df.col("date").dt.isoYear().alias("iy")]).toDicts() as any[];
if (res[0].iy !== 2024) throw new Error("2024 expected");
if (res[1].iy !== 2023) throw new Error("2023 expected");
if (res[2].iy !== 2026) throw new Error("2027-01-02 expected isoYear 2026");
if (res[3].iy !== null) throw new Error("null expected");


console.log("✓ TemporalExpr.isoYear tests passed!");
