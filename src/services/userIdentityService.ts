import { Preferences } from '@capacitor/preferences';

const PREF_KEY = 'p2p_user_id';

let userId: string | null = null;

export async function getUserId(): Promise<string> {
  if (!userId) {
    const { value } = await Preferences.get({ key: PREF_KEY });
    if (value) {
      userId = value;
    } else {
      userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      await Preferences.set({ key: PREF_KEY, value: userId });
    }
  }
  return userId;
}
