declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.monthStart tests...");


const df = $df.data([
    { date: "2024-02-29" },
    { date: "2023-03-15" },
    { date: null }
], { date: $df.Date });

const res = df.select([$df.col("date").dt.monthStart().alias("m_start")]).toDicts() as any[];
if (res[0].m_start.toISOString() !== "2024-02-01T00:00:00.000Z") throw new Error("Expected 2024-02-01");
if (res[1].m_start.toISOString() !== "2023-03-01T00:00:00.000Z") throw new Error("Expected 2023-03-01");
if (res[2].m_start !== null) throw new Error("Expected null");


console.log("✓ TemporalExpr.monthStart tests passed!");
