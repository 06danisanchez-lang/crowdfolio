export type PlatformType = 'equity' | 'lending' | 'real_estate' | 'mixed';
export type PlatformStatus = 'active' | 'inactive' | 'pending_verification';

export interface UserPlatform {
  id: string;
  userId: string;
  name: string;
  countryCode: string;
  platformType: PlatformType;
  websiteUrl?: string;
  registrationDate?: string;
  status: PlatformStatus;
  username?: string;
  notes?: string;
  defaultWithholding: number;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPlatformFormData {
  name: string;
  countryCode: string;
  platformType: PlatformType;
  websiteUrl: string;
  registrationDate: string;
  status: PlatformStatus;
  username: string;
  notes: string;
  defaultWithholding: number;
}

export const PLATFORM_TYPES: { value: PlatformType; label: string }[] = [
  { value: 'equity', label: 'Equity' },
  { value: 'lending', label: 'Lending' },
  { value: 'real_estate', label: 'Inmobiliario' },
  { value: 'mixed', label: 'Mixto' },
];

export const PLATFORM_STATUS: { value: PlatformStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Activa', color: 'bg-green-500' },
  { value: 'inactive', label: 'Inactiva', color: 'bg-gray-500' },
  { value: 'pending_verification', label: 'Pendiente verificación', color: 'bg-yellow-500' },
];

export const COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'NL', name: 'Países Bajos', flag: '🇳🇱' },
  { code: 'UK', name: 'Reino Unido', flag: '🇬🇧' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'OTHER', name: 'Otro', flag: '🌍' },
];

export const DEFAULT_PLATFORM_FORM_DATA: UserPlatformFormData = {
  name: '',
  countryCode: 'ES',
  platformType: 'real_estate',
  websiteUrl: '',
  registrationDate: '',
  status: 'active',
  username: '',
  notes: '',
  defaultWithholding: 19,
};
