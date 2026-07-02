import { useState, useEffect, useMemo } from 'react';
import { Search, Users, GraduationCap, MapPin, Calendar, Trash2, Pencil, X, Check, ChevronDown, ChevronUp, RefreshCw, Shield, Mail, Phone, Globe, BookOpen, Building2, Hash, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { fetchAllUsers, adminUpdateUser, adminDeleteUser, fetchUserStats } from '../lib/api';

interface UsersPanelProps {
  email: string;
}

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  dob: string;
  phone: string;
  citizenship: string;
  home_state: string;
  australian_state: string;
  audience_mode?: 'student' | 'newcomer';
  university: string;
  university_id: string;
  email_type: 'edu_au' | 'standard';
  course_name: string;
  graduation_year: number | null;
  postcode: string;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
}

type SortKey = 'name' | 'email' | 'university' | 'state' | 'created_at';
type SortDir = 'asc' | 'desc';

// Derive true email type from the email address itself (fallback for legacy data)
function resolveEmailType(user: UserProfile): 'edu_au' | 'standard' {
  if (user.email.toLowerCase().trim().endsWith('.edu.au')) return 'edu_au';
  return user.email_type || 'standard';
}

function getEmailHandle(email: string) {
  return String(email || '').split('@')[0]?.trim() || String(email || '').trim() || 'User';
}

function getUserDisplayName(user: UserProfile) {
  const name = `${user.first_name || ''} ${user.last_name || ''}`.replace(/\s+/g, ' ').trim();
  return name || getEmailHandle(user.email);
}

function getUserInitials(user: UserProfile) {
  const firstInitial = (user.first_name?.[0] || '').toUpperCase();
  const lastInitial = (user.last_name?.[0] || '').toUpperCase();
  if (firstInitial || lastInitial) return `${firstInitial}${lastInitial}`;
  const fallback = getEmailHandle(user.email).replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase();
  return fallback || 'U';
}

export function UsersPanel({ email: adminEmail }: UsersPanelProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<Record<string, { rental_count: number; listing_count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [filterState, setFilterState] = useState('');
  const [filterEmailType, setFilterEmailType] = useState<'' | 'edu_au' | 'standard'>('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    const [usersData, statsData] = await Promise.allSettled([
      fetchAllUsers(adminEmail),
      fetchUserStats(adminEmail),
    ]);

    if (usersData.status === 'fulfilled') {
      setUsers(usersData.value);
    } else {
      console.error('GHAR: Failed to load users:', usersData.reason);
      setUsers([]);
      setError(usersData.reason?.message || 'Failed to load users');
    }

    if (statsData.status === 'fulfilled') {
      setStats(statsData.value);
    } else {
      console.error('GHAR: Failed to load user stats:', statsData.reason);
      setStats({});
      if (usersData.status === 'fulfilled') {
        setError('User stats are unavailable right now, but the user list is still live.');
      }
    }

    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Derive unique states for filter
  const uniqueStates = useMemo(() => {
    const states = new Set(users.map(u => u.australian_state).filter(Boolean));
    return Array.from(states).sort();
  }, [users]);

  // Filter and sort
  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        getUserDisplayName(u).toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.university || '').toLowerCase().includes(q) ||
        (u.postcode || '').includes(q) ||
        (u.phone || '').includes(q)
      );
    }

    if (filterState) {
      result = result.filter(u => u.australian_state === filterState);
    }

    if (filterEmailType) {
      result = result.filter(u => resolveEmailType(u) === filterEmailType);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = getUserDisplayName(a).localeCompare(getUserDisplayName(b));
          break;
        case 'email':
          cmp = a.email.localeCompare(b.email);
          break;
        case 'university':
          cmp = (a.university || '').localeCompare(b.university || '');
          break;
        case 'state':
          cmp = (a.australian_state || '').localeCompare(b.australian_state || '');
          break;
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [users, searchQuery, filterState, filterEmailType, sortKey, sortDir]);

  // Stats derived from users
  const totalUsers = users.length;
  const eduUsers = users.filter(u => resolveEmailType(u) === 'edu_au').length;
  const standardUsers = users.filter(u => resolveEmailType(u) === 'standard').length;
  const stateBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    users.forEach(u => {
      const s = u.australian_state || 'Unknown';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [users]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const startEdit = (user: UserProfile) => {
    setEditingUser(user.email);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      citizenship: user.citizenship,
      home_state: user.home_state,
      australian_state: user.australian_state,
      audience_mode: user.audience_mode || 'student',
      university: user.university,
      university_id: user.university_id,
      email_type: user.email_type,
      course_name: user.course_name,
      graduation_year: user.graduation_year,
      postcode: user.postcode,
      dob: user.dob,
    });
    setExpandedUser(user.email);
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      await adminUpdateUser(editingUser, adminEmail, editForm);
      setEditingUser(null);
      setEditForm({});
      await loadData();
    } catch (err: any) {
      console.error('GHAR: Failed to update user:', err);
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async (targetEmail: string) => {
    setDeletingUser(true);
    try {
      await adminDeleteUser(targetEmail, adminEmail);
      setDeleteConfirm(null);
      setExpandedUser(null);
      await loadData();
    } catch (err: any) {
      console.error('GHAR: Failed to delete user:', err);
      setError(err.message);
    } finally {
      setDeletingUser(false);
    }
  };

  const labelClass = "text-[10px] tracking-wide uppercase text-[#94A3B8] mb-1 block font-medium";
  const inputClass = "w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10 font-normal";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#1E40AF]" strokeWidth={1.5} />
          <h2 className="text-base font-bold text-[#0F172A]">User Dashboard</h2>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#EEF2FF] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-[#64748B]" strokeWidth={1.5} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" strokeWidth={1.5} />
          <p className="text-xs text-red-700">{error}</p>
          <button onClick={() => setError('')} className="ml-auto cursor-pointer"><X className="w-3.5 h-3.5 text-red-400" /></button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gradient-to-br from-[#1E40AF]/10 to-[#1E40AF]/5 border border-[#1E40AF]/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-light text-[#1E40AF]">{totalUsers}</p>
          <p className="text-[9px] tracking-wide uppercase text-[#64748B] font-medium mt-0.5">Total Users</p>
        </div>
        <div className="bg-gradient-to-br from-[#16A34A]/10 to-[#16A34A]/5 border border-[#16A34A]/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-light text-[#16A34A]">{eduUsers}</p>
          <p className="text-[9px] tracking-wide uppercase text-[#64748B] font-medium mt-0.5">.edu.au</p>
        </div>
        <div className="bg-gradient-to-br from-[#EA580C]/10 to-[#EA580C]/5 border border-[#EA580C]/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-light text-[#EA580C]">{standardUsers}</p>
          <p className="text-[9px] tracking-wide uppercase text-[#64748B] font-medium mt-0.5">Standard</p>
        </div>
      </div>

      {/* State Breakdown */}
      {stateBreakdown.length > 0 && (
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
          <p className="text-[10px] tracking-wide uppercase text-[#94A3B8] font-medium mb-2">By State</p>
          <div className="flex flex-wrap gap-1.5">
            {stateBreakdown.map(([state, count]) => (
              <button
                key={state}
                onClick={() => setFilterState(f => f === state ? '' : state)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors cursor-pointer ${
                  filterState === state
                    ? 'bg-[#1E40AF] text-white'
                    : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#1E40AF]/30'
                }`}
              >
                {state} <span className="opacity-70">({count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" strokeWidth={1.5} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, university, postcode..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1E40AF] focus:ring-2 focus:ring-[#1E40AF]/10"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
              <X className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilterEmailType(f => f === 'edu_au' ? '' : 'edu_au')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
              filterEmailType === 'edu_au' ? 'bg-[#16A34A] text-white' : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]'
            }`}
          >
            .edu.au only
          </button>
          <button
            onClick={() => setFilterEmailType(f => f === 'standard' ? '' : 'standard')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
              filterEmailType === 'standard' ? 'bg-[#EA580C] text-white' : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]'
            }`}
          >
            Standard only
          </button>
          {(filterState || filterEmailType) && (
            <button
              onClick={() => { setFilterState(''); setFilterEmailType(''); }}
              className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-red-50 text-red-600 border border-red-200 cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Sort Bar */}
      <div className="flex items-center gap-1 text-[9px] tracking-wide uppercase text-[#94A3B8] font-medium">
        <span>Sort:</span>
        {(['name', 'email', 'university', 'state', 'created_at'] as SortKey[]).map(key => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            className={`px-2 py-1 rounded transition-colors cursor-pointer ${
              sortKey === key ? 'bg-[#1E40AF]/10 text-[#1E40AF]' : 'hover:bg-[#F8FAFC]'
            }`}
          >
            {key === 'created_at' ? 'Date' : key}
            {sortKey === key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <p className="text-[10px] text-[#94A3B8] font-medium">
        Showing {filteredUsers.length} of {totalUsers} users
      </p>

      {/* User List */}
      <div className="space-y-2">
        <AnimatePresence>
          {filteredUsers.map(user => {
            const isExpanded = expandedUser === user.email;
            const isEditing = editingUser === user.email;
            const userStats = stats[user.email] || { rental_count: 0, listing_count: 0 };

            return (
              <motion.div
                key={user.email}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
              >
                {/* User Row */}
                <button
                  onClick={() => {
                    if (isEditing) return;
                    setExpandedUser(isExpanded ? null : user.email);
                  }}
                  className="w-full flex items-center gap-3 p-3 text-left cursor-pointer hover:bg-[#F8FAFC]/50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {getUserInitials(user)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-[#0F172A] truncate">
                        {getUserDisplayName(user)}
                      </p>
                      {resolveEmailType(user) === 'edu_au' ? (
                        <span className="px-1.5 py-0.5 bg-[#16A34A]/10 text-[#16A34A] text-[8px] font-bold rounded-full tracking-wide uppercase flex-shrink-0">.edu.au</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-[#EA580C]/10 text-[#EA580C] text-[8px] font-bold rounded-full tracking-wide uppercase flex-shrink-0">Standard</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748B] truncate">{user.email}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {user.australian_state && (
                        <span className="text-[9px] text-[#94A3B8]">
                          <MapPin className="w-2.5 h-2.5 inline mr-0.5" strokeWidth={1.5} />{user.australian_state}
                        </span>
                      )}
                      <span className="text-[9px] text-[#94A3B8]">
                        <Calendar className="w-2.5 h-2.5 inline mr-0.5" strokeWidth={1.5} />
                        {format(new Date(user.created_at), 'dd MMM yyyy')}
                      </span>
                      {userStats.rental_count > 0 && (
                        <span className="text-[9px] text-[#94A3B8]">{userStats.rental_count} rentals</span>
                      )}
                      {userStats.listing_count > 0 && (
                        <span className="text-[9px] text-[#B91C1C]">{userStats.listing_count} flags</span>
                      )}
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#94A3B8] flex-shrink-0" strokeWidth={1.5} />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#94A3B8] flex-shrink-0" strokeWidth={1.5} />
                  )}
                </button>

                {/* Expanded Detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 border-t border-[#E2E8F0]">
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 py-2">
                          {!isEditing ? (
                            <>
                              <button
                                onClick={() => startEdit(user)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-[#EEF2FF] text-[#1E40AF] rounded-lg text-[10px] font-medium cursor-pointer hover:bg-[#1E40AF]/20 transition-colors"
                              >
                                <Pencil className="w-3 h-3" strokeWidth={1.5} /> Edit
                              </button>
                              {deleteConfirm === user.email ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-red-600 font-medium">Delete this user?</span>
                                  <button
                                    onClick={() => confirmDelete(user.email)}
                                    disabled={deletingUser}
                                    className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-medium cursor-pointer disabled:opacity-50"
                                  >
                                    {deletingUser ? '...' : 'Yes'}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-[10px] text-[#64748B] font-medium cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(user.email)}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-medium cursor-pointer hover:bg-red-100 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" strokeWidth={1.5} /> Delete
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                onClick={saveEdit}
                                disabled={savingEdit}
                                className="flex items-center gap-1 px-3 py-1.5 bg-[#16A34A] text-white rounded-lg text-[10px] font-medium cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3 h-3" strokeWidth={2} /> {savingEdit ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => { setEditingUser(null); setEditForm({}); }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] rounded-lg text-[10px] font-medium cursor-pointer"
                              >
                                <X className="w-3 h-3" strokeWidth={1.5} /> Cancel
                              </button>
                            </>
                          )}
                        </div>

                        {/* Detail Grid */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          {isEditing ? (
                            <>
                              <div>
                                <label className={labelClass}>First Name</label>
                                <input value={editForm.first_name || ''} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} className={inputClass} />
                              </div>
                              <div>
                                <label className={labelClass}>Last Name</label>
                                <input value={editForm.last_name || ''} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} className={inputClass} />
                              </div>
                              <div>
                                <label className={labelClass}>Phone</label>
                                <input value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className={inputClass} />
                              </div>
                              <div>
                                <label className={labelClass}>Date of Birth</label>
                                <input type="date" value={editForm.dob || ''} onChange={e => setEditForm(f => ({ ...f, dob: e.target.value }))} className={inputClass} />
                              </div>
                              <div>
                                <label className={labelClass}>Citizenship</label>
                                <input value={editForm.citizenship || ''} onChange={e => setEditForm(f => ({ ...f, citizenship: e.target.value }))} className={inputClass} />
                              </div>
                              <div>
                                <label className={labelClass}>Home State / Province</label>
                                <input value={editForm.home_state || ''} onChange={e => setEditForm(f => ({ ...f, home_state: e.target.value }))} className={inputClass} />
                              </div>
                              <div>
                                <label className={labelClass}>Australian State</label>
                                <input value={editForm.australian_state || ''} onChange={e => setEditForm(f => ({ ...f, australian_state: e.target.value }))} className={inputClass} />
                              </div>
                              <div>
                                <label className={labelClass}>Audience</label>
                                <select
                                  value={editForm.audience_mode || 'student'}
                                  onChange={e => setEditForm(f => ({ ...f, audience_mode: e.target.value as 'student' | 'newcomer' }))}
                                  className={inputClass}
                                >
                                  <option value="student">Student</option>
                                  <option value="newcomer">Newcomer</option>
                                </select>
                              </div>
                              <div>
                                <label className={labelClass}>Postcode</label>
                                <input value={editForm.postcode || ''} onChange={e => setEditForm(f => ({ ...f, postcode: e.target.value }))} className={inputClass} />
                              </div>
                              <div className="col-span-2">
                                <label className={labelClass}>University</label>
                                <input value={editForm.university || ''} onChange={e => setEditForm(f => ({ ...f, university: e.target.value }))} className={inputClass} />
                              </div>
                              <div>
                                <label className={labelClass}>University ID</label>
                                <input value={editForm.university_id || ''} onChange={e => setEditForm(f => ({ ...f, university_id: e.target.value }))} className={inputClass} />
                              </div>
                              <div>
                                <label className={labelClass}>Email Type</label>
                                <select
                                  value={editForm.email_type || 'standard'}
                                  onChange={e => setEditForm(f => ({ ...f, email_type: e.target.value as 'edu_au' | 'standard' }))}
                                  className={inputClass}
                                >
                                  <option value="edu_au">.edu.au</option>
                                  <option value="standard">Standard</option>
                                </select>
                              </div>
                              <div>
                                <label className={labelClass}>Course Name</label>
                                <input value={editForm.course_name || ''} onChange={e => setEditForm(f => ({ ...f, course_name: e.target.value }))} className={inputClass} />
                              </div>
                              <div>
                                <label className={labelClass}>Graduation Year</label>
                                <input type="number" value={editForm.graduation_year || ''} onChange={e => setEditForm(f => ({ ...f, graduation_year: e.target.value ? Number(e.target.value) : null }))} className={inputClass} />
                              </div>
                            </>
                          ) : (
                            <>
                              <DetailField icon={Mail} label="Email" value={user.email} />
                              <DetailField icon={Phone} label="Phone" value={user.phone || '—'} />
                              <DetailField icon={Calendar} label="DOB" value={user.dob ? format(new Date(user.dob), 'dd MMM yyyy') : '—'} />
                              <DetailField icon={Globe} label="Citizenship" value={user.citizenship || '—'} />
                              <DetailField icon={MapPin} label="Home State" value={user.home_state || '—'} />
                              <DetailField icon={MapPin} label="AU State" value={user.australian_state || '—'} />
                              <DetailField icon={Users} label="Audience" value={user.audience_mode === 'newcomer' ? 'Newcomer' : 'Student'} />
                              <DetailField icon={Hash} label="Postcode" value={user.postcode || '—'} />
                              <DetailField icon={GraduationCap} label="University" value={user.university || '—'} />
                              <DetailField icon={Shield} label="University ID" value={user.university_id || '—'} />
                              <DetailField icon={BookOpen} label="Course" value={user.course_name || '—'} />
                              <DetailField icon={Calendar} label="Grad Year" value={user.graduation_year ? String(user.graduation_year) : '—'} />
                              <DetailField icon={Building2} label="Rentals" value={String(userStats.rental_count)} />
                              <DetailField icon={Calendar} label="Joined" value={format(new Date(user.created_at), 'dd MMM yyyy, HH:mm')} />
                              {user.updated_at && (
                                <DetailField icon={Pencil} label="Updated" value={format(new Date(user.updated_at), 'dd MMM yyyy, HH:mm')} />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredUsers.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-[#E2E8F0] mx-auto mb-2" strokeWidth={1} />
            <p className="text-sm text-[#94A3B8]">
              {searchQuery || filterState || filterEmailType ? 'No users match your filters' : 'No registered users yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] tracking-wide uppercase text-[#94A3B8] mb-0.5 font-medium flex items-center gap-1">
        <Icon className="w-2.5 h-2.5" strokeWidth={1.5} />
        {label}
      </p>
      <p className="text-xs text-[#0F172A] font-normal break-all">{value}</p>
    </div>
  );
}
