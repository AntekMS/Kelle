import * as SecureStore from 'expo-secure-store';
import type { UserProfile } from '../types';

const PROFILE_KEY = 'user_profile';

// Art. 9 DSGVO: profile never leaves the device — SecureStore is hardware-backed on iOS/Android
export async function loadProfile(): Promise<UserProfile | null> {
  const raw = await SecureStore.getItemAsync(PROFILE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as UserProfile;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
}

export async function deleteProfile(): Promise<void> {
  await SecureStore.deleteItemAsync(PROFILE_KEY);
}

export async function hasGrantedConsent(): Promise<boolean> {
  const profile = await loadProfile();
  return typeof profile?.consent.granted_at === 'string' && profile.consent.granted_at.length > 0;
}
