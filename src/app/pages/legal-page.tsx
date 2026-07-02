import { useParams } from 'react-router';
import { LegalCenter } from '../components/legal-center';
import { useGharData } from '../components/layout';

export function LegalPage() {
  const { listingId } = useParams();
  const { evidence, listings } = useGharData();

  // If a listingId is passed, pre-select it in the Legal Center
  const preSelectedListing = listingId
    ? listings.find(l => l.id === listingId) || null
    : null;

  return (
    <LegalCenter
      evidence={evidence}
      listings={listings}
      preSelectedListing={preSelectedListing}
    />
  );
}
