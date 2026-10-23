declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running TemporalExpr.century tests...");


const d1000 = new Date(0); d1000.setUTCFullYear(1000, 0, 1);
const d100 = new Date(0); d100.setUTCFullYear(100, 0, 1);
const d1 = new Date(0); d1.setUTCFullYear(1, 0, 1);

const df = $df.data({
    date: [
        new Date("2026-05-25T00:00:00.000Z"),
        new Date("2001-01-01T00:00:00.000Z"),
        new Date("2000-12-31T23:59:59.000Z"),
        new Date("2000-01-01T00:00:00.000Z"),
        new Date("1901-01-01T00:00:00.000Z"),
        new Date("1900-12-31T00:00:00.000Z"),
        d1000,
        d100,
        d1,
        null
    ]
}, { date: $df.Datetime });

const res = df.select([$df.col("date").dt.century().alias("c")]).toDicts() as any[];
if (res[0].c !== 21) throw new Error("2026 expected century 21");
if (res[1].c !== 21) throw new Error("2001 expected century 21");
if (res[2].c !== 20) throw new Error("2000-12-31 expected century 20");
if (res[3].c !== 20) throw new Error("2000-01-01 expected century 20");
if (res[4].c !== 20) throw new Error("1901-01-01 expected century 20");
if (res[5].c !== 19) throw new Error("1900-12-31 expected century 19");
if (res[6].c !== 10) throw new Error("1000 expected century 10");
if (res[7].c !== 1) throw new Error("100 expected century 1");
if (res[8].c !== 1) throw new Error("1 expected century 1");
if (res[9].c !== null) throw new Error("null expected century null");


console.log("✓ TemporalExpr.century tests passed!");
