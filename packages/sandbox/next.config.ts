import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { sep } from 'node:path';

import type { NextConfig } from 'next';

const storeMarker = `${sep}links${sep}`;
const realNextPath = realpathSync(createRequire(import.meta.url).resolve('next/package.json'));
const storeMarkerAt = realNextPath.indexOf(storeMarker);

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true,
  },
  experimental: {
    // Turbopack only compiles files under its root. With pnpm's global virtual
    // store the installed packages live outside the repository, so the store is
    // added as a root.
    turbopackAdditionalRoots:
      storeMarkerAt === -1
        ? {}
        : { pnpmStore: { path: realNextPath.slice(0, storeMarkerAt + storeMarker.length - 1) } },
  },
};

export default nextConfig;
