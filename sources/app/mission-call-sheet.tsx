import type { CSSProperties } from 'react';

import type { MissionCallContent } from '../content/mission-call-content';
import { MapLandmarkIcon } from './map-landmark-icon';

export function MissionCallSheet({
  calls,
  closeLabel,
  featuredMissionId,
  onClose,
  onOpenMission,
}: Readonly<{
  calls: readonly MissionCallContent[];
  closeLabel: string;
  featuredMissionId: string | null;
  onClose: () => void;
  onOpenMission: (missionId: string) => void;
}>) {
  const firstCall = calls[0];
  if (firstCall === undefined) {
    return null;
  }
  return (
    <section
      aria-label={firstCall.locationName}
      className="mission-call-sheet"
      data-location-id={firstCall.locationId}
    >
      <button
        aria-label={closeLabel}
        className="mission-call-close"
        onClick={onClose}
        type="button"
      >
        <span aria-hidden="true" className="mission-call-close-icon" />
      </button>
      <div className="mission-call-list">
        {calls.map((call) => (
          <MissionCallCard
            call={call}
            featured={call.id === featuredMissionId}
            key={call.id}
            onOpen={onOpenMission}
          />
        ))}
      </div>
    </section>
  );
}

function MissionCallCard({
  call,
  featured,
  onOpen,
}: Readonly<{
  call: MissionCallContent;
  featured: boolean;
  onOpen: (missionId: string) => void;
}>) {
  const cueStyle = {
    '--mission-call-accent': call.locationPresentation.accentColor,
  } as CSSProperties;
  return (
    <button
      aria-label={`${call.title} — ${call.locationName}`}
      className="mission-call-card"
      data-completed={call.completed ? 'true' : undefined}
      data-featured={featured ? 'true' : undefined}
      onClick={() => {
        onOpen(call.id);
      }}
      type="button"
    >
      <span
        aria-hidden="true"
        className="mission-call-location-cue"
        data-shape={call.locationPresentation.shape}
        style={cueStyle}
      >
        <MapLandmarkIcon silhouette={call.locationPresentation.silhouette} />
      </span>
      {call.portraitUrl === null ? null : (
        <img aria-hidden="true" alt="" className="mission-call-portrait" src={call.portraitUrl} />
      )}
      <span className="mission-call-title">{call.title}</span>
    </button>
  );
}
