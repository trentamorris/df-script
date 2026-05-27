import { isArray } from "./types";
import { toValidNumber } from "./number";

export function getListSumAndCount(arr: unknown): {
    sum: number | null;
    count: number;
    min: any;
    max: any;
} {
    if (!isArray(arr)) {
        return { sum: null, count: 0, min: null, max: null };
    }
    const list = Array.from(arr as any);
    if (list.length === 0) {
        return { sum: null, count: 0, min: null, max: null };
    }

    let total = 0;
    let count = 0;
    let minVal: any = null;
    let maxVal: any = null;

    for (const val of list) {
        if (val == null) continue;

        if (minVal == null || val < minVal) {
            minVal = val;
        }
        if (maxVal == null || val > maxVal) {
            maxVal = val;
        }

        const n = toValidNumber(val);
        if (n !== null) {
            total += n;
            count++;
        }
    }

    return {
        sum: count > 0 ? total : null,
        count,
        min: minVal,
        max: maxVal
    };
}
