import { Navigate, useNavigate } from 'react-router';
import { Noticeboard } from '../components/noticeboard';
import { useGharData } from '../components/layout';
import { APP_CONFIG } from '../lib/app-config';

export function NoticeboardPage() {
  const navigate = useNavigate();
  const { bulletins, banners } = useGharData();
  const isHoodieExperience = APP_CONFIG.experienceMode === 'hoodie';

  if (isHoodieExperience) {
    return <Navigate to="/vibe?section=alerts" replace />;
  }

  return (
    <Noticeboard
      onBack={() => navigate('/dashboard')}
      bulletins={bulletins}
      banners={banners}
    />
  );
}
