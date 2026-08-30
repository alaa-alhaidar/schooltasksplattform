import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, RefreshCw, Search } from 'lucide-react';
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

export default function AuditLog() {
  const navigate = useNavigate();
  const { role } = useAppIdentity();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (role !== 'super_admin') {
      navigate('/dashboard', { replace: true });
      return;
    }
    const loadEntries = async () => {
      setLoading(true);
      const { data, error: loadError } = await supabase
        .from('content_audit_log')
        .select('id, actor_email, actor_name, action, entity_type, entity_title, created_at, classes(name, class_level, subclass)')
        .order('created_at', { ascending: false })
        .limit(500);
      if (loadError) setError(loadError.message);
      else setEntries((data || []) as unknown as AuditEntry[]);
      setLoading(false);
    };
    loadEntries();
  }, [navigate, role]);

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      [entry.actor_name, entry.actor_email, entry.entity_title, entry.classes?.name]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    );
  }, [entries, search]);

  return (
    <main className="min-h-screen bg-[#faf8f8] px-6 py-8 md:px-10 lg:px-14" dir="rtl">
      <header className="mb-8 border-b border-slate-200 pb-7">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
          <ClipboardList size={18} /><span>إدارة النظام</span>
        </div>
        <h1 className="text-3xl font-bold md:text-4xl">سجل تغييرات المحتوى</h1>
        <p className="mt-2 text-sm text-slate-500">آخر 500 عملية إنشاء أو تعديل أو حذف</p>
      </header>

      <div className="mb-5 flex max-w-xl items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
        <Search size={19} className="text-slate-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent outline-none" placeholder="البحث بالمعلم أو المحتوى أو الصف" />
      </div>

      {loading ? <RefreshCw className="mx-auto mt-24 animate-spin" size={30} /> : error ? (
        <div className="rounded-2xl bg-red-50 p-5 text-red-800">{error}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr><th className="p-4">الوقت</th><th className="p-4">المستخدم</th><th className="p-4">العملية</th><th className="p-4">المحتوى</th><th className="p-4">الصف</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="p-4 whitespace-nowrap">{new Date(entry.created_at).toLocaleString('ar')}</td>
                    <td className="p-4"><div className="font-semibold">{entry.actor_name || 'النظام'}</div><div className="text-xs text-slate-500">{entry.actor_email || '—'}</div></td>
                    <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${entry.action === 'delete' ? 'bg-red-100 text-red-800' : entry.action === 'update' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{actionLabels[entry.action]}</span></td>
                    <td className="p-4"><div className="font-semibold">{entry.entity_title || '—'}</div><div className="text-xs text-slate-500">{entityLabels[entry.entity_type] || entry.entity_type}</div></td>
                    <td className="p-4">{entry.classes ? `${entry.classes.class_level}${entry.classes.subclass.toUpperCase()}` : '—'}</td>
                  </tr>
                ))}
                {visibleEntries.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-500">لا توجد عمليات مسجلة</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
