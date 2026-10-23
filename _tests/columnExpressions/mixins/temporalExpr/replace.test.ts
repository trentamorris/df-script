declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.replace tests...");


const df = $df.data({
    ts: [
        "2024-02-29T23:45:15.123Z",
        null
    ]
});

const res = df.withColumns(
    $df.col("ts").dt.replace({ year: 2030, month: 12, day: 25, hour: 8, timeZone: "America/Chicago" }).alias("replaced_chicago")
).toDicts() as any[];

if (res[0].replaced_chicago.getUTCFullYear() !== 2030) throw new Error("replace year failed");
if (res[1].replaced_chicago !== null) throw new Error("replace null failed");


console.log("✓ TemporalExpr.replace tests passed!");
