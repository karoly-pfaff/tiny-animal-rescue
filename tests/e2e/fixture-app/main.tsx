import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { WipeFixture } from './wipe-fixture';
import './style.css';

const rootElement = document.querySelector('#root');

if (!(rootElement instanceof HTMLElement)) {
  throw new Error('Fixture root element is missing.');
}

createRoot(rootElement).render(
  <StrictMode>
    <WipeFixture />
  </StrictMode>,
);
