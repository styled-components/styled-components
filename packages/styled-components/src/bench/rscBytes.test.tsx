/**
 * RSC output sizes for styled-components, through the two-graph harness.
 *
 * Run: pnpm --filter styled-components exec jest -c jest.config.bench-rsc.js --no-coverage src/bench/rscBytes.test.tsx
 *
 * Reports the bytes a server component page sends in each form: the Flight payload, the HTML
 * the SSR graph writes, and the part of that HTML the style registry holds.
 */

import React from 'react';
import { renderPage, styleTags } from '../test/rscStream';

const COLORS = ['red', 'blue', 'green', 'orange', 'purple'];

describe('RSC output size', () => {
  it('reports the bytes of 50 cards with 5 badge variants', async () => {
    const page = await renderPage({
      server: ({ library: { styled } }) => {
        const Card = styled.div`
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 24px;
        `;
        const Badge = styled.span<{ $variant: string }>`
          color: ${p => p.$variant};
          padding: 4px 8px;
        `;

        return (
          <div>
            {Array.from({ length: 50 }, (_, index) => (
              <Card key={index}>
                <Badge $variant={COLORS[index % COLORS.length]}>tag</Badge>
              </Card>
            ))}
          </div>
        );
      },
    });
    const registryBytes = styleTags(page.streamed).reduce((sum, tag) => sum + tag.length, 0);

    console.log('\n--- Output size ---');
    console.log('  50 cards with 5 badge variants:');
    console.log(`    Flight payload: ${page.flight.payload.length}`);
    console.log(`    Total HTML: ${page.streamed.length}`);
    console.log(`    Registry style bytes: ${registryBytes}`);
    console.log(
      `    Style overhead: ${((registryBytes / page.streamed.length) * 100).toFixed(1)}%`
    );

    expect(page.flight.errors).toEqual([]);
  });
});
