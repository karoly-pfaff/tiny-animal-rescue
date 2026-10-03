import type { CSSProperties } from 'react';

import type { MissionCallContent } from '../content/mission-call-content';
import { MapLandmarkIcon } from './map-landmark-icon';

export function MissionCallSheet({
  calls,
  closeLabel,
  completedLabel,
  featuredMissionId,
  onClose,
  onOpenMission,
}: Readonly<{
  calls: readonly MissionCallContent[];
  closeLabel: string;
  completedLabel: string;
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
            completedLabel={completedLabel}
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
  completedLabel,
  featured,
  onOpen,
}: Readonly<{
  call: MissionCallContent;
  completedLabel: string;
  featured: boolean;
  onOpen: (missionId: string) => void;
}>) {
  const cueStyle = {
    '--mission-call-accent': call.locationPresentation.accentColor,
  } as CSSProperties;
  const completionDescriptionId = `mission-call-${call.id}-completion`;
  return (
    <button
      aria-describedby={call.completed ? completionDescriptionId : undefined}
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
      <MissionCompletion
        completed={call.completed}
        descriptionId={completionDescriptionId}
        label={completedLabel}
      />
      <span className="mission-call-title">{call.title}</span>
    </button>
  );
}

function MissionCompletion({
  completed,
  descriptionId,
  label,
}: Readonly<{ completed: boolean; descriptionId: string; label: string }>) {
  if (!completed) {
    return null;
  }
  return (
    <>
      <span aria-hidden="true" className="mission-call-complete-cue" />
      <span className="visually-hidden" id={descriptionId}>
        {label}
      </span>
    </>
  );
}
