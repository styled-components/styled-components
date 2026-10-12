import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { sep } from 'node:path';
import type { NextConfig } from 'next';

/**
 * pnpm's global virtual store (virtualStoreType: global) keeps every installed package, `next`
 * included, outside the repository. Turbopack follows those symlinks only into an additional
 * root, so the store's `links` folder is added when `next` resolves into one.
 */
const storeMarker = `${sep}links${sep}`;
const realNextPath = realpathSync(createRequire(import.meta.url).resolve('next/package.json'));
const storeMarkerAt = realNextPath.indexOf(storeMarker);

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true,
  },
  experimental: {
    turbopackAdditionalRoots:
      storeMarkerAt === -1
        ? {}
        : { pnpmStore: { path: realNextPath.slice(0, storeMarkerAt + storeMarker.length - 1) } },
  },
};

export default nextConfig;
