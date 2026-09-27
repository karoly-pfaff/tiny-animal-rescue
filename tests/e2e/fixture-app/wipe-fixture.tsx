import { useState } from 'react';

import { WipeClean } from '../../../sources/interactions/wipe-clean';

const completionThreshold = 0.7;

export function WipeFixture() {
  const [completionCount, setCompletionCount] = useState(0);
  return (
    <main className="interaction-demo" data-completion-count={completionCount}>
      <div className="interaction-demo-surface">
        <WipeClean
          accessibleLabel="Wipe the surface clean"
          brushRadius={0.1}
          columns={64}
          completionThreshold={completionThreshold}
          maskColor="#7b6048"
          onComplete={() => {
            setCompletionCount((current) => current + 1);
          }}
          rows={64}
          underlay={
            <span className="interaction-demo-underlay">
              <span className="interaction-demo-paw interaction-demo-paw-main" />
              <span className="interaction-demo-paw interaction-demo-paw-one" />
              <span className="interaction-demo-paw interaction-demo-paw-two" />
              <span className="interaction-demo-paw interaction-demo-paw-three" />
            </span>
          }
        />
      </div>
    </main>
  );
}
