/**
 * Simple, zero-dependency benchmarking helper using performance.now().
 */

export interface BenchmarkOptions {
    warmupRuns?: number;
    benchmarkRuns?: number;
}

export interface BenchResult {
    name: string;
    avgMs: number;
    minMs: number;
    maxMs: number;
    opsSec: number;
}

export function measure(
    name: string,
    fn: () => void,
    options: BenchmarkOptions = {}
): BenchResult {
    const { warmupRuns = 3, benchmarkRuns = 10 } = options;

    // 1. Warm-up
    for (let i = 0; i < warmupRuns; i++) {
        fn();
    }

    // 2. Timed runs
    const times: number[] = [];
    for (let i = 0; i < benchmarkRuns; i++) {
        const start = performance.now();
        fn();
        const end = performance.now();
        times.push(end - start);
    }

    // 3. Stats calculation
    let total = 0;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < times.length; i++) {
        const t = times[i];
        total += t;
        if (t < min) min = t;
        if (t > max) max = t;
    }
    const avg = total / times.length;
    const opsSec = 1000 / avg;

    return { name, avgMs: avg, minMs: min, maxMs: max, opsSec };
}

export function bench(
    name: string,
    fn: () => void,
    options: BenchmarkOptions = {}
): BenchResult {
    const res = measure(name, fn, options);
    console.log(
        `  - ${res.name.padEnd(45)}: avg ${res.avgMs.toFixed(2)} ms | min ${res.minMs.toFixed(2)} ms | ~${res.opsSec.toFixed(1)} ops/s`
    );
    return res;
}

/**
 * Compares a raw hand-optimized V8/JS baseline with the df-script operation.
 */
export function benchCompare(
    scenarioName: string,
    rawBaselineFn: () => void,
    dfScriptFn: () => void,
    options: BenchmarkOptions = {}
): void {
    console.log(`\n📌 Scenario: ${scenarioName}`);
    const rawRes = measure("Raw V8 Baseline", rawBaselineFn, options);
    const dfRes = measure("df-script", dfScriptFn, options);

    const ratio = dfRes.avgMs / (rawRes.avgMs || 0.001);

    console.log(
        `  • Raw V8 Baseline : avg ${rawRes.avgMs.toFixed(2).padStart(6)} ms | min ${rawRes.minMs.toFixed(2).padStart(6)} ms | ~${rawRes.opsSec.toFixed(1).padStart(7)} ops/s`
    );
    console.log(
        `  • df-script       : avg ${dfRes.avgMs.toFixed(2).padStart(6)} ms | min ${dfRes.minMs.toFixed(2).padStart(6)} ms | ~${dfRes.opsSec.toFixed(1).padStart(7)} ops/s`
    );
    console.log(
        `  ➔ Abstraction Tax : ${ratio.toFixed(2)}x baseline ${ratio <= 2.5 ? "⚡ (Excellent)" : ratio <= 5.0 ? "✅ (Good)" : "⚠️ (Needs Optimization)"}`
    );
}
