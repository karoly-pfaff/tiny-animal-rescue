export function LadderArt({ assetUrl }: Readonly<{ assetUrl: string | null | undefined }>) {
  if (assetUrl !== null && assetUrl !== undefined) {
    return <img className="mission-ladder-art" src={assetUrl} alt="" aria-hidden="true" />;
  }
  return (
    <>
      <span className="ladder-rail ladder-rail-left" aria-hidden="true" />
      <span className="ladder-rail ladder-rail-right" aria-hidden="true" />
      <span className="ladder-rungs" aria-hidden="true" />
    </>
  );
}
