import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { MatchFixture } from './match-fixture';
import { PrimitiveSuite } from './primitive-suite';
import { TraceFixture } from './trace-fixture';
import { WipeFixture } from './wipe-fixture';
import './style.css';

const rootElement = document.querySelector('#root');

if (!(rootElement instanceof HTMLElement)) {
  throw new Error('Fixture root element is missing.');
}

function fixtureFor(search: string) {
  if (search === '?fixture=match') {
    return <MatchFixture />;
  }
  if (search === '?fixture=trace') {
    return <TraceFixture />;
  }
  if (search === '?fixture=suite') {
    return <PrimitiveSuite />;
  }
  return <WipeFixture />;
}

createRoot(rootElement).render(<StrictMode>{fixtureFor(window.location.search)}</StrictMode>);
