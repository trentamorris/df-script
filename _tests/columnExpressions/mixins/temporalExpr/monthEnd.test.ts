declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.monthEnd tests...");


const df = $df.data([
    { date: "2024-02-15" },
    { date: "2023-03-15" },
    { date: null }
], { date: $df.Date });

const res = df.select([$df.col("date").dt.monthEnd().alias("m_end")]).toDicts() as any[];
if (res[0].m_end.toISOString() !== "2024-02-29T00:00:00.000Z") throw new Error("2024 Feb end expected 2024-02-29");
if (res[1].m_end.toISOString() !== "2023-03-31T00:00:00.000Z") throw new Error("2023 Mar end expected 2023-03-31");
if (res[2].m_end !== null) throw new Error("null expected null");


console.log("✓ TemporalExpr.monthEnd tests passed!");
