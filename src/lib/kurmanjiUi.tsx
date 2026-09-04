import { useEffect } from 'react';

const translations: Record<string, string> = {
  'إدارة المدرسة': 'Rêveberiya dibistanê', 'لوحة المهام والإشعارات': 'Panela peywir û agahdariyan',
  'تحديد الجدول الأسبوعي': 'Bernameya heftane saz bike', 'إضافة مهمة': 'Peywirek lê zêde bike',
  'إضافة إشعار': 'Agahdariyek lê zêde bike', 'إضافة إشعار جديد': 'Agahdariyeke nû lê zêde bike',
  'المهام': 'Peywir', 'الاختبارات': 'Îmtîhan', 'كل الصفوف': 'Hemû pol', 'كل الشعب': 'Hemû şax',
  'النوع': 'Cure', 'الصف': 'Pol', 'الشعبة': 'Şax', 'صالح حتى': 'Heya vê demê derbasdar e',
  'رابط خارجي': 'Girêdana derveyî', 'ورقة عمل أو صورة': 'Pelê karê an wêne',
  'PDF، JPG، PNG أو WebP · الحد الأقصى 10 MB': 'PDF, JPG, PNG an WebP · herî zêde 10 MB',
  'النشاط': 'Çalakî', 'السنة': 'Sal', 'الشهر': 'Meh', 'الأسبوع': 'Hefte', 'أحدث المهام': 'Peywirên herî nû',
  'التسليم:': 'Teslîmkirin:', 'المعلم:': 'Mamoste:', 'تسجيل الدخول': 'Têketin',
  'الخطة الأسبوعية': 'Plana heftane', 'الجدول الدراسي': 'Bernameya dersan', 'الإشعارات': 'Agahdarî',
  'إشعارات مهمة': 'Agahdariyên girîng', 'المهام حسب أيام الأسبوع': 'Peywir li gor rojên hefteyê',
  'لا توجد مهام': 'Peywir tune', 'مهام أخرى': 'Peywirên din', 'عرض التفاصيل': 'Hûrguliyan bibîne',
  'الاثنين': 'Duşem', 'الثلاثاء': 'Sêşem', 'الأربعاء': 'Çarşem', 'الخميس': 'Pêncşem', 'الجمعة': 'În',
  'الأسبوع السابق': 'Hefta berê', 'الأسبوع التالي': 'Hefta bê', 'إعادة المحاولة': 'Dîsa biceribîne',
  'تعذر عرض الخطة الأسبوعية.': 'Plana heftane nehat nîşandan.', 'لم يتم ربط الحساب بصف بعد': 'Hesab hîn bi polekê ve nehat girêdan',
  'يرجى التواصل مع المدرسة لربط حسابك بصف أو بطفل.': 'Ji kerema xwe bi dibistanê re têkilî daynin da hesab bi polê ve were girêdan.',
  'مهمة': 'Peywir', 'إشعار': 'Agahdarî', 'موعد': 'Dem', 'المادة': 'Mijar', 'اليوم': 'Roj',
  'موعد التسليم': 'Dema teslîmkirinê', 'الوصف': 'Danasîn', 'لا يوجد وصف إضافي.': 'Danasîna din tune.',
  'فتح المرفق': 'Pel veke', 'جارٍ تجهيز المرفق...': 'Pel tê amadekirin...', 'فتح الرابط': 'Girêdanê veke', 'إغلاق': 'Bigire',
  'الحصص الأسبوعية': 'Dersên heftane', 'جميع الأوقات بنظام 24 ساعة': 'Hemû dem bi pergala 24 saetan',
  'الوقت / اليوم': 'Dem / roj', 'حصة فارغة': 'Dersa vala', 'اختر الصف': 'Polê hilbijêre', 'اختر الشعبة': 'Şaxê hilbijêre',
  'الرسائل': 'Peyam', 'جديد': 'Nû', 'لا توجد إشعارات بعد': 'Hîn agahdarî tune', 'طالب': 'Xwendekar',
  'الإحصائيات': 'Statîstîk', 'إجمالي الرسائل': 'Hemû peyam', 'الرسائل غير المقروءة': 'Peyamên nexwendî',
  'النشاط الأخير': 'Çalakiya dawî', 'لا يوجد نشاط حديث': 'Çalakiya nû tune', 'جدول اليوم': 'Bernameya îro',
  'لا توجد حصص اليوم': 'Îro ders tune', 'ملخص الأسبوع': 'Kurteya hefteyê', 'خطأ': 'Çewtî',
  'بيانات مطلوبة مفقودة': 'Daneyên pêwîst kêm in', 'يرجى العودة إلى الصفحة الرئيسية والمحاولة مرة أخرى.': 'Ji kerema xwe vegerin destpêkê û dîsa biceribînin.',
  'العودة إلى الرئيسية': 'Vegere destpêkê', 'العودة إلى تسجيل الدخول': 'Vegere têketinê', 'تسجيل الخروج': 'Derkeve',
  'الرياضيات': 'Matematîk', 'العلوم': 'Zanist', 'التاريخ': 'Dîrok', 'اللغة': 'Ziman', 'الرياضة': 'Werziş',
  'الفنون': 'Huner', 'الموسيقى': 'Muzîk', 'الحاسوب': 'Kompîtur', 'الدراسات الاجتماعية': 'Civaknasî', 'الأنشطة': 'Çalakî',
  'اللغة الألمانية': 'Almanî', 'اللغة الإنجليزية': 'Îngilîzî', 'الكيمياء': 'Kîmya', 'اختبار': 'Îmtîhan',
};

function translateText(value: string) {
  const trimmed = value.trim();
  let translated = translations[trimmed];
  if (!translated) translated = trimmed
    .replace(/^المهام \((\d+)\)$/, 'Peywir ($1)')
    .replace(/^الاختبارات \((\d+)\)$/, 'Îmtîhan ($1)')
    .replace(/^الأسبوع (\d+)$/, 'Hefta $1')
    .replace(/^الصف (.+)$/, 'Pol $1')
    .replace(/^الشعبة (.+)$/, 'Şax $1')
    .replace(/^مسجل باسم (.+)$/, 'Bi navê $1 têketî ye')
    .replace(/^(\d+) (حصة|حصص)$/, '$1 ders')
    .replace(/الصف/g, 'Pol')
    .replace(/الشعبة/g, 'Şax')
    .replace(/التسليم:/g, 'Teslîmkirin:')
    .replace(/المعلم:/g, 'Mamoste:');
  if (!translated || translated === trimmed) return null;
  return value.replace(trimmed, translated);
}

export function KurmanjiUiTranslator({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.querySelector('.app-shell-page');
    if (!root) return;
    const apply = (target: Node) => {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (node.parentElement?.closest('[data-user-content]')) continue;
        const translated = translateText(node.textContent || '');
        if (translated) node.textContent = translated;
      }
      if (target instanceof Element) {
        [target, ...Array.from(target.querySelectorAll('[title], [aria-label], [placeholder]'))].forEach((element) => {
          ['title', 'aria-label', 'placeholder'].forEach((attribute) => {
            const value = element.getAttribute(attribute);
            const translated = value && translateText(value);
            if (translated) element.setAttribute(attribute, translated);
          });
        });
      }
    };
    apply(root);
    const observer = new MutationObserver((mutations) => mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') apply(mutation.target.parentNode || mutation.target);
      mutation.addedNodes.forEach(apply);
    }));
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [enabled]);
  return null;
}
