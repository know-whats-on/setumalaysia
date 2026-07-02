import { useState, useEffect, useCallback } from 'react';
import { Shield, X, Clock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { fetchRentalHistory } from '../lib/api';
import { sendHealthCheckNotification } from '../lib/notifications';

const REMINDER_DISMISSED_KEY = 'ghar_health_check_reminder_dismissed';
const REMINDER_NOTIFIED_KEY = 'ghar_health_check_browser_notified';
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

/**
 * HealthCheckReminder
 * 
 * Checks if the user has a current address without a completed risk assessment.
 * If 48+ hours have passed since the address was created:
 *   1. Shows an in-app banner notification
 *   2. Attempts to send a browser push notification (one-time)
 * 
 * The banner can be dismissed (stored in localStorage per-entry).
 * The browser notification is sent once per entry.
 */
export function HealthCheckReminder() {
  const navigate = useNavigate();
  const email = localStorage.getItem('ghar_email') || '';
  const [showBanner, setShowBanner] = useState(false);
  const [entryAddress, setEntryAddress] = useState('');
  const [hoursAgo, setHoursAgo] = useState(0);

  const checkReminder = useCallback(async () => {
    if (!email) return;

    try {
      const history = await fetchRentalHistory(email);
      const currentEntry = history.find((r: any) => r.is_current);

      if (!currentEntry) return;

      // Already has a risk assessment — no reminder needed
      if (currentEntry.risk_assessment) return;

      // Check if 48 hours have passed since creation
      const createdAt = new Date(currentEntry.created_at).getTime();
      const elapsed = Date.now() - createdAt;

      if (elapsed < FORTY_EIGHT_HOURS_MS) return;

      const hours = Math.floor(elapsed / (60 * 60 * 1000));
      setHoursAgo(hours);
      setEntryAddress(currentEntry.display_address || currentEntry.address || 'your current property');

      // Check if user already dismissed this specific reminder
      const dismissedFor = localStorage.getItem(REMINDER_DISMISSED_KEY);
      if (dismissedFor === currentEntry.id) return;

      // Show in-app banner
      setShowBanner(true);

      // Attempt browser notification (one-time per entry)
      const notifiedFor = localStorage.getItem(REMINDER_NOTIFIED_KEY);
      if (notifiedFor !== currentEntry.id) {
        const sent = await sendHealthCheckNotification({
          entryId: currentEntry.id,
          address: currentEntry.display_address || currentEntry.address || 'your property',
          onNativeTap: () => navigate('/profile?action=health-check'),
        });
        if (sent) {
          localStorage.setItem(REMINDER_NOTIFIED_KEY, currentEntry.id);
        }
      }
    } catch (err) {
      console.error('GHAR health check reminder error:', err);
    }
  }, [email, navigate]);

  useEffect(() => {
    // Check on mount after a brief delay to let the page load
    const timer = setTimeout(checkReminder, 2000);

    // Also re-check periodically (every 30 minutes) while the app is open
    const interval = setInterval(checkReminder, 30 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [checkReminder]);

  const handleDismiss = () => {
    setShowBanner(false);
    // Store the dismissed entry ID so it doesn't reappear
    fetchRentalHistory(email).then((history) => {
      const current = history.find((r: any) => r.is_current);
      if (current) {
        localStorage.setItem(REMINDER_DISMISSED_KEY, current.id);
      }
    }).catch(() => {});
  };

  const handleTakeHealthCheck = () => {
    setShowBanner(false);
    navigate('/profile?action=health-check');
  };

  const formatTimeAgo = (hours: number): string => {
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    return days === 1 ? '1 day' : `${days} days`;
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9998] px-3 pb-0 native-safe-area-top"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <div className="bg-[#1E40AF] rounded-2xl shadow-xl shadow-[#1E40AF]/30 overflow-hidden max-w-md mx-auto">
            {/* Urgency stripe */}
            <div className="h-1 bg-gradient-to-r from-[#EE811A] via-[#B91C1C] to-[#EE811A]" />

            <div className="px-4 py-3">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-5 h-5 text-white" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[11px] font-semibold text-white tracking-tight">
                      Tenancy Health Check Overdue
                    </h3>
                    <button
                      onClick={handleDismiss}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 -mr-1"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>

                  <p className="text-[10px] text-white/80 leading-relaxed mb-2.5">
                    You added <span className="font-medium text-white">{entryAddress}</span>{' '}
                    <span className="font-medium text-[#EE811A]">{formatTimeAgo(hoursAgo)} ago</span> without completing the health check. This leaves you vulnerable to bond disputes, false damage claims, and lease violations.
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTakeHealthCheck}
                      className="flex-1 py-2 bg-white text-[#1E40AF] rounded-xl flex items-center justify-center gap-1.5 hover:bg-white/90 transition-all cursor-pointer active:scale-[0.98]"
                    >
                      <Shield className="w-3.5 h-3.5" strokeWidth={2} />
                      <span className="text-[10px] font-semibold tracking-wide">Take Health Check</span>
                      <ChevronRight className="w-3 h-3" strokeWidth={2} />
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="px-3 py-2 bg-white/10 text-white/70 rounded-xl text-[10px] font-medium tracking-wide hover:bg-white/15 transition-all cursor-pointer"
                    >
                      Later
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Clock className="w-2.5 h-2.5 text-white/40" strokeWidth={2} />
                    <p className="text-[8px] text-white/40 tracking-wide font-medium">
                      Takes less than 60 seconds
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
