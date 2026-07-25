import { ColumnExpr } from "../ColumnExpr";
import { seq_range } from "./seq_range";
import type { SeqRangeOptions } from "./seq_range";

export type LitOptions = Pick<SeqRangeOptions, "dtype" | "name">;

/**
 * Creates a literal column expression that repeats the given value for all rows.
 *
 * @param {any} value The literal value (number, string, boolean, etc.).
 * @param {LitOptions} [options] Configuration options including data type and output name.
 * @returns {ColumnExpr<any>} A column expression with the literal value.
 * @identifier $df
 * @example
 * >>> const df = $df.data({ a: [1, 2] })
 * >>> df
 * shape: (2, 1)
 * ┌───┐
 * │ a │
 * ├───┤
 * │ 1 │
 * │ 2 │
 * └───┘
 * >>> df.select($df.lit(42).alias("answer"))
 * shape: (2, 1)
 * ┌────────┐
 * │ answer │
 * ├────────┤
 * │ 42     │
 * │ 42     │
 * └────────┘
 */
export function lit(value: any, options?: LitOptions): ColumnExpr<any> {
    const expr = seq_range(value, {
        strict: true,
        mode: "constant",
        dtype: options?.dtype,
        name: options?.name,
    } as any);
    expr._isLiteral = true;
    return expr;
}

