import { useNavigate, useSearchParams } from 'react-router';
import { TriageCenter } from '../components/triage-center';

export function TriagePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || undefined;

  return (
    <TriageCenter
      onBack={() => navigate('/dashboard')}
      initialCategory={category}
    />
  );
}
