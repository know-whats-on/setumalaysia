import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './ui/dialog';
import {
  fetchActiveInAppPopupCampaigns,
  recordInAppPopupCampaignClick,
  recordInAppPopupCampaignImpression,
  type InAppPopupCampaignRecord,
} from '../lib/api';
import { APP_VARIANT } from '../lib/app-variant';
import {
  markInAppPopupCampaignSeen,
  selectInAppPopupCampaign,
} from '../lib/in-app-popup-campaigns';
import { normalizeIncomingRoute } from '../lib/push-notifications';

export function InAppPopupCampaignHost({
  disabled = false,
  email = '',
}: {
  disabled?: boolean;
  email?: string;
}) {
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<InAppPopupCampaignRecord | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setCampaign(null);
      return;
    }

    let cancelled = false;
    let image: HTMLImageElement | null = null;

    void fetchActiveInAppPopupCampaigns(email)
      .then((campaigns) => {
        if (cancelled) return;
        const nextCampaign = selectInAppPopupCampaign(campaigns, {
          appVariant: APP_VARIANT,
        });
        if (!nextCampaign) {
          setOpen(false);
          setCampaign(null);
          return;
        }

        image = new Image();
        image.onload = () => {
          if (cancelled) return;
          setCampaign(nextCampaign);
          setOpen(true);
          markInAppPopupCampaignSeen(nextCampaign);
          void recordInAppPopupCampaignImpression(nextCampaign.id).catch((error) => {
            console.warn('GHAR in-app popup impression tracking failed:', error);
          });
        };
        image.onerror = () => {
          if (cancelled) return;
          setOpen(false);
          setCampaign(null);
        };
        image.src = nextCampaign.image_url;
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn('GHAR in-app popup campaigns unavailable:', error);
        setOpen(false);
        setCampaign(null);
      });

    return () => {
      cancelled = true;
      if (image) {
        image.onload = null;
        image.onerror = null;
      }
    };
  }, [disabled, email]);

  if (!campaign) return null;

  const title = campaign.title || 'Campaign';
  const handlePosterClick = () => {
    markInAppPopupCampaignSeen(campaign);
    setOpen(false);
    void recordInAppPopupCampaignClick(campaign.id).catch((error) => {
      console.warn('GHAR in-app popup click tracking failed:', error);
    });

    const route = normalizeIncomingRoute(campaign.click_url);
    if (route) {
      navigate(route);
      return;
    }
    window.location.assign(campaign.click_url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[430px] gap-0 overflow-hidden rounded-3xl border-0 bg-transparent p-0 shadow-[0_28px_80px_rgba(15,23,42,0.42)] sm:max-w-[430px]">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Tap the poster to open this campaign.
        </DialogDescription>
        <button
          type="button"
          aria-label={`Open ${title}`}
          onClick={handlePosterClick}
          className="block w-full overflow-hidden rounded-3xl bg-white text-left"
        >
          <img
            src={campaign.image_url}
            alt={campaign.alt_text || title}
            className="block h-auto max-h-[78svh] w-full object-contain"
            data-testid="in-app-popup-campaign-poster"
          />
        </button>
      </DialogContent>
    </Dialog>
  );
}
