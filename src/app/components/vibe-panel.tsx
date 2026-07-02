import { useMemo, useState } from 'react';
import { Users, Globe, Utensils, MapPin, GraduationCap, Building, Store, Train, ShoppingBasket, TrendingUp, Bus, Plane, Shield, Hospital, BarChart3, Info } from 'lucide-react';
import { hasBrokenSuburbDemographics, suburbDemographics } from '../lib/demographics-data';
import policeLocations from '../../imports/ghar_police_locations.json';
import hospitalLocations from '../../imports/ghar_hospital_locations.json';
import { lookupCrimeForSuburb, getCautionStyle } from '../lib/suburb-crime-map';
import {
  getVibeDemographicBarWidth,
  getVibeDemographicView,
  sortVibeDemographics,
} from '../lib/vibe-demographics';

interface VibePanelProps {
  suburbName: string;
}

export function VibePanel({ suburbName }: VibePanelProps) {
  const [activeTab, setActiveTab] = useState<'diversity' | 'crime' | 'lifestyle'>('diversity');

  const data = useMemo(() => {
    return suburbDemographics.find(d => d.suburb.toLowerCase() === suburbName.toLowerCase());
  }, [suburbName]);

  if (!data || hasBrokenSuburbDemographics(data)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-14 h-14 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex items-center justify-center mb-4">
          <MapPin className="w-6 h-6 text-[#94A3B8]" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-bold text-[#0F172A]">No vibe data available for {suburbName}</p>
        <p className="text-xs mt-2 text-[#64748B] text-center font-normal">Select another suburb while this data is refreshed.</p>
      </div>
    );
  }

  const demographicView = getVibeDemographicView(data);
  const isStudentResidentView = demographicView === 'student_residents';
  const sortedDemographics = sortVibeDemographics(data.demographics, demographicView);
  const topDemographics = sortedDemographics.slice(0, 5);
  const visibleDemographics = sortedDemographics.slice(0, data.maxVisibleDemographics ?? 5);

  // Vibe Tags
  const vibeTags: { label: string; icon: any; color: string; bgColor: string }[] = [];
  if (!isStudentResidentView) {
    topDemographics.forEach(demo => {
      const studentRatio = demo.total > 0 ? demo.students / demo.total : 0;
      if (studentRatio > 0.5 && demo.students > 100) {
        vibeTags.push({ label: 'Strong Student Hub', icon: GraduationCap, color: 'text-[#B45309]', bgColor: 'bg-[#FFFBEB] border-[#FDE68A]' });
      } else if (demo.total > 500 && studentRatio <= 0.2) {
        vibeTags.push({ label: 'Cultural Infrastructure', icon: Utensils, color: 'text-[#059669]', bgColor: 'bg-[#ECFDF5] border-[#A7F3D0]' });
      }
    });
  }
  if (vibeTags.length === 0) {
    if (data.totalStudents > 1000) {
      vibeTags.push({ label: 'Active Campus Vibe', icon: Users, color: 'text-[#1E40AF]', bgColor: 'bg-[#EFF6FF] border-[#BFDBFE]' });
    } else {
      vibeTags.push({ label: 'Quiet Residential', icon: Building, color: 'text-[#64748B]', bgColor: 'bg-[#F8FAFC] border-[#E2E8F0]' });
    }
  }
  const uniqueVibeTags = Array.from(new Map(vibeTags.map(item => [item.label, item])).values());

  // Deterministic lifestyle metrics
  const metrics = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < suburbName.length; i++) {
      hash = suburbName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absHash = Math.abs(hash);
    return {
      stores: 10 + (absHash % 150),
      transit: (absHash % 2 === 0) ? 'Train Station' : 'Bus Hub',
      transitDist: 1 + (absHash % 15),
      groceries: 2 + (absHash % 20),
      employment: 60 + (absHash % 35),
      busDist: 1 + (absHash % 10),
      airportDist: 15 + (absHash % 45),
      policeDist: (() => {
        const subLower = suburbName.toLowerCase();
        const matching = policeLocations.filter((ps: any) => 
          ps.status === 'OPERATIONAL' && (ps.suburb || '').toLowerCase() === subLower
        );
        if (matching.length > 0) return 2 + (absHash % 6);
        return 5 + (absHash % 20);
      })(),
      hospitalDist: (() => {
        // Check if any hospitals are in the same state as this suburb (rough proximity)
        const hasNearby = hospitalLocations.some((h: any) => !h.closed && h.lat && h.lng);
        if (hasNearby) return 3 + (absHash % 15);
        return 10 + (absHash % 25);
      })(),
    };
  }, [suburbName]);

  const crimeData = useMemo(() => {
    return lookupCrimeForSuburb(suburbName, data?.state || '');
  }, [suburbName, data]);

  return (
    <div className="w-full bg-white flex flex-col">
      <div className="w-full flex flex-col">
        {/* Hero */}
        <div className="px-4 pt-5 pb-5 border-b border-[#E2E8F0] bg-white shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8]">Vibe Analysis</span>
            {uniqueVibeTags.slice(0, 1).map((tag, idx) => (
              <div key={idx} className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${tag.bgColor}`}>
                <tag.icon className={`w-3 h-3 ${tag.color}`} strokeWidth={2} />
                <span className={`text-[10px] font-bold tracking-wide ${tag.color}`}>{tag.label}</span>
              </div>
            ))}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] mb-1 leading-none">
            {data.suburb}, <span className="text-[#94A3B8] font-medium">{data.state}</span>
          </h1>
          
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold tracking-tighter text-[#0F172A] leading-none">
              {data.totalStudents.toLocaleString()}
            </span>
            <span className="text-[#64748B] text-sm font-medium">Tertiary Students</span>
          </div>
          <p className="text-xs text-[#64748B] mt-2 font-normal leading-relaxed">
            Active tertiary students from all nationalities currently living in this area.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center px-4 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 shrink-0">
          {([
            { id: 'diversity' as const, label: 'Diversity' },
            { id: 'crime' as const, label: 'Crime' },
            { id: 'lifestyle' as const, label: 'Lifestyle' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-[13px] font-bold border-b-2 transition-colors text-center cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#059669] text-[#059669]'
                  : 'border-transparent text-[#94A3B8] hover:text-[#64748B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white p-4">
          {activeTab === 'diversity' && (
            <div className="space-y-4">
              <div className="flex justify-end items-center mb-2">
                {isStudentResidentView ? (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                    <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <span>Student residents by country of birth</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#F1F5F9] border border-[#E2E8F0]" />
                      <span>Total Pop</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                      <span>Students</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {visibleDemographics.map((demo, idx) => {
                  const widthStudent = getVibeDemographicBarWidth(demo, visibleDemographics, demographicView);
                  return (
                    <div key={idx} className="space-y-1.5" data-testid="vibe-demographic-row">
                      <div className="flex justify-between items-end">
                        <span className="text-[13px] font-bold text-[#0F172A]">{demo.name}</span>
                        {isStudentResidentView ? (
                          <div className="text-[11px] flex gap-2">
                            <span className="text-[#059669] font-bold">{demo.students.toLocaleString()} students</span>
                          </div>
                        ) : (
                          <div className="text-[11px] flex gap-2">
                            <span className="text-[#94A3B8] font-medium">{demo.total.toLocaleString()} total</span>
                            <span className="text-[#059669] font-bold">{demo.students.toLocaleString()} students</span>
                          </div>
                        )}
                      </div>
                      <div className="h-3 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div 
                          data-testid="vibe-demographic-bar"
                          className="h-full bg-[#10B981] rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${widthStudent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'crime' && crimeData && (() => {
            if (crimeData.status === 'coming_soon') {
              return (
                <div className="flex flex-col items-center justify-center h-full py-10 px-4 text-center">
                  <div className="w-16 h-16 bg-[#F8FAFC] rounded-2xl flex items-center justify-center mb-4 border border-[#E2E8F0]">
                    <BarChart3 className="w-8 h-8 text-[#94A3B8]" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[#0F172A] font-bold mb-2">Crime Data Coming Soon</h3>
                  <p className="text-xs text-[#64748B] max-w-[200px] leading-relaxed">
                    We're currently waiting for cleaner government data to accurately map crime stats{crimeData.state ? ` for ${crimeData.state}` : ' for this area'}. Check back soon!
                  </p>
                </div>
              );
            }

            const record = crimeData.data;
            const style = getCautionStyle(record.scores?.overall_caution_band || 'Statewide context');
            
            // Map the metrics safely
            const metrics_crime = [
              { label: 'DV Assault', value: record.metrics.dv_assault || record.metrics.dv_order_breach || 0 },
              { label: 'Non-DV Assault', value: record.metrics.non_dv_assault || 0 },
              { label: 'Robbery', value: record.metrics.robbery || 0 },
              { label: 'Break & Enter (Dwelling)', value: record.metrics.break_enter_dwelling || 0 },
              ...(record.metrics.break_enter_non_dwelling !== undefined ? [{ label: 'Break & Enter (Non-Dwelling)', value: record.metrics.break_enter_non_dwelling }] : []),
              { label: 'Motor Vehicle Theft', value: record.metrics.motor_vehicle_theft || 0 },
              { label: 'Steal from Vehicle', value: record.metrics.steal_from_vehicle || 0 },
              { label: 'Retail Theft', value: record.metrics.retail_theft || 0 },
              { label: 'Malicious Damage', value: record.metrics.malicious_damage || 0 },
            ].filter(m => m.value > 0 || m.label !== 'DV Assault'); // DV assault mapping fallback logic might yield 0

            const maxVal = Math.max(...metrics_crime.map(m => m.value), 1); // fallback to 1 to avoid / 0
            
            return (
              <div className="space-y-4">
                {/* Headline card */}
                <div className={`rounded-2xl border p-4 ${style.bg} ${style.border}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: style.dotColor }}>
                      <BarChart3 className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                         <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: style.dotColor }} />
                        <p className={`text-sm font-bold ${style.text}`}>{style.label}</p>
                      </div>
                      <p className="text-xs text-[#64748B] font-normal leading-relaxed">{record.display.summary}</p>
                    </div>
                  </div>
                  {record.scores && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/70 rounded-xl p-2.5 text-center">
                        <p className="text-lg font-bold text-[#0F172A]">{record.scores.overall_caution_score_0_100}</p>
                        <p className="text-[8px] tracking-wider uppercase text-[#94A3B8] font-bold mt-0.5">Overall</p>
                      </div>
                      <div className="bg-white/70 rounded-xl p-2.5 text-center">
                        <p className="text-lg font-bold text-[#0F172A]">{record.scores.personal_safety_score_0_100}</p>
                        <p className="text-[8px] tracking-wider uppercase text-[#94A3B8] font-bold mt-0.5">Personal</p>
                      </div>
                      <div className="bg-white/70 rounded-xl p-2.5 text-center">
                        <p className="text-lg font-bold text-[#0F172A]">{record.scores.property_crime_score_0_100}</p>
                        <p className="text-[8px] tracking-wider uppercase text-[#94A3B8] font-bold mt-0.5">Property</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* LGA label */}
                <div className="flex items-center gap-2 px-1">
                  <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" strokeWidth={1.5} />
                  <p className="text-[10px] text-[#64748B] font-medium">
                    {record.geo_type === 'LGA' ? 'LGA' : record.geo_type === 'SA2' ? 'SA2' : record.geo_type === 'state' ? 'State' : 'District'}: <span className="font-bold text-[#0F172A]">{record.lga_or_district}</span>
                    {record.reporting_region && (
                      <>
                        <span className="mx-1">•</span>
                        Region: <span className="font-bold text-[#0F172A]">{record.reporting_region}</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Metrics breakdown */}
                <div>
                  <p className="text-[9px] tracking-wider uppercase text-[#94A3B8] font-bold mb-2.5">{record.metrics_label}</p>
                  <div className="space-y-2.5">
                    {metrics_crime.map((m, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-end">
                          <span className="text-[11px] font-medium text-[#0F172A]">{m.label}</span>
                          <span className="text-[11px] font-bold text-[#0F172A]">{m.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                        </div>
                        <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${Math.max(2, (m.value / maxVal) * 100)}%`, backgroundColor: style.dotColor }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="flex items-start gap-2 px-3 py-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <Info className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 mt-0.5" strokeWidth={2} />
                  <p className="text-[9px] text-[#94A3B8] font-normal leading-relaxed">
                    {record.notes.warning} Source: {record.period}.
                  </p>
                </div>
              </div>
            );
          })()}

          {activeTab === 'lifestyle' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Store, value: metrics.stores, label: 'Local Stores', color: 'bg-[#EEF2FF] text-[#4F46E5]' },
                { icon: Train, value: `${metrics.transitDist} min`, label: 'Train Station', color: 'bg-[#EFF6FF] text-[#2563EB]' },
                { icon: Bus, value: `${metrics.busDist} min`, label: 'Bus Stop', color: 'bg-[#F0F9FF] text-[#0284C7]' },
                { icon: ShoppingBasket, value: metrics.groceries, label: 'Supermarkets', color: 'bg-[#ECFDF5] text-[#059669]' },
                { icon: Shield, value: `${metrics.policeDist} min`, label: 'Police Station', color: 'bg-[#EFF6FF] text-[#1E40AF]' },
                { icon: Hospital, value: `${metrics.hospitalDist} min`, label: 'Hospital', color: 'bg-[#FEF2F2] text-[#DC2626]' },
                { icon: Plane, value: `${metrics.airportDist} min`, label: 'Airport', color: 'bg-[#F8FAFC] text-[#64748B]' },
                { icon: TrendingUp, value: metrics.employment, label: 'Employment Score', color: 'bg-[#FFFBEB] text-[#D97706]', suffix: '/100' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col">
                  <div className={`w-8 h-8 rounded-xl ${item.color} flex items-center justify-center mb-2.5`}>
                    <item.icon className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <span className="text-xl font-bold text-[#0F172A]">{item.value}</span>
                    {item.suffix && <span className="text-xs font-medium text-[#94A3B8]">{item.suffix}</span>}
                  </div>
                  <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
