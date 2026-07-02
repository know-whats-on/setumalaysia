import { Contacts } from '@capacitor-community/contacts';
import type { PermissionStatus } from '@capacitor-community/contacts/dist/esm/definitions';
import { isNativeShell } from './platform';

export type InviteContactsPermissionState =
  | 'granted'
  | 'limited'
  | 'prompt'
  | 'denied'
  | 'unavailable';

export type InviteContactPhoneEntry = {
  contactId: string;
  displayName: string;
  phoneNumber: string;
  label: string;
};

function normalizePermissionStatus(status: PermissionStatus['contacts'] | undefined): InviteContactsPermissionState {
  if (status === 'granted') return 'granted';
  if (status === 'limited') return 'limited';
  if (status === 'denied') return 'denied';
  if (status === 'prompt') return 'prompt';
  return 'unavailable';
}

function isGranted(status: InviteContactsPermissionState) {
  return status === 'granted' || status === 'limited';
}

function getContactDisplayName(contact: {
  name?: {
    display?: string | null;
    given?: string | null;
    family?: string | null;
  };
}) {
  return (
    contact?.name?.display ||
    [contact?.name?.given, contact?.name?.family].filter(Boolean).join(' ').trim() ||
    'Unknown contact'
  );
}

export async function checkInviteContactsPermission(): Promise<InviteContactsPermissionState> {
  if (!isNativeShell()) return 'unavailable';
  const permissions = await Contacts.checkPermissions();
  return normalizePermissionStatus(permissions.contacts);
}

export async function requestInviteContactsPermission(): Promise<InviteContactsPermissionState> {
  if (!isNativeShell()) return 'unavailable';
  const permissions = await Contacts.requestPermissions();
  return normalizePermissionStatus(permissions.contacts);
}

export async function loadInviteContactPhoneEntries(): Promise<InviteContactPhoneEntry[]> {
  if (!isNativeShell()) {
    return [];
  }

  const permission = await checkInviteContactsPermission();
  if (!isGranted(permission)) {
    throw new Error('Contacts permission is required to load phone numbers.');
  }

  const result = await Contacts.getContacts({
    projection: {
      name: true,
      phones: true,
    },
  });

  return (result.contacts || [])
    .flatMap((contact) => {
      const displayName = getContactDisplayName(contact);
      return (contact.phones || [])
        .map((phone, index) => {
          const phoneNumber = String(phone.number || '').trim();
          if (!phoneNumber) return null;
          const label = String(phone.label || phone.type || '').trim();
          return {
            contactId: `${contact.contactId}:${index}`,
            displayName,
            phoneNumber,
            label,
          } satisfies InviteContactPhoneEntry;
        })
        .filter((entry): entry is InviteContactPhoneEntry => Boolean(entry));
    })
    .sort((left, right) => {
      const byName = left.displayName.localeCompare(right.displayName, undefined, { sensitivity: 'base' });
      if (byName !== 0) return byName;
      return left.phoneNumber.localeCompare(right.phoneNumber, undefined, { sensitivity: 'base' });
    });
}
