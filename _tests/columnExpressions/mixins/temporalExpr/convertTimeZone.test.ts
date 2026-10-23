declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.convertTimeZone tests...");


const df = $df.data({
    ts: [
        "2024-02-29T23:45:15.123Z",
        null
    ]
});

const res = df.withColumns(
    $df.col("ts").dt.convertTimeZone("Europe/London").alias("converted_london")
).toDicts() as any[];

if (res[0].converted_london.getTime() !== new Date("2024-02-29T23:45:15.123Z").getTime()) {
    throw new Error("convertTimeZone time value failed");
}
if (res[1].converted_london !== null) throw new Error("convertTimeZone null failed");


console.log("✓ TemporalExpr.convertTimeZone tests passed!");
