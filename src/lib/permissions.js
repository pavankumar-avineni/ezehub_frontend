// Platform permission codes. Access is decided by these codes, never by role names.
export const PERM = {
  TENANTS_READ: 'tenants:read',
  TENANTS_CREATE: 'tenants:create',
  TENANTS_UPDATE: 'tenants:update',
  TENANTS_SUSPEND: 'tenants:suspend',
  TENANTS_ACTIVATE: 'tenants:activate',
  TENANTS_DELETE: 'tenants:delete',
  ANALYTICS: 'platform:analytics',
  SUPPORT: 'platform:support',
  EMPLOYEES_READ: 'platform:employees:read',
  EMPLOYEES_MANAGE: 'platform:employees:manage',
  ROLES_MANAGE: 'platform:roles:manage',
  AUDIT_READ: 'platform:audit:read',
  REPORTS_READ: 'platform:reports:read',
  VIEW_ALL_TENANTS: 'platform:tenants:view_all',
  ASSIGN_TENANTS: 'platform:tenants:assign',
  BILLING_READ: 'platform:billing:read',
  BILLING_MANAGE: 'platform:billing:manage',
  PRICING_MANAGE: 'platform:pricing:manage',
};

export const has = (permissions, code) => Array.isArray(permissions) && permissions.includes(code);
export const hasAny = (permissions, codes) => codes.some((c) => has(permissions, c));

/** Permissions a role would add that the current user does not hold. */
export const missingPermissions = (userPermissions, rolePermissions) =>
  (rolePermissions || []).map((p) => p.code || p).filter((code) => !has(userPermissions, code));
