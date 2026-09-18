declare const process: any;
import { $df } from "../../src/index";

console.log("Running DataFrame.fillNan tests...");

const df = $df.data([
    { a: 1, b: 10 },
    { a: NaN, b: 20 },
    { a: 3, b: NaN }
]);

const res = df.fillNan(0).toDicts() as any[];
if (res[1].a !== 0) throw new Error("df.fillNan failed for col a");
if (res[2].b !== 0) throw new Error("df.fillNan failed for col b");
if (res[0].a !== 1 || res[0].b !== 10) throw new Error("df.fillNan modified valid numbers");

console.log("✓ DataFrame.fillNan tests passed!");
