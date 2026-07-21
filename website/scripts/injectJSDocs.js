import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "../..");
const srcDir = path.resolve(rootDir, "src");

// Complete metadata dictionary mapping method names to their JSDoc description and version compatibility.
const METADATA_MAP = {
  // DataFrame Operations
  "select": { desc: "Selects specific columns or compiles column expression evaluations.", version: "v1.5.0" },
  "filter": { desc: "Filters rows matching one or more boolean expressions.", version: "v1.5.0" },
  "groupby": { desc: "Groups rows by key columns and applies aggregated operations.", version: "v1.5.0" },
  "pivot": { desc: "Pivots columns from long format to a wide datagrid structure.", version: "v1.7.0" },
  "with_columns": { desc: "Adds new columns or updates existing ones with expression results.", version: "v1.6.0" },
  "drop": { desc: "Drops specified columns from the DataFrame.", version: "v1.5.0" },
  "sort": { desc: "Sorts the DataFrame rows by one or more column expressions.", version: "v1.5.0" },
  "limit": { desc: "Limits the output to the first N rows with optional offset.", version: "v1.5.0" },
  "join": { desc: "Joins two DataFrames on a key column using inner, left, or outer join strategy.", version: "v1.6.0" },
  "drop_nulls": { desc: "Drops rows that contain null or undefined values in specified columns.", version: "v1.6.0" },
  "explode": { desc: "Explodes an array column into multiple rows, replicating other row columns.", version: "v1.7.0" },
  "fill_null": { desc: "Fills null values in the DataFrame with a constant value or a statistical strategy.", version: "v1.6.0" },
  "get_schema": { desc: "Returns the mapping of column names to their registered DataType.", version: "v1.5.0" },
  "head": { desc: "Returns the first N rows as a new DataFrame.", version: "v1.5.0" },
  "tail": { desc: "Returns the last N rows as a new DataFrame.", version: "v1.5.0" },
  "insert_column": { desc: "Inserts a new column at a specific index.", version: "v1.6.0" },
  "item": { desc: "Returns a single scalar cell value by row index and column name/index.", version: "v1.5.0" },
  "rename": { desc: "Renames columns based on a key-value mapping object.", version: "v1.6.0" },
  "reverse": { desc: "Reverses the row order of the DataFrame.", version: "v1.5.0" },
  "slice": { desc: "Slices a range of rows from start to end index.", version: "v1.5.0" },
  "to_dict": { desc: "Converts columns to a dictionary mapping column keys to arrays.", version: "v1.5.0" },
  "to_dicts": { desc: "Converts rows into an array of JavaScript objects.", version: "v1.5.0" },
  "transpose": { desc: "Transposes rows into columns and columns into rows.", version: "v1.7.0" },
  "with_row_index": { desc: "Appends an incremental index column named index or custom key.", version: "v1.6.0" },

  // Base Expressions (ExprBase)
  "alias": { desc: "Renames the output expression column key.", version: "v1.5.0" },
  "cast": { desc: "Coerces the column data type to another type.", version: "v1.5.0" },
  "debug": { desc: "Prints the current evaluation intermediate array to console for debugging.", version: "v1.5.0" },

  // Arithmetic
  "abs": { desc: "Computes the absolute value of the column values.", version: "v1.5.0" },
  "acos": { desc: "Computes the arccosine of the column values.", version: "v1.5.0" },
  "acosh": { desc: "Computes the hyperbolic arccosine of the column values.", version: "v1.5.0" },
  "add": { desc: "Adds a scalar value or another column expression.", version: "v1.5.0" },
  "asin": { desc: "Computes the arcsine of the column values.", version: "v1.5.0" },
  "asinh": { desc: "Computes the hyperbolic arcsine of the column values.", version: "v1.5.0" },
  "atan": { desc: "Computes the arctangent of the column values.", version: "v1.5.0" },
  "atan2": { desc: "Computes the quadrant-aware arctangent of two values.", version: "v1.5.0" },
  "atanh": { desc: "Computes the hyperbolic arctangent of the column values.", version: "v1.5.0" },
  "cbrt": { desc: "Computes the cube root of the column values.", version: "v1.5.0" },
  "ceil": { desc: "Rounds column values up to the nearest integer.", version: "v1.5.0" },
  "clip": { desc: "Clamps column values between lower and upper numeric thresholds.", version: "v1.6.0" },
  "copysign": { desc: "Returns absolute value of expr with the sign of other.", version: "v1.5.0" },
  "cos": { desc: "Computes the cosine of the column values.", version: "v1.5.0" },
  "cosh": { desc: "Computes the hyperbolic cosine of the column values.", version: "v1.5.0" },
  "degrees": { desc: "Converts angles from radians to degrees.", version: "v1.5.0" },
  "div": { desc: "Divides by a scalar or another column expression.", version: "v1.5.0" },
  "exp": { desc: "Computes natural exponent (e^x) of the column values.", version: "v1.5.0" },
  "expm1": { desc: "Computes e^x - 1 for each element in the column.", version: "v1.5.0" },
  "floor": { desc: "Rounds column values down to the nearest integer.", version: "v1.5.0" },
  "floordiv": { desc: "Performs integer division floor(x / y) on column values.", version: "v1.5.0" },
  "hypot": { desc: "Computes the hypotenuse sqrt(x^2 + y^2) of two values.", version: "v1.5.0" },
  "log": { desc: "Computes the logarithm of positive values with a specified base.", version: "v1.6.0" },
  "log1p": { desc: "Computes natural logarithm of 1 + x.", version: "v1.5.0" },
  "mod": { desc: "Computes modulo remainder (x % y) of column values.", version: "v1.5.0" },
  "mul": { desc: "Multiplies by a scalar or another column expression.", version: "v1.5.0" },
  "negate": { desc: "Negates column values (-x).", version: "v1.5.0" },
  "pow": { desc: "Raises column values to the specified power.", version: "v1.5.0" },
  "radians": { desc: "Converts angles from degrees to radians.", version: "v1.5.0" },
  "rand": { desc: "Fills sequence with pseudo-random generated floats or integers.", version: "v1.6.0" },
  "round": { desc: "Rounds values to a specific scale of decimal digits.", version: "v1.5.0" },
  "round_sig_figs": { desc: "Rounds values to a specific number of significant figures.", version: "v1.6.0" },
  "sign": { desc: "Returns sign indicator of column values (-1, 0, or 1).", version: "v1.5.0" },
  "sin": { desc: "Computes the sine of the column values.", version: "v1.5.0" },
  "sinh": { desc: "Computes the hyperbolic sine of the column values.", version: "v1.5.0" },
  "sqrt": { desc: "Computes the square root of non-negative column values.", version: "v1.5.0" },
  "sub": { desc: "Subtracts a scalar or another column expression.", version: "v1.5.0" },
  "tan": { desc: "Computes the tangent of the column values.", version: "v1.5.0" },
  "tanh": { desc: "Computes the hyperbolic tangent of the column values.", version: "v1.5.0" },
  "trunc": { desc: "Truncates fractional digits of column values.", version: "v1.5.0" },

  // Comparisons
  "between": { desc: "Checks if values fall inside lower and upper boundaries (inclusive).", version: "v1.5.0" },
  "eq": { desc: "Boolean comparison: Returns true if values match exactly.", version: "v1.5.0" },
  "eq_missing": { desc: "Equivalence check that treats null values as equal to each other.", version: "v1.6.0" },
  "ge": { desc: "Boolean comparison: Returns true if greater than or equal to argument.", version: "v1.5.0" },
  "gt": { desc: "Boolean comparison: Returns true if column value is greater than argument.", version: "v1.5.0" },
  "has_nulls": { desc: "Aggregation: Checks if any value in the group is null.", version: "v1.6.0" },
  "is_close": { desc: "Determines if floating-point values are approximately equal within tolerances.", version: "v1.7.0" },
  "is_duplicated": { desc: "Checks if values occur more than once in the column.", version: "v1.7.0" },
  "is_empty": { desc: "Checks if strings or nested arrays have length 0.", version: "v1.6.0" },
  "is_finite": { desc: "Checks if values are finite numbers (not NaN or Infinity).", version: "v1.5.0" },
  "is_in": { desc: "Checks if values are elements of a specific array or set list.", version: "v1.5.0" },
  "is_infinite": { desc: "Checks if values are positive or negative Infinity.", version: "v1.5.0" },
  "is_nan": { desc: "Checks if values are NaN.", version: "v1.5.0" },
  "is_not_nan": { desc: "Checks if values are not NaN.", version: "v1.5.0" },
  "is_not_null": { desc: "Checks if values are non-null and valid.", version: "v1.6.0" },
  "is_null": { desc: "Checks if values are null, undefined, or missing.", version: "v1.6.0" },
  "is_unique": { desc: "Checks if values occur exactly once in the column.", version: "v1.7.0" },
  "le": { desc: "Boolean comparison: Returns true if less than or equal to argument.", version: "v1.5.0" },
  "lt": { desc: "Boolean comparison: Returns true if less than argument.", version: "v1.5.0" },
  "ne": { desc: "Boolean comparison: Returns true if values do not match.", version: "v1.5.0" },
  "ne_missing": { desc: "Difference check that treats null values as equal to each other.", version: "v1.6.0" },
  "not_in": { desc: "Checks if values are not elements of a specific array or set list.", version: "v1.5.0" },

  // Logical
  "and": { desc: "Logical AND check supporting Kleene logic.", version: "v1.5.0" },
  "not": { desc: "Logical negation.", version: "v1.5.0" },
  "or": { desc: "Logical OR check supporting Kleene logic.", version: "v1.5.0" },
  "xor": { desc: "Logical XOR check.", version: "v1.6.0" },

  // Aggregation
  "all": { desc: "Aggregation: Checks if all values in the group are truthy.", version: "v1.5.0" },
  "all_null": { desc: "Aggregation: Checks if all values in the group are null.", version: "v1.6.0" },
  "any": { desc: "Aggregation: Checks if any value in the group are truthy.", version: "v1.5.0" },
  "any_null": { desc: "Aggregation: Checks if any value in the group are null.", version: "v1.6.0" },
  "avg": { desc: "Aggregation: Computes the arithmetic mean of the group.", version: "v1.5.0" },
  "corr": { desc: "Aggregation: Computes the Pearson correlation coefficient between two columns.", version: "v1.7.0" },
  "count": { desc: "Aggregation: Returns the count of records inside the group.", version: "v1.5.0" },
  "cov": { desc: "Aggregation: Computes the covariance between two columns.", version: "v1.7.0" },
  "dot": { desc: "Aggregation: Computes the dot product with another column.", version: "v1.6.0" },
  "first": { desc: "Aggregation: Finds the first value in the group.", version: "v1.5.0" },
  "implode": { desc: "Aggregation: Collapses group values into a single array element.", version: "v1.5.0" },
  "last": { desc: "Aggregation: Finds the last value in the group.", version: "v1.5.0" },
  "max": { desc: "Aggregation: Finds the maximum value in the group.", version: "v1.5.0" },
  "mean": { desc: "Aggregation: Computes the arithmetic mean.", version: "v1.5.0" },
  "median": { desc: "Aggregation: Computes the 50th percentile median.", version: "v1.6.0" },
  "min": { desc: "Aggregation: Finds the minimum value in the group.", version: "v1.5.0" },
  "mode": { desc: "Aggregation: Finds the statistical mode (most frequent value).", version: "v1.6.0" },
  "n_unique": { desc: "Aggregation: Computes number of unique elements.", version: "v1.6.0" },
  "null_count": { desc: "Aggregation: Counts the number of null or missing records.", version: "v1.6.0" },
  "quantile": { desc: "Aggregation: Computes the specific quantile values (0.0 to 1.0).", version: "v1.6.0" },
  "spearman_corr": { desc: "Aggregation: Computes the Spearman rank correlation coefficient.", version: "v1.7.0" },
  "std": { desc: "Aggregation: Computes sample standard deviation.", version: "v1.6.0" },
  "sum": { desc: "Aggregation: Computes the sum of elements in the group.", version: "v1.5.0" },
  "w_avg": { desc: "Aggregation: Computes weighted average.", version: "v1.7.0" },

  // Manipulation
  "fill_null": { desc: "Fills null values in the column with a constant value or a statistical strategy.", version: "v1.6.0" },

  // Strings (str namespace)
  "str.concat": { desc: "Concatenates string expressions side-by-side.", version: "v1.5.0" },
  "str.contains": { desc: "Checks if a string contains the search substring pattern (supports Regex).", version: "v1.7.0" },
  "str.count_matches": { desc: "Counts occurrences of pattern matches inside a string column.", version: "v1.7.0" },
  "str.decode_uri_component": { desc: "Decodes URL percent-encoded characters.", version: "v1.6.0" },
  "str.encode_uri_component": { desc: "Percent-encodes URI characters.", version: "v1.6.0" },
  "str.ends_with": { desc: "Checks if string ends with a suffix suffix.", version: "v1.5.0" },
  "str.explode": { desc: "Explodes a string into individual character arrays.", version: "v1.7.0" },
  "str.extract": { desc: "Extracts regex pattern capture groups.", version: "v1.7.0" },
  "str.len": { desc: "Returns character length of each string.", version: "v1.5.0" },
  "str.len_bytes": { desc: "Returns byte count of each string under UTF-8 encoding.", version: "v1.6.0" },
  "str.len_chars": { desc: "Returns character length of each string.", version: "v1.5.0" },
  "str.lower": { desc: "Transforms all string characters to lowercase.", version: "v1.5.0" },
  "str.lpad": { desc: "Pads strings on left side to dynamic width.", version: "v1.6.0" },
  "str.pad_end": { desc: "Pads strings on right side to dynamic width.", version: "v1.6.0" },
  "str.pad_start": { desc: "Pads strings on left side to dynamic width.", version: "v1.6.0" },
  "str.replace": { desc: "Replaces the first occurrence matching a string pattern.", version: "v1.6.0" },
  "str.replace_all": { desc: "Replaces all occurrences matching a string pattern.", version: "v1.7.0" },
  "str.reverse": { desc: "Reverses characters of a string column.", version: "v1.6.0" },
  "str.rpad": { desc: "Pads strings on right side to dynamic width.", version: "v1.6.0" },
  "str.slice": { desc: "Slices a substring.", version: "v1.6.0" },
  "str.slice_str": { desc: "Slices a substring.", version: "v1.6.0" },
  "str.split": { desc: "Splits a string column into an array column by a delimiter string.", version: "v1.6.0" },
  "str.starts_with": { desc: "Checks if string starts with a prefix prefix.", version: "v1.5.0" },
  "str.strip_chars": { desc: "Strips occurrences of characters from both sides.", version: "v1.6.0" },
  "str.strip_chars_end": { desc: "Strips occurrences of characters from right side.", version: "v1.6.0" },
  "str.strip_chars_start": { desc: "Strips occurrences of characters from left side.", version: "v1.6.0" },
  "str.strip_prefix": { desc: "Strips prefix if it is present.", version: "v1.7.0" },
  "str.strip_suffix": { desc: "Strips suffix if it is present.", version: "v1.7.0" },
  "str.strptime": { desc: "Parses string columns into Date/Datetime.", version: "v1.7.0" },
  "str.to_camelcase": { desc: "Converts strings to camelCase.", version: "v1.6.0" },
  "str.to_date": { desc: "Converts ISO strings to Date columns.", version: "v1.6.0" },
  "str.to_datetime": { desc: "Parses ISO dates from string columns into Datetime types.", version: "v1.7.0" },
  "str.to_decimal": { desc: "Parses string column to Decimal format.", version: "v1.7.0" },
  "str.to_integer": { desc: "Parses string column to integers.", version: "v1.6.0" },
  "str.to_kebabcase": { desc: "Converts strings to kebab-case.", version: "v1.6.0" },
  "str.to_lowercase": { desc: "Converts strings to lowercase.", version: "v1.5.0" },
  "str.to_pascalcase": { desc: "Converts strings to PascalCase.", version: "v1.6.0" },
  "str.to_snakecase": { desc: "Converts strings to snake_case.", version: "v1.6.0" },
  "str.to_time": { desc: "Parses string column to Time of day.", version: "v1.6.0" },
  "str.to_titlecase": { desc: "Capitalizes the first letter of each word in the string.", version: "v1.6.0" },
  "str.to_uppercase": { desc: "Converts strings to uppercase.", version: "v1.5.0" },
  "str.trim": { desc: "Removes whitespace from both sides.", version: "v1.6.0" },
  "str.trim_end": { desc: "Removes whitespace from right side.", version: "v1.6.0" },
  "str.trim_start": { desc: "Removes whitespace from left side.", version: "v1.6.0" },
  "str.upper": { desc: "Transforms all string characters to uppercase.", version: "v1.5.0" },
  "str.zfill": { desc: "Zero-pads string on left to width.", version: "v1.6.0" },

  // Datetime (dt namespace)
  "dt.century": { desc: "Extracts century index of a Datetime value.", version: "v1.7.0" },
  "dt.date": { desc: "Extracts Date object component from Datetime.", version: "v1.6.0" },
  "dt.day": { desc: "Extracts the calendar day component (1-31) from a Datetime column.", version: "v1.5.0" },
  "dt.days_in_month": { desc: "Extracts number of days in the month.", version: "v1.6.0" },
  "dt.epoch": { desc: "Returns epoch duration timestamp offset.", version: "v1.6.0" },
  "dt.hour": { desc: "Extracts the hour component (0-23) from a Datetime column.", version: "v1.7.0" },
  "dt.is_business_day": { desc: "Boolean check: Returns true if target falls on a business day.", version: "v1.7.0" },
  "dt.is_leap_year": { desc: "Checks if year is a leap year.", version: "v1.6.0" },
  "dt.iso_week": { desc: "Extracts ISO week index.", version: "v1.6.0" },
  "dt.iso_year": { desc: "Extracts ISO calendar year.", version: "v1.6.0" },
  "dt.microsecond": { desc: "Extracts microseconds component.", version: "v1.7.0" },
  "dt.millennium": { desc: "Extracts millennium component index.", version: "v1.7.0" },
  "dt.millisecond": { desc: "Extracts milliseconds component.", version: "v1.6.0" },
  "dt.minute": { desc: "Extracts the minute component (0-59) from a Datetime column.", version: "v1.7.0" },
  "dt.month": { desc: "Extracts the calendar month component (1-12) from a Datetime column.", version: "v1.5.0" },
  "dt.month_end": { desc: "Returns date representing end of the month.", version: "v1.7.0" },
  "dt.month_start": { desc: "Returns date representing start of the month.", version: "v1.7.0" },
  "dt.nanosecond": { desc: "Extracts nanoseconds component.", version: "v1.7.0" },
  "dt.offset_business_day": { desc: "Offsets date by N business days.", version: "v1.7.0" },
  "dt.offset_day": { desc: "Offsets date by N calendar days.", version: "v1.7.0" },
  "dt.ordinal_day": { desc: "Returns day of the year (1-366).", version: "v1.6.0" },
  "dt.quarter": { desc: "Returns quarter of the year (1-4).", version: "v1.6.0" },
  "dt.second": { desc: "Extracts seconds component (0-59).", version: "v1.6.0" },
  "dt.strftime": { desc: "Formats dates to custom strings.", version: "v1.6.0" },
  "dt.time": { desc: "Extracts time component index.", version: "v1.6.0" },
  "dt.timestamp": { desc: "Returns numeric timestamp relative to Epoch.", version: "v1.6.0" },
  "dt.to_string": { desc: "Formats dates to custom strings.", version: "v1.6.0" },
  "dt.total_days": { desc: "Converts Duration to integer day count.", version: "v1.6.0" },
  "dt.total_hours": { desc: "Converts Duration to floating point hours.", version: "v1.6.0" },
  "dt.total_microseconds": { desc: "Converts Duration to microsecond count.", version: "v1.7.0" },
  "dt.total_milliseconds": { desc: "Converts Duration to millisecond count.", version: "v1.6.0" },
  "dt.total_minutes": { desc: "Converts Duration to floating point minutes.", version: "v1.6.0" },
  "dt.total_nanoseconds": { desc: "Converts Duration to nanosecond count.", version: "v1.7.0" },
  "dt.total_seconds": { desc: "Converts Duration to floating point seconds.", version: "v1.6.0" },
  "dt.utc_offset": { desc: "Returns the offset of local timezone relative to UTC.", version: "v1.7.0" },
  "dt.week": { desc: "Extracts ISO week index.", version: "v1.6.0" },
  "dt.weekday": { desc: "Extracts weekday component (1=Monday, 7=Sunday).", version: "v1.6.0" },
  "dt.year": { desc: "Extracts the year component from a Datetime column.", version: "v1.5.0" },

  // Arrays (arr namespace)
  "arr.all": { desc: "Returns true if all items in nested list cells are truthy.", version: "v1.6.0" },
  "arr.any": { desc: "Returns true if any item in nested list cells is truthy.", version: "v1.6.0" },
  "arr.contains": { desc: "Checks if nested lists contain item.", version: "v1.6.0" },
  "arr.contains_all": { desc: "Checks if nested lists contain all elements in items.", version: "v1.6.0" },
  "arr.contains_any": { desc: "Checks if nested lists contain any element in items.", version: "v1.6.0" },
  "arr.count_matches": { desc: "Counts occurrence frequency of item inside nested lists.", version: "v1.7.0" },
  "arr.eval": { desc: "Evaluates subExpr element-wise across array lists.", version: "v1.7.0" },
  "arr.explode": { desc: "Expands lists into row-wise records.", version: "v1.7.0" },
  "arr.filter": { desc: "Filters elements of list columns matching a boolean sub-expression.", version: "v1.7.0" },
  "arr.first": { desc: "Returns the first element of each list.", version: "v1.6.0" },
  "arr.gather": { desc: "Gathers specific indices from each nested list.", version: "v1.7.0" },
  "arr.gather_every": { desc: "Gather element slices with custom steps.", version: "v1.7.0" },
  "arr.get": { desc: "Extracts a single list element by its index position.", version: "v1.6.0" },
  "arr.join": { desc: "Joins elements of list columns into a single string column.", version: "v1.7.0" },
  "arr.last": { desc: "Returns the last element of each list.", version: "v1.6.0" },
  "arr.len": { desc: "Returns the length of each list inside the column cell.", version: "v1.6.0" },
  "arr.lengths": { desc: "Returns the length of each list inside the column cell.", version: "v1.6.0" },
  "arr.max": { desc: "Returns the maximum value of elements inside each list.", version: "v1.6.0" },
  "arr.max_index": { desc: "Returns the index of maximum value.", version: "v1.7.0" },
  "arr.mean": { desc: "Returns average of elements inside each list.", version: "v1.6.0" },
  "arr.median": { desc: "Returns statistical median inside each list.", version: "v1.6.0" },
  "arr.min": { desc: "Returns minimum of elements inside each list.", version: "v1.6.0" },
  "arr.min_index": { desc: "Returns the index of minimum value.", version: "v1.7.0" },
  "arr.mode": { desc: "Returns the mode value inside each list.", version: "v1.7.0" },
  "arr.n_unique": { desc: "Returns the unique count of elements inside each list.", version: "v1.7.0" },
  "arr.reverse": { desc: "Reverses elements of list columns.", version: "v1.6.0" },
  "arr.shift": { desc: "Shifts elements of list columns by N offsets.", version: "v1.7.0" },
  "arr.slice": { desc: "Slices nested list arrays.", version: "v1.6.0" },
  "arr.sort": { desc: "Sorts elements inside each list.", version: "v1.6.0" },
  "arr.splice": { desc: "Splices elements in list cells.", version: "v1.7.0" },
  "arr.std": { desc: "Returns sample standard deviation of elements inside each list.", version: "v1.7.0" },
  "arr.sum": { desc: "Returns sum of elements inside each list.", version: "v1.6.0" },
  "arr.to_struct": { desc: "Converts list column elements to struct columns.", version: "v1.7.0" },
  "arr.unique": { desc: "Fills each list with unique elements only.", version: "v1.6.0" },
  "arr.variance": { desc: "Returns sample variance of elements inside each list.", version: "v1.7.0" },

  // Structs (struct namespace)
  "struct.field": { desc: "Extracts a sub-field property value from nested objects.", version: "v1.6.0" },
  "struct.rename_fields": { desc: "Renames fields inside structured columns.", version: "v1.7.0" },
  "struct.unnest": { desc: "Expands nested struct attributes into distinct columns in the row schema.", version: "v1.7.0" },
  "struct.with_fields": { desc: "Inserts or updates fields inside structured columns.", version: "v1.7.0" },

  // Windows & Windows Aggregations
  "cum_count": { desc: "Window: Computes cumulative count.", version: "v1.7.0" },
  "cum_max": { desc: "Window: Computes cumulative max.", version: "v1.7.0" },
  "cum_min": { desc: "Window: Computes cumulative min.", version: "v1.7.0" },
  "cum_prod": { desc: "Window: Computes cumulative product.", version: "v1.7.0" },
  "cum_sum": { desc: "Window: Computes cumulative sum.", version: "v1.7.0" },
  "dense_rank": { desc: "Window: Computes dense rank within group partition.", version: "v1.7.0" },
  "lag": { desc: "Window: Shifts values down by offset, filling with default.", version: "v1.7.0" },
  "lead": { desc: "Window: Shifts values up by offset, filling with default.", version: "v1.7.0" },
  "over": { desc: "Executes a window aggregation partitioned by column keys.", version: "v1.7.0" },
  "rank": { desc: "Window: Computes rank within group partition.", version: "v1.7.0" },
  "rolling_max": { desc: "Window: Computes rolling window max.", version: "v1.7.0" },
  "rolling_mean": { desc: "Window: Computes rolling window mean.", version: "v1.7.0" },
  "rolling_median": { desc: "Window: Computes rolling window median.", version: "v1.7.0" },
  "rolling_min": { desc: "Window: Computes rolling window min.", version: "v1.7.0" },
  "rolling_quantile": { desc: "Window: Computes rolling window quantile value.", version: "v1.7.0" },
  "rolling_rank": { desc: "Window: Computes rolling window rank.", version: "v1.7.0" },
  "rolling_std": { desc: "Window: Computes rolling window standard deviation.", version: "v1.7.0" },
  "rolling_sum": { desc: "Window: Computes rolling window sum.", version: "v1.7.0" },
  "row_number": { desc: "Window: Computes row index count within group partitions.", version: "v1.7.0" },

  // Global functions
  "col": { desc: "Creates a ColumnExpression referencing a column by name, type, or array selection.", version: "v1.5.0" },
  "lit": { desc: "Wraps a literal value into a ColumnExpression.", version: "v1.5.0" },
  "all": { desc: "Selects all columns in the current DataFrame.", version: "v1.5.0" },
  "exclude": { desc: "Excludes specific columns from wildcard selectors.", version: "v1.6.0" },
  "coalesce": { desc: "Returns the first non-null value among the specified expressions.", version: "v1.6.0" },
  "when": { desc: "Provides conditional branch evaluations inside column expressions.", version: "v1.5.0" },
  "implode": { desc: "Aggregates values of a column into a list within each group.", version: "v1.5.0" },
  "seq_range": { desc: "Generates a sequence range of values cumulative or constant.", version: "v1.6.0" },
  "element": { desc: "References list elements inside nested list loops/evals.", version: "v1.6.0" },
  "struct": { desc: "Packages multiple expressions into a structured object column.", version: "v1.6.0" }
};

// Helper to check if a line has JSDoc comment right before it in file lines
function hasJSDocBefore(lines, index) {
  let idx = index - 1;
  while (idx >= 0) {
    const line = lines[idx].trim();
    if (line === "*/") return true;
    if (line === "" || line.startsWith("//")) {
      idx--;
      continue;
    }
    break;
  }
  return false;
}

// Helper to inject JSDoc comment above a matched method/function
function injectComment(filePath, searchPatterns, desc, version) {
  if (!fs.existsSync(filePath)) return false;
  let code = fs.readFileSync(filePath, "utf-8");
  let lines = code.split("\n");
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if line matches any search pattern
    const isMatch = searchPatterns.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(line);
      }
      return line.includes(pattern);
    });

    if (isMatch) {
      if (!hasJSDocBefore(lines, i)) {
        // Construct JSDoc comment with @since tag
        const indent = line.match(/^\s*/)[0];
        const jsDoc = [
          `${indent}/**`,
          `${indent} * ${desc}`,
          `${indent} * @since ${version}`,
          `${indent} */`
        ].join("\n");
        
        lines.splice(i, 0, jsDoc);
        console.log(`Injected JSDoc into ${path.basename(filePath)} above: ${line.trim()} (@since ${version})`);
        modified = true;
        break; // Inject once per method
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
    return true;
  }
  return false;
}

console.log("Injecting JSDocs with @since tags into source files...");

// 2. Iterate and inject JSDoc comments
for (const [rawName, meta] of Object.entries(METADATA_MAP)) {
  const isGlobal = !rawName.includes(".") && ["col", "lit", "all", "exclude", "coalesce", "when", "implode", "seq_range", "element", "struct"].includes(rawName);

  if (rawName.startsWith("str.")) {
    // String mixin namespace methods
    const strFile = path.join(srcDir, "columnExpressions", "mixins", "StringExpr.ts");
    const nameOnly = rawName.split(".")[1];
    const regex1 = new RegExp(`^\\s+${nameOnly}\\s*\\(`);
    injectComment(strFile, [regex1], meta.desc, meta.version);
  } else if (rawName.startsWith("dt.")) {
    // DateTime mixin namespace methods
    const dtFile = path.join(srcDir, "columnExpressions", "mixins", "TemporalExpr.ts");
    const nameOnly = rawName.split(".")[1];
    const regex1 = new RegExp(`^\\s+${nameOnly}\\s*\\(`);
    injectComment(dtFile, [regex1], meta.desc, meta.version);
  } else if (rawName.startsWith("arr.")) {
    // Array mixin namespace methods
    const arrFile = path.join(srcDir, "columnExpressions", "mixins", "ArrayExpr.ts");
    const nameOnly = rawName.split(".")[1];
    const regex1 = new RegExp(`^\\s+${nameOnly}\\s*\\(`);
    injectComment(arrFile, [regex1], meta.desc, meta.version);
  } else if (rawName.startsWith("struct.")) {
    // Struct mixin namespace methods
    const structFile = path.join(srcDir, "columnExpressions", "mixins", "StructExpr.ts");
    const nameOnly = rawName.split(".")[1];
    const regex1 = new RegExp(`^\\s+${nameOnly}\\s*\\(`);
    injectComment(structFile, [regex1], meta.desc, meta.version);
  } else if (isGlobal) {
    // Global column functions in columnExpressions/functions/
    const funcFile = path.join(srcDir, "columnExpressions", "functions", `${rawName}.ts`);
    if (fs.existsSync(funcFile)) {
      const regex1 = new RegExp(`export function ${rawName}\\s*\\(`);
      injectComment(funcFile, [regex1], meta.desc, meta.version);
    }
  } else {
    // DataFrame or standard ColumnExpression method
    const dfMethods = ["select", "filter", "groupby", "pivot", "with_columns", "drop", "sort", "limit", "join", "drop_nulls", "explode", "fill_null", "get_schema", "head", "tail", "insert_column", "item", "rename", "reverse", "slice", "to_dict", "to_dicts", "transpose", "with_row_index"];
    
    if (dfMethods.includes(rawName)) {
      const dfFile = path.join(srcDir, "dataframe", "dataframe.ts");
      const regex1 = new RegExp(`^\\s+${rawName}\\s*\\(`);
      const regex2 = new RegExp(`^\\s+${rawName}\\s*<`);
      injectComment(dfFile, [regex1, regex2], meta.desc, meta.version);
    } else {
      // General ColumnExpression mixins (Arithmetic, Comparison, Aggregation, Manipulation, Window)
      const mixinDir = path.join(srcDir, "columnExpressions", "mixins");
      const mixinFiles = fs.readdirSync(mixinDir).map(f => path.join(mixinDir, f));
      mixinFiles.push(path.join(srcDir, "columnExpressions", "ExprBase.ts"));
      
      const regex1 = new RegExp(`^\\s+${rawName}\\s*\\(`);
      const regex2 = new RegExp(`^\\s+${rawName}\\s*<`);

      for (const file of mixinFiles) {
        if (injectComment(file, [regex1, regex2], meta.desc, meta.version)) {
          break; // Injected successfully in this file
        }
      }
    }
  }
}

console.log("JSDoc injection complete!");
