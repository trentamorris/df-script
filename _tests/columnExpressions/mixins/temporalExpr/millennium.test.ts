declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.millennium tests...");


const d1000 = new Date(0); d1000.setUTCFullYear(1000, 0, 1);
const df = $df.data({
    date: [
        new Date("2026-05-25T00:00:00.000Z"),
        new Date("2000-12-31T23:59:59.000Z"),
        d1000,
        null
    ]
}, { date: $df.Datetime });

const res = df.select([$df.col("date").dt.millennium().alias("m")]).toDicts() as any[];
if (res[0].m !== 3) throw new Error("2026 expected millennium 3");
if (res[1].m !== 2) throw new Error("2000 expected millennium 2");
if (res[2].m !== 1) throw new Error("1000 expected millennium 1");
if (res[3].m !== null) throw new Error("null expected null");


console.log("✓ TemporalExpr.millennium tests passed!");
