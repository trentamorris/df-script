declare const process: any;
import { parseCSV } from "../../../src/utils/csv";

try {
    // 1. Basic CSV parsing
    const parsed = parseCSV("a,b,c\n1,2,3\n4,5,6");
    if (parsed.length !== 3 || parsed[0][0] !== "a" || parsed[1][1] !== "2") {
        throw new Error("Basic parsing failed");
    }

    // 2. Quotes with commas
    const quoted = parseCSV('colA,colB\n"val,1",val2');
    if (quoted.length !== 2 || quoted[1][0] !== "val,1" || quoted[1][1] !== "val2") {
        throw new Error("Quoted comma parsing failed");
    }

    // 3. Escaped quotes inside quotes
    const escaped = parseCSV('col\n"He said ""hello"""" to me"');
    if (escaped.length !== 2 || escaped[1][0] !== 'He said "hello"" to me') {
        throw new Error("Escaped quotes inside quotes failed");
    }

    // 4. Quotes spanning multiple lines
    const multiLine = parseCSV('id,desc\n1,"Line 1\r\nLine 2\rLine 3\nLine 4"\n2,End');
    if (multiLine.length !== 3 || multiLine[1][1] !== "Line 1\r\nLine 2\rLine 3\nLine 4" || multiLine[2][1] !== "End") {
        throw new Error("Multiline quote parsing failed");
    }

    // 5. UTF-8 BOM stripping
    const bomParsed = parseCSV("\uFEFFx,y\n10,20");
    if (bomParsed.length !== 2 || bomParsed[0][0] !== "x") {
        throw new Error("UTF-8 BOM stripping failed");
    }

    // 6. Custom separator (tab)
    const tabParsed = parseCSV("col1\tcol2\nval1\tval2", { separator: "\t" });
    if (tabParsed.length !== 2 || tabParsed[1][0] !== "val1" || tabParsed[1][1] !== "val2") {
        throw new Error("Tab separator failed");
    }

    // 7. Empty and blank strings
    if (parseCSV("").length !== 0) throw new Error("Empty string should return empty array");
    if (parseCSV("\r\n\n\r").length !== 0) throw new Error("Newline-only should return empty array");

    // 8. Trailing empty delimiters
    const trailing = parseCSV("a,b,c\n1,,\n,,\n");
    if (trailing.length !== 3 || trailing[1][0] !== "1" || trailing[1][1] !== "") {
        throw new Error("Trailing delimiters failed");
    }

    // 9. Mixed line breaks
    const mixed = parseCSV("a,,c\r\n1,2,\r3,,");
    if (mixed.length !== 3 || mixed[0].length !== 3 || mixed[1][2] !== "") {
        throw new Error("Mixed line breaks failed");
    }

    // 10. Quote inside unquoted cell
    const quoteInCell = parseCSV('a,b\nfoo"bar,baz');
    if (quoteInCell.length !== 2 || quoteInCell[1][0] !== 'foo"bar') {
        throw new Error("Quote inside unquoted cell failed");
    }

    // 11. Unclosed quote at EOF
    const unclosed = parseCSV('a,b\n1,"unclosed text');
    if (unclosed.length !== 2 || unclosed[1][1] !== "unclosed text") {
        throw new Error("Unclosed quote at EOF failed");
    }

    // 12. Empty quoted field
    const emptyQuoted = parseCSV('a,b\n"",foo\nbar,""');
    if (emptyQuoted.length !== 3 || emptyQuoted[1][0] !== "" || emptyQuoted[1][1] !== "foo" || emptyQuoted[2][1] !== "") {
        throw new Error("Empty quoted field failed");
    }

    // 13. Single cell without newlines or separators
    const singleCell = parseCSV("standalone");
    if (singleCell.length !== 1 || singleCell[0].length !== 1 || singleCell[0][0] !== "standalone") {
        throw new Error("Single cell without newlines failed");
    }

    // 14. Single quoted cell
    const singleQuotedCell = parseCSV('"standalone quoted"');
    if (singleQuotedCell.length !== 1 || singleQuotedCell[0][0] !== "standalone quoted") {
        throw new Error("Single quoted cell failed");
    }

    // 15. Custom quote character
    const customQuote = parseCSV("a|'hello|world'|c", { separator: "|", quoteChar: "'" });
    if (customQuote.length !== 1 || customQuote[0].length !== 3 || customQuote[0][1] !== "hello|world") {
        throw new Error("Custom quote character failed");
    }

    // 16. Consecutive escaped quotes inside quotes ("""" -> "")
    const consecutiveEscaped = parseCSV('col\n""""');
    if (consecutiveEscaped.length !== 2 || consecutiveEscaped[1][0] !== '"') {
        throw new Error("Consecutive escaped quotes failed");
    }

    // 17. Only delimiters
    const onlyDelimiters = parseCSV(",,\n,,");
    if (onlyDelimiters.length !== 2 || onlyDelimiters[0].length !== 3 || onlyDelimiters[1].length !== 3) {
        throw new Error("Only delimiters failed");
    }

    // 18. Line with trailing spaces after closing quote
    const trailingSpaceAfterQuote = parseCSV('a,b\n"quoted" ,val');
    if (trailingSpaceAfterQuote.length !== 2 || trailingSpaceAfterQuote[1][0] !== "quoted " || trailingSpaceAfterQuote[1][1] !== "val") {
        throw new Error("Trailing space after quote failed");
    }

    // 19. Multi-line CSV ending with CR instead of LF
    const endingCR = parseCSV("a,b\n1,2\r");
    if (endingCR.length !== 2 || endingCR[1][0] !== "1" || endingCR[1][1] !== "2") {
        throw new Error("Ending with carriage return failed");
    }

    // 20. Quote within unquoted content surrounded by separators
    const midQuotes = parseCSV("a,b,c\nhello,world \"test\",123");
    if (midQuotes.length !== 2 || midQuotes[1][1] !== 'world "test"') {
        throw new Error("Mid unquoted content quote failed");
    }

    // 21. Triple quotes inside quoted field ("""a""" -> "a")
    const tripleQuotes = parseCSV('col\n"""a"""');
    if (tripleQuotes.length !== 2 || tripleQuotes[1][0] !== '"a"') {
        throw new Error('Triple quotes failed: expected \'"a"\', got ' + JSON.stringify(tripleQuotes[1][0]));
    }

    // 22. Quoted field containing separator and CR LF
    const complexField = parseCSV('h1,h2\n"line1\r\npart1,part2\nline3",end');
    if (complexField.length !== 2 || complexField[1][0] !== "line1\r\npart1,part2\nline3" || complexField[1][1] !== "end") {
        throw new Error("Complex quoted field containing separators and newlines failed");
    }

    // 23. Empty lines interspersed in content
    const emptyLinesInterspersed = parseCSV("a,b\n\n1,2\n\n3,4\n\n");
    if (emptyLinesInterspersed.length !== 3 || emptyLinesInterspersed[1][0] !== "1" || emptyLinesInterspersed[2][0] !== "3") {
        throw new Error("Empty lines interspersed failed: length=" + emptyLinesInterspersed.length);
    }

    // 24. Multi-character cells with Unicode surrogate pairs and emojis
    const unicodeCSV = parseCSV('emoji,text\n"🚀,🎉","Hello 🌍"');
    if (unicodeCSV.length !== 2 || unicodeCSV[1][0] !== "🚀,🎉" || unicodeCSV[1][1] !== "Hello 🌍") {
        throw new Error("Unicode / emoji CSV parsing failed");
    }

    // 25. Custom multi-char separator or regex-special separator (e.g., pipe '|')
    const pipeCSV = parseCSV("a|b|c\n1|2|3\n4|5|6", { separator: "|" });
    if (pipeCSV.length !== 3 || pipeCSV[0][1] !== "b" || pipeCSV[2][2] !== "6") {
        throw new Error("Pipe separator failed");
    }

    // 26. Quoted empty strings followed immediately by newline
    const quotedEmptyAtEOL = parseCSV('a,b\n1,""\n2,""');
    if (quotedEmptyAtEOL.length !== 3 || quotedEmptyAtEOL[1][1] !== "" || quotedEmptyAtEOL[2][1] !== "") {
        throw new Error("Quoted empty string at EOL failed");
    }

    console.log("✓ parseCSV tests passed!");
} catch (err: any) {
    console.error(`❌ parseCSV test failed: ${err.message}`);
    process.exit(1);
}
