/** Node ESM 解析补上相对路径的 .ts，供 check:figure 自检。 */
export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith('.') || specifier.startsWith('/')) &&
    !/\.[a-zA-Z0-9]+$/.test(specifier.split('?')[0] ?? specifier)
  ) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      /* fall through */
    }
  }
  return nextResolve(specifier, context);
}
