import { ColumnExpr } from "../ColumnExpr";
import { seq_range } from "./seq_range";
import type { SeqRangeOptions } from "./seq_range";

export type LitOptions = Pick<SeqRangeOptions, "dtype" | "name">;

/**
 * Creates a literal column expression that repeats the given value for all rows.
 */
export function lit(value: any, options?: LitOptions): ColumnExpr<any> {
    const expr = seq_range(value, {
        strict: true,
        mode: "constant",
        dtype: options?.dtype,
        name: options?.name,
    } as any);
    expr.isLiteral = true;
    return expr;
}

