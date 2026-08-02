import { ColumnExpr } from "../ColumnExpr";
import { lit } from "./lit";
import { DURATION_MARKER } from "../constants";
import { evaluateExpression } from "../utils";
import { DurationType } from "../../datatypes/types";
import { InvalidArgumentError } from "../../exceptions";
import { isArrayOrTypedArray, isValidNumber, toValidNumber, scaleDurationMs } from "../../utils";
import {
    MS_PER_WEEK,
    MS_PER_DAY,
    MS_PER_HOUR,
    MS_PER_MINUTE,
    MS_PER_SECOND,
    MS_PER_MILLISECOND,
    MS_PER_MICROSECOND,
    MS_PER_NANOSECOND
} from "../../constants";
import type { IntoExpr, DatetimeTimeUnit } from "../../types";

export interface DurationOptions {
    weeks?: IntoExpr | number;
    days?: IntoExpr | number;
    hours?: IntoExpr | number;
    minutes?: IntoExpr | number;
    seconds?: IntoExpr | number;
    milliseconds?: IntoExpr | number;
    microseconds?: IntoExpr | number;
    nanoseconds?: IntoExpr | number;
    timeUnit?: DatetimeTimeUnit;
}

/**
 * Constructs a Duration expression column from numeric values, column references, or expressions.
 *
 * @param {DurationOptions} [options] Duration component options (weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, timeUnit).
 * @returns {ColumnExpr<any>} A column expression with the calculated duration values.
 * @namespace $df
 * @category ColumnExpression
 * @syntax $df.duration(options)
 * @example
 * >>> const df = $df.data({ dt: ["2026-01-01"], add: [1, 2] })
 * >>> df.select($df.col("dt").cast($df.DataType.Datetime).add($df.duration({ days: "add" })).alias("add_days"))
 * shape: (2, 1)
 * ┌──────────────────────────┐
 * │ add_days                 │
 * ├──────────────────────────┤
 * │ 2026-01-02T00:00:00.000Z │
 * │ 2026-01-03T00:00:00.000Z │
 * └──────────────────────────┘
 */
export function duration(options: DurationOptions = {}): ColumnExpr<any> {
    const timeUnit: DatetimeTimeUnit = options.timeUnit ?? "ms";

    const parts: { expr: ColumnExpr<any>; multiplier: number }[] = [];

    const fieldMap: [IntoExpr | number | undefined, number][] = [
        [options.weeks, MS_PER_WEEK],
        [options.days, MS_PER_DAY],
        [options.hours, MS_PER_HOUR],
        [options.minutes, MS_PER_MINUTE],
        [options.seconds, MS_PER_SECOND],
        [options.milliseconds, MS_PER_MILLISECOND],
        [options.microseconds, MS_PER_MICROSECOND],
        [options.nanoseconds, MS_PER_NANOSECOND],
    ];

    for (const [val, mult] of fieldMap) {
        if (val != null) {
            const expr = isValidNumber(val) ? lit(val) : ColumnExpr.toColExpr(val);
            parts.push({ expr, multiplier: mult });
        }
    }

    if (parts.length === 0) {
        throw new InvalidArgumentError("At least one duration component must be specified for $df.duration().");
    }

    const expr = new ColumnExpr(DURATION_MARKER);
    expr._castType = new DurationType(timeUnit);

    expr._ops.push((vArray, columns) => {
        // 1. Infer true row height across scalar vs columnar contexts
        let height = vArray ? vArray.length : 0;

        if (height === 0 && columns) {
            const firstColKey = Object.keys(columns)[0];
            if (firstColKey && isArrayOrTypedArray(columns[firstColKey])) {
                height = (columns[firstColKey] as ArrayLike<unknown>).length;
            }
        }
        if (height === 0) height = 1;

        const totalMs = new Float64Array(height);
        const isNull = new Uint8Array(height);
        let hasNull = false;

        for (let p = 0; p < parts.length; p++) {
            const { expr: subExpr, multiplier } = parts[p];
            const evaluated = evaluateExpression(subExpr, columns, height);

            if (isArrayOrTypedArray(evaluated)) {
                const arr = evaluated as ArrayLike<unknown>;
                const len = arr.length;
                for (let i = 0; i < height; i++) {
                    if (isNull[i] === 1) continue;
                    const num = toValidNumber(i < len ? arr[i] : (len === 1 ? arr[0] : null));
                    if (num != null) {
                        totalMs[i] += num * multiplier;
                    } else {
                        isNull[i] = 1;
                        totalMs[i] = 0;
                        hasNull = true;
                    }
                }
            } else {
                const num = toValidNumber(evaluated);
                if (num != null) {
                    const addVal = num * multiplier;
                    for (let i = 0; i < height; i++) {
                        if (isNull[i] === 1) continue;
                        totalMs[i] += addVal;
                    }
                } else {
                    hasNull = true;
                    isNull.fill(1);
                    totalMs.fill(0);
                    break;
                }
            }
        }

        // 2. Uniform output array structure with float drift cleanup
        const result = new Array(height);
        for (let i = 0; i < height; i++) {
            if (isNull[i] === 1) {
                result[i] = null;
            } else {
                const cleanMs = Math.round(totalMs[i] * 1e6) / 1e6;
                result[i] = scaleDurationMs(cleanMs, timeUnit);
            }
        }
        return result;
    });

    return expr.alias("duration") as ColumnExpr<any>;
}
