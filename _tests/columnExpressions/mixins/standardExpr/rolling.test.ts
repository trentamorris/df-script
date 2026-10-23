declare const process: any;
import { $df } from "../../../../src";

console.log("Running StandardExpr.rolling 50 exhaustive 10/10 difficulty tests...");

// =========================================================================
// Category 1: Mathematical & Statistical Expression Reductions (Tests 1-10)
// =========================================================================

// Test 1: Rolling Sum with Expression
{
    const df = $df.data({ a: [1, 2, 3, 4, 5] });
    const res = df.select($df.col("a").rolling(3, $df.col("a").sum()).alias("r")).toDicts() as any[];
    if (res[0].r !== 1 || res[1].r !== 3 || res[2].r !== 6 || res[3].r !== 9 || res[4].r !== 12) {
        throw new Error(`Test 1 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 2: Rolling Mean with Expression
{
    const df = $df.data({ a: [10, 20, 30, 40] });
    const res = df.select($df.col("a").rolling(2, $df.col("a").mean()).alias("r")).toDicts() as any[];
    if (res[0].r !== 10 || res[1].r !== 15 || res[2].r !== 25 || res[3].r !== 35) {
        throw new Error(`Test 2 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 3: Rolling Min with Expression
{
    const df = $df.data({ a: [5, 2, 8, 1, 9] });
    const res = df.select($df.col("a").rolling(3, $df.col("a").min()).alias("r")).toDicts() as any[];
    if (res[0].r !== 5 || res[1].r !== 2 || res[2].r !== 2 || res[3].r !== 1 || res[4].r !== 1) {
        throw new Error(`Test 3 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 4: Rolling Max with Expression
{
    const df = $df.data({ a: [5, 2, 8, 1, 9] });
    const res = df.select($df.col("a").rolling(3, $df.col("a").max()).alias("r")).toDicts() as any[];
    if (res[0].r !== 5 || res[1].r !== 5 || res[2].r !== 8 || res[3].r !== 8 || res[4].r !== 9) {
        throw new Error(`Test 4 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 5: Rolling Variance with Expression
{
    const df = $df.data({ a: [2, 4, 4, 4, 5, 5, 7, 9] });
    const res = df.select($df.col("a").rolling(4, $df.col("a").variance()).alias("r")).toDicts() as any[];
    if (typeof res[3].r !== "number" || res[3].r === 0) throw new Error(`Test 5 Failed: ${JSON.stringify(res)}`);
}

// Test 6: Rolling Standard Deviation with Expression
{
    const df = $df.data({ a: [10, 10, 10, 10] });
    const res = df.select($df.col("a").rolling(3, $df.col("a").std()).alias("r")).toDicts() as any[];
    if (res[2].r !== 0 || res[3].r !== 0) throw new Error(`Test 6 Failed: ${JSON.stringify(res)}`);
}

// Test 7: Rolling Quantile (Median 50th percentile)
{
    const df = $df.data({ a: [1, 10, 2, 8, 3] });
    const res = df.select($df.col("a").rolling(3, $df.col("a").quantile(0.5)).alias("r")).toDicts() as any[];
    if (res[2].r !== 2 || res[3].r !== 8 || res[4].r !== 3) throw new Error(`Test 7 Failed: ${JSON.stringify(res)}`);
}

// Test 8: Rolling Product / Compound Growth
{
    const df = $df.data({ a: [2, 3, 4, 5] });
    const res = df.select($df.col("a").rolling(2, (vals) => vals.reduce((acc, v) => acc * v, 1)).alias("r")).toDicts() as any[];
    if (res[0].r !== 2 || res[1].r !== 6 || res[2].r !== 12 || res[3].r !== 20) {
        throw new Error(`Test 8 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 9: Rolling Skewness Custom Reducer
{
    const df = $df.data({ a: [1, 2, 2, 3, 10, 2, 3] });
    const res = df.select($df.col("a").rolling(5, (vals) => {
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const m3 = vals.reduce((a, b) => a + Math.pow(b - mean, 3), 0) / vals.length;
        const m2 = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
        return m2 === 0 ? 0 : m3 / Math.pow(m2, 1.5);
    }).alias("r")).toDicts() as any[];
    if (typeof res[4].r !== "number") throw new Error(`Test 9 Failed: ${JSON.stringify(res)}`);
}

// Test 10: Rolling Kurtosis
{
    const df = $df.data({ a: [1, 2, 3, 4, 5, 6, 7] });
    const res = df.select($df.col("a").rolling(4, $df.col("a").kurtosis()).alias("r")).toDicts() as any[];
    if (res.length !== 7) throw new Error(`Test 10 Failed: ${JSON.stringify(res)}`);
}

// =========================================================================
// Category 2: Nulls, NaNs & Missing Value Resilience (Tests 11-20)
// =========================================================================

// Test 11: Window containing all nulls (returns null)
{
    const df = $df.data({ a: [null, null, null] });
    const res = df.select($df.col("a").rolling(2, $df.col("a").sum()).alias("r")).toDicts() as any[];
    if (res[0].r !== null || res[1].r !== null || res[2].r !== null) throw new Error(`Test 11 Failed: ${JSON.stringify(res)}`);
}

// Test 12: Intermittent nulls in rolling mean
{
    const df = $df.data({ a: [10, null, 30, null, 50] });
    const res = df.select($df.col("a").rolling(2, $df.col("a").mean()).alias("r")).toDicts() as any[];
    if (res[0].r !== 10 || res[1].r !== 10 || res[2].r !== 30 || res[3].r !== 30 || res[4].r !== 50) {
        throw new Error(`Test 12 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 13: Rolling count of non-null elements
{
    const df = $df.data({ a: [1, null, 3, null, 5] });
    const res = df.select($df.col("a").rolling(3, (vals) => vals.filter(v => v !== null).length).alias("r")).toDicts() as any[];
    if (res[0].r !== 1 || res[1].r !== 1 || res[2].r !== 2 || res[3].r !== 1 || res[4].r !== 2) {
        throw new Error(`Test 13 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 14: Rolling with NaNs
{
    const df = $df.data({ a: [10, NaN, 20, 30] });
    const res = df.select($df.col("a").rolling(2, $df.col("a").sum()).alias("r")).toDicts() as any[];
    if (res[0].r !== 10 || res[2].r !== 20 || res[3].r !== 50) throw new Error(`Test 14 Failed: ${JSON.stringify(res)}`);
}

// Test 15: Single non-null surrounded by nulls
{
    const df = $df.data({ a: [null, null, 42, null, null] });
    const res = df.select($df.col("a").rolling(3, $df.col("a").max()).alias("r")).toDicts() as any[];
    if (res[2].r !== 42 || res[3].r !== 42 || res[4].r !== 42) throw new Error(`Test 15 Failed: ${JSON.stringify(res)}`);
}

// Test 16: Rolling null count ratio on string data
{
    const df = $df.data({ a: ["x", null, null, "y"] });
    const res = df.select($df.col("a").rolling(2, (v) => v.filter(x => x == null).length / v.length).alias("r")).toDicts() as any[];
    if (res[1].r !== 0.5 || res[2].r !== 1 || res[3].r !== 0.5) throw new Error(`Test 16 Failed: ${JSON.stringify(res)}`);
}

// Test 17: Rolling first non-null (Coalesce rolling)
{
    const df = $df.data({ a: [null, 10, null, 20] });
    const res = df.select($df.col("a").rolling(2, (v) => v.find(x => x != null) ?? null).alias("r")).toDicts() as any[];
    if (res[0].r !== null || res[1].r !== 10 || res[2].r !== 10 || res[3].r !== 20) throw new Error(`Test 17 Failed: ${JSON.stringify(res)}`);
}

// Test 18: Rolling last non-null
{
    const df = $df.data({ a: [10, null, 20, null] });
    const res = df.select($df.col("a").rolling(2, (v) => {
        const valid = v.filter(x => x != null);
        return valid.length > 0 ? valid[valid.length - 1] : null;
    }).alias("r")).toDicts() as any[];
    if (res[1].r !== 10 || res[3].r !== 20) throw new Error(`Test 18 Failed: ${JSON.stringify(res)}`);
}

// Test 19: All NaN column
{
    const df = $df.data({ a: [NaN, NaN, NaN] });
    const res = df.select($df.col("a").rolling(2, $df.col("a").count()).alias("r")).toDicts() as any[];
    if (res.length !== 3) throw new Error(`Test 19 Failed`);
}

// Test 20: Alternating nulls with window larger than data
{
    const df = $df.data({ a: [1, null, 3] });
    const res = df.select($df.col("a").rolling(10, $df.col("a").sum()).alias("r")).toDicts() as any[];
    if (res[2].r !== 4) throw new Error(`Test 20 Failed: ${JSON.stringify(res)}`);
}

// =========================================================================
// Category 3: Edge Windows & Sizing Extremes (Tests 21-30)
// =========================================================================

// Test 21: windowSize = 1 (Identity rolling)
{
    const df = $df.data({ a: [10, 20, 30] });
    const res = df.select($df.col("a").rolling(1, $df.col("a").sum()).alias("r")).toDicts() as any[];
    if (res[0].r !== 10 || res[1].r !== 20 || res[2].r !== 30) throw new Error(`Test 21 Failed: ${JSON.stringify(res)}`);
}

// Test 22: windowSize equal to DataFrame length
{
    const df = $df.data({ a: [1, 2, 3, 4] });
    const res = df.select($df.col("a").rolling(4, $df.col("a").sum()).alias("r")).toDicts() as any[];
    if (res[3].r !== 10) throw new Error(`Test 22 Failed: ${JSON.stringify(res)}`);
}

// Test 23: windowSize much larger than DataFrame length (100 on 3 rows)
{
    const df = $df.data({ a: [5, 15, 25] });
    const res = df.select($df.col("a").rolling(100, $df.col("a").sum()).alias("r")).toDicts() as any[];
    if (res[0].r !== 5 || res[1].r !== 20 || res[2].r !== 45) throw new Error(`Test 23 Failed: ${JSON.stringify(res)}`);
}

// Test 24: Single row DataFrame
{
    const df = $df.data({ a: [99] });
    const res = df.select($df.col("a").rolling(5, $df.col("a").sum()).alias("r")).toDicts() as any[];
    if (res[0].r !== 99) throw new Error(`Test 24 Failed: ${JSON.stringify(res)}`);
}

// Test 25: Empty DataFrame
{
    const df = $df.data({ a: [] });
    const res = df.select($df.col("a").rolling(3, $df.col("a").sum()).alias("r")).toDicts() as any[];
    if (res.length !== 0) throw new Error(`Test 25 Failed: expected empty`);
}

// Test 26: Large sequence windowSize 10
{
    const arr = Array.from({ length: 50 }, (_, i) => i + 1);
    const df = $df.data({ a: arr });
    const res = df.select($df.col("a").rolling(10, $df.col("a").sum()).alias("r")).toDicts() as any[];
    // Sum of 1..10 = 55, sum of 41..50 = 455
    if (res[9].r !== 55 || res[49].r !== 455) throw new Error(`Test 26 Failed: res[9]=${res[9].r}, res[49]=${res[49].r}`);
}

// Test 27: Rolling with Options Object { windowSize: 3 }
{
    const df = $df.data({ a: [2, 4, 6, 8] });
    const res = df.select($df.col("a").rolling({ windowSize: 3 }, $df.col("a").mean()).alias("r")).toDicts() as any[];
    if (res[2].r !== 4 || res[3].r !== 6) throw new Error(`Test 27 Failed: ${JSON.stringify(res)}`);
}

// Test 28: Rolling window range (Max - Min)
{
    const df = $df.data({ a: [10, 50, 20, 80] });
    const res = df.select($df.col("a").rolling(3, (v) => Math.max(...v) - Math.min(...v)).alias("r")).toDicts() as any[];
    if (res[1].r !== 40 || res[2].r !== 40 || res[3].r !== 60) throw new Error(`Test 28 Failed: ${JSON.stringify(res)}`);
}

// Test 29: Window size equal to 2 with repeated values
{
    const df = $df.data({ a: [7, 7, 7, 7] });
    const res = df.select($df.col("a").rolling(2, $df.col("a").sum()).alias("r")).toDicts() as any[];
    if (res[1].r !== 14 || res[2].r !== 14 || res[3].r !== 14) throw new Error(`Test 29 Failed`);
}

// Test 30: Negative values in rolling sum
{
    const df = $df.data({ a: [-10, 20, -30, 40] });
    const res = df.select($df.col("a").rolling(2, $df.col("a").sum()).alias("r")).toDicts() as any[];
    if (res[0].r !== -10 || res[1].r !== 10 || res[2].r !== -10 || res[3].r !== 10) throw new Error(`Test 30 Failed: ${JSON.stringify(res)}`);
}

// =========================================================================
// Category 4: Multi-Type, Strings, Arrays & Objects (Tests 31-40)
// =========================================================================

// Test 31: Rolling string concatenation
{
    const df = $df.data({ s: ["a", "b", "c", "d"] });
    const res = df.select($df.col("s").rolling(2, (v) => v.join("-")).alias("r")).toDicts() as any[];
    if (res[0].r !== "a" || res[1].r !== "a-b" || res[2].r !== "b-c" || res[3].r !== "c-d") {
        throw new Error(`Test 31 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 32: Rolling boolean AND logic
{
    const df = $df.data({ b: [true, true, false, true] });
    const res = df.select($df.col("b").rolling(2, (v) => v.every(Boolean)).alias("r")).toDicts() as any[];
    if (res[0].r !== true || res[1].r !== true || res[2].r !== false || res[3].r !== false) {
        throw new Error(`Test 32 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 33: Rolling boolean OR logic
{
    const df = $df.data({ b: [false, false, true, false] });
    const res = df.select($df.col("b").rolling(2, (v) => v.some(Boolean)).alias("r")).toDicts() as any[];
    if (res[0].r !== false || res[1].r !== false || res[2].r !== true || res[3].r !== true) {
        throw new Error(`Test 33 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 34: Rolling array union / flatten
{
    const df = $df.data({ tags: [["ts"], ["js"], ["python"]] });
    const res = df.select($df.col("tags").rolling(2, (v) => v.flat()).alias("r")).toDicts() as any[];
    if (res[1].r.length !== 2 || res[1].r[0] !== "ts" || res[1].r[1] !== "js") {
        throw new Error(`Test 34 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 35: Rolling distinct count (unique values in window)
{
    const df = $df.data({ cat: ["A", "A", "B", "A", "C"] });
    const res = df.select($df.col("cat").rolling(3, (v) => new Set(v).size).alias("r")).toDicts() as any[];
    if (res[0].r !== 1 || res[1].r !== 1 || res[2].r !== 2 || res[3].r !== 2 || res[4].r !== 3) {
        throw new Error(`Test 35 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 36: Rolling majority vote (Mode)
{
    const df = $df.data({ v: [1, 2, 2, 3, 3, 3] });
    const res = df.select($df.col("v").rolling(4, (v) => {
        const counts: Record<any, number> = {};
        v.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }).alias("r")).toDicts() as any[];
    if (res[5].r !== "3") throw new Error(`Test 36 Failed: ${JSON.stringify(res)}`);
}

// Test 37: Rolling object property aggregation
{
    const df = $df.data({ item: [{ score: 10 }, { score: 20 }, { score: 30 }] });
    const res = df.select($df.col("item").rolling(2, (v) => v.reduce((acc, x) => acc + x.score, 0)).alias("r")).toDicts() as any[];
    if (res[0].r !== 10 || res[1].r !== 30 || res[2].r !== 50) throw new Error(`Test 37 Failed: ${JSON.stringify(res)}`);
}

// Test 38: Rolling date range duration (ms difference)
{
    const d1 = new Date("2026-01-01T00:00:00Z");
    const d2 = new Date("2026-01-02T00:00:00Z");
    const d3 = new Date("2026-01-05T00:00:00Z");
    const df = $df.data({ dt: [d1, d2, d3] });
    const res = df.select($df.col("dt").rolling(2, (v) => (v[v.length - 1].getTime() - v[0].getTime()) / (1000 * 3600 * 24)).alias("days")).toDicts() as any[];
    if (res[0].days !== 0 || res[1].days !== 1 || res[2].days !== 3) throw new Error(`Test 38 Failed: ${JSON.stringify(res)}`);
}

// Test 39: Rolling BigInt Sum
{
    const df = $df.data({ n: [10n, 20n, 30n, 40n] });
    const res = df.select($df.col("n").rolling(2, (v) => v.reduce((a, b) => a + b, 0n)).alias("r")).toDicts() as any[];
    if (res[0].r !== 10n || res[1].r !== 30n || res[2].r !== 50n || res[3].r !== 70n) throw new Error(`Test 39 Failed: ${JSON.stringify(res)}`);
}

// Test 40: Rolling JSON payload serialize
{
    const df = $df.data({ a: [1, 2, 3] });
    const res = df.select($df.col("a").rolling(2, (v) => JSON.stringify(v)).alias("r")).toDicts() as any[];
    if (res[0].r !== "[1]" || res[1].r !== "[1,2]" || res[2].r !== "[2,3]") throw new Error(`Test 40 Failed: ${JSON.stringify(res)}`);
}

// =========================================================================
// Category 5: GroupBy, Windowing & Chained Pipeline Integration (Tests 41-50)
// =========================================================================

// Test 41: Rolling within withColumns pipeline
{
    const df = $df.data({ a: [10, 20, 30, 40] });
    const res = df.withColumns([
        $df.col("a").rolling(2, $df.col("a").sum()).alias("r_sum"),
        $df.col("a").rolling(2, $df.col("a").mean()).alias("r_mean")
    ]).toDicts() as any[];
    if (res[3].r_sum !== 70 || res[3].r_mean !== 35) throw new Error(`Test 41 Failed`);
}

// Test 42: Chaining Rolling with Arithmetic Operations
{
    const df = $df.data({ a: [10, 20, 30, 40] });
    const res = df.select(
        $df.col("a").rolling(2, $df.col("a").sum()).mul(2).alias("doubled_sum")
    ).toDicts() as any[];
    if (res[0].doubled_sum !== 20 || res[1].doubled_sum !== 60 || res[2].doubled_sum !== 100 || res[3].doubled_sum !== 140) {
        throw new Error(`Test 42 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 43: Comparing Current Value against Rolling Average (Bollinger Band logic)
{
    const df = $df.data({ price: [10, 20, 15, 30] });
    const res = df.withColumns(
        $df.col("price").rolling(2, $df.col("price").mean()).alias("ma2")
    ).withColumns(
        $df.col("price").gt($df.col("ma2")).alias("above_ma")
    ).toDicts() as any[];
    if (res[1].above_ma !== true || res[2].above_ma !== false || res[3].above_ma !== true) {
        throw new Error(`Test 43 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 44: Rolling Exponential Smoothing Approximation
{
    const df = $df.data({ a: [10, 20, 30, 40] });
    const res = df.select($df.col("a").rolling(3, (v) => {
        let ema = v[0];
        const alpha = 0.5;
        for (let i = 1; i < v.length; i++) ema = alpha * v[i] + (1 - alpha) * ema;
        return ema;
    }).alias("ema")).toDicts() as any[];
    if (typeof res[3].ema !== "number") throw new Error(`Test 44 Failed`);
}

// Test 45: Rolling Linear Regression Slope (Trend Detector)
{
    const df = $df.data({ y: [1, 2, 3, 4, 5] });
    const res = df.select($df.col("y").rolling(3, (vals) => {
        const n = vals.length;
        if (n < 2) return 0;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += vals[i];
            sumXY += i * vals[i];
            sumXX += i * i;
        }
        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }).alias("slope")).toDicts() as any[];
    if (res[2].slope !== 1 || res[4].slope !== 1) throw new Error(`Test 45 Failed: ${JSON.stringify(res)}`);
}

// Test 46: Rolling Peak / Local Maximum detector
{
    const df = $df.data({ a: [1, 5, 2, 8, 3] });
    const res = df.select($df.col("a").rolling(3, (v) => {
        if (v.length < 3) return false;
        return v[1] > v[0] && v[1] > v[2];
    }).alias("is_peak")).toDicts() as any[];
    if (res[2].is_peak !== true || res[3].is_peak !== false || res[4].is_peak !== true) {
        throw new Error(`Test 46 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 47: Rolling Consecutive Growth Count
{
    const df = $df.data({ a: [1, 2, 3, 1, 2] });
    const res = df.select($df.col("a").rolling(3, (v) => {
        let count = 0;
        for (let i = 1; i < v.length; i++) {
            if (v[i] > v[i - 1]) count++;
        }
        return count;
    }).alias("growth_streak")).toDicts() as any[];
    if (res[2].growth_streak !== 2 || res[3].growth_streak !== 1 || res[4].growth_streak !== 1) {
        throw new Error(`Test 47 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 48: Rolling Volatility (Max drawdown in window)
{
    const df = $df.data({ price: [100, 120, 90, 80, 110] });
    const res = df.select($df.col("price").rolling(3, (v) => {
        let maxPeak = v[0];
        let maxDd = 0;
        for (let i = 0; i < v.length; i++) {
            if (v[i] > maxPeak) maxPeak = v[i];
            const dd = (maxPeak - v[i]) / maxPeak;
            if (dd > maxDd) maxDd = dd;
        }
        return maxDd;
    }).alias("drawdown")).toDicts() as any[];
    if (res[2].drawdown !== 0.25 || res[3].drawdown !== 0.3333333333333333) {
        throw new Error(`Test 48 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 49: Multiple rolling expressions on different columns simultaneously
{
    const df = $df.data({ a: [1, 2, 3], b: [10, 20, 30] });
    const res = df.select([
        $df.col("a").rolling(2, $df.col("a").sum()).alias("r_a"),
        $df.col("b").rolling(2, $df.col("b").sum()).alias("r_b")
    ]).toDicts() as any[];
    if (res[2].r_a !== 5 || res[2].r_b !== 50) throw new Error(`Test 49 Failed`);
}

// Test 50: Rolling Z-Score Standardization inside Sliding Window
{
    const df = $df.data({ val: [10, 20, 30, 40, 50] });
    const res = df.select($df.col("val").rolling(3, (vals) => {
        if (vals.length < 2) return 0;
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (vals.length - 1);
        const std = Math.sqrt(variance);
        return std === 0 ? 0 : (vals[vals.length - 1] - mean) / std;
    }).alias("zscore")).toDicts() as any[];
    if (Math.abs(res[2].zscore - 1.0) > 1e-6 || Math.abs(res[4].zscore - 1.0) > 1e-6) {
        throw new Error(`Test 50 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 51: Invalid window size (0, negative, NaN) throws InvalidArgumentError
{
    let caughtZero = false;
    try {
        $df.col("a").rolling(0, $df.col("a").sum());
    } catch (e: any) {
        if (e.message.includes("windowSize must be a positive number")) caughtZero = true;
    }
    if (!caughtZero) throw new Error("Test 51 Failed: windowSize=0 did not throw");

    let caughtNeg = false;
    try {
        $df.col("a").rolling(-2, $df.col("a").sum());
    } catch (e: any) {
        if (e.message.includes("windowSize must be a positive number")) caughtNeg = true;
    }
    if (!caughtNeg) throw new Error("Test 51 Failed: windowSize=-2 did not throw");

    let caughtNaN = false;
    try {
        $df.col("a").rolling(NaN, $df.col("a").sum());
    } catch (e: any) {
        if (e.message.includes("windowSize must be a positive number")) caughtNaN = true;
    }
    if (!caughtNaN) throw new Error("Test 51 Failed: windowSize=NaN did not throw");
}

// Test 52: Empty options object or missing windowSize throws InvalidArgumentError
{
    let caughtEmptyObj = false;
    try {
        $df.col("a").rolling({} as any, $df.col("a").sum());
    } catch (e: any) {
        if (e.message.includes("windowSize must be a positive number")) caughtEmptyObj = true;
    }
    if (!caughtEmptyObj) throw new Error("Test 52 Failed: empty options object did not throw");
}

// Test 53: Floating point window size is floored (e.g., 2.9 floors to 2)
{
    const df = $df.data({ a: [10, 20, 30] });
    const res = df.select($df.col("a").rolling(2.9, $df.col("a").sum()).alias("r")).toDicts() as any[];
    if (res[0].r !== 10 || res[1].r !== 30 || res[2].r !== 50) {
        throw new Error(`Test 53 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 54: Rolling with cross-column reference inside sub-expression
{
    const df = $df.data({ a: [1, 2, 3], b: [10, 20, 30] });
    const res = df.select($df.col("a").rolling(2, (vals) => vals[vals.length - 1] * 2).alias("r")).toDicts() as any[];
    if (res[0].r !== 2 || res[1].r !== 4 || res[2].r !== 6) {
        throw new Error(`Test 54 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 55: Rolling chained with arithmetic operations afterwards (.rolling().add(5))
{
    const df = $df.data({ a: [10, 20, 30] });
    const res = df.select($df.col("a").rolling(2, $df.col("a").sum()).add(5).alias("r")).toDicts() as any[];
    if (res[0].r !== 15 || res[1].r !== 35 || res[2].r !== 55) {
        throw new Error(`Test 55 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 56: Rolling with over/groupBy partition boundary separation
{
    const df = $df.data({
        dept: ["A", "A", "A", "B", "B"],
        salary: [100, 200, 300, 400, 500]
    });
    const res = df.select([
        $df.col("dept"),
        $df.col("salary").rolling(2, $df.col("salary").sum()).over("dept").alias("r_sum")
    ]).toDicts() as any[];
    // For dept A: 100, 300, 500. For dept B: 400, 900 (resets across partition boundaries)
    if (res[0].r_sum !== 100 || res[1].r_sum !== 300 || res[2].r_sum !== 500 || res[3].r_sum !== 400 || res[4].r_sum !== 900) {
        throw new Error(`Test 56 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 57: Specialized rolling methods reject invalid window sizes
{
    let caughtSpecialized = false;
    try {
        $df.col("val").rollingMean(0);
    } catch (e: any) {
        caughtSpecialized = true;
    }
    if (!caughtSpecialized) throw new Error("Test 57 Failed: rollingMean(0) did not throw");
}

// Test 58: Invalid second argument (null, number, object without evaluate) throws InvalidArgumentError
{
    let caughtNull = false;
    try {
        $df.col("a").rolling(2, null as any);
    } catch (e: any) {
        if (e.message.includes("second argument must be a reducer function")) caughtNull = true;
    }
    if (!caughtNull) throw new Error("Test 58 Failed: rolling(2, null) did not throw");

    let caughtInvalidType = false;
    try {
        $df.col("a").rolling(2, 42 as any);
    } catch (e: any) {
        if (e.message.includes("second argument must be a reducer function")) caughtInvalidType = true;
    }
    if (!caughtInvalidType) throw new Error("Test 58 Failed: rolling(2, 42) did not throw");
}

// Test 59: Rolling with non-numeric data (String concatenation across sliding window)
{
    const df = $df.data({ s: ["a", "b", "c", "d"] });
    const res = df.select($df.col("s").rolling(2, (vals) => vals.join("-")).alias("r")).toDicts() as any[];
    if (res[0].r !== "a" || res[1].r !== "a-b" || res[2].r !== "b-c" || res[3].r !== "c-d") {
        throw new Error(`Test 59 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 60: Rolling with windowed sub-expression (window inside rolling)
{
    const df = $df.data({ a: [10, 20, 30, 40] });
    // cumSum inside each rolling window
    const res = df.select($df.col("a").rolling(3, $df.col("a").cumSum()).alias("r")).toDicts() as any[];
    // At index 0: [10] -> cumSum is [10] -> 10
    // At index 1: [10, 20] -> cumSum is [10, 30] -> 30
    // At index 2: [10, 20, 30] -> cumSum is [10, 30, 60] -> 60
    // At index 3: [20, 30, 40] -> cumSum is [20, 50, 90] -> 90
    if (res[0].r !== 10 || res[1].r !== 30 || res[2].r !== 60 || res[3].r !== 90) {
        throw new Error(`Test 60 Failed: ${JSON.stringify(res)}`);
    }
}

// Test 61: Rolling window evaluation with boolean values (Rolling all / any)
{
    const df = $df.data({ b: [true, true, false, true] });
    const res = df.select([
        $df.col("b").rolling(2, $df.col("b").all()).alias("all_true"),
        $df.col("b").rolling(2, $df.col("b").any()).alias("any_true")
    ]).toDicts() as any[];
    if (res[0].all_true !== true || res[1].all_true !== true || res[2].all_true !== false || res[3].all_true !== false) {
        throw new Error(`Test 61 Failed all: ${JSON.stringify(res)}`);
    }
    if (res[0].any_true !== true || res[1].any_true !== true || res[2].any_true !== true || res[3].any_true !== true) {
        throw new Error(`Test 61 Failed any: ${JSON.stringify(res)}`);
    }
}

// Test 62: Rolling window of size larger than group partition height
{
    const df = $df.data({
        grp: ["X", "X", "Y", "Y"],
        v: [1, 2, 10, 20]
    });
    const res = df.select([
        $df.col("grp"),
        $df.col("v").rolling(10, $df.col("v").sum()).over("grp").alias("r")
    ]).toDicts() as any[];
    if (res[0].r !== 1 || res[1].r !== 3 || res[2].r !== 10 || res[3].r !== 30) {
        throw new Error(`Test 62 Failed: ${JSON.stringify(res)}`);
    }
}

console.log("✓ All 62 exhaustive StandardExpr.rolling tests passed successfully!");

