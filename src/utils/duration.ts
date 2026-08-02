/** @internalfile */

export {
    MS_PER_WEEK,
    MS_PER_DAY,
    MS_PER_HOUR,
    MS_PER_MINUTE,
    MS_PER_SECOND,
    MS_PER_MILLISECOND,
    MS_PER_MICROSECOND,
    MS_PER_NANOSECOND
} from "../constants";

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
