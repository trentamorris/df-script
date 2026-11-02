declare const process: any;
import { $df } from "../../src/index";

console.log("Running DataFrame.fillNan tests...");

// -------------------------------------------------------------
// Case 1: Standard df.fillNan({ value: ... })
// -------------------------------------------------------------
const df = $df.data([
    { a: 1, b: 10 },
    { a: NaN, b: 20 },
    { a: 3, b: NaN }
]);

const res = df.fillNan({ value: 0 }).toDicts() as any[];
if (res[1].a !== 0) throw new Error("df.fillNan failed for col a");
if (res[2].b !== 0) throw new Error("df.fillNan failed for col b");
if (res[0].a !== 1 || res[0].b !== 10) throw new Error("df.fillNan modified valid numbers");

// -------------------------------------------------------------
// Case 2: DataFrame fillNan with strategy "forward"
// -------------------------------------------------------------
const dfFwd = $df.data([
    { a: 10, b: 100 },
    { a: NaN, b: 200 },
    { a: 30, b: NaN }
]);

const resFwd = dfFwd.fillNan({ strategy: "forward" }).toDicts() as any[];
if (resFwd[1].a !== 10) throw new Error("df.fillNan strategy forward failed for col a");
if (resFwd[2].b !== 200) throw new Error("df.fillNan strategy forward failed for col b");

// -------------------------------------------------------------
// Case 3: Empty DataFrame
// -------------------------------------------------------------
const dfEmpty = $df.data([] as { a: number }[]);
const resEmpty = dfEmpty.fillNan({ value: 0 }).toDicts();
if (resEmpty.length !== 0) throw new Error("df.fillNan empty failed");

// -------------------------------------------------------------
// Case 4: df.fillNan does NOT touch nulls or other types
// -------------------------------------------------------------
const dfPreserve = $df.data([
    { a: NaN, b: null, c: "text", d: 0 }
]);
const resPreserve = dfPreserve.fillNan({ value: -1 }).toDicts() as any[];
if (resPreserve[0].a !== -1) throw new Error("df.fillNan did not fill NaN");
if (resPreserve[0].b !== null) throw new Error("df.fillNan altered null");
if (resPreserve[0].c !== "text") throw new Error("df.fillNan altered string");
if (resPreserve[0].d !== 0) throw new Error("df.fillNan altered 0");

console.log("✓ DataFrame.fillNan tests passed!");
