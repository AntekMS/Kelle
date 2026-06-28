import type { UserProfile } from '../../types';
import { loadProfile, saveProfile, deleteProfile, hasGrantedConsent } from '../profile-store';

// ── Mock expo-secure-store ────────────────────────────────────────────────────

const mockGetItemAsync = jest.fn<Promise<string | null>, [string]>();
const mockSetItemAsync = jest.fn<Promise<void>, [string, string]>();
const mockDeleteItemAsync = jest.fn<Promise<void>, [string]>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: (...args: [string]) => mockGetItemAsync(...args),
  setItemAsync: (...args: [string, string]) => mockSetItemAsync(...args),
  deleteItemAsync: (...args: [string]) => mockDeleteItemAsync(...args),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const validProfile: UserProfile = {
  id: 'user-123',
  consent: { granted_at: '2026-01-01T10:00:00.000Z', policy_version: '1.0' },
  diet: 'omnivore',
  allergies: ['gluten'],
  goals: ['high_protein'],
  equipment: ['herdplatte'],
  time_budget_min: 30,
  skill_techniques: ['kochen'],
  cooked_dish_ids: ['d1'],
  favorites: [],
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:00:00.000Z',
};

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── loadProfile ───────────────────────────────────────────────────────────────

describe('loadProfile', () => {
  test('gibt null zurück wenn nichts gespeichert', async () => {
    mockGetItemAsync.mockResolvedValue(null);
    const result = await loadProfile();
    expect(result).toBeNull();
  });

  test('parst gespeichertes JSON korrekt', async () => {
    mockGetItemAsync.mockResolvedValue(JSON.stringify(validProfile));
    const result = await loadProfile();
    expect(result).toEqual(validProfile);
  });

  test('ruft getItemAsync mit dem korrekten Key auf', async () => {
    mockGetItemAsync.mockResolvedValue(null);
    await loadProfile();
    expect(mockGetItemAsync).toHaveBeenCalledWith('user_profile');
    expect(mockGetItemAsync).toHaveBeenCalledTimes(1);
  });

  test('bewahrt alle UserProfile-Felder beim Parsen', async () => {
    mockGetItemAsync.mockResolvedValue(JSON.stringify(validProfile));
    const result = await loadProfile();
    expect(result?.allergies).toEqual(['gluten']);
    expect(result?.consent.granted_at).toBe('2026-01-01T10:00:00.000Z');
    expect(result?.cooked_dish_ids).toEqual(['d1']);
  });
});

// ── saveProfile ───────────────────────────────────────────────────────────────

describe('saveProfile', () => {
  test('serialisiert UserProfile korrekt als JSON', async () => {
    mockSetItemAsync.mockResolvedValue(undefined);
    await saveProfile(validProfile);
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      'user_profile',
      JSON.stringify(validProfile)
    );
  });

  test('ruft setItemAsync genau einmal auf', async () => {
    mockSetItemAsync.mockResolvedValue(undefined);
    await saveProfile(validProfile);
    expect(mockSetItemAsync).toHaveBeenCalledTimes(1);
  });
});

// ── deleteProfile ─────────────────────────────────────────────────────────────

describe('deleteProfile', () => {
  test('ruft deleteItemAsync mit korrektem Key auf', async () => {
    mockDeleteItemAsync.mockResolvedValue(undefined);
    await deleteProfile();
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('user_profile');
    expect(mockDeleteItemAsync).toHaveBeenCalledTimes(1);
  });
});

// ── hasGrantedConsent ─────────────────────────────────────────────────────────

describe('hasGrantedConsent', () => {
  test('false wenn kein Profil gespeichert', async () => {
    mockGetItemAsync.mockResolvedValue(null);
    expect(await hasGrantedConsent()).toBe(false);
  });

  test('false wenn granted_at leer ist', async () => {
    const noConsent: UserProfile = {
      ...validProfile,
      consent: { granted_at: '', policy_version: '1.0' },
    };
    mockGetItemAsync.mockResolvedValue(JSON.stringify(noConsent));
    expect(await hasGrantedConsent()).toBe(false);
  });

  test('true wenn granted_at ein gültiger ISO-String ist', async () => {
    mockGetItemAsync.mockResolvedValue(JSON.stringify(validProfile));
    expect(await hasGrantedConsent()).toBe(true);
  });

  test('prüft via loadProfile — ruft getItemAsync auf', async () => {
    mockGetItemAsync.mockResolvedValue(null);
    await hasGrantedConsent();
    expect(mockGetItemAsync).toHaveBeenCalledWith('user_profile');
  });
});
