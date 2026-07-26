export async function resolve(specifier, context, nextResolve) {
  const resolved = await nextResolve(specifier, context);
  if (specifier.includes("runtime-prepare") || resolved.url.includes("runtime-prepare")) {
    process.stderr.write(`[proof-loader] runtime-prepare loaded: ${resolved.url}\n`);
  }
  return resolved;
}
