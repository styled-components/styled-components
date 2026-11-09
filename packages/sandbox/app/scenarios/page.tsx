import Link from 'next/link';

import { routes } from './routes';

export default function Page() {
  return (
    <div>
      <h1 style={{ fontSize: 20 }}>Style order scenarios</h1>
      <p style={{ fontSize: 14 }}>
        Each page marks the elements to check with <code>data-expected</code>, the computed value
        the element must have.
      </p>
      <ul style={{ fontSize: 14, lineHeight: 1.8 }}>
        {routes.map(route => (
          <li key={route.href}>
            <Link href={`/scenarios/${route.href}`}>{route.href}</Link> ({route.rows}): {route.what}
          </li>
        ))}
      </ul>
    </div>
  );
}
