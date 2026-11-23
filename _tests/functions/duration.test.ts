declare const process: any;
import { $df } from "df-script";

console.log("=========================================");
console.log("STARTING COLUMN EXPRESSION $df.duration() TESTS...");
console.log("=========================================");

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(msg);
}

function assertThrows(fn: () => void, msg: string): void {
    let threw = false;
    try {
        fn();
    } catch {
        threw = true;
    }
    if (!threw) throw new Error(msg);
}

try {
    const df = $df.dataFrame({
        days_col: [1, 2, 3]
    });

    // 1. Single Unit Duration Constructors
    const resUnits = df.select([
        $df.duration({ weeks: 1 }).alias("1_week"),
        $df.duration({ days: 2 }).alias("2_days"),
        $df.duration({ hours: 5 }).alias("5_hours"),
        $df.duration({ minutes: 30 }).alias("30_mins"),
        $df.duration({ seconds: 45 }).alias("45_secs"),
        $df.duration({ milliseconds: 500 }).alias("500_ms"),
        $df.duration({ microseconds: 1000 }).alias("1000_us"),
        $df.duration({ nanoseconds: 1000000 }).alias("1m_ns"),
    ]).toDicts()[0];

    if (resUnits["1_week"] !== 604800000) throw new Error("1 week failed");
    if (resUnits["2_days"] !== 172800000) throw new Error("2 days failed");
    if (resUnits["5_hours"] !== 18000000) throw new Error("5 hours failed");
    if (resUnits["30_mins"] !== 1800000) throw new Error("30 mins failed");
    if (resUnits["45_secs"] !== 45000) throw new Error("45 secs failed");
    if (resUnits["500_ms"] !== 500) throw new Error("500 ms failed");
    if (resUnits["1000_us"] !== 1) throw new Error("1000 us failed");
    if (resUnits["1m_ns"] !== 1) throw new Error("1m ns failed");

    // 2. Dynamic Column Expressions
    const resDyn = df.select([
        $df.duration({ days: $df.col("days_col") }).alias("dyn_days")
    ]).toDicts();

    if (resDyn[0].dyn_days !== 86400000 || resDyn[1].dyn_days !== 172800000 || resDyn[2].dyn_days !== 259200000) {
        throw new Error("Dynamic days duration failed: " + JSON.stringify(resDyn));
    }

    // 3. String Duration Parsing & Fast-path literals
    const resStrings = df.select([
        $df.duration("1d 12h").alias("str_compound"),
        $df.duration("500ms").alias("str_ms"),
        $df.duration("2w").alias("str_weeks")
    ]).toDicts()[0];

    if (resStrings["str_compound"] !== 86400000 + 43200000) throw new Error("String duration 1d 12h failed");
    // 4. Constant Folding & Mixed Column + Literal Durations
    const resFolded = df.select([
        $df.duration({ days: 1, hours: 12 }).alias("folded_const"),
        $df.duration({ days: $df.col("days_col"), hours: 6 }).alias("mixed_dyn")
    ]).toDicts();

    if (resFolded[0].folded_const !== 86400000 + 43200000) {
        throw new Error("Folded constant duration failed: " + resFolded[0].folded_const);
    }
    if (resFolded[0].mixed_dyn !== 86400000 + 21600000) {
        throw new Error("Mixed dynamic + literal duration failed: " + resFolded[0].mixed_dyn);
    }
    // --- Additional Extreme Edge Cases ---
    (() => {
    const df = $df.dataFrame({ n: [1, 2, null] });

    // 1. Empty options object throws InvalidArgumentError
    assertThrows(() => $df.duration({}), "1: Empty duration options should throw");

    // 2. Default (no args) throws InvalidArgumentError
    assertThrows(() => $df.duration(), "2: Default duration() with no args should throw");

    // 3. String shorthand parsing ("1d 12h")
    const r3 = df.select($df.duration("1d 12h")).toDicts() as any[];
    assert(r3[0].duration === 36 * 3600 * 1000, "3: String shorthand 1d 12h failed");

    // 4. Negative duration components
    const r4 = df.select($df.duration({ hours: -2, minutes: 30 })).toDicts() as any[];
    assert(r4[0].duration === (-2 * 60 + 30) * 60 * 1000, "4: Negative duration components failed");

    // 5. Fractional duration components
    const r5 = df.select($df.duration({ seconds: 1.5 })).toDicts() as any[];
    assert(r5[0].duration === 1500, "5: Fractional seconds failed");

    // 6. Zero duration component
    const r6 = df.select($df.duration({ milliseconds: 0 })).toDicts() as any[];
    assert(r6[0].duration === 0, "6: Zero duration component failed");

    // 7. Dynamic expression component ($df.col("n"))
    const r7 = df.select($df.duration({ seconds: $df.col("n") })).toDicts() as any[];
    assert(r7[0].duration === 1000 && r7[1].duration === 2000 && r7[2].duration === null, "7: Dynamic expr component failed");

    // 8. Mixed constant + dynamic expression components
    const r8 = df.select($df.duration({ seconds: $df.col("n"), milliseconds: 500 })).toDicts() as any[];
    assert(r8[0].duration === 1500 && r8[1].duration === 2500 && r8[2].duration === null, "8: Mixed constant + dynamic failed");

    // 9. Multiple dynamic expression components
    const r9 = df.select($df.duration({ minutes: $df.col("n"), seconds: $df.col("n") })).toDicts() as any[];
    assert(r9[0].duration === 61000 && r9[1].duration === 122000, "9: Multiple dynamic components failed");

    // 10. Invalid string shorthand throws
    assertThrows(() => $df.duration("not_a_duration"), "10: Invalid duration string should throw");
    })();

    console.log("✓ $df.duration() tests passed successfully!");
} catch (err) {
    console.error("❌ $df.duration() tests failed:", err);
    process.exit(1);
}
