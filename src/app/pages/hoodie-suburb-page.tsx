import { Navigate, useParams } from 'react-router';
import { resolveHoodieSuburbPathToVibeRoute } from '../lib/hoodie-share';

export function HoodieSuburbPage() {
  const { suburbSlug = '' } = useParams();
  return <Navigate to={resolveHoodieSuburbPathToVibeRoute(suburbSlug)} replace />;
}
