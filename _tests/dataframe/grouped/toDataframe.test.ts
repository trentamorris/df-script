import { DataFrame } from "df-script";

console.log("Running GroupedData.toDataframe tests...");

const df = new DataFrame([
    { group: "A", val: 1 },
    { group: "A", val: 2 },
    { group: "B", val: 3 },
]);

// 1. Convert group keys back to distinct DataFrame
const distinctDf = df.groupBy("group").toDataframe();

if (distinctDf.height !== 2) {
    throw new Error(`Expected height 2, got ${distinctDf.height}`);
}

const rows = distinctDf.toDicts();
const groups = rows.map(r => r.group);
if (!groups.includes("A") || !groups.includes("B")) {
    throw new Error("Missing group key in distinct DataFrame");
}

// 2. Multi-column grouping toDataframe
const multiDf = new DataFrame([
    { g1: "X", g2: 1, v: 10 },
    { g1: "X", g2: 1, v: 20 },
    { g1: "X", g2: 2, v: 30 },
    { g1: "Y", g2: 1, v: 40 },
]);

const distinctMulti = multiDf.groupBy(["g1", "g2"]).toDataframe();
if (distinctMulti.height !== 3) {
    throw new Error(`Expected height 3 for multi-key distinct DataFrame, got ${distinctMulti.height}`);
}

console.log("✓ GroupedData.toDataframe tests passed!");
