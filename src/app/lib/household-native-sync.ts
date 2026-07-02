import { registerPlugin } from '@capacitor/core';
import { APP_VARIANT } from './app-variant';
import { isNativeShell } from './platform';

export interface HouseholdMutationHint {
  householdId: string;
  entityType: string;
  entityId: string;
  route: string;
  updatedAt: string;
  source: string;
}

type HouseholdSyncPlugin = {
  setSharedSession(options: { email: string; appVariant: string }): Promise<void>;
  clearSharedSession(): Promise<void>;
  consumeMutationHint(): Promise<Partial<HouseholdMutationHint>>;
};

const HouseholdSync = registerPlugin<HouseholdSyncPlugin>('HouseholdSync');

export async function syncHouseholdSharedSession(email: string) {
  if (!isNativeShell()) return;

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    await clearHouseholdSharedSession();
    return;
  }

  try {
    await HouseholdSync.setSharedSession({
      email: normalizedEmail,
      appVariant: APP_VARIANT,
    });
  } catch (error) {
    console.warn('GHAR household shared session sync failed:', error);
  }
}

export async function clearHouseholdSharedSession() {
  if (!isNativeShell()) return;
  try {
    await HouseholdSync.clearSharedSession();
  } catch (error) {
    console.warn('GHAR household shared session clear failed:', error);
  }
}

export async function consumeHouseholdMutationHint(): Promise<HouseholdMutationHint | null> {
  if (!isNativeShell()) return null;

  try {
    const hint = await HouseholdSync.consumeMutationHint();
    const householdId = String(hint?.householdId || '').trim();
    if (!householdId) return null;

    return {
      householdId,
      entityType: String(hint?.entityType || '').trim(),
      entityId: String(hint?.entityId || '').trim(),
      route: String(hint?.route || '').trim(),
      updatedAt: String(hint?.updatedAt || '').trim(),
      source: String(hint?.source || '').trim(),
    };
  } catch (error) {
    console.warn('GHAR household mutation hint consume failed:', error);
    return null;
  }
}
