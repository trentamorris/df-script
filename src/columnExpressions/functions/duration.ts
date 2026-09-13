import { ColumnExpr } from "../ColumnExpr";
import { toColExpr } from "../ExprBase"
import { lit } from "./lit";
import { DurationType } from "../../datatypes/types";
import { InvalidArgumentError } from "../../exceptions";
import { isValidNumber, parseDurationString, FIXED_DURATION_UNITS } from "../../utils";
import type { IntoExpr, DurationOptions } from "../../types";

/**
 * Constructs a Duration expression column from numeric values, string intervals, column references, or expressions.
 *
 * @param {DurationOptions | string} [options] Duration component options or string interval (e.g. "1d 12h").
 * @returns {ColumnExpr<any>} A column expression with the calculated duration values.
 * @namespace $df
 * @category ColumnExpression
 * @syntax $df.duration(options)
 * @example
 * <!-- doc:base_temporal_single -->
 * >>> df.select($df.col("date").cast($df.Datetime).add($df.duration({ days: 1 })).alias("plus_1_day"))
 * shape: (1, 1)
 * ┌──────────────────────────┐
 * │ plus_1_day               │
 * ├──────────────────────────┤
 * │ 2026-05-21T10:00:00.123Z │
 * └──────────────────────────┘
 */
export function duration(options: DurationOptions | string = {}): ColumnExpr<any> {
    if (typeof options === "string") {
        const ms = parseDurationString(options, { to: "ms" });
        const expr = lit(ms).alias("duration");
        expr._castType = new DurationType("ms");
        return expr;
    }

    let constantMs = 0;
    let exprTotal: ColumnExpr<any> | null = null;
    let hasComponent = false;
    const opts = options as Record<string, IntoExpr | number | undefined>;

    for (const key in opts) {
        const mult = FIXED_DURATION_UNITS[key];
        if (mult === undefined) continue;

        const val = opts[key];
        if (val == null) continue;

        hasComponent = true;
        if (isValidNumber(val)) {
            constantMs += (val as number) * mult;
            continue;
        }

        const part = toColExpr<ColumnExpr<any>>(val as IntoExpr, ColumnExpr).mul(mult);
        exprTotal = exprTotal ? exprTotal.add(part) : part;
    }

    if (!hasComponent) {
        throw new InvalidArgumentError("At least one duration component must be specified for $df.duration().");
    }

    const out = !exprTotal
        ? lit(constantMs)
        : constantMs !== 0
            ? exprTotal.add(lit(constantMs))
            : exprTotal;

    out._castType = new DurationType("ms");
    return out.alias("duration") as ColumnExpr<any>;
}
