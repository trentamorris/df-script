import { ColumnExpr } from "../columnExpressions/ColumnExpr";
import type { IExpr, ValidScalarTypes } from "../types";
import { evaluateArg, isEvaluatedColumn, evaluateArgsMatrix } from "../columnExpressions/utils";
import { WHEN_MARKER } from "../columnExpressions/constants";

type WhenArg = IExpr | ValidScalarTypes | any[] | Record<string, any>;

export class WhenThenChain {
    constructor(
        public _predicates: WhenArg[],
        public _values: WhenArg[] = []
    ) { }

    then(value: WhenArg): WhenThen {
        return new WhenThen(this._predicates, [...this._values, value]);
    }
}

export { WhenThenChain as When };

export class WhenThen extends ColumnExpr<any> {
    get _branchOperands(): WhenArg[] {
        return this._otherwise != null ? [...this._values, this._otherwise] : this._values;
    }

    constructor(
        public _predicates: WhenArg[] = [],
        public _values: WhenArg[] = [],
        public _otherwise: WhenArg = null
    ) {
        super(WHEN_MARKER);

        this._ops = [(_, columns) => {
            const height = _.length;
            const numConditions = this._predicates.length;

            const { evaluatedArrays: evaluatedPreds, isCol: isPredCol } = evaluateArgsMatrix(this._predicates, columns, height);
            const { evaluatedArrays: evaluatedVals, isCol: isValCol } = evaluateArgsMatrix(this._values, columns, height);

            const currentOtherwise = this._otherwise;
            const evaluatedOtherwise = evaluateArg(currentOtherwise, columns, height);
            const isOtherwiseCol = isEvaluatedColumn(currentOtherwise, evaluatedOtherwise, columns, height);

            const result = new Array(height);

            for (let i = 0; i < height; i++) {
                let matched = false;
                for (let j = 0; j < numConditions; j++) {
                    const predVal = isPredCol[j] ? evaluatedPreds[j][i] : evaluatedPreds[j];
                    if (predVal === true) {
                        result[i] = isValCol[j] ? evaluatedVals[j][i] : evaluatedVals[j];
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    result[i] = isOtherwiseCol ? evaluatedOtherwise[i] : evaluatedOtherwise;
                }
            }
            return result;
        }];
    }

    when(predicate: WhenArg): WhenThenChain {
        return new WhenThenChain([...this._predicates, predicate], this._values);
    }

    otherwise(value: WhenArg): WhenThen {
        return new WhenThen(this._predicates, this._values, value);
    }
}

/**
 * Provides conditional branch evaluations inside column expressions.
 *
 * @param {WhenArg} predicate The boolean condition or expression.
 * @returns {WhenThenChain} A When object builder to chain `.then()` and `.otherwise()`/`.when()`.
 * @namespace $df
 * @category ColumnExpression
 * @syntax $df.{symbol}(...)
 * @example
 * <!-- doc:base_numbers_3x1 -->
 * >>> df.select(
 * ...   $df.when($df.col("a").gt(2)).then("High")
 * ...     .otherwise("Low").alias("tier")
 * ... )
 * shape: (3, 1)
 * ┌──────┐
 * │ tier │
 * ├──────┤
 * │ Low  │
 * │ Low  │
 * │ High │
 * └──────┘
 */
export function when(predicate: WhenArg): WhenThenChain {
    return new WhenThenChain([predicate]);
}