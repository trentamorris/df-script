import { $tbl } from "../../src/index";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION ARITHMETIC TESTS...");
console.log("=========================================");

const data = [
    {
        val1: 10,
        val2: 3,
        val3: -5.5,
        val4: 0,
        val5: 2.718281828459045,
        val6: 144,
        val7: 0.5
    },
    {
        val1: -20,
        val2: 5,
        val3: 4.88,
        val4: 2,
        val5: 1,
        val6: -9,
        val7: -0.5
    }
];

try {
    const df = $tbl.data(data);

    const projected = df.select([
        $tbl.col("val3").abs().alias("abs"),
        $tbl.col("val5").acos().alias("acos"),
        $tbl.col("val5").acosh().alias("acosh"),
        $tbl.col("val1").add($tbl.col("val2")).alias("add_expr"),
        $tbl.col("val1").add(5).alias("add_scalar"),
        $tbl.col("val1").add($tbl.lit(5)).alias("add_lit"),
        $tbl.col("val5").asin().alias("asin"),
        $tbl.col("val3").asinh().alias("asinh"),
        $tbl.col("val3").atan().alias("atan"),
        $tbl.col("val7").atanh().alias("atanh"),
        $tbl.col("val6").cbrt().alias("cbrt"),
        $tbl.col("val3").ceil().alias("ceil"),
        $tbl.col("val3").clip(-5, 5).alias("clip_both"),
        $tbl.col("val3").clip(-2, null).alias("clip_lower"),
        $tbl.col("val3").clip(null, 2).alias("clip_upper"),
        $tbl.col("val3").cos().alias("cos"),
        $tbl.col("val3").cosh().alias("cosh"),
        $tbl.col("val5").degrees().alias("degrees"),
        $tbl.col("val1").div($tbl.col("val2")).alias("div_expr"),
        $tbl.col("val1").div($tbl.col("val4")).alias("div_zero"), // div by zero should return null
        $tbl.col("val5").exp().alias("exp"),
        $tbl.col("val4").expm1().alias("expm1"),
        $tbl.col("val3").floor().alias("floor"),
        $tbl.col("val1").floordiv($tbl.col("val2")).alias("floordiv_expr"),
        $tbl.col("val1").floordiv($tbl.col("val4")).alias("floordiv_zero"), // floordiv by zero should return null
        $tbl.col("val2").hypot($tbl.col("val4")).alias("hypot_expr"),
        $tbl.col("val1").log().alias("log_natural"),
        $tbl.col("val1").log(10).alias("log_10"),
        $tbl.col("val1").log(2).alias("log_2"),
        $tbl.col("val4").log1p().alias("log1p"),
        $tbl.col("val1").mod($tbl.col("val2")).alias("mod_expr"),
        $tbl.col("val1").mod($tbl.col("val4")).alias("mod_zero"), // mod by zero should return null
        $tbl.col("val1").mul($tbl.col("val2")).alias("mul_expr"),
        $tbl.col("val3").negate().alias("negate"),
        $tbl.col("val2").pow($tbl.col("val4")).alias("pow_expr"),
        $tbl.col("val5").radians().alias("radians"),
        $tbl.col("val3").round(1).alias("round_1"),
        $tbl.col("val3").round().alias("round_0"),
        $tbl.col("val3").sin().alias("sin"),
        $tbl.col("val3").sinh().alias("sinh"),
        $tbl.col("val3").sign().alias("sign"),
        $tbl.col("val6").sqrt().alias("sqrt"),
        $tbl.col("val3").tan().alias("tan"),
        $tbl.col("val3").tanh().alias("tanh"),
        $tbl.col("val3").trunc().alias("trunc"),
        $tbl.col("val1").sub($tbl.col("val2")).alias("sub_expr"),
        $tbl.col("val1").rand().alias("rand_no_seed"),
        $tbl.col("val1").rand(42).alias("rand_seed_42_a"),
        $tbl.col("val1").rand(42).alias("rand_seed_42_b"),
        $tbl.col("val1").rand(99).alias("rand_seed_99")
    ]).collect() as any[];

    console.dir(projected, { depth: null });

    // Assert row 0
    const r0 = projected[0];
    if (r0.abs !== 5.5) throw new Error(`abs failed: expected 5.5, got ${r0.abs}`);
    if (r0.acos !== null) throw new Error(`acos out of bounds failed: expected null, got ${r0.acos}`);
    if (Math.abs(r0.acosh - Math.acosh(2.7182818)) > 1e-6) throw new Error(`acosh failed: got ${r0.acosh}`);
    if (r0.add_expr !== 13) throw new Error(`add_expr failed: expected 13, got ${r0.add_expr}`);
    if (r0.add_scalar !== 15) throw new Error(`add_scalar failed: expected 15, got ${r0.add_scalar}`);
    if (r0.add_lit !== 15) throw new Error(`add_lit failed: expected 15, got ${r0.add_lit}`);
    if (r0.asin !== null) throw new Error(`asin out of bounds failed: expected null, got ${r0.asin}`);
    if (Math.abs(r0.asinh - Math.asinh(-5.5)) > 1e-6) throw new Error(`asinh failed: got ${r0.asinh}`);
    if (Math.abs(r0.atan - Math.atan(-5.5)) > 1e-6) throw new Error(`atan failed: expected ~-1.39, got ${r0.atan}`);
    if (Math.abs(r0.atanh - Math.atanh(0.5)) > 1e-6) throw new Error(`atanh failed: got ${r0.atanh}`);
    if (Math.abs(r0.cbrt - Math.cbrt(144)) > 1e-6) throw new Error(`cbrt failed: expected ~5.24, got ${r0.cbrt}`);
    if (r0.ceil !== -5) throw new Error(`ceil failed: expected -5, got ${r0.ceil}`);
    if (r0.clip_both !== -5) throw new Error(`clip_both failed: expected -5, got ${r0.clip_both}`);
    if (r0.clip_lower !== -2) throw new Error(`clip_lower failed: expected -2, got ${r0.clip_lower}`);
    if (r0.clip_upper !== -5.5) throw new Error(`clip_upper failed: expected -5.5, got ${r0.clip_upper}`);
    if (Math.abs(r0.cos - Math.cos(-5.5)) > 1e-6) throw new Error(`cos failed: expected ~0.708, got ${r0.cos}`);
    if (Math.abs(r0.cosh - Math.cosh(-5.5)) > 1e-6) throw new Error(`cosh failed: expected ~122.06, got ${r0.cosh}`);
    if (Math.abs(r0.degrees - 2.7182818 * 180 / Math.PI) > 1e-2) throw new Error(`degrees failed: got ${r0.degrees}`);
    if (Math.abs(r0.div_expr - 3.33333333) > 1e-6) throw new Error(`div_expr failed: expected ~3.333, got ${r0.div_expr}`);
    if (r0.div_zero !== null) throw new Error(`div_zero failed: expected null, got ${r0.div_zero}`);
    if (Math.abs(r0.exp - 15.15426) > 1e-4) throw new Error(`exp failed: expected ~15.154, got ${r0.exp}`);
    if (r0.expm1 !== 0) throw new Error(`expm1 failed: expected 0, got ${r0.expm1}`);
    if (r0.floor !== -6) throw new Error(`floor failed: expected -6, got ${r0.floor}`);
    if (r0.floordiv_expr !== 3) throw new Error(`floordiv_expr failed: expected 3, got ${r0.floordiv_expr}`);
    if (r0.floordiv_zero !== null) throw new Error(`floordiv_zero failed: expected null, got ${r0.floordiv_zero}`);
    if (r0.hypot_expr !== 3) throw new Error(`hypot_expr failed: expected 3, got ${r0.hypot_expr}`);
    if (Math.abs(r0.log_natural - Math.log(10)) > 1e-6) throw new Error(`log_natural failed: expected ~2.302, got ${r0.log_natural}`);
    if (Math.abs(r0.log_10 - 1) > 1e-6) throw new Error(`log_10 failed: expected 1, got ${r0.log_10}`);
    if (Math.abs(r0.log_2 - Math.log2(10)) > 1e-6) throw new Error(`log_2 failed: expected ~3.32, got ${r0.log_2}`);
    if (r0.log1p !== 0) throw new Error(`log1p failed: expected 0, got ${r0.log1p}`);
    if (r0.mod_expr !== 1) throw new Error(`mod_expr failed: expected 1, got ${r0.mod_expr}`);
    if (r0.mod_zero !== null) throw new Error(`mod_zero failed: expected null, got ${r0.mod_zero}`);
    if (r0.mul_expr !== 30) throw new Error(`mul_expr failed: expected 30, got ${r0.mul_expr}`);
    if (r0.negate !== 5.5) throw new Error(`negate failed: expected 5.5, got ${r0.negate}`);
    if (r0.pow_expr !== 1) throw new Error(`pow_expr failed: expected 1, got ${r0.pow_expr}`);
    if (Math.abs(r0.radians - 2.7182818 * Math.PI / 180) > 1e-6) throw new Error(`radians failed: got ${r0.radians}`);
    if (r0.round_1 !== -5.5) throw new Error(`round_1 failed: expected -5.5, got ${r0.round_1}`);
    if (r0.round_0 !== -5) throw new Error(`round_0 failed: expected -5, got ${r0.round_0}`);
    if (Math.abs(r0.sin - Math.sin(-5.5)) > 1e-6) throw new Error(`sin failed: got ${r0.sin}`);
    if (Math.abs(r0.sinh - Math.sinh(-5.5)) > 1e-6) throw new Error(`sinh failed: got ${r0.sinh}`);
    if (r0.sign !== -1) throw new Error(`sign failed: expected -1, got ${r0.sign}`);
    if (r0.sqrt !== 12) throw new Error(`sqrt failed: expected 12, got ${r0.sqrt}`);
    if (Math.abs(r0.tan - Math.tan(-5.5)) > 1e-6) throw new Error(`tan failed: got ${r0.tan}`);
    if (Math.abs(r0.tanh - Math.tanh(-5.5)) > 1e-6) throw new Error(`tanh failed: got ${r0.tanh}`);
    if (r0.trunc !== -5) throw new Error(`trunc failed: expected -5, got ${r0.trunc}`);
    if (r0.sub_expr !== 7) throw new Error(`sub_expr failed: expected 7, got ${r0.sub_expr}`);
    if (r0.rand_no_seed < 0 || r0.rand_no_seed >= 1) throw new Error(`rand_no_seed out of range: ${r0.rand_no_seed}`);
    if (r0.rand_seed_42_a !== r0.rand_seed_42_b) throw new Error(`seeded random mismatch: ${r0.rand_seed_42_a} vs ${r0.rand_seed_42_b}`);
    if (r0.rand_seed_42_a === r0.rand_seed_99) throw new Error(`seeded random collision with different seeds`);


    // Assert row 1
    const r1 = projected[1];
    if (r1.abs !== 4.88) throw new Error(`abs failed: expected 4.88, got ${r1.abs}`);
    if (r1.acos !== 0) throw new Error(`acos failed: expected 0, got ${r1.acos}`);
    if (r1.acosh !== 0) throw new Error(`acosh failed: expected 0, got ${r1.acosh}`);
    if (r1.add_expr !== -15) throw new Error(`add_expr failed: expected -15, got ${r1.add_expr}`);
    if (r1.add_scalar !== -15) throw new Error(`add_scalar failed: expected -15, got ${r1.add_scalar}`);
    if (r1.add_lit !== -15) throw new Error(`add_lit failed: expected -15, got ${r1.add_lit}`);
    if (Math.abs(r1.asin - Math.PI / 2) > 1e-6) throw new Error(`asin failed: expected ~1.57, got ${r1.asin}`);
    if (Math.abs(r1.asinh - Math.asinh(4.88)) > 1e-6) throw new Error(`asinh failed: got ${r1.asinh}`);
    if (Math.abs(r1.atan - Math.atan(4.88)) > 1e-6) throw new Error(`atan failed: got ${r1.atan}`);
    if (Math.abs(r1.atanh - Math.atanh(-0.5)) > 1e-6) throw new Error(`atanh failed: got ${r1.atanh}`);
    if (Math.abs(r1.cbrt - Math.cbrt(-9)) > 1e-6) throw new Error(`cbrt failed: got ${r1.cbrt}`);
    if (r1.ceil !== 5) throw new Error(`ceil failed: expected 5, got ${r1.ceil}`);
    if (r1.clip_both !== 4.88) throw new Error(`clip_both failed: expected 4.88, got ${r1.clip_both}`);
    if (r1.clip_lower !== 4.88) throw new Error(`clip_lower failed: expected 4.88, got ${r1.clip_lower}`);
    if (r1.clip_upper !== 2) throw new Error(`clip_upper failed: expected 2, got ${r1.clip_upper}`);
    if (Math.abs(r1.cos - Math.cos(4.88)) > 1e-6) throw new Error(`cos failed: got ${r1.cos}`);
    if (Math.abs(r1.cosh - Math.cosh(4.88)) > 1e-6) throw new Error(`cosh failed: got ${r1.cosh}`);
    if (Math.abs(r1.degrees - 180 / Math.PI) > 1e-4) throw new Error(`degrees failed: got ${r1.degrees}`);
    if (r1.div_expr !== -4) throw new Error(`div_expr failed: expected -4, got ${r1.div_expr}`);
    if (r1.div_zero !== -10) throw new Error(`div_zero failed (non-zero divisor 2): expected -10, got ${r1.div_zero}`);
    if (Math.abs(r1.exp - 2.71828) > 1e-4) throw new Error(`exp failed: expected ~2.71828, got ${r1.exp}`);
    if (Math.abs(r1.expm1 - (Math.exp(2) - 1)) > 1e-6) throw new Error(`expm1 failed: got ${r1.expm1}`);
    if (r1.floor !== 4) throw new Error(`floor failed: expected 4, got ${r1.floor}`);
    if (r1.floordiv_expr !== -4) throw new Error(`floordiv_expr failed: expected -4, got ${r1.floordiv_expr}`);
    if (r1.floordiv_zero !== -10) throw new Error(`floordiv_zero failed (non-zero divisor 2): expected -10, got ${r1.floordiv_zero}`);
    if (Math.abs(r1.hypot_expr - Math.hypot(5, 2)) > 1e-6) throw new Error(`hypot_expr failed: got ${r1.hypot_expr}`);
    if (r1.log_natural !== null) throw new Error(`log_natural (neg input) failed: expected null, got ${r1.log_natural}`);
    if (r1.log_10 !== null) throw new Error(`log_10 (neg input) failed: expected null, got ${r1.log_10}`);
    if (r1.log_2 !== null) throw new Error(`log_2 (neg input) failed: expected null, got ${r1.log_2}`);
    if (Math.abs(r1.log1p - Math.log1p(2)) > 1e-6) throw new Error(`log1p failed: got ${r1.log1p}`);
    if (r1.mod_expr !== 0 && r1.mod_expr !== -0) throw new Error(`mod_expr failed: expected 0, got ${r1.mod_expr}`);
    if (r1.mod_zero !== 0 && r1.mod_zero !== -0) throw new Error(`mod_zero failed (non-zero divisor 2): expected 0, got ${r1.mod_zero}`);
    if (r1.mul_expr !== -100) throw new Error(`mul_expr failed: expected -100, got ${r1.mul_expr}`);
    if (r1.negate !== -4.88) throw new Error(`negate failed: expected -4.88, got ${r1.negate}`);
    if (r1.pow_expr !== 25) throw new Error(`pow_expr failed: expected 25, got ${r1.pow_expr}`);
    if (Math.abs(r1.radians - Math.PI / 180) > 1e-6) throw new Error(`radians failed: got ${r1.radians}`);
    if (r1.round_1 !== 4.9) throw new Error(`round_1 failed: expected 4.9, got ${r1.round_1}`);
    if (r1.round_0 !== 5) throw new Error(`round_0 failed: expected 5, got ${r1.round_0}`);
    if (Math.abs(r1.sin - Math.sin(4.88)) > 1e-6) throw new Error(`sin failed: got ${r1.sin}`);
    if (Math.abs(r1.sinh - Math.sinh(4.88)) > 1e-6) throw new Error(`sinh failed: got ${r1.sinh}`);
    if (r1.sign !== 1) throw new Error(`sign failed: expected 1, got ${r1.sign}`);
    if (r1.sqrt !== null) throw new Error(`sqrt failed (neg input): expected null, got ${r1.sqrt}`);
    if (Math.abs(r1.tan - Math.tan(4.88)) > 1e-6) throw new Error(`tan failed: got ${r1.tan}`);
    if (Math.abs(r1.tanh - Math.tanh(4.88)) > 1e-6) throw new Error(`tanh failed: got ${r1.tanh}`);
    if (r1.trunc !== 4) throw new Error(`trunc failed: expected 4, got ${r1.trunc}`);
    if (r1.sub_expr !== -25) throw new Error(`sub_expr failed: expected -25, got ${r1.sub_expr}`);
    if (r1.rand_no_seed < 0 || r1.rand_no_seed >= 1) throw new Error(`rand_no_seed out of range: ${r1.rand_no_seed}`);
    if (r1.rand_seed_42_a !== r1.rand_seed_42_b) throw new Error(`seeded random mismatch: ${r1.rand_seed_42_a} vs ${r1.rand_seed_42_b}`);
    if (r1.rand_seed_42_a === r1.rand_seed_99) throw new Error(`seeded random collision with different seeds`);


    console.log("=========================================");
    console.log("🎉 ALL COLUMN EXPRESSION ARITHMETIC TESTS PASSED!");
    console.log("=========================================");
} catch (error) {
    console.error("Test failed with error:", error);
    process.exit(1);
}
