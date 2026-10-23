declare const process: any;
import { $df } from "../../../../src";

console.log("Running StandardExpr.cot tests...");

// 1. Standard Angles (Radians) & Precision
const df1 = $df.data({
    val: [1, 2, 3, Math.PI / 4, Math.PI / 6, Math.PI / 3, null]
});
const res1 = df1.select([$df.col("val").cot().alias("c")]).toDicts() as any[];

if (Math.abs(res1[0].c - (1 / Math.tan(1))) > 1e-6) throw new Error("cot(1) failed");
if (Math.abs(res1[1].c - (1 / Math.tan(2))) > 1e-6) throw new Error("cot(2) failed");
if (Math.abs(res1[2].c - (1 / Math.tan(3))) > 1e-6) throw new Error("cot(3) failed");
if (Math.abs(res1[3].c - 1) > 1e-6) throw new Error("cot(pi/4) should be 1");
if (Math.abs(res1[4].c - Math.sqrt(3)) > 1e-6) throw new Error("cot(pi/6) should be sqrt(3)");
if (Math.abs(res1[5].c - (1 / Math.sqrt(3))) > 1e-6) throw new Error("cot(pi/3) should be 1/sqrt(3)");
if (res1[6].c !== null) throw new Error("cot(null) should be null");

// 2. Negative Angles & Odd Symmetry: cot(-x) === -cot(x)
const dfNeg = $df.data({
    val: [-1, -2, -Math.PI / 4, -Math.PI / 6]
});
const resNeg = dfNeg.select([$df.col("val").cot().alias("c")]).toDicts() as any[];
if (Math.abs(resNeg[0].c - (-1 / Math.tan(1))) > 1e-6) throw new Error("cot(-1) odd symmetry failed");
if (Math.abs(resNeg[1].c - (-1 / Math.tan(2))) > 1e-6) throw new Error("cot(-2) odd symmetry failed");
if (Math.abs(resNeg[2].c - (-1)) > 1e-6) throw new Error("cot(-pi/4) should be -1");
if (Math.abs(resNeg[3].c - (-Math.sqrt(3))) > 1e-6) throw new Error("cot(-pi/6) should be -sqrt(3)");

// 3. Exact Zero Singularity -> tan(0) === 0 -> returns null
const dfZero = $df.data({ val: [0, -0] });
const resZero = dfZero.select([$df.col("val").cot().alias("c")]).toDicts() as any[];
if (resZero[0].c !== null) throw new Error("cot(0) singularity should be null");
if (resZero[1].c !== null) throw new Error("cot(-0) singularity should be null");

// 4. Asymptotic Points near odd multiples of pi/2 (where tan(x) approaches infinity -> cot approaches 0)
const dfPiOver2 = $df.data({
    val: [Math.PI / 2, -Math.PI / 2, 3 * Math.PI / 2, -3 * Math.PI / 2]
});
const resPiOver2 = dfPiOver2.select([$df.col("val").cot().alias("c")]).toDicts() as any[];
for (let i = 0; i < resPiOver2.length; i++) {
    if (Math.abs(resPiOver2[i].c) > 1e-6) {
        throw new Error(`cot near pi/2 multiple at index ${i} should be near 0, got ${resPiOver2[i].c}`);
    }
}

// 5. Very Large Angles / Wrap-around
const dfLarge = $df.data({ val: [1000, -1000, 1e6] });
const resLarge = dfLarge.select([$df.col("val").cot().alias("c")]).toDicts() as any[];
if (Math.abs(resLarge[0].c - (1 / Math.tan(1000))) > 1e-6) throw new Error("cot(1000) failed");
if (Math.abs(resLarge[1].c - (1 / Math.tan(-1000))) > 1e-6) throw new Error("cot(-1000) failed");
if (Math.abs(resLarge[2].c - (1 / Math.tan(1e6))) > 1e-6) throw new Error("cot(1e6) failed");

// 6. NaN in pure numeric column & Non-Finite Edge Cases
const dfNan = $df.data({ val: [NaN] });
const resNan = dfNan.select([$df.col("val").cot().alias("c")]).toDicts() as any[];
if (!Number.isNaN(resNan[0].c)) throw new Error("cot(NaN) should be NaN");

const dfInf = $df.data({ val: [Infinity, -Infinity] });
const resInf = dfInf.select([$df.col("val").cot().alias("c")]).toDicts() as any[];
if (resInf[0].c !== null) throw new Error("cot(Infinity) should be null");
if (resInf[1].c !== null) throw new Error("cot(-Infinity) should be null");

// 7. Empty DataFrame
const dfEmpty = $df.data({ val: [] });
const resEmpty = dfEmpty.select([$df.col("val").cot().alias("c")]).toDicts() as any[];
if (resEmpty.length !== 0) throw new Error("cot on empty DataFrame should return empty array");

// 8. Grouped / Window Column Expression Context
const dfGrouped = $df.data({
    grp: ["A", "A", "B", "B"],
    val: [Math.PI / 4, 0, -Math.PI / 4, null]
});
const resGrouped = dfGrouped.withColumns($df.col("val").cot().alias("cot_val")).toDicts() as any[];
if (Math.abs(resGrouped[0].cot_val - 1) > 1e-6) throw new Error("Grouped cot(pi/4) failed");
if (resGrouped[1].cot_val !== null) throw new Error("Grouped cot(0) should be null");
if (Math.abs(resGrouped[2].cot_val - (-1)) > 1e-6) throw new Error("Grouped cot(-pi/4) failed");
if (resGrouped[3].cot_val !== null) throw new Error("Grouped cot(null) should be null");

console.log("✓ StandardExpr.cot tests passed!");
