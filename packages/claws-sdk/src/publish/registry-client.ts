/**
 * Registry client — publish, query, and validate packages for ClawHub.
 *
 * Business logic for registry interactions lives here in the SDK,
 * not in the CLI. The CLI imports this module as a thin adapter.
 *
 * @module claws-sdk/publish/registry-client
 */

/**
 * A package ready for publish to ClawHub.
 */
export interface RegistryPackage {
  /** Package name (e.g. "@openclaw/audit-chain"). */
  readonly name: string;
  /** Semantic version string. */
  readonly version: string;
  /** Package description. */
  readonly description: string;
  /** Package contents as serialized artifacts. */
  readonly artifacts: readonly RegistryArtifact[];
  /** Content hash for integrity verification. */
  readonly contentHash: string;
  /** Optional signing key ID used to sign the package. */
  readonly signingKeyId?: string;
}

/**
 * A single artifact within a registry package.
 */
export interface RegistryArtifact {
  /** Artifact file name. */
  readonly name: string;
  /** Artifact content. */
  readonly content: string;
}

/**
 * Credentials for authenticating with ClawHub.
 */
export interface RegistryCredentials {
  /** API token for registry authentication. */
  readonly token: string;
  /** Registry endpoint URL. */
  readonly endpoint: string;
}

/**
 * Result of a publish operation.
 */
export interface PublishResult {
  /** Whether the publish succeeded. */
  readonly success: boolean;
  /** Published package name and version (on success). */
  readonly published?: string;
  /** Error message (on failure). */
  readonly error?: string;
  /** HTTP status code from the registry. */
  readonly statusCode?: number;
}

/**
 * A registry query for searching packages.
 */
export interface RegistryQuery {
  /** Search term (name substring or keyword). */
  readonly term: string;
  /** Maximum results to return. Default: 20. */
  readonly limit?: number;
  /** Offset for pagination. Default: 0. */
  readonly offset?: number;
}

/**
 * A single result from a registry query.
 */
export interface RegistryQueryResult {
  /** Package name. */
  readonly name: string;
  /** Latest version. */
  readonly version: string;
  /** Package description. */
  readonly description: string;
  /** Download count. */
  readonly downloads: number;
}

/**
 * Result of querying the registry.
 */
export interface QueryResult {
  /** Whether the query succeeded. */
  readonly success: boolean;
  /** Matching packages. */
  readonly results: readonly RegistryQueryResult[];
  /** Total count of matches (may exceed returned results). */
  readonly totalCount: number;
  /** Error message (on failure). */
  readonly error?: string;
}

/**
 * Validation issue found in a package before publish.
 */
export interface PackageValidationIssue {
  /** Issue severity. */
  readonly severity: 'error' | 'warning';
  /** Human-readable message. */
  readonly message: string;
  /** Field or artifact that has the issue. */
  readonly field: string;
}

/**
 * Result of package validation before publish.
 */
export interface PackageValidationResult {
  /** Whether the package is valid for publish. */
  readonly valid: boolean;
  /** Validation issues found. */
  readonly issues: readonly PackageValidationIssue[];
}

/**
 * Check whether a registry endpoint URL is safe for Bearer token auth.
 *
 * HTTPS is required when sending Bearer tokens, except for localhost
 * and 127.0.0.1 (dev/test environments).
 *
 * @throws Error if the endpoint is non-HTTPS and not localhost
 */
function requireSecureEndpoint(endpoint: string): void {
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error(`Invalid registry endpoint URL: ${endpoint}`);
  }
  const isHttps = parsed.protocol === 'https:';
  const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (!isHttps && !isLocalhost) {
    throw new Error(
      `Bearer token auth requires HTTPS. Endpoint "${endpoint}" is not secure. ` +
      'HTTP is only allowed for localhost/127.0.0.1 during development.',
    );
  }
}

/**
 * Validate a package for publish to ClawHub.
 *
 * Checks:
 * - Package name is non-empty and follows naming convention
 * - Version is a valid semver string
 * - At least one artifact is present
 * - Content hash is non-empty
 * - No artifact has empty content
 */
export function validatePackageForPublish(
  pkg: RegistryPackage,
): PackageValidationResult {
  const issues: PackageValidationIssue[] = [];

  // Name validation
  if (!pkg.name || pkg.name.trim().length === 0) {
    issues.push({
      severity: 'error',
      message: 'Package name is required.',
      field: 'name',
    });
  } else if (!/^@?[\w-]+\/[\w-]+$|^[\w-]+$/.test(pkg.name)) {
    issues.push({
      severity: 'warning',
      message: `Package name "${pkg.name}" does not follow naming convention (@scope/name or name).`,
      field: 'name',
    });
  }

  // Version validation (basic semver check)
  if (!pkg.version || pkg.version.trim().length === 0) {
    issues.push({
      severity: 'error',
      message: 'Package version is required.',
      field: 'version',
    });
  } else if (!/^\d+\.\d+\.\d+/.test(pkg.version)) {
    issues.push({
      severity: 'error',
      message: `Invalid version "${pkg.version}" — must follow semver (e.g. 1.0.0).`,
      field: 'version',
    });
  }

  // Artifacts validation
  if (pkg.artifacts.length === 0) {
    issues.push({
      severity: 'error',
      message: 'Package must contain at least one artifact.',
      field: 'artifacts',
    });
  }

  for (const artifact of pkg.artifacts) {
    if (!artifact.content || artifact.content.length === 0) {
      issues.push({
        severity: 'error',
        message: `Artifact "${artifact.name}" has empty content.`,
        field: `artifacts.${artifact.name}`,
      });
    }
  }

  // Content hash validation
  if (!pkg.contentHash || pkg.contentHash.trim().length === 0) {
    issues.push({
      severity: 'error',
      message: 'Content hash is required for integrity verification.',
      field: 'contentHash',
    });
  }

  return {
    valid: issues.every((i) => i.severity !== 'error'),
    issues,
  };
}

/**
 * Publish a package to ClawHub.
 *
 * Validates the package first, then submits to the registry endpoint.
 * Returns a descriptive error if validation fails or the registry rejects.
 *
 * @param pkg - Package to publish
 * @param credentials - Registry authentication credentials
 */
export async function publishToRegistry(
  pkg: RegistryPackage,
  credentials: RegistryCredentials,
): Promise<PublishResult> {
  // Enforce HTTPS when sending Bearer tokens
  requireSecureEndpoint(credentials.endpoint);

  // Pre-publish validation
  const validation = validatePackageForPublish(pkg);
  if (!validation.valid) {
    const errorMessages = validation.issues
      .filter((i) => i.severity === 'error')
      .map((i) => i.message);
    return {
      success: false,
      error: `Package validation failed: ${errorMessages.join('; ')}`,
    };
  }

  // Submit to registry
  try {
    const response = await fetch(`${credentials.endpoint}/v1/packages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.token}`,
      },
      body: JSON.stringify({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        artifacts: pkg.artifacts,
        contentHash: pkg.contentHash,
        signingKeyId: pkg.signingKeyId,
      }),
    });

    if (response.ok) {
      return {
        success: true,
        published: `${pkg.name}@${pkg.version}`,
        statusCode: response.status,
      };
    }

    const body = await response.text().catch(() => '');
    return {
      success: false,
      error: `Registry returned ${response.status}: ${body}`,
      statusCode: response.status,
    };
  } catch (err) {
    return {
      success: false,
      error: `Registry request failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Query the ClawHub registry for packages.
 *
 * @param query - Search query parameters
 * @param credentials - Registry authentication credentials
 */
export async function queryRegistry(
  query: RegistryQuery,
  credentials: RegistryCredentials,
): Promise<QueryResult> {
  // Enforce HTTPS when sending Bearer tokens
  requireSecureEndpoint(credentials.endpoint);

  try {
    const params = new URLSearchParams({
      q: query.term,
      limit: String(query.limit ?? 20),
      offset: String(query.offset ?? 0),
    });

    const response = await fetch(
      `${credentials.endpoint}/v1/packages/search?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.token}`,
        },
      },
    );

    if (!response.ok) {
      return {
        success: false,
        results: [],
        totalCount: 0,
        error: `Registry returned ${response.status}`,
      };
    }

    const data = await response.json() as {
      results: readonly RegistryQueryResult[];
      totalCount: number;
    };

    return {
      success: true,
      results: data.results ?? [],
      totalCount: data.totalCount ?? 0,
    };
  } catch (err) {
    return {
      success: false,
      results: [],
      totalCount: 0,
      error: `Registry query failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
