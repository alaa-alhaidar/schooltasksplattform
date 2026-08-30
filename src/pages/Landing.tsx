import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  FileText,
  LockKeyhole,
  Menu,
  Paperclip,
  School,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const features = [
  { icon: CalendarDays, title: 'خطة أسبوعية واضحة', text: 'المهام مرتبة حسب اليوم والتاريخ مع موعد التسليم الحقيقي.' },
  { icon: BookOpen, title: 'جدول دراسي ثابت', text: 'جدول الحصص يبقى متاحاً طوال الأسبوع ويتحدث فوراً عند أي تغيير.' },
  { icon: Bell, title: 'إعلانات لا تضيع', text: 'التنبيهات المهمة تبقى ظاهرة حتى تاريخ انتهائها.' },
  { icon: Paperclip, title: 'أوراق عمل ومرفقات', text: 'ملفات PDF والصور والروابط جاهزة للفتح من تفاصيل المهمة.' },
  { icon: Users, title: 'حساب واحد لكل صف', text: 'دخول بسيط للطلاب والأهل من دون إدارة عشرات الحسابات الفردية.' },
  { icon: ShieldCheck, title: 'صلاحيات واضحة', text: 'المعلم يكتب لصفه، والطلاب والأهل يقرؤون فقط.' },
];

const weekDays = [
  { day: 'الاثنين', date: '31.08', color: 'bg-blue-50', task: 'دفتر القراءة' },
  { day: 'الثلاثاء', date: '01.09', color: 'bg-violet-50', task: 'تدريب الضرب' },
  { day: 'الأربعاء', date: '02.09', color: 'bg-amber-50', task: 'عرض كتاب' },
  { day: 'الخميس', date: '03.09', color: 'bg-teal-50', task: 'دورة الماء' },
  { day: 'الجمعة', date: '04.09', color: 'bg-rose-50', task: 'مراجعة الأسبوع' },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fbfaf8] text-slate-950" dir="rtl">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-[#fbfaf8]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white"><BookOpen size={22} /></span>
            <span className="text-lg font-black">مهامي المدرسية</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
            <a href="#features" className="hover:text-emerald-700">الميزات</a>
            <a href="#idea" className="hover:text-emerald-700">فكرة المنصة</a>
            <a href="#security" className="hover:text-emerald-700">الأمان</a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-bold hover:bg-white">تسجيل الدخول</Link>
            <a href="#contact" className="rounded-full bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800">للمدارس</a>
          </div>
          <button onClick={() => setMenuOpen((open) => !open)} className="rounded-xl p-2 md:hidden" aria-label="القائمة">{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && <div className="border-t bg-white px-5 py-5 md:hidden"><div className="flex flex-col gap-4 font-semibold"><a href="#features" onClick={() => setMenuOpen(false)}>الميزات</a><a href="#idea" onClick={() => setMenuOpen(false)}>فكرة المنصة</a><a href="#security" onClick={() => setMenuOpen(false)}>الأمان</a><Link to="/login" className="rounded-xl bg-black px-4 py-3 text-center text-white">تسجيل الدخول</Link></div></div>}
      </header>

      <main>
        <section className="relative px-5 pb-20 pt-16 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="absolute right-[-10rem] top-10 h-80 w-80 rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-900"><School size={17} /> لوحة الصف الرقمية</span>
              <h1 className="mt-7 text-4xl font-black leading-[1.25] md:text-6xl">كل ما يحتاجه الصف،<br /><span className="text-emerald-700">واضح وفي مكان واحد.</span></h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">خطة أسبوعية، واجبات، جدول دراسي، إعلانات وأوراق عمل للطلاب والأهل. بدون تعقيد أنظمة الإدارة المدرسية وبدون بيانات شخصية حساسة.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/login" className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3.5 font-bold text-white shadow-lg shadow-black/10 hover:bg-emerald-800">الدخول إلى المنصة <ChevronLeft size={18} /></Link>
                <a href="#idea" className="rounded-full border border-slate-300 bg-white px-6 py-3.5 font-bold hover:border-slate-500">كيف تعمل؟</a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600">
                <span className="flex items-center gap-2"><Check className="text-emerald-600" size={18} /> حساب واحد لكل صف</span>
                <span className="flex items-center gap-2"><Check className="text-emerald-600" size={18} /> عربية أولاً</span>
                <span className="flex items-center gap-2"><Check className="text-emerald-600" size={18} /> تعمل على الهاتف</span>
              </div>
            </div>

            <div className="relative rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/50 md:p-6">
              <div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold text-slate-400">مدرسة الأمل · الصف 4A</p><h2 className="mt-1 text-2xl font-black">الخطة الأسبوعية</h2></div><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white"><BookOpen size={20} /></span></div>
              <div className="mb-5 rounded-2xl bg-amber-50 p-4"><div className="flex items-center gap-2 font-bold"><Bell size={17} /> اجتماع أولياء الأمور</div><p className="mt-2 text-sm text-amber-900/70">يوم الخميس الساعة السادسة مساءً.</p></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {weekDays.map((item) => <div key={item.day}><div className={`rounded-xl p-3 text-center ${item.color}`}><div className="font-black">{item.day}</div><div className="mt-1 text-xs text-slate-500">{item.date}</div></div><div className={`mt-2 min-h-28 rounded-xl p-3 ${item.color}`}><div className="flex items-start justify-between gap-1"><FileText size={16} /><span className="text-xs font-bold">{item.task}</span></div><div className="mt-5 text-[10px] text-slate-500">التسليم 17:00</div></div></div>)}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="bg-white px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="font-bold text-emerald-700">المهم فقط</p><h2 className="mt-3 text-3xl font-black md:text-4xl">وظائف واضحة للاستخدام اليومي</h2><p className="mt-4 leading-7 text-slate-600">صُممت المنصة لتجيب عن أسئلة الأسرة الأساسية: ماذا لدينا هذا الأسبوع؟ متى التسليم؟ وهل تغير شيء؟</p></div><div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-3xl border border-slate-200 p-6 transition hover:-translate-y-1 hover:shadow-xl"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><Icon size={22} /></span><h3 className="mt-5 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-slate-600">{text}</p></article>)}</div></div>
        </section>

        <section id="idea" className="px-5 py-20 lg:px-8"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2"><div><p className="font-bold text-emerald-700">فكرة مختلفة</p><h2 className="mt-3 text-3xl font-black md:text-4xl">ليست نظاماً مدرسياً معقداً</h2><p className="mt-5 text-lg leading-8 text-slate-600">مهامي المدرسية هي لوحة معلومات للصف. لا علامات، لا حضور، لا ملفات شخصية للطلاب، ولا مئات الحسابات التي تحتاج إلى إدارة.</p></div><div className="space-y-4">{['حساب قراءة مشترك وآمن لكل صف', 'حساب معلم بصلاحية كتابة لصفه فقط', 'تحديث فوري يظهر لجميع الطلاب والأهل', 'سجل تغييرات لا يراه إلا المشرف العام'].map((text, index) => <div key={text} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black font-bold text-white">{index + 1}</span><span className="font-bold">{text}</span></div>)}</div></div></section>

        <section id="security" className="bg-slate-950 px-5 py-20 text-white lg:px-8"><div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2"><div><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950"><LockKeyhole size={27} /></span><h2 className="mt-6 text-3xl font-black md:text-4xl">خصوصية من خلال البساطة</h2><p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">المنصة لا تحتاج إلى أسماء الطلاب أو درجاتهم أو عناوينهم. ملفات الواجبات محفوظة بشكل خاص، وكل تغيير يقوم به المعلم مسجل في قاعدة البيانات.</p></div><div className="grid gap-4 sm:grid-cols-2">{['لا بيانات طلاب حساسة', 'مرفقات خاصة بالصف', 'صلاحيات كتابة محددة', 'سجل إداري كامل'].map((text) => <div key={text} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5"><Check className="text-emerald-400" /><span className="font-bold">{text}</span></div>)}</div></div></section>

        <section id="contact" className="px-5 py-20 text-center lg:px-8"><div className="mx-auto max-w-4xl rounded-[2rem] bg-emerald-100 px-6 py-14 md:px-14"><h2 className="text-3xl font-black md:text-4xl">معلومات الصف يجب أن تكون واضحة للجميع</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-emerald-950/70">منصة بسيطة للمدارس التي تريد تحسين التواصل مع الطلاب والأهل من دون مشروع تقني معقد.</p><Link to="/login" className="mt-8 inline-flex items-center gap-2 rounded-full bg-black px-7 py-4 font-bold text-white">تسجيل الدخول <ChevronLeft size={18} /></Link></div></section>
      </main>

      <footer className="border-t border-slate-200 px-5 py-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-slate-500 md:flex-row"><div className="flex items-center gap-2 font-bold text-slate-900"><BookOpen size={18} /> مهامي المدرسية</div><p>لوحة الصف الرقمية · بسيطة، واضحة، وآمنة</p></div></footer>
    </div>
  );
}
