// Static runner for the suites executed against the built package (npm run test:dist).
// These suites import "df-script", so they resolve to dist/ unless the "@df-script/source" condition is set.
console.log("=========================================");
console.log("RUNNING DFSCRIPT TESTS AGAINST BUILT PACKAGE (dist/)...");
console.log("=========================================");

// 1. ColumnExpressions mixins
import "./columnExpressions/mixins/arrayExpr/run_all.ts";
import "./columnExpressions/mixins/standardExpr/run_all.ts";
import "./columnExpressions/mixins/stringExpr/run_all.ts";
import "./columnExpressions/mixins/structExpr/run_all.ts";
import "./columnExpressions/mixins/temporalExpr/run_all.ts";

// 2. DataFrames
import "./dataframe/run_all.ts";

// 3. Functions
import "./functions/all.test.ts";
import "./functions/coalesce.test.ts";
import "./functions/col.test.ts";
import "./functions/concat.test.ts";
import "./functions/data.test.ts";
import "./functions/duration.test.ts";
import "./functions/element.test.ts";
import "./functions/exclude.test.ts";
import "./functions/horizontal.test.ts";
import "./functions/implode.test.ts";
import "./functions/lit.test.ts";
import "./functions/readCsv.test.ts";
import "./functions/readJson.test.ts";
import "./functions/seqRange.test.ts";
import "./functions/struct.test.ts";
import "./functions/when.test.ts";

// 4. DataTypes
import "./datatypes/dataTypes.test.ts";

console.log("=========================================");
console.log("🎉 ALL DIST TESTS FINISHED!");
console.log("=========================================");
