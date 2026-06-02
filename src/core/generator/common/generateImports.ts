export function generateImports(imports: Set<string>): string {
  return [...imports]
    .sort()
    .map(x => `import ${x};`)
    .join("\n");
}