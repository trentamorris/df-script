declare const process: any;
import { $df } from "../../../../src/index";

console.log("Running StandardExpr.log exhaustive edge case tests...");

// Base tests: standard positive values, negative values, null, and undefined
{
    const df = $df.data([
        { val: 10 },
        { val: -5 },
        { val: null },
        { val: undefined }
    ]);
    const res = df.select([
        $df.col("val").log().alias("ln"),
        $df.col("val").log(10).alias("l10"),
        $df.col("val").log(2).alias("l2")
    ]).toDicts() as any[];

    if (Math.abs(res[0].ln - Math.log(10)) > 1e-6 || Math.abs(res[0].l10 - 1) > 1e-6 || Math.abs(res[0].l2 - Math.log2(10)) > 1e-6) {
        throw new Error("Standard positive log test failed");
    }
    if (res[1].ln !== null || res[1].l10 !== null || res[1].l2 !== null) throw new Error("Negative value should produce null");
    if (res[2].ln !== null || res[2].l10 !== null || res[2].l2 !== null) throw new Error("null value should produce null");
    if (res[3].ln !== null || res[3].l10 !== null || res[3].l2 !== null) throw new Error("undefined value should produce null");
}

// Edge case: zero and negative zero
{
    const dfZero = $df.data([{ val: 0 }, { val: -0 }]);
    const resZero = dfZero.select([
        $df.col("val").log().alias("ln"),
        $df.col("val").log(10).alias("l10")
    ]).toDicts() as any[];

    if (resZero[0].ln !== null || resZero[0].l10 !== null) throw new Error("Zero must return null");
    if (resZero[1].ln !== null || resZero[1].l10 !== null) throw new Error("-0 must return null");
}

// Edge case: input value 1 (log_b(1) should always be 0 for any valid base)
{
    const dfOne = $df.data([{ val: 1 }]);
    const resOne = dfOne.select([
        $df.col("val").log().alias("ln_1"),
        $df.col("val").log(10).alias("l10_1"),
        $df.col("val").log(2).alias("l2_1"),
        $df.col("val").log(0.5).alias("lhalf_1"),
        $df.col("val").log(100).alias("l100_1")
    ]).toDicts() as any[];

    if (resOne[0].ln_1 !== 0) throw new Error("log(1) must be 0");
    if (resOne[0].l10_1 !== 0) throw new Error("log10(1) must be 0");
    if (resOne[0].l2_1 !== 0) throw new Error("log2(1) must be 0");
    if (resOne[0].lhalf_1 !== 0) throw new Error("log_0.5(1) must be 0");
    if (resOne[0].l100_1 !== 0) throw new Error("log100(1) must be 0");
}

// Edge case: fractional inputs (0 < v < 1)
{
    const dfFrac = $df.data([{ val: 0.5 }, { val: 0.1 }, { val: 0.001 }]);
    const resFrac = dfFrac.select([
        $df.col("val").log().alias("ln"),
        $df.col("val").log(10).alias("l10"),
        $df.col("val").log(2).alias("l2")
    ]).toDicts() as any[];

    if (Math.abs(resFrac[0].ln - Math.log(0.5)) > 1e-6) throw new Error("log(0.5) failed");
    if (Math.abs(resFrac[1].l10 - (-1)) > 1e-6) throw new Error("log10(0.1) should be -1");
    if (Math.abs(resFrac[2].l10 - (-3)) > 1e-6) throw new Error("log10(0.001) should be -3");
    if (Math.abs(resFrac[0].l2 - (-1)) > 1e-6) throw new Error("log2(0.5) should be -1");
}

// Edge case: fractional base (e.g., base 0.5)
{
    const dfBaseFrac = $df.data([{ val: 2 }, { val: 4 }, { val: 8 }, { val: 0.5 }]);
    const resBaseFrac = dfBaseFrac.select([
        $df.col("val").log(0.5).alias("l_half")
    ]).toDicts() as any[];

    if (Math.abs(resBaseFrac[0].l_half - (-1)) > 1e-6) throw new Error("log_0.5(2) should be -1");
    if (Math.abs(resBaseFrac[1].l_half - (-2)) > 1e-6) throw new Error("log_0.5(4) should be -2");
    if (Math.abs(resBaseFrac[2].l_half - (-3)) > 1e-6) throw new Error("log_0.5(8) should be -3");
    if (Math.abs(resBaseFrac[3].l_half - 1) > 1e-6) throw new Error("log_0.5(0.5) should be 1");
}

// Edge case: base equal to value (log_b(b) === 1)
{
    const dfSame = $df.data([{ val: 7 }]);
    const resSame = dfSame.select([$df.col("val").log(7).alias("same")]).toDicts() as any[];
    if (Math.abs(resSame[0].same - 1) > 1e-6) throw new Error("log_b(b) should be 1");
}

// Edge case: Infinity and -Infinity
{
    const dfInf = $df.data([{ val: Infinity }, { val: -Infinity }]);
    const resInf = dfInf.select([
        $df.col("val").log().alias("ln")
    ]).toDicts() as any[];

    if (resInf[0].ln !== Infinity) throw new Error("log(Infinity) should be Infinity");
    if (resInf[1].ln !== null) throw new Error("log(-Infinity) should be null");
}

// Edge case: NaN handling
{
    const dfNan = $df.data([{ val: NaN }]);
    const resNan = dfNan.select([
        $df.col("val").log().alias("ln")
    ]).toDicts() as any[];

    // NaN <= 0 is false in JS, Math.log(NaN) is NaN
    if (!Number.isNaN(resNan[0].ln)) throw new Error("log(NaN) should be NaN");
}

// Edge case: Large numbers / Powers of 10 and 2
{
    const dfPowers = $df.data([
        { val: 1000 },
        { val: 1000000 },
        { val: 1024 }
    ]);
    const resPowers = dfPowers.select([
        $df.col("val").log(10).alias("l10"),
        $df.col("val").log(2).alias("l2")
    ]).toDicts() as any[];

    if (Math.abs(resPowers[0].l10 - 3) > 1e-6) throw new Error("log10(1000) should be 3");
    if (Math.abs(resPowers[1].l10 - 6) > 1e-6) throw new Error("log10(1000000) should be 6");
    if (Math.abs(resPowers[2].l2 - 10) > 1e-6) throw new Error("log2(1024) should be 10");
}

// Edge case: Base = Math.E default parameter behavior
{
    const dfE = $df.data([{ val: Math.E }, { val: Math.E * Math.E }]);
    const resE = dfE.select([
        $df.col("val").log().alias("ln_default"),
        $df.col("val").log(Math.E).alias("ln_explicit")
    ]).toDicts() as any[];

    if (Math.abs(resE[0].ln_default - 1) > 1e-6) throw new Error("log(e) should be 1");
    if (Math.abs(resE[0].ln_explicit - 1) > 1e-6) throw new Error("log(e, e) should be 1");
    if (Math.abs(resE[1].ln_default - 2) > 1e-6) throw new Error("log(e^2) should be 2");
}

// Edge case: Chaining with arithmetic operations (.log().round(2))
{
    const dfChain = $df.data([{ val: 20 }]);
    const resChain = dfChain.select([
        $df.col("val").log(10).round(2).alias("rounded_log")
    ]).toDicts() as any[];

    // log10(20) ~ 1.30103 -> round(2) -> 1.3
    if (resChain[0].rounded_log !== 1.3) throw new Error("Chaining log().round() failed");
}

console.log("✓ StandardExpr.log exhaustive edge case tests passed!");
