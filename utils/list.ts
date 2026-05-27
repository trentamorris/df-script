import { isArray } from "./types";
import { toValidNumber } from "./number";

export function sortList(arr: unknown, descending: boolean = false): any[] {
    if (!isArray(arr)) return [];
    const list = Array.from(arr as any);
    list.sort((a, b) => {
        if (a == null && b == null) return 0;
        if (a == null) return 1;
        if (b == null) return -1;
        if (a < b) return descending ? 1 : -1;
        if (a > b) return descending ? -1 : 1;
        return 0;
    });
    return list;
}

export function getListStats(
    arr: unknown,
    options: { sort?: boolean } = {}
): {
    sum: number | null;
    count: number;
    min: any;
    max: any;
    median: number | null;
} {
    if (!isArray(arr)) {
        return { sum: null, count: 0, min: null, max: null, median: null };
    }
    let list = Array.from(arr as any);
    if (list.length === 0) {
        return { sum: null, count: 0, min: null, max: null, median: null };
    }

    if (options.sort) {
        list = sortList(list, false);
    }

    let total = 0;
    let count = 0;
    let minVal: any = null;
    let maxVal: any = null;
    const nums: number[] = [];

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
            if (options.sort) {
                nums.push(n);
            }
        }
    }

    let medianVal: number | null = null;
    if (options.sort && nums.length > 0) {
        const mid = Math.floor(nums.length / 2);
        medianVal = nums.length % 2 !== 0
            ? nums[mid]
            : (nums[mid - 1] + nums[mid]) / 2;
    }

    return {
        sum: count > 0 ? total : null,
        count,
        min: minVal,
        max: maxVal,
        median: medianVal
    };
}

export function getListMedian(arr: unknown): number | null {
    return getListStats(arr, { sort: true }).median;
}

export function getListMode(arr: unknown): any[] | null {
    if (!isArray(arr)) return null;
    const list = Array.from(arr as any);
    const valid = list.filter((val) => val != null);
    if (valid.length === 0) return [];
    const counts = new Map<any, number>();
    let maxCount = 0;
    for (const val of valid) {
        const c = (counts.get(val) || 0) + 1;
        counts.set(val, c);
        if (c > maxCount) {
            maxCount = c;
        }
    }
    const modes: any[] = [];
    for (const [val, c] of counts.entries()) {
        if (c === maxCount) {
            modes.push(val);
        }
    }
    modes.sort((a, b) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    });
    return modes;
}
