declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.roundSigFigs tests...");


const df = $df.data([{ val: -5.5 }, { val: 4.88 }, { val: null }]);
const res = df.select([
    $df.col("val").roundSigFigs(2).alias("r2"),
    $df.col("val").roundSigFigs(1).alias("r1")
]).toDicts() as any[];
if (res[0].r2 !== -5.5 || res[0].r1 !== -6) throw new Error("roundSigFigs 0 failed");
if (res[1].r2 !== 4.9 || res[1].r1 !== 5) throw new Error("roundSigFigs 1 failed");
if (res[2].r2 !== null) throw new Error("roundSigFigs null failed");


console.log("✓ StandardExpr.roundSigFigs tests passed!");
