/**
 * L0: SecurityScanner — all 16 rules with positive and negative cases.
 */

import { describe, it, expect } from 'vitest';
import { scan } from '../../src/security/scanner.js';
import { noEval, noFunctionConstructor, noTemplateLiteralInjection, noDynamicImport } from '../../src/security/rules/injection.js';
import { noApiKeys, noTokens, noCredentials, noEnvLeaks } from '../../src/security/rules/secrets.js';
import { noUnvalidatedInput, noMissingTrustLabels, noUrlInjection, noUnboundedInput } from '../../src/security/rules/input.js';
import { noUnredactedPii, noUnvalidatedUrls, noFormatInjection, noChainBypass } from '../../src/security/rules/output.js';

function scanCode(code: string, rules: Parameters<typeof scan>[1]) {
  return scan([{ filePath: 'test.ts', content: code }], rules);
}

// ── Injection Defense (4) ────────────────────────────────────────────────

describe('Rule 1: no-eval', () => {
  it('detects eval() call with critical severity', () => {
    const result = scanCode('const x = eval(userInput);', [noEval]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-eval');
    expect(result.findings[0]!.severity).toBe('critical');
    expect(result.findings[0]!.line).toBeGreaterThan(0);
    expect(result.findings[0]!.remediation.length).toBeGreaterThan(0);
  });

  it('does not flag non-eval calls', () => {
    const result = scanCode('const x = evaluate("safe");', [noEval]);
    expect(result.findings).toHaveLength(0);
  });
});

describe('Rule 2: no-function-constructor', () => {
  it('detects new Function() with critical severity', () => {
    const result = scanCode('const fn = new Function(input);', [noFunctionConstructor]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-function-constructor');
    expect(result.findings[0]!.severity).toBe('critical');
  });

  it('does not flag normal constructors', () => {
    const result = scanCode('const x = new Map();', [noFunctionConstructor]);
    expect(result.findings).toHaveLength(0);
  });
});

describe('Rule 3: no-template-literal-injection', () => {
  it('detects template literal in exec context with high severity', () => {
    const code = 'exec(`SELECT * FROM users WHERE name = \'${userInput}\'`);';
    const result = scanCode(code, [noTemplateLiteralInjection]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-template-literal-injection');
    expect(result.findings[0]!.severity).toBe('high');
  });

  it('does not flag template literals outside dangerous contexts', () => {
    const result = scanCode('const msg = `Hello ${name}`;', [noTemplateLiteralInjection]);
    expect(result.findings).toHaveLength(0);
  });
});

describe('Rule 4: no-dynamic-import', () => {
  it('detects import() with variable argument with high severity', () => {
    const result = scanCode('const mod = import(userPath);', [noDynamicImport]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-dynamic-import');
    expect(result.findings[0]!.severity).toBe('high');
  });

  it('does not flag static import()', () => {
    const result = scanCode('const mod = import("./safe-module");', [noDynamicImport]);
    expect(result.findings).toHaveLength(0);
  });
});

// ── Secret Detection (4) ─────────────────────────────────────────────────

describe('Rule 5: no-api-keys', () => {
  it('detects hardcoded API key pattern with high severity', () => {
    const result = scanCode('const key = "sk-proj-abc123def456ghi789jkl0";', [noApiKeys]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-api-keys');
    expect(result.findings[0]!.severity).toBe('high');
  });

  it('does not flag normal strings', () => {
    const result = scanCode('const msg = "hello world";', [noApiKeys]);
    expect(result.findings).toHaveLength(0);
  });
});

describe('Rule 6: no-tokens', () => {
  it('detects hardcoded bearer token with high severity', () => {
    const result = scanCode('const auth = "Bearer eyJhbGciOiJIUzI1NiJ9.abcdefghijklmn";', [noTokens]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-tokens');
    expect(result.findings[0]!.severity).toBe('high');
  });

  it('does not flag short Bearer values', () => {
    const result = scanCode('const auth = "Bearer short";', [noTokens]);
    expect(result.findings).toHaveLength(0);
  });
});

describe('Rule 7: no-credentials', () => {
  it('detects hardcoded password variable with medium severity', () => {
    const result = scanCode('const password = "hunter2";', [noCredentials]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-credentials');
    expect(result.findings[0]!.severity).toBe('medium');
  });

  it('does not flag non-sensitive variable names', () => {
    const result = scanCode('const username = "admin";', [noCredentials]);
    expect(result.findings).toHaveLength(0);
  });
});

describe('Rule 8: no-env-leaks', () => {
  it('detects process.env logged with medium severity', () => {
    const result = scanCode('console.log(process.env["SECRET_KEY"]);', [noEnvLeaks]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-env-leaks');
    expect(result.findings[0]!.severity).toBe('medium');
  });

  it('does not flag non-env logging', () => {
    const result = scanCode('console.log("hello");', [noEnvLeaks]);
    expect(result.findings).toHaveLength(0);
  });
});

// ── Input Sanitization (4) ───────────────────────────────────────────────

describe('Rule 9: no-unvalidated-input', () => {
  it('detects raw user input passed to tool call with high severity', () => {
    const result = scanCode('toolCall(userInput);', [noUnvalidatedInput]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-unvalidated-input');
    expect(result.findings[0]!.severity).toBe('high');
  });

  it('does not flag validated input', () => {
    const result = scanCode('toolCall(sanitize(userInput));', [noUnvalidatedInput]);
    expect(result.findings).toHaveLength(0);
  });
});

describe('Rule 10: no-missing-trust-labels', () => {
  it('detects agent message without trust annotation with medium severity', () => {
    const result = scanCode('sendMessage("agent-b", { content: "hello" });', [noMissingTrustLabels]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-missing-trust-labels');
    expect(result.findings[0]!.severity).toBe('medium');
  });

  it('does not flag messages with trust level', () => {
    const result = scanCode('sendMessage("agent-b", { content: "hello", trustLevel: "high" });', [noMissingTrustLabels]);
    expect(result.findings).toHaveLength(0);
  });
});

describe('Rule 11: no-url-injection', () => {
  it('detects URL constructed from user input with high severity', () => {
    const result = scanCode('const url = `http://${userDomain}/api`;', [noUrlInjection]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-url-injection');
    expect(result.findings[0]!.severity).toBe('high');
  });

  it('does not flag static URLs', () => {
    const result = scanCode('const url = "https://api.example.com";', [noUrlInjection]);
    expect(result.findings).toHaveLength(0);
  });
});

describe('Rule 12: no-unbounded-input', () => {
  it('detects handler without length check with medium severity', () => {
    const code = 'function handleRequest(input: string) { return input.toUpperCase(); }';
    const result = scanCode(code, [noUnboundedInput]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-unbounded-input');
    expect(result.findings[0]!.severity).toBe('medium');
  });

  it('does not flag handlers with length validation', () => {
    const code = 'function handleRequest(input: string) { if (input.length > 1024) throw new Error("too long"); return input; }';
    const result = scanCode(code, [noUnboundedInput]);
    expect(result.findings).toHaveLength(0);
  });
});

// ── Output Validation (4) ────────────────────────────────────────────────

describe('Rule 13: no-unredacted-pii', () => {
  it('detects email/phone in return with high severity', () => {
    const result = scanCode('function f() { return "Contact: john@example.com"; }', [noUnredactedPii]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-unredacted-pii');
    expect(result.findings[0]!.severity).toBe('high');
  });

  it('does not flag clean return values', () => {
    const result = scanCode('function f() { return "Hello world"; }', [noUnredactedPii]);
    expect(result.findings).toHaveLength(0);
  });
});

describe('Rule 14: no-unvalidated-urls', () => {
  it('detects URL in return with variable component with medium severity', () => {
    const code = 'function f(path: string) { return `https://api.example.com/${path}`; }';
    const result = scanCode(code, [noUnvalidatedUrls]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-unvalidated-urls');
    expect(result.findings[0]!.severity).toBe('medium');
  });

  it('does not flag static URL returns', () => {
    const result = scanCode('function f() { return "https://api.example.com/safe"; }', [noUnvalidatedUrls]);
    expect(result.findings).toHaveLength(0);
  });
});

describe('Rule 15: no-format-injection', () => {
  it('detects user input in JSON.stringify with medium severity', () => {
    const result = scanCode('JSON.stringify(userInput);', [noFormatInjection]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-format-injection');
    expect(result.findings[0]!.severity).toBe('medium');
  });

  it('does not flag safe data in stringify', () => {
    const result = scanCode('JSON.stringify({ name: "safe" });', [noFormatInjection]);
    expect(result.findings).toHaveLength(0);
  });
});

describe('Rule 16: no-chain-bypass', () => {
  it('detects skipValidation = true with high severity', () => {
    const result = scanCode('const skipValidation = true;', [noChainBypass]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.rule).toBe('no-chain-bypass');
    expect(result.findings[0]!.severity).toBe('high');
  });

  it('does not flag normal boolean variables', () => {
    const result = scanCode('const isEnabled = true;', [noChainBypass]);
    expect(result.findings).toHaveLength(0);
  });
});
