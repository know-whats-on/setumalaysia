import { useNavigate, useSearchParams } from 'react-router';
import { ProfileVault, type ProfileVaultTab } from '../components/profile-vault';
import { useGharData } from '../components/layout';
import { APP_VARIANT } from '../lib/app-variant';
import { clearHouseholdSharedSession } from '../lib/household-native-sync';
import { clearPushRegistration } from '../lib/push-notifications';
import { WolliProfilePage } from './wolli-pages';

export function VaultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { evidence, listings } = useGharData();

  const autoAddAddress = searchParams.get('action') === 'add-address';
  const autoAddWork = searchParams.get('action') === 'add-work';
  const autoAddEvidence = searchParams.get('action') === 'add-evidence';
  const autoHealthCheck = searchParams.get('action') === 'health-check';
  const tabParam = searchParams.get('tab');
  const initialTab: ProfileVaultTab | undefined =
    tabParam === 'overview' ||
    tabParam === 'timeline' ||
    tabParam === 'household' ||
    tabParam === 'evidence' ||
    tabParam === 'plans' ||
    tabParam === 'invites'
      ? tabParam
      : undefined;

  const handleLogout = () => {
    void clearPushRegistration(localStorage.getItem('ghar_email') || '').catch((err) => {
      console.error('GHAR push logout cleanup failed:', err);
    });
    void clearHouseholdSharedSession();
    localStorage.removeItem('ghar_onboarded');
    localStorage.removeItem('ghar_email');
    localStorage.removeItem('ghar_first_name');
    localStorage.removeItem('ghar_last_name');
    localStorage.removeItem('ghar_au_state');
    localStorage.removeItem('ghar_gps_granted');
    localStorage.removeItem('ghar_admin');
    navigate('/', { replace: true });
  };

  if (APP_VARIANT === 'setu_china') {
    return (
      <ProfileVault
        evidence={evidence}
        listings={listings}
        onLogout={handleLogout}
        initialTab={initialTab}
        autoAddAddress={autoAddAddress}
        autoAddWork={autoAddWork}
        autoAddEvidence={autoAddEvidence}
        autoHealthCheck={autoHealthCheck}
        shellVariant="setu-china"
      />
    );
  }

  if (APP_VARIANT === 'ghar') {
    return (
      <ProfileVault
        evidence={evidence}
        listings={listings}
        onLogout={handleLogout}
        initialTab={initialTab}
        autoAddAddress={autoAddAddress}
        autoAddWork={autoAddWork}
        autoAddEvidence={autoAddEvidence}
        autoHealthCheck={autoHealthCheck}
        shellVariant="setu-india"
      />
    );
  }

  if (APP_VARIANT === 'jom_settle') {
    return (
      <ProfileVault
        evidence={evidence}
        listings={listings}
        onLogout={handleLogout}
        initialTab={initialTab}
        autoAddAddress={autoAddAddress}
        autoAddWork={autoAddWork}
        autoAddEvidence={autoAddEvidence}
        autoHealthCheck={autoHealthCheck}
        shellVariant="setu-malaysia"
      />
    );
  }

  if (APP_VARIANT === 'wheres_wolli') {
    return <WolliProfilePage onLogout={handleLogout} />;
  }

  return (
    <ProfileVault
      evidence={evidence}
      listings={listings}
      onLogout={handleLogout}
      initialTab={initialTab}
      autoAddAddress={autoAddAddress}
      autoAddWork={autoAddWork}
      autoAddEvidence={autoAddEvidence}
      autoHealthCheck={autoHealthCheck}
    />
  );
}
