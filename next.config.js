/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  // Enable static HTML export for deployment to any web host
  output: 'export',

  reactStrictMode: true,

  // Add trailing slashes to URLs for better compatibility
  trailingSlash: true,

  // Required for static export: disable image optimization
  images: {
    unoptimized: true,
  },

  sassOptions: {
    includePaths: [path.join(__dirname, 'styles')],
  },

  // Set NEXT_PUBLIC_BASE_PATH when the export is served under a path prefix rather than at the site root.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
}

export default nextConfig;
