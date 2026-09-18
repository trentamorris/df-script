declare const process: any;
import { $df } from "../../src/index";

console.log("Running DataFrame.fill tests...");

const df = $df.data([
    { a: 1, b: null },
    { a: null, b: 20 },
    { a: NaN, b: NaN },
    { a: 4, b: 40 }
]);

// 1. Fill null across all columns
const filledNull = df.fill("null", { value: 0 }).toDicts() as any[];
if (filledNull[0].b !== 0) throw new Error("df.fill null failed for row 0 col b");
if (filledNull[1].a !== 0) throw new Error("df.fill null failed for row 1 col a");
if (!Number.isNaN(filledNull[2].a)) throw new Error("df.fill null should leave NaN intact");

// 2. Fill nan across all columns
const filledNan = df.fill("nan", { value: 999 }).toDicts() as any[];
if (filledNan[2].a !== 999 || filledNan[2].b !== 999) throw new Error("df.fill nan failed for row 2");
if (filledNan[0].b !== null) throw new Error("df.fill nan should leave null intact");

// 3. Fill all across all columns
const filledAll = df.fill("all", { value: -1 }).toDicts() as any[];
if (filledAll[0].b !== -1 || filledAll[1].a !== -1 || filledAll[2].a !== -1 || filledAll[2].b !== -1) {
    throw new Error("df.fill all failed");
}

// 4. Fill using expression options across DataFrame
const dfExpr = $df.data([
    { a: null, b: 10 },
    { a: null, b: 20 },
    { a: 5, b: 30 }
]);
const filledWithCol = dfExpr.fill("null", $df.col("b").mul(10)).toDicts() as any[];
if (filledWithCol[0].a !== 100) throw new Error("df.fill with expression row 0 failed");
if (filledWithCol[1].a !== 200) throw new Error("df.fill with expression row 1 failed");
if (filledWithCol[2].a !== 5) throw new Error("df.fill preserved value row 2 failed");

// 5. Fill using forward strategy across all DataFrame columns
const dfFwdAll = $df.data([
    { a: 1, b: null },
    { a: null, b: "hello" },
    { a: null, b: null },
    { a: 4, b: "world" }
]);
const filledFwdAll = dfFwdAll.fill("null", { strategy: "forward" }).toDicts() as any[];
if (filledFwdAll[1].a !== 1 || filledFwdAll[2].a !== 1) throw new Error("df.fill forward col a failed");
if (filledFwdAll[0].b !== null) throw new Error("df.fill leading null col b must remain null");
if (filledFwdAll[2].b !== "hello") throw new Error("df.fill forward col b failed");

// 6. Fill with consecutive limit across all columns
const filledFwdLimit = dfFwdAll.fill("null", { strategy: "forward", limit: 1 }).toDicts() as any[];
if (filledFwdLimit[1].a !== 1) throw new Error("df.fill limit 1 row 1 failed");
if (filledFwdLimit[2].a !== null) throw new Error("df.fill limit 1 row 2 must be null");

// 7. Empty DataFrame fill
const emptyDf = $df.data([] as { a: number }[]);
const resEmpty = emptyDf.fill("null", 0).toDicts();
if (resEmpty.length !== 0) throw new Error("Empty DataFrame fill failed");

console.log("✓ DataFrame.fill tests passed (including all advanced edge cases)!");

