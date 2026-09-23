import { fileTypeFromBuffer } from 'file-type';
import { imageSize } from 'image-size';
import { parseBuffer } from 'music-metadata';

function canonicalMediaType(value) {
  return value === 'audio/x-wav' ? 'audio/wav' : value;
}

export async function detectedMediaType(data) {
  return canonicalMediaType((await fileTypeFromBuffer(data))?.mime);
}

async function measureMedia(data, mediaType) {
  const detected = await detectedMediaType(data);
  if (detected !== canonicalMediaType(mediaType)) {
    throw new Error(`Binary media type ${detected ?? 'unknown'} differs from ${mediaType}.`);
  }
  if (mediaType.startsWith('image/')) {
    const dimensions = imageSize(data);
    if (!Number.isInteger(dimensions.width) || !Number.isInteger(dimensions.height)) {
      throw new Error('Image dimensions could not be measured.');
    }
    return { width: dimensions.width, height: dimensions.height };
  }
  if (mediaType.startsWith('audio/')) {
    const metadata = await parseBuffer(
      data,
      { mimeType: mediaType, size: data.length },
      { duration: true, skipCovers: true },
    );
    const durationMilliseconds = Math.round((metadata.format.duration ?? 0) * 1000);
    if (!Number.isInteger(durationMilliseconds) || durationMilliseconds <= 0) {
      throw new Error('Audio duration could not be measured.');
    }
    return { durationMilliseconds };
  }
  throw new Error(`Unsupported materialized media type ${mediaType}.`);
}

export async function verifyMeasuredMedia(data, object, responseMediaType) {
  if (responseMediaType !== object.mediaType) {
    throw new Error(`HTTP media type differs from the lock for ${object.objectKey}.`);
  }
  const measured = await measureMedia(data, object.mediaType);
  const declared = object.mediaType.startsWith('image/')
    ? { width: object.width, height: object.height }
    : { durationMilliseconds: object.durationMilliseconds };
  if (JSON.stringify(measured) !== JSON.stringify(declared)) {
    throw new Error(`Measured media metadata differs from the lock for ${object.objectKey}.`);
  }
  return measured;
}
