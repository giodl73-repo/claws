/**
 * Vulnerable skill handler — multiple security findings expected.
 *
 * Contains intentional vulnerability patterns for testing:
 * - Injection: eval, new Function, template literal injection, dynamic import
 * - Secrets: API key, bearer token, hardcoded password, env leak
 * - Input: unvalidated input, missing trust labels, URL injection, unbounded input
 * - Output: unredacted PII, unvalidated URLs, format injection, chain bypass
 */

// Secret: hardcoded API key (Rule 5: no-api-keys)
const apiKey = "sk-proj-abc123def456ghi789jkl012mno345pqr678stu901";

// Secret: hardcoded token (Rule 6: no-tokens)
const authHeader = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc123";

// Secret: hardcoded password (Rule 7: no-credentials)
const password = "hunter2SuperSecret";

// Injection: eval (Rule 1: no-eval)
function unsafeEval(userInput: string) {
  return eval(userInput);
}

// Injection: Function constructor (Rule 2: no-function-constructor)
function unsafeFunction(code: string) {
  return new Function(code);
}

// Injection: template literal in exec context (Rule 3: no-template-literal-injection)
function unsafeQuery(userInput: string) {
  return exec(`SELECT * FROM users WHERE name = '${userInput}'`);
}

// Injection: dynamic import (Rule 4: no-dynamic-import)
async function unsafeImport(userPath: string) {
  return import(userPath);
}

// Secret: env leak (Rule 8: no-env-leaks)
function leakEnv() {
  // nosemgrep: javascript.lang.security.audit.unsafe-logging
  console.log(process.env['SECRET_KEY']); // CodeQL[js/clear-text-logging] — intentional: this fixture exists to test SecurityScanner detection of exactly this pattern
}

// Input: unvalidated input to tool call (Rule 9: no-unvalidated-input)
function unsafeToolCall(userInput: string) {
  return toolCall(userInput);
}

// Input: missing trust labels (Rule 10: no-missing-trust-labels)
function unsafeMessage() {
  return sendMessage('agent-b', { content: 'hello' });
}

// Input: URL injection (Rule 11: no-url-injection)
function unsafeUrl(userDomain: string) {
  return `http://${userDomain}/api/data`;
}

// Input: unbounded input (Rule 12: no-unbounded-input)
function handleRequest(input: string) {
  return input.toUpperCase();
}

// Output: unredacted PII (Rule 13: no-unredacted-pii)
function returnPii() {
  return "Contact: john@example.com, 555-123-4567";
}

// Output: unvalidated URL return (Rule 14: no-unvalidated-urls)
function returnUrl(path: string) {
  return `https://api.example.com/${path}`;
}

// Output: format injection (Rule 15: no-format-injection)
function unsafeFormat(userInput: string) {
  return JSON.stringify(userInput);
}

// Output: chain bypass (Rule 16: no-chain-bypass)
const skipValidation = true;

// Stubs for functions referenced above
declare function exec(cmd: string): unknown;
declare function toolCall(input: string): unknown;
declare function sendMessage(target: string, msg: Record<string, unknown>): unknown;
