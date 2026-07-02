import { useState } from 'react';
import { ArrowLeft, FileText, Image, Volume2, Download, Calendar, FolderOpen, Search } from 'lucide-react';
import { format } from 'date-fns';
import type { Evidence, Listing } from '../lib/mock-data';

interface VaultProps {
  onBack: () => void;
  evidence: Evidence[];
  listings: Listing[];
}

export function Vault({ onBack, evidence, listings }: VaultProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const getListingForEvidence = (listingId: string) =>
    listings.find((l) => l.id === listingId);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'screenshot': return <Image className="w-4 h-4" strokeWidth={1.5} />;
      case 'document': return <FileText className="w-4 h-4" strokeWidth={1.5} />;
      case 'audio': return <Volume2 className="w-4 h-4" strokeWidth={1.5} />;
      default: return <FileText className="w-4 h-4" strokeWidth={1.5} />;
    }
  };

  const filteredEvidence = evidence.filter(
    (e) =>
      e.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.notes.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedEvidence = filteredEvidence.reduce((acc, e) => {
    if (!acc[e.listing_id]) acc[e.listing_id] = [];
    acc[e.listing_id].push(e);
    return acc;
  }, {} as Record<string, Evidence[]>);

  return (
    <div className="size-full bg-white flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="border-b border-[#E2E8F0] px-4 py-3 native-safe-area-top flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-xs tracking-wide font-medium">Back</span>
        </button>
        <span className="text-xs tracking-wide text-[#64748B] font-medium">
          Evidence Vault
        </span>
        <div className="w-16" />
      </div>

      {/* Stats */}
      <div className="px-4 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-around">
        <div className="text-center">
          <p className="text-2xl text-[#0F172A]" style={{ fontWeight: 100 }}>{evidence.length}</p>
          <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">Items</p>
        </div>
        <div className="w-px h-8 bg-[#E2E8F0]" />
        <div className="text-center">
          <p className="text-2xl text-[#0F172A]" style={{ fontWeight: 100 }}>{Object.keys(groupedEvidence).length}</p>
          <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">Cases</p>
        </div>
        <div className="w-px h-8 bg-[#E2E8F0]" />
        <div className="text-center">
          <p className="text-2xl text-[#EE811A]" style={{ fontWeight: 100 }}>
            {listings.filter((l) => l.category === 'scam' || l.category === 'maintenance').length}
          </p>
          <p className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">Pending</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-[#E2E8F0]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" strokeWidth={1.5} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search evidence..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10"
            style={{ fontWeight: 400 }}
          />
        </div>
      </div>

      {/* Evidence List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {Object.keys(groupedEvidence).length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#94A3B8] text-sm font-normal">No evidence items found</p>
          </div>
        )}
        {Object.entries(groupedEvidence).map(([listingId, items]) => {
          const listing = getListingForEvidence(listingId);
          return (
            <div key={listingId}>
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen className="w-4 h-4 text-[#1E40AF]" strokeWidth={1.5} />
                <span className="text-xs text-[#0F172A] font-bold">
                  {listing?.listing_id_public || 'Unknown Case'}
                </span>
                <span className="text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">
                  {listing?.address || ''}
                </span>
              </div>
              <div className="space-y-2 ml-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-[#E2E8F0] rounded-xl p-3 flex items-center gap-3 hover:bg-[#F8FAFC] hover:shadow-sm transition-all"
                  >
                    <div className="w-9 h-9 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-center text-[#64748B]">
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#0F172A] truncate font-normal">
                        {item.filename}
                      </p>
                      <p className="text-xs text-[#94A3B8] font-normal">
                        {item.notes}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[#94A3B8]">
                        <Calendar className="w-3 h-3" strokeWidth={1.5} />
                        <span className="text-[9px] tracking-wide font-medium">
                          {format(new Date(item.created_at), 'dd MMM')}
                        </span>
                      </div>
                      <button className="w-8 h-8 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#1E40AF] transition-colors cursor-pointer">
                        <Download className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Generate PDF */}
      <div className="px-4 py-3 border-t border-[#E2E8F0]">
        <button className="w-full py-3.5 bg-[#0F172A] text-white rounded-xl flex items-center justify-center gap-2 hover:bg-[#1E293B] transition-all shadow-lg cursor-pointer">
          <FileText className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-xs tracking-wide font-medium">
            Generate Incident PDF
          </span>
        </button>
      </div>
    </div>
  );
}
