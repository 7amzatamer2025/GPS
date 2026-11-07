# مستكشف — لعبة استكشاف بالـ GPS

موقع (HTML + CSS + JS) بيستخدم Firebase للدخول وحفظ التقدم والمتصدرين.

## الملفات
- `index.html` — الصفحات (دخول، خريطة، حسابي، متصدرين)
- `css/style.css` — التصميم والثيمات (ليلي / نيون / خريطة كنز)
- `js/firebase-config.js` — **الملف الوحيد اللي تعدّل فيه** (إعدادات Firebase)
- `js/game.js` — الخريطة، الضباب، اكتشاف المناطق والمحلات
- `js/app.js` — الدخول، الحساب، الحفظ، المتصدرين
- `firestore.rules` — قواعد الأمان

## التشغيل (5 خطوات)
1. من Firebase Console اعمل مشروع، وأضف **Web app** وانسخ الإعدادات في `js/firebase-config.js`.
2. **Authentication → Sign-in method** فعّل **Email/Password**. (اسم المستخدم بيتحول داخليًا لإيميل `اسمك@explorer.app`.)
3. **Firestore Database → Create** ثم تبويب **Rules** والصق محتوى `firestore.rules` واضغط Publish.
4. **Authentication → Settings → Authorized domains**: أضف دومين موقعك (مثلاً `xxx.vercel.app`).
5. ارفع الفولدر على Vercel أو GitHub Pages. للتجربة محليًا: `npx serve` جوه الفولدر.

> لازم HTTPS (أو localhost) عشان الـ GPS يشتغل على الموبايل. فتح `index.html` بدبل كليك مش هيشتغل لأن الملفات modules.

## ملاحظات
- النقط: +1 لكل خطوة جديدة، +50 لكل منطقة جديدة، +20 لكل محل جديد. وضع "تجربة" بيكشف الخريطة بدون نقط.
- الصورة الشخصية بتتصغّر لـ128px وتتخزن في Firestore (من غير Storage عشان مفيش حاجة تتطلب خطة مدفوعة).
- أسماء المناطق من Nominatim والمحلات من Overpass (OpenStreetMap): مجانيين لكن للاستخدام الخفيف. لما اللعبة تكبر استخدم Mapbox/Google Places.
- قواعد الأمان بتمنع تعديل ملف لاعب تاني، لكن النقط بتتحسب في المتصفح، فاللوحة مناسبة للأصحاب مش للمسابقات الجدية. التحقق من السيرفر (Cloud Functions) خطوة لاحقة.
