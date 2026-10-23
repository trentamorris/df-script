declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.daysInMonth tests...");


const df = $df.data([
    { date: "2024-02-15" }, // Leap year Feb -> 29
    { date: "2023-02-15" }, // Non-leap Feb -> 28
    { date: "2023-03-15" }, // March -> 31
    { date: null }
], { date: $df.Date });

const res = df.select([$df.col("date").dt.daysInMonth().alias("dim")]).toDicts() as any[];
if (res[0].dim !== 29) throw new Error("2024-02 expected 29 days");
if (res[1].dim !== 28) throw new Error("2023-02 expected 28 days");
if (res[2].dim !== 31) throw new Error("2023-03 expected 31 days");
if (res[3].dim !== null) throw new Error("null expected null days");


console.log("✓ TemporalExpr.daysInMonth tests passed!");
