export function validateBasePackRelease(basePack, packageManifest) {
  return basePack.id === 'base' && basePack.version === packageManifest.version
    ? []
    : ['The bundled base pack ID and version must match the product release.'];
}
