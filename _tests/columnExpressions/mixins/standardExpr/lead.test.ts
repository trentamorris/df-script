declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.lead tests...");

const df = $df.data([{ val: 10 }, { val: 20 }, { val: 30 }]);

// 1. Basic lead(1)
const res = df.select([$df.col("val").lead(1).alias("l")]).toDicts() as any[];
if (res[0].l !== 20 || res[1].l !== 30 || res[2].l !== null) throw new Error("lead(1) failed");

// 2. Custom fillValue (named option)
const resOpt = df.select([$df.col("val").lead(1, { fillValue: -999 }).alias("l")]).toDicts() as any[];
if (resOpt[0].l !== 20 || resOpt[1].l !== 30 || resOpt[2].l !== -999) throw new Error("lead(1, { fillValue }) failed");

// 3. Negative offset (equivalent to lag)
const resNeg = df.select([$df.col("val").lead(-1, { fillValue: -999 }).alias("l")]).toDicts() as any[];
if (resNeg[0].l !== -999 || resNeg[1].l !== 10 || resNeg[2].l !== 20) throw new Error("lead(-1) failed");

// 4. Zero offset (identity)
const resZero = df.select([$df.col("val").lead(0).alias("l")]).toDicts() as any[];
if (resZero[0].l !== 10 || resZero[1].l !== 20 || resZero[2].l !== 30) throw new Error("lead(0) failed");

// 5. Offset >= length
const resBeyondPos = df.select([$df.col("val").lead(5, { fillValue: "N/A" }).alias("l")]).toDicts() as any[];
if (resBeyondPos[0].l !== "N/A" || resBeyondPos[1].l !== "N/A" || resBeyondPos[2].l !== "N/A") {
    throw new Error("lead(5) beyond positive failed");
}

// 6. Negative offset <= -length
const resBeyondNeg = df.select([$df.col("val").lead(-5, { fillValue: "N/A" }).alias("l")]).toDicts() as any[];
if (resBeyondNeg[0].l !== "N/A" || resBeyondNeg[1].l !== "N/A" || resBeyondNeg[2].l !== "N/A") {
    throw new Error("lead(-5) beyond negative failed");
}

// 7. Partitioning with .over("group")
const dfGrouped = $df.data([
    { group: "A", val: 1 },
    { group: "A", val: 2 },
    { group: "B", val: 3 },
    { group: "B", val: 4 }
]);
const resOver = dfGrouped.withColumns($df.col("val").lead(1, { fillValue: -1 }).over("group").alias("l")).toDicts() as any[];
if (resOver[0].l !== 2 || resOver[1].l !== -1 || resOver[2].l !== 4 || resOver[3].l !== -1) {
    throw new Error("lead with .over() failed");
}

// 8. Empty DataFrame
const emptyDf = $df.data([] as { val: number }[]);
const resEmpty = emptyDf.select([$df.col("val").lead(1).alias("l")]).toDicts() as any[];
if (resEmpty.length !== 0) throw new Error("lead empty DataFrame failed");

console.log("✓ StandardExpr.lead tests passed!");
