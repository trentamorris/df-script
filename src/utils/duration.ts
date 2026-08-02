/** @internalfile */


/**
 * Scale total milliseconds into the target time unit precision.
 */
export function scaleDurationMs(ms: number, timeUnit: "ms" | "us" | "ns"): number {
    if (timeUnit === "us") {
        return ms * 1000;
    }
    if (timeUnit === "ns") {
        return ms * 1000000;
    }
    return ms;
}
