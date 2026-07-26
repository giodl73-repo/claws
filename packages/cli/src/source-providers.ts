import { CliError } from "./errors.js";
import { parseExactGitHubCoordinate, resolveGitHubSource } from "./github-source.js";
import {
  parseExactClawHubCoordinate,
  resolveClawHubSource,
  type RemoteSourceOptions,
} from "./remote-source.js";
import { inspectLocalPackage } from "./source.js";
import type { LocalClawPackage } from "./types.js";

export type SourceProvider = {
  id: string;
  matches(input: string): boolean;
  resolve(input: string, options: RemoteSourceOptions): Promise<LocalClawPackage>;
};

const hasProviderPrefix = (input: string): boolean =>
  !/^[A-Za-z]:/.test(input) && /^[a-z][a-z0-9+.-]*:/i.test(input);

export const builtInSourceProviders: readonly SourceProvider[] = [
  {
    id: "clawhub",
    matches: (input) => input.startsWith("clawhub:"),
    resolve: async (input, options) =>
      resolveClawHubSource(parseExactClawHubCoordinate(input)!, options),
  },
  {
    id: "github",
    matches: (input) => input.startsWith("github:"),
    resolve: async (input, options) =>
      resolveGitHubSource(parseExactGitHubCoordinate(input)!, options),
  },
  {
    id: "local",
    matches: (input) => !hasProviderPrefix(input),
    resolve: async (input) => inspectLocalPackage(input),
  },
];

export function selectSourceProvider(
  input: string,
  providers: readonly SourceProvider[] = builtInSourceProviders,
): SourceProvider {
  const ids = new Set<string>();
  for (const provider of providers) {
    if (!provider.id || ids.has(provider.id)) {
      throw new Error(`Source provider ids must be non-empty and unique: ${provider.id}`);
    }
    ids.add(provider.id);
  }
  const matches = providers.filter((provider) => provider.matches(input));
  if (matches.length !== 1) {
    throw new CliError({
      code: matches.length === 0 ? "unknown_source_provider" : "ambiguous_source_provider",
      phase: "source",
      message:
        matches.length === 0
          ? `No source provider accepts ${input}.`
          : `More than one source provider accepts ${input}.`,
      path: input,
    });
  }
  return matches[0]!;
}

export async function inspectClawSource(
  input: string,
  options: RemoteSourceOptions = {},
  providers: readonly SourceProvider[] = builtInSourceProviders,
): Promise<LocalClawPackage> {
  return selectSourceProvider(input, providers).resolve(input, options);
}
