declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.between tests...");

// 1. Basic between with default options ({ closed: "both" })
const df = $df.data([
    { val: 15, lower: 10, upper: 20 },
    { val: 10, lower: 10, upper: 20 },
    { val: 20, lower: 10, upper: 20 },
    { val: 5, lower: 10, upper: 20 },
    { val: 25, lower: 10, upper: 20 }
]);

const res = df.select([
    $df.col("val").between(10, 20).alias("both_default"),
    $df.col("val").between(10, 20, { closed: "both" }).alias("both_explicit"),
    $df.col("val").between(10, 20, { closed: "left" }).alias("left"),
    $df.col("val").between(10, 20, { closed: "right" }).alias("right"),
    $df.col("val").between(10, 20, { closed: "none" }).alias("none")
]).toDicts() as any[];

// row 0: val = 15 (inside range)
if (res[0].both_default !== true || res[0].both_explicit !== true || res[0].left !== true || res[0].right !== true || res[0].none !== true) {
    throw new Error("between on interior value 15 failed");
}

// row 1: val = 10 (at lower boundary)
if (res[1].both_default !== true || res[1].both_explicit !== true || res[1].left !== true || res[1].right !== false || res[1].none !== false) {
    throw new Error("between on lower boundary value 10 failed");
}

// row 2: val = 20 (at upper boundary)
if (res[2].both_default !== true || res[2].both_explicit !== true || res[2].left !== false || res[2].right !== true || res[2].none !== false) {
    throw new Error("between on upper boundary value 20 failed");
}

// row 3: val = 5 (below range)
if (res[3].both_default !== false || res[3].left !== false || res[3].right !== false || res[3].none !== false) {
    throw new Error("between on below-range value 5 failed");
}

// row 4: val = 25 (above range)
if (res[4].both_default !== false || res[4].left !== false || res[4].right !== false || res[4].none !== false) {
    throw new Error("between on above-range value 25 failed");
}

// 2. Dynamic column-based boundaries ($df.col("lower") and $df.col("upper"))
const resDynamic = df.select([
    $df.col("val").between($df.col("lower"), $df.col("upper")).alias("both"),
    $df.col("val").between($df.col("lower"), $df.col("upper"), { closed: "none" }).alias("none")
]).toDicts() as any[];

if (resDynamic[1].both !== true || resDynamic[1].none !== false) {
    throw new Error("between with dynamic column boundaries failed");
}

// 3. Null handling edge cases
const dfNulls = $df.data({
    val: [null, 15, 10, null],
    lower: [10, null, 10, null],
    upper: [20, 20, null, null]
});

const resNulls = dfNulls.select([
    $df.col("val").between($df.col("lower"), $df.col("upper")).alias("c")
]).toArray("c");

for (let i = 0; i < resNulls.length; i++) {
    if (resNulls[i] !== null) {
        throw new Error(`between with nulls failed at index ${i}: expected null, got ${resNulls[i]}`);
    }
}

// 4. Equal boundaries: lower === upper
const dfEqual = $df.data({ val: [10, 9, 11] });
const resEqualBoth = dfEqual.select([$df.col("val").between(10, 10, { closed: "both" }).alias("c")]).toArray("c");
if (resEqualBoth[0] !== true || resEqualBoth[1] !== false || resEqualBoth[2] !== false) {
    throw new Error("between with equal boundaries ({ closed: 'both' }) failed");
}

const resEqualNone = dfEqual.select([$df.col("val").between(10, 10, { closed: "none" }).alias("c")]).toArray("c");
if (resEqualNone[0] !== false || resEqualNone[1] !== false || resEqualNone[2] !== false) {
    throw new Error("between with equal boundaries ({ closed: 'none' }) failed: expected all false");
}

// 5. Inverted boundaries: lower > upper (should yield false for all values)
const resInverted = df.select([$df.col("val").between(20, 10).alias("c")]).toArray("c");
for (let i = 0; i < resInverted.length; i++) {
    if (resInverted[i] !== false) {
        throw new Error(`between with inverted boundaries failed at index ${i}: expected false`);
    }
}

// 6. Empty DataFrame edge case
const dfEmpty = $df.data({ val: [] as number[] });
const resEmpty = dfEmpty.select([$df.col("val").between(0, 10).alias("c")]).toArray("c");
if (resEmpty.length !== 0) {
    throw new Error("between on empty DataFrame failed");
}

// 7. Infinity, -Infinity & extreme floating-point boundaries
const dfFloat = $df.data({
    val: [-Infinity, -1e10, 0, 1e10, Infinity, NaN]
});
const resInf = dfFloat.select([
    $df.col("val").between(-Infinity, Infinity, { closed: "both" }).alias("inf_both"),
    $df.col("val").between(-Infinity, Infinity, { closed: "none" }).alias("inf_none"),
    $df.col("val").between(0, Infinity, { closed: "both" }).alias("pos_inf")
]).toDicts() as any[];

if (resInf[0].inf_both !== true || resInf[0].inf_none !== false) {
    throw new Error("between with -Infinity boundary failed");
}
if (resInf[4].inf_both !== true || resInf[4].inf_none !== false) {
    throw new Error("between with Infinity boundary failed");
}
if (resInf[2].pos_inf !== true || resInf[1].pos_inf !== false || resInf[4].pos_inf !== true) {
    throw new Error("between with [0, Infinity] failed");
}

// 8. BigInt values and boundaries
const dfBigInt = $df.data({
    val: [10n, 20n, 30n, 5n, 35n]
});
const resBigInt = dfBigInt.select([
    $df.col("val").between(10n, 30n, { closed: "both" }).alias("both"),
    $df.col("val").between(10n, 30n, { closed: "left" }).alias("left"),
    $df.col("val").between(10n, 30n, { closed: "right" }).alias("right"),
    $df.col("val").between(10n, 30n, { closed: "none" }).alias("none")
]).toDicts() as any[];

if (resBigInt[0].both !== true || resBigInt[0].left !== true || resBigInt[0].right !== false || resBigInt[0].none !== false) {
    throw new Error("BigInt between on lower boundary (10n) failed");
}
if (resBigInt[2].both !== true || resBigInt[2].left !== false || resBigInt[2].right !== true || resBigInt[2].none !== false) {
    throw new Error("BigInt between on upper boundary (30n) failed");
}
if (resBigInt[1].both !== true || resBigInt[3].both !== false || resBigInt[4].both !== false) {
    throw new Error("BigInt between interior and exterior failed");
}

// 9. Lexicographical string comparisons in between
const dfStr = $df.data({
    val: ["apple", "banana", "cherry", "date", "apricot"]
});
const resStr = dfStr.select([
    $df.col("val").between("banana", "date", { closed: "both" }).alias("both"),
    $df.col("val").between("banana", "date", { closed: "none" }).alias("none")
]).toDicts() as any[];

// "apple" < "banana" => false
if (resStr[0].both !== false) throw new Error("string between 'apple' failed");
// "banana" == lower => true for both, false for none
if (resStr[1].both !== true || resStr[1].none !== false) throw new Error("string between 'banana' failed");
// "cherry" is interior => true for both and none
if (resStr[2].both !== true || resStr[2].none !== true) throw new Error("string between 'cherry' failed");
// "date" == upper => true for both, false for none
if (resStr[3].both !== true || resStr[3].none !== false) throw new Error("string between 'date' failed");

// 10. Date instances comparison
const d1 = new Date("2026-01-01T00:00:00Z");
const d2 = new Date("2026-06-01T00:00:00Z");
const d3 = new Date("2026-12-31T00:00:00Z");
const dMid = new Date("2026-03-15T00:00:00Z");
const dEarly = new Date("2025-12-31T00:00:00Z");

const dfDate = $df.data({
    val: [dEarly, d1, dMid, d2, d3]
});

const resDate = dfDate.select([
    $df.col("val").between(d1, d2, { closed: "both" }).alias("both"),
    $df.col("val").between(d1, d2, { closed: "left" }).alias("left"),
    $df.col("val").between(d1, d2, { closed: "right" }).alias("right"),
    $df.col("val").between(d1, d2, { closed: "none" }).alias("none")
]).toDicts() as any[];

if (resDate[0].both !== false) throw new Error("Date between prior date failed");
if (resDate[1].both !== true || resDate[1].left !== true || resDate[1].right !== false || resDate[1].none !== false) {
    throw new Error("Date between lower boundary (d1) failed");
}
if (resDate[2].both !== true || resDate[2].none !== true) throw new Error("Date between interior (dMid) failed");
if (resDate[3].both !== true || resDate[3].left !== false || resDate[3].right !== true || resDate[3].none !== false) {
    throw new Error("Date between upper boundary (d2) failed");
}
if (resDate[4].both !== false) throw new Error("Date between subsequent date failed");

// 11. Complex chained expression: filter with between
const dfFilter = $df.data({
    id: [1, 2, 3, 4, 5],
    score: [45, 75, 88, 92, 100]
});
const filtered = dfFilter.filter($df.col("score").between(75, 95, { closed: "left" })).toDicts() as any[];
if (filtered.length !== 3 || filtered[0].id !== 2 || filtered[1].id !== 3 || filtered[2].id !== 4) {
    throw new Error("DataFrame.filter with .between() failed");
}

console.log("✓ StandardExpr.between tests passed! (comprehensive 10/10 edge case test suite)");
