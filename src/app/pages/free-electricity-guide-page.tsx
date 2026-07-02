import { Browser } from '@capacitor/browser';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock3,
  ExternalLink,
  Info,
  PlugZap,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { APP_CONFIG } from '../lib/app-config';
import {
  FREE_ELECTRICITY_GUIDE_UPDATED_LABEL,
  freeElectricityBestUses,
  freeElectricityEligibility,
  freeElectricityGuideCities,
  freeElectricitySources,
  freeElectricityWatchOuts,
  type FreeElectricityGuideCity,
} from '../lib/free-electricity-guide';

function statusClassName(status: FreeElectricityGuideCity['status']) {
  return status === 'confirmed'
    ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
    : 'border-[#FED7AA] bg-[#FFF7ED] text-[#9A3412]';
}

function StatusIconBadge({
  status,
  label,
}: {
  status: FreeElectricityGuideCity['status'];
  label: string;
}) {
  const confirmed = status === 'confirmed';
  const Icon = confirmed ? CheckCircle2 : CircleHelp;

  return (
    <span
      aria-label={label}
      data-testid={confirmed ? 'free-electricity-status-confirmed' : 'free-electricity-status-not-confirmed'}
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
        confirmed
          ? 'border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]'
          : 'border-[#FDBA74] bg-[#FFEDD5] text-[#C2410C]'
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.1} aria-hidden="true" />
    </span>
  );
}

function getLocalizedStatusLabel(city: FreeElectricityGuideCity, isSetuChina: boolean) {
  if (!isSetuChina) return city.statusLabel;
  return city.status === 'confirmed' ? `${city.statusLabel} 已确认` : `${city.statusLabel} 未确认`;
}

function CitySummaryRow({ city, isSetuChina }: { city: FreeElectricityGuideCity; isSetuChina: boolean }) {
  const statusLabel = getLocalizedStatusLabel(city, isSetuChina);

  return (
    <tr className="border-b border-[#E2E8F0] last:border-b-0">
      <th scope="row" className="px-2 py-2.5 text-left align-top text-xs font-semibold text-[#0F172A] sm:px-3 sm:text-sm">
        <a
          href={`#${city.anchor}`}
          aria-label={`${city.city}, ${statusLabel}, jump to details`}
          className="inline-flex items-center gap-1.5 rounded-md font-bold text-[#1D4ED8] underline underline-offset-4 transition-colors hover:text-[#1E3A8A]"
        >
          <StatusIconBadge status={city.status} label={statusLabel} />
          <span>{city.city}</span>
        </a>
        <span className="ml-1 text-[11px] font-medium text-[#64748B] sm:text-xs">{city.state}</span>
      </th>
      <td className="px-2 py-2.5 align-top text-xs leading-5 text-[#334155] sm:px-3 sm:text-sm">{city.starts}</td>
      <td className="px-2 py-2.5 align-top text-xs font-semibold leading-5 text-[#0F172A] sm:px-3 sm:text-sm">{city.freeWindow}</td>
    </tr>
  );
}

function InfoList({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof CheckCircle2;
  items: string[];
}) {
  return (
    <section className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1D4ED8]">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <h2 className="text-lg font-bold text-[#0F172A]">{title}</h2>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-[#475569]">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" strokeWidth={1.8} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FreeElectricityGuidePage() {
  const navigate = useNavigate();
  const isSetuChina = APP_CONFIG.variant === 'setu_china';

  const openOfficialSource = (url: string) => {
    void Browser.open({ url }).catch(() => {
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  };

  return (
    <div className="size-full overflow-y-auto bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <main className={`${isSetuChina ? 'w-full max-w-none' : 'mx-auto w-full max-w-5xl'} flex flex-col gap-6 px-4 py-5 pb-10 native-safe-area-top`}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          {isSetuChina ? 'Back 返回' : 'Back'}
        </button>

        <header className="space-y-4 border-b border-[#E2E8F0] pb-6">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-xs font-semibold text-[#1D4ED8]">
              <Zap className="h-4 w-4" strokeWidth={1.8} />
              {isSetuChina ? '2026 update / 2026 更新' : '2026 update'}
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#475569]">
              <CalendarDays className="h-4 w-4" strokeWidth={1.8} />
              Updated: {FREE_ELECTRICITY_GUIDE_UPDATED_LABEL}{isSetuChina ? ' / 更新' : ''}
            </span>
          </div>
          <div>
            <h1 className="max-w-3xl text-3xl font-bold leading-tight text-[#0F172A] md:text-4xl">
              3 Hours Daily Free Electricity in Australia: 2026 City Guide
            </h1>
            {isSetuChina ? (
              <p className="mt-2 max-w-3xl text-xl font-bold leading-8 text-[#0F172A]">
                澳洲每日 3 小时免费用电：2026 城市指南
              </p>
            ) : null}
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#475569]">
              Australia&apos;s free midday electricity rollout is confirmed in some regions and still unavailable in others.
              This guide shows the city-by-city timing, what households need, and the watch-outs before switching plans.
            </p>
            {isSetuChina ? (
              <p className="mt-2 max-w-3xl text-base leading-7 text-[#475569]">
                部分地区已确认中午免费用电时段，其他地区仍需向电力零售商确认。本指南按城市说明时间、准备事项和换套餐前需要注意的问题。
              </p>
            ) : null}
          </div>
        </header>

        <section className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F0FDF4] text-[#16A34A]">
              <Clock3 className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">{isSetuChina ? 'Quick guide 快速指南' : 'Quick guide'}</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                {isSetuChina ? 'Tap a city to jump to the full section. 点击城市查看详细说明。' : 'Tap a city to jump to the full section.'}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#475569]">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-1.5 text-[#166534]">
              <StatusIconBadge status="confirmed" label={isSetuChina ? 'Confirmed 已确认' : 'Confirmed'} />
              {isSetuChina ? 'Confirmed 已确认' : 'Confirmed'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-2.5 py-1.5 text-[#9A3412]">
              <StatusIconBadge status="not-confirmed" label={isSetuChina ? 'Not confirmed 未确认' : 'Not confirmed'} />
              {isSetuChina ? 'Not confirmed / check retailer 未确认 / 请确认零售商' : 'Not confirmed / check retailer'}
            </span>
          </div>
          <div className="mt-3">
            <table className="w-full table-fixed border-collapse text-left">
              <caption className="sr-only">Free electricity city timing table</caption>
              <thead>
                <tr className="border-y border-[#E2E8F0] bg-[#F8FAFC]">
                  <th scope="col" className="w-[42%] px-2 py-2.5 text-xs font-semibold text-[#475569] sm:px-3">{isSetuChina ? 'City 城市' : 'City'}</th>
                  <th scope="col" className="w-[29%] px-2 py-2.5 text-xs font-semibold text-[#475569] sm:px-3">{isSetuChina ? 'Starts 开始' : 'Starts'}</th>
                  <th scope="col" className="w-[29%] px-2 py-2.5 text-xs font-semibold text-[#475569] sm:px-3">{isSetuChina ? 'Free window 免费时段' : 'Free window'}</th>
                </tr>
              </thead>
              <tbody>
                {freeElectricityGuideCities.map((city) => (
                  <CitySummaryRow key={city.anchor} city={city} isSetuChina={isSetuChina} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4" aria-label="City details">
          {freeElectricityGuideCities.map((city) => (
            <article
              key={city.anchor}
              id={city.anchor}
              className="scroll-mt-20 rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm md:p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#475569]">
                      {city.region}
                    </span>
                    <span className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${statusClassName(city.status)}`}>
                      {getLocalizedStatusLabel(city, isSetuChina)}
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-bold leading-tight text-[#0F172A]">
                    {city.city} / {city.state}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#475569]">{city.summary}</p>
                </div>
                <div className="grid min-w-[15rem] gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#64748B]">{isSetuChina ? 'Starts 开始' : 'Starts'}</span>
                    <span className="font-semibold text-[#0F172A]">{city.starts}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#64748B]">{isSetuChina ? 'Window 时段' : 'Window'}</span>
                    <span className="font-semibold text-[#0F172A]">{city.freeWindow}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#64748B]">{isSetuChina ? 'Offer 套餐' : 'Offer'}</span>
                    <span className="text-right font-semibold text-[#0F172A]">{city.offerName}</span>
                  </div>
                </div>
              </div>
              <ul className="mt-5 grid gap-3 md:grid-cols-2">
                {city.details.map((detail) => (
                  <li key={`${city.anchor}-${detail}`} className="flex gap-3 text-sm leading-6 text-[#475569]">
                    {city.status === 'confirmed' ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" strokeWidth={1.8} />
                    ) : (
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#EA580C]" strokeWidth={1.8} />
                    )}
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => openOfficialSource(city.sourceUrl)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-sm font-semibold text-[#1D4ED8] transition-colors hover:bg-[#DBEAFE]"
              >
                {isSetuChina ? 'Know more 了解更多' : 'Know more'}
                <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <InfoList title={isSetuChina ? 'What you need 你需要准备' : 'What you need'} icon={PlugZap} items={freeElectricityEligibility} />
          <InfoList title={isSetuChina ? 'Best uses 适合用途' : 'Best uses'} icon={Zap} items={freeElectricityBestUses} />
          <InfoList title={isSetuChina ? 'Watch-outs 注意事项' : 'Watch-outs'} icon={ShieldAlert} items={freeElectricityWatchOuts} />
        </section>

        <section className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F8FAFC] text-[#0F172A]">
              <ExternalLink className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">{isSetuChina ? 'Official sources 官方来源' : 'Official sources'}</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                {isSetuChina
                  ? 'Official government and regulator links used for this guide. 本指南参考的政府和监管机构链接。'
                  : 'Official government and regulator links used for this guide.'}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {freeElectricitySources.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-lg border border-[#E2E8F0] px-3 py-3 text-sm font-semibold text-[#1D4ED8] transition-colors hover:bg-[#EFF6FF]"
              >
                <span>{source.label}</span>
                <ExternalLink className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
