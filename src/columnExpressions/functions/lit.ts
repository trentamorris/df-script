import { ColumnExpr } from "../ColumnExpr";
import { seqRange } from "./seqRange";
import type { SeqRangeOptions } from "./seqRange";

export type LitOptions = Pick<SeqRangeOptions, "dtype" | "name">;

/**
 * Creates a literal column expression that repeats the given value for all rows.
 *
 * @param value The literal value (number, string, boolean, etc.).
 * @param [options] Configuration options.
 * @param [options.dtype] The data type to allocate for the literal values.
 * @param [options.name] The name of the output column.
 * @returns {ColumnExpr<any>} A column expression with the literal value.
 * @namespace $df
 * @category ColumnExpression
 * @syntax $df.{symbol}(...)
 * @example
 * <!-- doc:base_2x2 -->
 * >>> df.select($df.lit(42).alias("answer"))
 * shape: (2, 1)
 * ┌────────┐
 * │ answer │
 * ├────────┤
 * │ 42     │
 * │ 42     │
 * └────────┘
 */
export function lit(value: any, options: LitOptions = {}): ColumnExpr<any> {
    const expr = seqRange(value, { ...options, mode: "constant" });
    expr._isLiteral = true;
    expr._literalValue = value;
    return expr;
}

