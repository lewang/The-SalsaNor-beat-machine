/*
 * Next prefixes the routes and bundles it manages with the deployment's basePath, but a raw <a href="/…"> or a
 * <link href="/…"> in Head is passed through untouched — those point at the server root and 404 under a prefix.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function withBasePath(path: string): string {
  return `${BASE_PATH}${path}`;
}
