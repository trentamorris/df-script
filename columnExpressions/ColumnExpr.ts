import { ExprBase, derive } from "./ExprBase"
import { ArithmeticExpr } from "./mixins/ArithmeticExpr"
import { ComparisonExpr } from "./mixins/ComparisonExpr"
import { AggregationExpr } from "./mixins/AggregationExpr"
import { WindowExpr } from "./mixins/WindowExpr"
import { StringExpr } from "./mixins/StringExpr"
import { LogicalExpr } from "./mixins/LogicalExpr"
import { TemporalExpr } from "./mixins/TemporalExpr"

export class ColumnExpr<T> extends TemporalExpr(LogicalExpr(StringExpr(WindowExpr(AggregationExpr(ComparisonExpr(ArithmeticExpr(ExprBase))))))) {
    public colName: string

    constructor(colName: keyof T | string) {
        super()
        this.colName = String(colName)
        this.outputName = this.colName
    }

    evaluate(row: T): any {
        let value = (row as any)[this.colName]
        for (const op of this.ops) {
            value = op(value, row)
        }
        return value
    }

    replace(mapping: Map<any, any> | Record<string | number, any>, defaultValue?: any): this {
        const map = mapping instanceof Map ? mapping : new Map(Object.entries(mapping));
        return derive(this, (currentValue) => {
            if (map.has(currentValue)) return map.get(currentValue);
            return defaultValue !== undefined ? defaultValue : currentValue;
        });
    }
}
