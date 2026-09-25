type ShelterReactionId = 'greet' | 'pet' | 'feed' | 'play';

export type AnimalRecord = Readonly<{
  id: string;
  species: string;
  nameKey: string;
  shelterAreaId: string;
  assets: Readonly<{
    portrait: string;
    idle: string;
    happy: string;
    mission?: string;
    sleeping?: string;
  }>;
  shelterReactions: readonly ShelterReactionId[];
}>;

export type LocationRecord = Readonly<{
  id: string;
  nameKey: string;
  mapLabelKey: string;
  assets: Readonly<{
    mapBackground: string;
    missionBackground: string;
  }>;
}>;

export type ShelterAreaRecord = Readonly<{
  id: string;
  nameKey: string;
  capacity: number;
  assets: Readonly<{
    background: string;
  }>;
}>;

export type LocalizationDocument = Readonly<Record<string, string>>;

type AssetCategory = 'image' | 'music' | 'effect' | 'voice';
type AssetQaStatus = 'approved' | 'not-produced' | 'rejected';
type AssetProductionStatus = 'approved' | 'pending-production';
type AssetDelivery = 'r2-locked' | 'r2-pending';

type AssetMetadataBase = Readonly<{
  id: string;
  category: AssetCategory;
  objectKey: string;
  role: string;
  ownership: string;
  qaStatus: AssetQaStatus;
  licenseStatus: AssetProductionStatus;
  provenanceStatus: AssetProductionStatus;
  classification?: 'production-safe' | 'presentation-only';
  delivery?: AssetDelivery;
  bytes?: number;
  digest?: `sha256:${string}`;
}>;

type ImageAssetMetadata = AssetMetadataBase &
  Readonly<{
    category: 'image';
    mediaType: 'image/png' | 'image/webp';
    width: number;
    height: number;
    transparent: boolean;
    promptRecord: string;
  }>;

type AudioAssetMetadata = AssetMetadataBase &
  Readonly<{
    category: 'music' | 'effect' | 'voice';
    mediaType: 'audio/ogg' | 'audio/mpeg' | 'audio/wav';
    durationBoundsSeconds: Readonly<{ min: number; max: number }>;
    locale?: 'hu' | 'en';
    promptRecord: string;
  }>;

export type AssetMetadata = ImageAssetMetadata | AudioAssetMetadata;

export type AssetInventory = Readonly<{
  schemaVersion: 1;
  assets: readonly AssetMetadata[];
}>;
