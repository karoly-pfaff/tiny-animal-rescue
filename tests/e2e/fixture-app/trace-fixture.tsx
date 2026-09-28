import { useState } from 'react';

import { Trace } from '../../../sources/interactions/trace';
import { fixtureTracePath } from './trace-fixture-path';

export function TraceFixture() {
  const [completionCount, setCompletionCount] = useState(0);
  return (
    <main className="interaction-demo" data-completion-count={completionCount}>
      <div className="interaction-demo-surface trace-demo-surface">
        <Trace
          accessibleLabel="Guide the turtle to the pond"
          corridorColor="#f2d69a"
          corridorWidth={0.18}
          endAffordance={<span className="fixture-trace-pond" />}
          onComplete={() => {
            setCompletionCount((current) => current + 1);
          }}
          path={fixtureTracePath}
          progressColor="#65a986"
          startAffordance={<span className="fixture-trace-start" />}
          tracer={<span className="fixture-trace-turtle" />}
        />
      </div>
    </main>
  );
}
