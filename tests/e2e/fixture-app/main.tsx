import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { MatchFixture } from './match-fixture';
import { WipeFixture } from './wipe-fixture';
import './style.css';

const rootElement = document.querySelector('#root');

if (!(rootElement instanceof HTMLElement)) {
  throw new Error('Fixture root element is missing.');
}

const fixture = window.location.search === '?fixture=match' ? <MatchFixture /> : <WipeFixture />;

createRoot(rootElement).render(<StrictMode>{fixture}</StrictMode>);
