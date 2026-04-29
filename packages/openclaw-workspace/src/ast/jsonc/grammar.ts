/**
 * JSONC grammar — authority-of-record PEG description for the JSON-with-
 * comments dialect this package parses. The actual parser at `parse.ts`
 * is a hand-written recursive-descent implementation; this string is
 * exported for documentation, IDE references, and grammar diff tracking.
 *
 * Differences from RFC 8259 strict JSON:
 *   - Line comments (`// ...` to end of line)
 *   - Block comments (`/* ... \*\/`, non-nesting)
 *   - Trailing commas allowed in object members and array elements
 *   - Optional UTF-8 BOM at file start (stripped if present)
 *
 * @module @bic/openclaw-workspace/ast/jsonc/grammar
 */

export const JSONC_GRAMMAR = `
Document = BOM? _ value:Value? _ EOF

Value = Object / Array / String / Number / Boolean / Null

Object = "{" _ members:Members? _ "}"
Members = Member (_ "," _ Member)* (_ ",")?
Member = key:String _ ":" _ value:Value

Array = "[" _ elements:Elements? _ "]"
Elements = Value (_ "," _ Value)* (_ ",")?

String = '"' chars:Char* '"'
Char = Escape / [^"\\\\\\x00-\\x1F]
Escape = "\\\\" ('"' / "\\\\" / "/" / "b" / "f" / "n" / "r" / "t" / "u" Hex Hex Hex Hex)
Hex = [0-9a-fA-F]

Number = "-"? Integer Fraction? Exponent?
Integer = "0" / [1-9] [0-9]*
Fraction = "." [0-9]+
Exponent = ("e" / "E") ("+" / "-")? [0-9]+

Boolean = "true" / "false"
Null = "null"

BOM = "\\uFEFF"

_ = (Whitespace / LineComment / BlockComment)*
Whitespace = [ \\t\\r\\n]+
LineComment = "//" [^\\n]*
BlockComment = "/*" (!"*/" .)* "*/"

EOF = !.
` as const;
