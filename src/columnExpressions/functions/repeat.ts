import { ColumnExpr } from "../ColumnExpr";
import { LITERAL_MARKER } from "../constants";
import type { RegisteredDataType } from "../../types";

/**
 * Creates a literal column expression that repeats the given value.
 * If n is specified, it repeats the value n times.
 * If strict is true (default), a height mismatch with the DataFrame will throw a ShapeError.
 * If strict is false, it will pad/truncate to match the DataFrame height.
 */
export function repeat(
    value: any,
    options: { n?: number; dtype?: RegisteredDataType; name?: string; strict?: boolean } = {}
): ColumnExpr<any> {
    const expr = new ColumnExpr(LITERAL_MARKER);
    expr.isLiteral = true;
    expr.literalValue = value;
    if (options.name) {
        expr.outputName = options.name;
    }

    const strict = options.strict !== false;

    expr.ops.push((vArray) => {
        const targetHeight = vArray.length;
        const specifiedHeight = options.n !== undefined ? options.n : targetHeight;
        const finalHeight = strict ? specifiedHeight : targetHeight;

        const result = new Array(finalHeight);
        const finalVal = options.dtype ? options.dtype.coerce(value) : value;

        const repeatCount = strict ? finalHeight : Math.min(specifiedHeight, finalHeight);

        for (let i = 0; i < finalHeight; i++) {
            result[i] = i < repeatCount ? finalVal : null;
        }
        return result;
    });

    return expr;
}
