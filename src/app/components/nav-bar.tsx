import { useEffect, useRef } from 'react';
import {
  Bell,
  Bot,
  Building2,
  ClipboardList,
  Compass,
  Home,
  Landmark,
  Map,
  Scale,
  Search,
  Sparkles,
  User,
} from 'lucide-react';
import { APP_CONFIG } from '../lib/app-config';
import { APP_VARIANT } from '../lib/app-variant';
import { HOODIE_FEATURED_NAV_GEOMETRY } from '../lib/hoodie-nav-geometry';
import { setuChinaNavIcons } from '../lib/setu-china-icons';
import { setuIndiaNavIcons } from '../lib/setu-india-icons';
import { setuMalaysiaNavIcons } from '../lib/setu-malaysia-icons';
import { wolliNavIcons } from '../lib/wolli-icons';
import hoodieniLampUrl from '../assets/lamp-hoodienie.svg';

export type View = 'dashboard' | 'vibe' | 'noticeboard' | 'profile' | 'legal' | 'resources' | 'arrival';

interface NavBarProps {
  activeView: View;
  onNavigate: (view: View) => void;
  onFeaturedNavigateStart?: (rect: DOMRect) => void;
}

type NavItem = {
  view: View;
  icon: typeof Map;
  label: string;
  featured?: boolean;
};

export function NavBar({
  activeView,
  onNavigate,
  onFeaturedNavigateStart,
}: NavBarProps) {
  const isHoodieExperience = APP_CONFIG.experienceMode === 'hoodie';
  const isSetuChina = APP_VARIANT === 'setu_china';
  const isSetuIndia = APP_VARIANT === 'ghar';
  const profileTapCountRef = useRef(0);
  const profileTapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usesRhinoStudentNav = isSetuChina || isSetuIndia;
  const isJomSettle = APP_VARIANT === 'jom_settle';
  const isWolli = APP_VARIANT === 'wheres_wolli';
  const hoodieFourthNavItem: NavItem = APP_CONFIG.showSetuFeatures
    ? { view: 'resources', icon: usesRhinoStudentNav || isJomSettle || isWolli ? ClipboardList : Landmark, label: isSetuIndia ? 'Tasks' : isJomSettle ? 'Senarai' : 'Resources' }
    : { view: 'legal', icon: Scale, label: 'Resources' };
  const navItems: NavItem[] = isHoodieExperience
    ? usesRhinoStudentNav
      ? [
          { view: 'dashboard', icon: Home, label: 'Home' },
          { view: 'vibe', icon: Compass, label: isSetuIndia ? 'Explore' : 'Vibe' },
          { view: 'arrival', icon: Bot, label: isSetuIndia ? 'Ask' : 'Chat', featured: false },
          hoodieFourthNavItem,
          { view: 'profile', icon: User, label: isSetuIndia ? 'Me' : 'Profile' },
        ]
      : isJomSettle
        ? [
            { view: 'dashboard', icon: Home, label: 'Rumah' },
            { view: 'vibe', icon: Sparkles, label: 'Vibe' },
            { view: 'arrival', icon: Bot, label: APP_CONFIG.assistantName },
            hoodieFourthNavItem,
            { view: 'profile', icon: User, label: 'Profil' },
          ]
      : isWolli
        ? [
            { view: 'dashboard', icon: Home, label: 'Home' },
            { view: 'vibe', icon: Compass, label: 'Explore' },
            { view: 'arrival', icon: Bot, label: 'Ask' },
            hoodieFourthNavItem,
            { view: 'profile', icon: User, label: 'Me' },
          ]
      : [
          { view: 'dashboard', icon: Search, label: APP_CONFIG.variant === 'burb_mate' ? "'Hood" : 'Map' },
          { view: 'vibe', icon: Sparkles, label: 'Vibe' },
          { view: 'arrival', icon: Sparkles, label: APP_CONFIG.assistantName, featured: true },
          hoodieFourthNavItem,
          { view: 'profile', icon: Building2, label: 'Household' },
        ]
    : [
        { view: 'dashboard', icon: Map, label: 'Map' },
        { view: 'vibe', icon: Sparkles, label: 'Vibe' },
        { view: 'noticeboard', icon: Bell, label: 'Alerts' },
        { view: 'profile', icon: User, label: 'Profile' },
        { view: 'legal', icon: Scale, label: 'Legal' },
        { view: 'resources', icon: Landmark, label: APP_CONFIG.resourcesLabel },
      ];

  const resetProfileTapCounter = () => {
    profileTapCountRef.current = 0;
    if (profileTapResetTimerRef.current) {
      clearTimeout(profileTapResetTimerRef.current);
      profileTapResetTimerRef.current = null;
    }
  };

  const handleNavItemClick = (view: View) => {
    if (isSetuIndia && view === 'profile') {
      if (profileTapResetTimerRef.current) clearTimeout(profileTapResetTimerRef.current);
      profileTapCountRef.current += 1;
      if (profileTapCountRef.current >= 12) {
        resetProfileTapCounter();
        window.dispatchEvent(new CustomEvent('setu-india-admin-unlock'));
      } else {
        profileTapResetTimerRef.current = setTimeout(resetProfileTapCounter, 3000);
      }
    } else if (isSetuIndia) {
      resetProfileTapCounter();
    }
    onNavigate(view);
  };

  useEffect(() => {
    return () => {
      if (profileTapResetTimerRef.current) {
        clearTimeout(profileTapResetTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      {isHoodieExperience && (
        <style>{`
          @keyframes hoodieniGlowPulse {
            0%, 100% {
              transform: translateY(0);
              box-shadow: 0 14px 30px rgba(250, 204, 21, 0.22), 0 8px 16px rgba(15, 23, 42, 0.18);
            }
            50% {
              transform: translateY(-1px);
              box-shadow: 0 18px 36px rgba(250, 204, 21, 0.32), 0 10px 18px rgba(15, 23, 42, 0.22);
            }
          }

          @keyframes hoodieniHaloPulse {
            0%, 100% {
              opacity: 0.55;
              transform: scale(0.96);
            }
            50% {
              opacity: 0.88;
              transform: scale(1.03);
            }
          }

          @keyframes hoodieniSparkleTwinkle {
            0%, 100% {
              opacity: 0.28;
              transform: scale(0.78) rotate(-8deg);
            }
            40% {
              opacity: 1;
              transform: scale(1.08) rotate(0deg);
            }
            70% {
              opacity: 0.52;
              transform: scale(0.9) rotate(6deg);
            }
          }

          @keyframes hoodieniLampSway {
            0%, 100% {
              transform: rotate(-5deg) translateY(0);
            }
            25% {
              transform: rotate(1deg) translateY(-1px);
            }
            50% {
              transform: rotate(4deg) translateY(0);
            }
            75% {
              transform: rotate(-1deg) translateY(-1px);
            }
          }
        `}</style>
      )}

      <nav
        className={`relative z-[2000] shrink-0 pointer-events-auto bg-white border-t border-[#E2E8F0] px-1.5 pt-2 native-safe-area-bottom ${isHoodieExperience ? 'overflow-visible' : ''}`}
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        <div className={`grid items-end gap-1 ${isHoodieExperience ? 'grid-cols-5' : 'grid-cols-6'}`}>
          {navItems.map(({ view, icon: Icon, label, featured }) => {
            const active = activeView === view;
            const mascotNavIcon = isWolli
              ? wolliNavIcons[view]
              : isSetuChina
                ? setuChinaNavIcons[view]
                : isSetuIndia
                  ? setuIndiaNavIcons[view]
                  : isJomSettle
                    ? setuMalaysiaNavIcons[view]
                  : null;
            const zhLabel =
              isSetuChina
                ? label === 'Home'
                  ? '首页'
                  : label === 'Vibe'
                    ? '发现'
                    : label === 'Events'
                      ? '活动'
                      : label === 'Alerts'
                        ? '通知'
                        : label === 'Chat'
                          ? '聊天'
                        : label === 'Checklist'
                          ? '清单'
                          : label === 'Resources'
                            ? '资源'
                            : label === 'Profile'
                              ? '我的'
                              : '我的'
                : view === 'dashboard'
                  ? 'Start'
                  : view === 'vibe'
                    ? 'Places'
                    : view === 'arrival'
                      ? APP_CONFIG.assistantName
                      : view === 'resources'
                        ? 'Checklist'
                        : view === 'profile'
                          ? 'Profile'
                          : label;
            const malaysiaLabel =
              isJomSettle
                ? view === 'dashboard'
                  ? 'Home'
                  : view === 'vibe'
                    ? 'Explore'
                    : view === 'arrival'
                      ? 'Ask'
                      : view === 'resources'
                        ? 'Resources'
                        : view === 'profile'
                          ? 'Profile'
                          : label
                : label;

            if (featured && isHoodieExperience) {
              return (
                <div key={view} className="relative z-[2] flex justify-center">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-3 top-1 rounded-full bg-[#FACC15]/35 blur-2xl"
                    style={{
                      height: `${HOODIE_FEATURED_NAV_GEOMETRY.haloHeightPx}px`,
                      animation: 'hoodieniHaloPulse 2.8s ease-in-out infinite',
                    }}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-0 h-3 w-16 -translate-x-1/2 rounded-full bg-[#FACC15]/30 blur-xl"
                    style={{ animation: 'hoodieniHaloPulse 2.8s ease-in-out infinite' }}
                  />
                  <button
                    data-hoodienie-featured-nav-button="true"
                    onClick={(event) => {
                      onFeaturedNavigateStart?.(event.currentTarget.getBoundingClientRect());
                      handleNavItemClick(view);
                    }}
                    className={`relative z-[3] flex w-full flex-col items-center gap-1.5 rounded-[24px] border px-2 pb-2.5 pt-3 text-center transition-all cursor-pointer ${
                      active
                        ? 'border-[#FDE68A] bg-[linear-gradient(180deg,#111827_0%,#0F172A_100%)] text-white'
                        : 'border-[#FEF08A] bg-[linear-gradient(180deg,#1F2937_0%,#111827_100%)] text-[#F8FAFC]'
                    }`}
                    style={{
                      marginTop: `-${HOODIE_FEATURED_NAV_GEOMETRY.overhangPx}px`,
                      minHeight: `${HOODIE_FEATURED_NAV_GEOMETRY.buttonHeightPx}px`,
                      animation: 'hoodieniGlowPulse 2.8s ease-in-out infinite',
                    }}
                  >
                    <div className="relative flex h-11 w-11 items-center justify-center">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-1 h-2.5 w-6 rounded-full bg-[#FACC15]/35 blur-[2px]"
                      />
                      <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#FACC15] shadow-[0_10px_24px_rgba(250,204,21,0.28)]">
                        <img
                          src={hoodieniLampUrl}
                          alt=""
                          aria-hidden="true"
                          className="relative h-8 w-8 object-contain drop-shadow-[0_2px_2px_rgba(15,23,42,0.08)]"
                          style={{ animation: 'hoodieniLampSway 3.1s ease-in-out infinite' }}
                        />
                      </span>
                    </div>
                    <span className="max-w-full truncate text-[10px] font-semibold tracking-wide">
                      {label}
                    </span>
                  </button>
                </div>
              );
            }

            return (
              <button
                key={view}
                onClick={() => handleNavItemClick(view)}
                className={`flex w-full flex-col items-center transition-all cursor-pointer min-w-0 ${
                  usesRhinoStudentNav || isWolli || isJomSettle
                    ? active
                      ? 'min-h-[92px] -mt-3 justify-center gap-1 rounded-[24px] px-1 py-2 shadow-[0_12px_26px_rgba(240,68,68,0.12)]'
                      : 'min-h-[80px] justify-center gap-1 rounded-xl px-1 py-2'
                    : 'gap-1 rounded-xl px-1 py-1.5'
                } ${
                  active
                    ? usesRhinoStudentNav ? 'text-[#F04444] bg-[#F04444]/8' : isWolli ? 'text-[#008A8C] bg-[#008A8C]/8' : isJomSettle ? 'text-[#E53935] bg-[#E53935]/8' : 'text-[#1E40AF] bg-[#1E40AF]/8'
                    : 'text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F8FAFC]'
                }`}
              >
                {mascotNavIcon ? (
                  <img
                    src={active ? mascotNavIcon.active : mascotNavIcon.inactive}
                    alt=""
                    aria-hidden="true"
                    className={`shrink-0 object-contain transition-transform duration-200 ${
                      active ? 'h-14 w-14 scale-105' : 'h-10 w-10 opacity-90'
                    }`}
                    loading="lazy"
                  />
                ) : (
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2 : 1.5} />
                )}
                {usesRhinoStudentNav ? (
                  <span className="flex max-w-full flex-col items-center text-center leading-tight" style={{ fontWeight: active ? 700 : 500 }}>
                    <span className="max-w-full break-words text-[11px] leading-tight [overflow-wrap:anywhere]">{label}</span>
                    <span className="mt-0.5 max-w-full break-words text-[10px] leading-tight [overflow-wrap:anywhere]">{zhLabel}</span>
                  </span>
                ) : isWolli ? (
                  <span className="max-w-full break-words text-center text-[10px] leading-tight tracking-wide [overflow-wrap:anywhere]" style={{ fontWeight: active ? 700 : 500 }}>
                    {label}
                  </span>
                ) : isJomSettle ? (
                  <span className="flex max-w-full flex-col items-center text-center leading-tight" style={{ fontWeight: active ? 700 : 500 }}>
                    <span className="max-w-full break-normal text-[10px] leading-tight [overflow-wrap:normal]">{label}</span>
                    <span className="mt-0.5 max-w-full truncate whitespace-nowrap text-[8px] leading-tight text-[#64748B]">{malaysiaLabel}</span>
                  </span>
                ) : (
                  <span className="max-w-full truncate text-[9px] leading-tight tracking-wide" style={{ fontWeight: active ? 600 : 400 }}>
                    {label}
                  </span>
                )}
                </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
