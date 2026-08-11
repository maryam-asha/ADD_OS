# `design-tokens/` — انتهى دورُه

**القرار اتُّخذ.** مصدر التصميم الرسمي صار
👉 [`src/add-os/theme/`](../theme/) — وتحديداً [`tokens.ts`](../theme/tokens.ts).

هذا المجلد بقي كـ **إشارة تحويل** فقط، ولا يحتوي أي توكن. اقرأ
[`../theme/README.md`](../theme/README.md).

---

## ما اعتُمد

الخيارات الثلاثة التي كانت مطروحة هنا — (أ) تحديث `figma-tokens.json` مباشرةً،
(ب) ملف مستقل يُدمج فوق توكنات القالب، (ج) تجاوز الألوان بمتغيّرات CSS — **رُفضت
كلها** لصالح خيار رابع، لأن ADD OS ليس المستهلك الوحيد: هناك تطبيق أعضاء بـ Flutter،
وموقع عام بـ Nuxt، وتطبيق كشك استقبال، وكلها تقرأ التوكنات نفسها.

```
src/add-os/theme/tokens.ts          ← الملف الوحيد الذي يُعدَّل بيدٍ بشرية
   │  npm run tokens
   ├──▶ theme/tokens.json                W3C DTCG — محايد، وهو المرجع
   ├──▶ theme/tokens.generated.css       متغيّرات CSS + Tailwind @theme
   ├──▶ theme/tokens.dart                Flutter / Dart
   ├──▶ figma-tokens.json                إضافة Figma Tokens
   └──▶ src/design-tokens.json           سلسلة Pinx القائمة
```

**المرجع محايد لا خاصّ بـ Figma.** كل مخرَج آخر **مُحوِّل** فوقه، فإضافة مستهلك
جديد = إضافة مُحوِّل، لا صيانة لوحة ثانية بيدك.

## ما زال صحيحاً من التحذير القديم

`src/design-tokens.json` **مولَّد**، وأي تعديل يدوي عليه يُمحى. الجديد أن مصدره لم
يعد `figma-tokens.json` بل `tokens.ts` — والملفّان **كلاهما** صارا مخرَجَين، فلا
يُعدَّل أيٌّ منهما بيد. انظر §3.20 في
[`VENDOR-MANIFEST.md`](../../../_pinx-vendor/VENDOR-MANIFEST.md).

> **لا تُضِف توكنات هنا.** أضِفها في `theme/tokens.ts`، ثم `npm run tokens`.
> ملفٌ في هذا المجلد = كود ميت.
