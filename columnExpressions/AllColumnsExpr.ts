import { ExprBase, derive } from "./ExprBase"
import { ArithmeticExpr } from "./mixins/ArithmeticExpr"
import { ComparisonExpr } from "./mixins/ComparisonExpr"
import { AggregationExpr } from "./mixins/AggregationExpr"
import { WindowExpr } from "./mixins/WindowExpr"
import { StringExpr } from "./mixins/StringExpr"
import { LogicalExpr } from "./mixins/LogicalExpr"
import { TemporalExpr } from "./mixins/TemporalExpr"

export class AllColumnsExpr extends TemporalExpr(LogicalExpr(StringExpr(WindowExpr(AggregationExpr(ComparisonExpr(ArithmeticExpr(ExprBase))))))) {
    public excludedCols: string[] = [];

    constructor() {
        super();
        this.outputName = "*";
    }

    exclude(columns: string | string[]): this {
        const newInst = derive(this, (v) => v);
        const cols = Array.isArray(columns) ? columns : [columns];
        newInst.excludedCols = [...this.excludedCols, ...cols];
        return newInst;
    }

    evaluate(row: any): any {
        let value = row;
        for (const op of this.ops) {
            value = op(value, row);
        }
        return value;
    }
}
