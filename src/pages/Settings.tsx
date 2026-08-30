import { useEffect, useState } from 'react';
import { BellRing, Database, Languages, Moon, Settings as SettingsIcon, Sun } from 'lucide-react';
import { useAppIdentity } from '../layout/AppLayout';

const THEME_KEY = 'schooltasks:theme';

export default function Settings() {
  const { schoolFullName, schoolName, email, language, setLanguage } = useAppIdentity();
  const ku = language === 'ku';
  const [darkMode, setDarkMode] = useState(
    () => window.localStorage.getItem(THEME_KEY) === 'dark'
  );
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    () => ('Notification' in window ? Notification.permission : 'denied')
  );
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    window.localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const enableNotifications = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const clearOfflineData = () => {
    const preservedTheme = window.localStorage.getItem(THEME_KEY);
    const preservedLanguage = window.localStorage.getItem('schooltasks:language');
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('schooltasks:') && key !== THEME_KEY && key !== 'schooltasks:language')
      .forEach((key) => window.localStorage.removeItem(key));
    if (preservedTheme) window.localStorage.setItem(THEME_KEY, preservedTheme);
    if (preservedLanguage) window.localStorage.setItem('schooltasks:language', preservedLanguage);
    setCacheCleared(true);
  };

  return (
    <main className="min-h-screen bg-[#faf8f8] px-6 py-8 md:px-10 lg:px-14" dir="rtl">
      <header className="mb-10 border-b border-slate-200 pb-8">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
          <SettingsIcon size={18} />
          <span>{ku ? 'Mîheng' : 'الإعدادات'}</span>
        </div>
        <h1 className="text-3xl font-bold md:text-4xl">{ku ? 'Mîheng' : 'الإعدادات'}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {schoolFullName || schoolName} · {email}
        </p>
      </header>

      <section className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-5 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="rounded-xl bg-slate-100 p-3"><Languages size={22} /></span>
            <div><h2 className="font-bold">{ku ? 'Ziman' : 'اللغة'}</h2><p className="mt-1 text-sm text-slate-500">{ku ? 'Zimanê portalê hilbijêre' : 'اختر لغة واجهة المنصة'}</p></div>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button onClick={() => setLanguage('ar')} className={`rounded-lg px-4 py-2 text-sm font-bold ${language === 'ar' ? 'bg-black text-white' : ''}`}>العربية</button>
            <button onClick={() => setLanguage('ku')} className={`rounded-lg px-4 py-2 text-sm font-bold ${language === 'ku' ? 'bg-black text-white' : ''}`}>Kurdî</button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-5 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="rounded-xl bg-slate-100 p-3">
              {darkMode ? <Moon size={22} /> : <Sun size={22} />}
            </span>
            <div>
              <h2 className="font-bold">{ku ? 'Moda tarî' : 'الوضع الداكن'}</h2>
              <p className="mt-1 text-sm text-slate-500">{ku ? 'Dîtina rehet di êvar û şevê de' : 'عرض مريح في المساء والليل'}</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={darkMode}
            onClick={() => setDarkMode((enabled) => !enabled)}
            className={`relative h-8 w-14 rounded-full transition ${darkMode ? 'bg-black' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${darkMode ? 'right-7' : 'right-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-5 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="rounded-xl bg-slate-100 p-3"><BellRing size={22} /></span>
            <div>
              <h2 className="font-bold">{ku ? 'Agahdariyên gerokê' : 'إشعارات المتصفح'}</h2>
              <p className="mt-1 text-sm text-slate-500">{ku ? 'Dema agahiyên nû bên te agahdar bike' : 'تنبيه عند وصول معلومات جديدة'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={enableNotifications}
            disabled={notificationPermission === 'granted'}
            className="rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white disabled:bg-emerald-600"
          >
            {notificationPermission === 'granted' ? (ku ? 'Çalak e' : 'مفعّلة') : (ku ? 'Çalak bike' : 'تفعيل')}
          </button>
        </div>

        <div className="flex items-center justify-between gap-5 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="rounded-xl bg-slate-100 p-3"><Database size={22} /></span>
            <div>
              <h2 className="font-bold">{ku ? 'Daneyên offline' : 'البيانات المحفوظة دون اتصال'}</h2>
              <p className="mt-1 text-sm text-slate-500">{ku ? 'Tenê kopiyên li ser amûrê jê bibe' : 'حذف النسخ المحلية فقط دون حذف بيانات المدرسة'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearOfflineData}
            className="rounded-full bg-slate-100 px-4 py-2.5 text-sm font-medium hover:bg-slate-200"
          >
            {cacheCleared ? (ku ? 'Hat jêbirin' : 'تم الحذف') : (ku ? 'Jê bibe' : 'حذف')}
          </button>
        </div>
      </section>
    </main>
  );
}
