import { ColumnExpr } from "../columnExpressions/columnExpr";
import { seqRange } from "./seqRange";
import type { LitOptions } from "./types";


/**
 * Creates a literal column expression that repeats the given value for all rows.
 *
 * @param value The literal value (number, string, boolean, etc.).
 * @param [options] Configuration options.
 * @returns {ColumnExpr<any>} A column expression with the literal value.
 * @namespace $df
 * @category Function
 * @syntax $df.{symbol}(...)
 * @example
 * // 1. Literal number repeated for every row:
 * <!-- doc:base_2x2 -->
 * >>> df.select($df.lit(42).alias("answer"))
 * shape: (2, 1)
 * +--------+
 * | answer |
 * +--------+
 * | 42     |
 * | 42     |
 * +--------+
 *
 * @example
 * // 2. Literal string repeated across rows:
 * <!-- doc:base_2x2 -->
 * >>> df.withColumns($df.lit("active").alias("status"))
 * shape: (2, 3)
 * +---+---+--------+
 * | a | b | status |
 * +---+---+--------+
 * | 1 | x | active |
 * | 2 | y | active |
 * +---+---+--------+
 */
export function lit(value: any, options: LitOptions = {}): ColumnExpr<any> {
    const expr = seqRange(value, { ...options, mode: "constant" });
    expr._isLiteral = true;
    expr._literalValue = value;
    return expr;
}
