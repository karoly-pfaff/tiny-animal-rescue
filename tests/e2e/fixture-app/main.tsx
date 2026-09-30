import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { MatchFixture } from './match-fixture';
import { MapFixture } from './map-fixture';
import { PrimitiveSuite } from './primitive-suite';
import { TraceFixture } from './trace-fixture';
import { WipeFixture } from './wipe-fixture';
import { parseProgressionSeedName } from '../../support/progression-content';
import './style.css';

const rootElement = document.querySelector('#root');

if (!(rootElement instanceof HTMLElement)) {
  throw new Error('Fixture root element is missing.');
}

function fixtureFor(search: string) {
  const parameters = new URLSearchParams(search);
  const fixture = parameters.get('fixture');
  if (fixture === 'map') {
    return (
      <MapFixture
        locale={parameters.get('locale') === 'en' ? 'en' : 'hu'}
        seed={parseProgressionSeedName(parameters.get('seed'))}
      />
    );
  }
  if (fixture === 'match') {
    return <MatchFixture />;
  }
  if (fixture === 'trace') {
    return <TraceFixture />;
  }
  if (fixture === 'suite') {
    return <PrimitiveSuite />;
  }
  return <WipeFixture />;
}

createRoot(rootElement).render(<StrictMode>{fixtureFor(window.location.search)}</StrictMode>);
