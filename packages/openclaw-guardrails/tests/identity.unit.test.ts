/**
 * /identity — OIDC verify + OBO exchange + revocation (6 L0 unit tests per pulse 48).
 */

import { describe, expect, test } from "vitest";
import {
  addRole,
  authorize,
  checkAccess,
  createRevocationCache,
  createRoleStore,
  exchangeOboToken,
  isRevoked,
  mapGroup,
  resolveIdentity,
  resolveRoles,
  revokePrincipal,
  validateOidc,
  validateSaml,
} from "../src/identity/index.js";
import type { TokenPayload } from "../src/identity/index.js";

function makeToken(overrides: Partial<TokenPayload> = {}): TokenPayload {
  return {
    sub: "alice",
    iss: "https://login.example.com",
    aud: "openclaw-host",
    exp: 2_000_000_000,
    iat: 1_800_000_000,
    email: "alice@example.com",
    name: "Alice",
    groups: ["eng", "admin"],
    ...overrides,
  };
}

describe("/identity — OIDC + OBO + revocation (6 L0)", () => {
  test("validateOidc accepts a well-formed token, resolves identity", () => {
    const result = validateOidc(
      makeToken(),
      {
        issuer: "https://login.example.com",
        audience: "openclaw-host",
      },
      new Date(1_900_000_000 * 1000),
    );
    expect(result.valid).toBe(true);
    expect(result.identity?.subject).toBe("alice");
    expect(result.identity?.protocol).toBe("oidc");
    expect(result.identity?.groups).toEqual(["eng", "admin"]);
  });

  test("validateOidc rejects expired token", () => {
    const token = makeToken({ exp: 1_000_000_000 });
    const result = validateOidc(
      token,
      {
        issuer: "https://login.example.com",
        audience: "openclaw-host",
      },
      new Date(2_000_000_000 * 1000),
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("expired");
  });

  test("validateOidc rejects issuer / audience mismatches", () => {
    const r1 = validateOidc(
      makeToken({ iss: "https://evil.example.com" }),
      {
        issuer: "https://login.example.com",
        audience: "openclaw-host",
      },
      new Date(1_900_000_000 * 1000),
    );
    expect(r1.valid).toBe(false);
    expect(r1.error).toContain("Issuer");

    const r2 = validateOidc(
      makeToken({ aud: "wrong-audience" }),
      {
        issuer: "https://login.example.com",
        audience: "openclaw-host",
      },
      new Date(1_900_000_000 * 1000),
    );
    expect(r2.valid).toBe(false);
    expect(r2.error).toContain("Audience");
  });

  test("exchangeOboToken returns an OBO token (default fn + custom fn)", async () => {
    const defaultObo = await exchangeOboToken("user-token", "agent-42");
    expect(defaultObo).toContain("agent-42");

    const customObo = await exchangeOboToken("x", "y", async (u, a) => `custom:${u}:${a}`);
    expect(customObo).toBe("custom:x:y");

    await expect(exchangeOboToken("", "agent-1")).rejects.toThrow("userToken");
    await expect(exchangeOboToken("user-token", "")).rejects.toThrow("agentId");
  });

  test("revocation cache: revokePrincipal + isRevoked", () => {
    let cache = createRevocationCache();
    expect(isRevoked(cache, "alice")).toBe(false);
    cache = revokePrincipal(cache, "alice");
    expect(isRevoked(cache, "alice")).toBe(true);
    expect(isRevoked(cache, "bob")).toBe(false);
  });

  test("authorize: resolve roles via groups, grant matching permission", () => {
    let store = createRoleStore();
    store = addRole(store, {
      name: "admin",
      permissions: [{ resource: "snapshot", action: "promote" }],
    });
    store = mapGroup(store, "admin", ["admin"]);

    const identity = resolveIdentity(makeToken(), "oidc");
    const decision = authorize(store, identity, { resource: "snapshot", action: "promote" });
    expect(decision.granted).toBe(true);
    expect(decision.grantedBy).toBe("admin");
  });
});

describe("/identity — RBAC coverage fill", () => {
  test("validateSaml tags protocol as saml", () => {
    const r = validateSaml(
      makeToken(),
      {
        issuer: "https://login.example.com",
        audience: "openclaw-host",
      },
      new Date(1_900_000_000 * 1000),
    );
    expect(r.valid).toBe(true);
    expect(r.identity?.protocol).toBe("saml");
  });

  test("validateOidc rejects not-yet-valid nbf", () => {
    const token = makeToken({ nbf: 2_100_000_000, iat: 1_800_000_000 });
    const r = validateOidc(
      token,
      {
        issuer: "https://login.example.com",
        audience: "openclaw-host",
      },
      new Date(1_900_000_000 * 1000),
    );
    expect(r.valid).toBe(false);
    expect(r.error).toContain("not yet valid");
  });

  test("checkAccess supports wildcard action", () => {
    const role = {
      name: "root",
      permissions: [{ resource: "workspace", action: "*" }],
    };
    expect(checkAccess([role], { resource: "workspace", action: "read" }).granted).toBe(true);
    expect(checkAccess([role], { resource: "workspace", action: "write" }).granted).toBe(true);
    expect(checkAccess([role], { resource: "agent", action: "read" }).granted).toBe(false);
  });

  test("authorize denies when no roles resolve for identity", () => {
    const store = createRoleStore();
    const id = resolveIdentity(makeToken({ groups: [] }), "oidc");
    const d = authorize(store, id, { resource: "x", action: "r" });
    expect(d.granted).toBe(false);
    expect(d.reason).toContain("No roles resolved");
  });

  test("resolveRoles skips unmapped groups and missing role definitions", () => {
    let store = createRoleStore();
    store = mapGroup(store, "engineer", ["dev"]);
    const id = resolveIdentity(makeToken({ groups: ["engineer", "unknown"] }), "oidc");
    expect(resolveRoles(store, id)).toEqual([]); // dev role not defined
  });

  test("checkAccess denies with explicit reason", () => {
    const role = { name: "reader", permissions: [{ resource: "x", action: "r" }] };
    const d = checkAccess([role], { resource: "y", action: "r" });
    expect(d.granted).toBe(false);
    expect(d.reason).toContain("No role grants");
  });
});
