import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList, Eye, RefreshCw, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppIdentity } from '../layout/AppLayout';
import { supabase } from '../lib/supabase';

interface AuditEntry {
  id: number;
  actor_email: string | null;
  actor_name: string | null;
  action: 'create' | 'update' | 'delete';
  entity_type: string;
  entity_title: string | null;
  created_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  classes: { name: string; class_level: number; subclass: string } | null;
}

const actionLabels = { create: 'إنشاء', update: 'تعديل', delete: 'حذف' };
const entityLabels: Record<string, string> = {
  assignments: 'مهمة',
  notifications: 'إشعار',
  class_schedule_entries: 'حصة دراسية',
  weekly_plans: 'خطة أسبوعية',
  weekly_plan_items: 'عنصر في الخطة',
};
const fieldLabels: Record<string, string> = {
  title: 'العنوان', description: 'الوصف', note: 'الملاحظة', subject: 'النوع',
  deadline: 'الموعد', due_at: 'موعد التسليم', class_level: 'الصف', subclass: 'الشعبة',
  status: 'الحالة', week_start: 'بداية الأسبوع', day: 'اليوم', start_time: 'وقت البداية',
  end_time: 'وقت النهاية', attachment_name: 'المرفق', external_link: 'الرابط', message: 'الرسالة',
};
const hiddenFields = new Set(['updated_at', 'created_at', 'teacher_url_avatar', 'teacher_avatar_url']);
const PAGE_SIZE = 25;

export default function AuditLog() {
  const navigate = useNavigate();
  const { role } = useAppIdentity();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (role !== 'super_admin') {
      navigate('/dashboard', { replace: true });
      return;
    }
    const loadEntries = async () => {
      setLoading(true);
      setError(null);
      const allEntries: AuditEntry[] = [];
      let offset = 0;
      while (true) {
        const { data, error: loadError } = await supabase
          .from('content_audit_log')
          .select('id, actor_email, actor_name, action, entity_type, entity_title, created_at, old_data, new_data, classes(name, class_level, subclass)')
          .order('created_at', { ascending: false })
          .range(offset, offset + 999);
        if (loadError) {
          setError(loadError.message);
          break;
        }
        const batch = (data || []) as unknown as AuditEntry[];
        allEntries.push(...batch);
        if (batch.length < 1000) break;
        offset += 1000;
      }
      setEntries(allEntries);
      setLoading(false);
    };
    loadEntries();
  }, [navigate, reloadKey, role]);

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) =>
      (actionFilter === 'all' || entry.action === actionFilter) &&
      (entityFilter === 'all' || entry.entity_type === entityFilter) &&
      (classFilter === 'all' || entry.classes?.name === classFilter) &&
      (actorFilter === 'all' || entry.actor_email === actorFilter) &&
      (!query || [entry.actor_name, entry.actor_email, entry.entity_title, entry.classes?.name]
        .filter(Boolean).some((value) => value!.toLowerCase().includes(query)))
    );
  }, [actionFilter, actorFilter, classFilter, entityFilter, entries, search]);

  useEffect(() => setPage(1), [actionFilter, actorFilter, classFilter, entityFilter, search]);
  const classes = useMemo(() => Array.from(new Set(entries.map((entry) => entry.classes?.name).filter(Boolean))) as string[], [entries]);
  const actors = useMemo(() => Array.from(new Map(entries.filter((entry) => entry.actor_email).map((entry) => [entry.actor_email!, entry.actor_name || entry.actor_email!])).entries()), [entries]);
  const pageCount = Math.max(1, Math.ceil(visibleEntries.length / PAGE_SIZE));
  const pagedEntries = visibleEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const changedFields = selectedEntry ? Array.from(new Set([
    ...Object.keys(selectedEntry.old_data || {}), ...Object.keys(selectedEntry.new_data || {}),
  ])).filter((key) => !hiddenFields.has(key) && JSON.stringify(selectedEntry.old_data?.[key]) !== JSON.stringify(selectedEntry.new_data?.[key])) : [];

  return (
    <main className="min-h-screen bg-[#faf8f8] px-6 py-8 md:px-10 lg:px-14" dir="rtl">
      <header className="mb-8 border-b border-slate-200 pb-7">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
          <ClipboardList size={18} /><span>إدارة النظام</span>
        </div>
        <h1 className="text-3xl font-bold md:text-4xl">سجل تغييرات المحتوى</h1>
        <p className="mt-2 text-sm text-slate-500">جميع عمليات الإنشاء والتعديل والحذف · {entries.length} سجل</p>
      </header>

      <div className="mb-5 grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-6">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 xl:col-span-2"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent py-3 outline-none" placeholder="بحث" /></div>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3"><option value="all">كل العمليات</option>{Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3"><option value="all">كل المحتوى</option>{Object.entries(entityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3"><option value="all">كل الصفوف</option>{classes.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3"><option value="all">كل المستخدمين</option>{actors.map(([email, name]) => <option key={email} value={email}>{name}</option>)}</select>
      </div>

      {loading ? <RefreshCw className="mx-auto mt-24 animate-spin" size={30} /> : error ? (
        <div className="rounded-2xl bg-red-50 p-5 text-red-800">{error}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr><th className="p-4">الوقت</th><th className="p-4">المستخدم</th><th className="p-4">العملية</th><th className="p-4">المحتوى</th><th className="p-4">الصف</th><th className="p-4">التفاصيل</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="p-4 whitespace-nowrap">{new Date(entry.created_at).toLocaleString('ar')}</td>
                    <td className="p-4"><div className="font-semibold">{entry.actor_name || 'النظام'}</div><div className="text-xs text-slate-500">{entry.actor_email || '—'}</div></td>
                    <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${entry.action === 'delete' ? 'bg-red-100 text-red-800' : entry.action === 'update' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{actionLabels[entry.action]}</span></td>
                    <td className="p-4"><div className="font-semibold">{entry.entity_title || '—'}</div><div className="text-xs text-slate-500">{entityLabels[entry.entity_type] || entry.entity_type}</div></td>
                    <td className="p-4">{entry.classes ? `${entry.classes.class_level}${entry.classes.subclass.toUpperCase()}` : '—'}</td>
                    <td className="p-4"><button onClick={() => setSelectedEntry(entry)} className="rounded-xl bg-slate-100 p-2 hover:bg-slate-200" aria-label="عرض التفاصيل"><Eye size={18} /></button></td>
                  </tr>
                ))}
                {visibleEntries.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-slate-500">لا توجد عمليات مسجلة</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 p-4">
            <button onClick={() => setReloadKey((value) => value + 1)} className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2"><RefreshCw size={16} /> تحديث</button>
            <div className="flex items-center gap-3"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-xl bg-slate-100 p-2 disabled:opacity-40"><ChevronRight size={18} /></button><span>{page} / {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} className="rounded-xl bg-slate-100 p-2 disabled:opacity-40"><ChevronLeft size={18} /></button></div>
          </div>
        </div>
      )}

      {selectedEntry && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4" onMouseDown={(event) => event.target === event.currentTarget && setSelectedEntry(null)}><section className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-2xl font-bold">{selectedEntry.entity_title || entityLabels[selectedEntry.entity_type]}</h2><p className="mt-1 text-sm text-slate-500">{actionLabels[selectedEntry.action]} · {new Date(selectedEntry.created_at).toLocaleString('ar')}</p></div><button onClick={() => setSelectedEntry(null)} className="rounded-xl p-2 hover:bg-slate-100"><X size={21} /></button></div><div className="mt-6 space-y-3">{changedFields.map((field) => <div key={field} className="rounded-2xl bg-slate-50 p-4"><h3 className="mb-2 text-sm font-bold">{fieldLabels[field] || field}</h3><div className="grid gap-2 md:grid-cols-2"><div><span className="text-xs text-slate-500">قبل</span><p className="mt-1 break-words">{String(selectedEntry.old_data?.[field] ?? '—')}</p></div><div><span className="text-xs text-slate-500">بعد</span><p className="mt-1 break-words">{String(selectedEntry.new_data?.[field] ?? '—')}</p></div></div></div>)}{changedFields.length === 0 && <p className="text-slate-500">لا توجد تفاصيل إضافية.</p>}</div></section></div>}
    </main>
  );
}
