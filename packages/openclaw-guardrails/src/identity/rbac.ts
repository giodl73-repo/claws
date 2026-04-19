/**
 * @bic/openclaw-guardrails/identity — Role-based access control (RBAC).
 *
 * Maps identities to roles via group membership; checks whether a given
 * role set grants access to a resource + action pair. Wildcard '*' allows
 * all actions on a resource.
 */

import type {
  AccessDecision,
  TokenIdentity,
  Permission,
  Role,
} from './types.js';

export interface RoleStore {
  roles: Map<string, Role>;
  groupMappings: Map<string, string[]>;
}

export function createRoleStore(): RoleStore {
  return {
    roles: new Map(),
    groupMappings: new Map(),
  };
}

export function addRole(store: RoleStore, role: Role): RoleStore {
  const roles = new Map(store.roles);
  roles.set(role.name, role);
  return { ...store, roles };
}

export function mapGroup(
  store: RoleStore,
  group: string,
  roleNames: string[],
): RoleStore {
  const groupMappings = new Map(store.groupMappings);
  groupMappings.set(group, roleNames);
  return { ...store, groupMappings };
}

export function resolveRoles(store: RoleStore, identity: TokenIdentity): Role[] {
  const roleNames = new Set<string>();

  for (const group of identity.groups) {
    const mapped = store.groupMappings.get(group);
    if (mapped) {
      for (const name of mapped) {
        roleNames.add(name);
      }
    }
  }

  const roles: Role[] = [];
  for (const name of roleNames) {
    const role = store.roles.get(name);
    if (role) {
      roles.push(role);
    }
  }

  return roles;
}

export function checkAccess(roles: Role[], required: Permission): AccessDecision {
  for (const role of roles) {
    for (const perm of role.permissions) {
      if (
        perm.resource === required.resource &&
        (perm.action === required.action || perm.action === '*')
      ) {
        return {
          granted: true,
          grantedBy: role.name,
        };
      }
    }
  }

  return {
    granted: false,
    reason: `No role grants "${required.action}" on "${required.resource}"`,
  };
}

export function authorize(
  store: RoleStore,
  identity: TokenIdentity,
  required: Permission,
): AccessDecision {
  const roles = resolveRoles(store, identity);
  if (roles.length === 0) {
    return {
      granted: false,
      reason: `No roles resolved for subject "${identity.subject}"`,
    };
  }
  return checkAccess(roles, required);
}
