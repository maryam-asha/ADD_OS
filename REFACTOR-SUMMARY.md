# REFACTOR-SUMMARY.md — تجهيز أرضية ADD OS فوق قالب Pinx

> **الهدف:** فصل كود القالب عن كودنا، وتأسيس الوضع العربي RTL، ومعالجة فجوات RTL —
> **قبل** بناء أي وحدة فعلية.
> **التاريخ:** 2026-08-01 → 2026-08-02 · **الأساس:** pinx-vue 1.23.0 · naive-ui 2.44.1
> **لم يُبنَ أي منطق أعمال.** هذه مرحلة تمهيدية بحتة.

## الوثائق الناتجة

| الوثيقة | الغرض |
|---|---|
| [INVENTORY.md](INVENTORY.md) | جرد ~330 ملفاً في `src/` مصنّفاً إلى 4 فئات |
| [_pinx-vendor/VENDOR-MANIFEST.md](_pinx-vendor/VENDOR-MANIFEST.md) | الحدّ الفاصل: ما لا يُعدَّل · ما هو مختلط · كل نقطة تماس |
| [src/add-os/theme-overrides/RTL-REPORT.md](src/add-os/theme-overrides/RTL-REPORT.md) | فحص RTL الساكن، مكوّناً مكوّناً |
| [I18N-REPORT.md](I18N-REPORT.md) | الثنائية اللغوية · ربط لغة↔اتجاه · المنسِّق الموحّد |
| **هذه الوثيقة** | الخلاصة + قائمة القرارات + الخطوات اليدوية |

---

## 1. ما تمّ في كل مرحلة

### المرحلة 1 — جرد وتوثيق (قراءة فقط)

جرد كامل لـ `src/` مصنَّف إلى: (أ) بنية أساسية · (ب) مكوّنات عامة · (ج) عروض توضيحية ·
(د) أدوات. الفئة (ج) هي الأضخم بفارق كبير — 81 ملفاً في `views/Components/` وحدها.

**أنتج 8 اكتشافات وجّهت كل ما بعدها**، أهمّها أن الغطاء الحالي لـ RTL أوسع مما توقّعنا:
`naive-override.scss` يحوي كتلة `.direction-rtl` بطول ~215 سطراً. هذا **غيّر نطاق المرحلة 3
جوهرياً** — من «بناء غطاء» إلى «سدّ ثغرات».

**الملفات:** `INVENTORY.md` (جديد). صفر تعديلات.

---

### المرحلة 2أ — تأسيس الوضع العربي (قرارات بشرية معتمدة)

#### البند 1 — العربية RTL كوضع أساسي

`ar` لم يكن موجوداً إطلاقاً، فتفعيله كان يستلزم بناءه أولاً — **داخل مساحتنا** لا داخل القالب:

| الملف | التغيير |
|---|---|
| `src/add-os/lang/ar/ar.json` | 🆕 الترجمة العربية |
| `src/add-os/lang/ar/index.ts` | 🆕 نقطة دمج حزم الوحدات القادمة |
| `src/lang/locales/index.ts` | سطر re-export واحد |
| `src/lang/config.ts` | `locale: "ar"` + `fallbackLocale: "en"` |
| `src/stores/i18n.ts` | `{ code: "ar", ui: arDZ, date: dateArDZ }` |
| `src/utils/dayjs.ts` | `import "dayjs/locale/ar"` |
| `src/theme/index.ts` | `rtl: false` ← `true` |
| `locales/{de,en,es,fr,it,jp}.json` | مفتاح `locales.ar` — لإبقاء `MessageSchema` متطابقاً |

`fallbackLocale` إضافة مني: المفاتيح غير المترجَمة تعرض الإنجليزية بدل المفتاح الخام.

#### البند 2 — سمة `dir` الأصلية

`html.dir` فُعِّل في `stores/theme.ts` (كان معطّلاً بتعليق) **مع** الإبقاء على `.direction-rtl` —
الآليتان معاً: الكلاس يقود SCSS، والسمة تقود سلوك المتصفح الأصلي.
`"rtl"` أُضيف إلى `persist.pick`. و`index.html` صار `<html lang="ar" dir="rtl">` لمنع وميض LTR.

**هذا البند وحده حسم معظم المرحلة 3** — انظر §2.

#### البند 3 — الخط: Cairo

`@fontsource-variable/cairo@5.3.0` (وزن متغيّر 200–1000، subsets عربية/لاتينية بـ `unicode-range`).
**نقطة تبديل واحدة:** الخط مُسمّى حصراً في `--font-family-arabic` داخل `fonts.scss`،
والتوكنات تشير إليه بـ `var(--font-family-arabic)`.
حُدِّث `figma-tokens.json` أيضاً لأن `design-tokens.json` **مولَّد منه**.

#### البند 4 — `.DS_Store`

حُذف **21 ملفاً** (18 في `src/` + 3 خارجه). `.gitignore` كان يحويه أصلاً.

---

### المرحلة 2ب — فصل القالب عن كودنا

**النهج: فصل منطقي لا فيزيائي.** لم يُنقل شيء.

القالب مبنيّ على `@/` = `src/`. النقل كان سيكسر 466 سطر راوتر باستيرادات ديناميكية،
و`unplugin-vue-components`، واستيرادات SCSS النسبية — **والأهم أنه كان سيفسد الهدف نفسه**:
ملفات منقولة = تعارض دمج في كل ملف عند أي ترقية.

```
src/add-os/
├── README.md · modules/ · theme-overrides/ · lang/ar/ · design-tokens/
```

`theme-overrides/index.scss` مستورد **كآخر سطر** في نقطة دخول أنماط القالب — عند تساوي
التخصّص يفوز آخر ما يُعلَن، فتغلب قواعدنا دون `!important`.

**كلفة النهج (بصراحة):** الفصل غير مفروض آلياً. الالتزام بشري والمانيفست أداته.
مقترح الفرض الآلي في §4.

---

### المرحلة 3 — فحص RTL ساكن وسدّ الثغرات

من **19 مكوّناً إنتاجياً**: 14 مُعالَج أصلاً · 4 عولجت · 1 لا يُصلَح بـ CSS.

| المعالجة | الملف | النوع |
|---|---|---|
| `unstablePopoverRtl` + `unstableUploadsRtl` | `rtl-styles.ts` + سطران في `rtlProvider.ts` | تسجيل عنصر naive-ui رسمي |
| `blockquote` · `ul` · `ol` | `tailwind.css` | **خاصية منطقية في المصدر** |
| `Percentage.vue` · `Breadcrumb.vue` | `_rtl-gaps.scss` | override |

**تحقّق من مخرجات البناء لا من الكود فقط:** عنصرا RTL موجودان في الحزمة، والخصائص
المنطقية وقواعد الـ override ظاهرة في CSS الناتج.

**⚠️ لا شيء منها مؤكَّد بصرياً.**

---

### المرحلة 5 — الثنائية اللغوية والمنسِّق الموحّد

تفصيلها الكامل في [I18N-REPORT.md](I18N-REPORT.md). الخلاصة:

| البند | الناتج |
|---|---|
| **1 — ربط لغة↔اتجاه** | الاتجاه صار **دالّة في اللغة**. سُدَّت كل منافذ الحالة المتناقضة: مفتاح `LayoutSettings` صار يبدّل اللغة، و`reset()` يستعيد اللغة، والمبدّل مقيَّد بـ `ar`/`en`. + سكربت ما-قبل-الرسم يمنع وميض الاتجاه |
| **2 — اكتمال الترجمتين** | **اكتشاف:** القالب لا يستخدم i18n لواجهته إطلاقاً. تُرجمت 11 نصّاً تشغيلياً (🔴)، وبُنيت حزمتان متماثلتان في `add-os/lang/`، وحارس آلي يمنع انحرافهما |
| **2.5 — تقليص اللغات** | حُذفت `de/es/fr/it/jp` (استثناء معتمد). قلّص سطح التماس من 21 إلى 18 ملفاً |
| **2.7 — تسريبات حاجبة** | أُزيلت الصور الخارجية من السطح الإنتاجي (خرق عزل VPN) ونسبة D\*VERSE من التذييل |
| **3 — المنسِّق الموحّد** | [`add-os/utils/format`](src/add-os/utils/format/index.ts) — أرقام لاتينية بحكم البناء، وعملة لا تفقد الدقّة، وتقويم شامي من جدول واحد |
| **4 — منتقي التاريخ** | **القيد رُفع** — كان متوقَّعاً أن يبقى. لُفَّ `dateArDZ` واستُبدلت `localize.month` وحدها، فصار المنتقي يعرض «آب» بلا اعتماد جديد |

**أهم ثلاثة قرارات هندسية في هذه المرحلة:**

1. **المنسِّق مبنيّ على معالجة نصية لا على `Intl`** — فالأرقام اللاتينية نتيجة بنيوية
   لا إعداد يمكن أن ينكسر، والدقّة محفوظة لقيم DECIMAL الممرَّرة كنصوص.
2. **`formatCurrency` لا يقرّب إلا حين يُطلب صراحةً.** مبلغ صحيح ⟵ بلا كسور (القرار)؛
   مبلغ بكسر ⟵ الكسر يُعرض. عكس سلوك `Intl` الذي يحذف كسور الليرة صامتاً.
3. **جدول الأشهر يصل إلى ثلاث وجهات** — منسِّقنا، وdayjs (عبر `updateLocale`)،
   ولوحة naive-ui الداخلية (عبر لفّ `NDateLocale`).

### Sprint 0 — قائمة ADD OS والراوتر

| البند | الناتج |
|---|---|
| **1 — ComingSoon** | [صفحة placeholder واحدة](src/add-os/views/ComingSoon.vue)، عنوانها مفتاح i18n |
| **1.5 — الأيقونات دون اتصال** | خرق عزل VPN أوسع من الصور: كل أيقونة كانت تُجلب من `api.iconify.design`. 235 أيقونة صارت محلية، و`dist` خالٍ من المضيفات الثلاثة |
| **2 — القائمة** | 13 قسماً و28 صفحة من [`sections.ts`](src/add-os/navigation/sections.ts). كل التسميات مفاتيح i18n |
| **3 — إزاحة RTL** | `:indent="0"` + `padding-inline-start !important` — الثغرة المفتوحة منذ المرحلة 3 أُغلقت. الـ`!important` أُضيف لاحقاً: `indent=0` لا يُسقط نمط naive-ui السطري بل يجعله `padding-left: 0px`، فكان يبتلع الإزاحة في LTR وحدها ([RTL §5.3](src/add-os/theme-overrides/RTL-REPORT.md) · حارس [`nav-indent.spec.ts`](src/add-os/theme-overrides/__tests__/nav-indent.spec.ts)) |
| **4 — الراوتر** | مسارات القالب أُزيلت، ومسارات ADD OS تُولَّد من نفس القائمة |
| **مبدّل اللغة** | نصّ بلا أعلام — حسم القرار المعلّق حول `circle-flags` |

**أهم قرارين:**

1. **مصدر واحد للقائمة والراوتر.** كلاهما مشتقّ من `sections.ts`، فلا يمكن أن يشير عنصر
   قائمة إلى مسار محذوف. [14 اختباراً](src/add-os/navigation/__tests__/navigation.spec.ts)
   تحرس التطابق، ومنها أن مقصد `/` صفحة موجودة داخل قسم **فعّال**.
2. **`/` تشير إلى `/spatial/branches` لا إلى لوحة القيادة** — الأخيرة آخر ما سيُبنى،
   فكانت صفحة الهبوط ستقول «قريباً» طوال البناء تقريباً.

**أثر جانبي مقيس:** حذف مسارات الديمو أسقط صفحاتها من الحزمة تماماً (Kanban · Mailbox ·
VectorMap · Milkdown · Tiptap · FullCalendar…). الناتج الآن **4 ملفات JS** بدل عشرات.

### المرحلة 4 — التحقق

| الفحص | النتيجة |
|---|---|
| `vue-tsc --build --force` | **18 خطأ** — كلها في `Kanban/ColumnEditor.vue` و`Kanban/TaskEditor.vue` (استنتاج generics في `defineModel`). **قائمة في القالب أصلاً؛ لم أفتح Kanban إطلاقاً.** العدد والملفّان **لم يتغيّرا** عبر المراحل الخمس. |
| `eslint .` | **خطآن** — `composables/useNotifications.ts:129` (`prefer-array-some`) و`utils/theme.ts:60` (`prefer-string-starts-ends-with`). **ملفان لم ألمسهما.** |
| `vitest` | **46/46 ✅** — 9 اتجاه · 7 تكافؤ لغوي · 29 تنسيق · 1 اختبار القالب |
| `vite build` | ✅ ناجح |

**صفر أخطاء ناتجة عن إعادة الهيكلة.** لم أصلح الأخطاء القائمة في كود القالب — سُجِّلت فقط (§4، بند 12).

---

## 2. لماذا كانت ثغرات RTL أقل من المتوقّع

سببان — وأحدهما من صنعنا:

1. `naive-override.scss` يعالج يدوياً منذ البداية: menu · tabs · date-panel ·
   time-picker-panel · popover/popconfirm · cascader · timeline · transfer · slider · form.
2. **تفعيل `<html dir="rtl">` في المرحلة 2أ** جعل تدفّق flex/grid وترتيب النصّ ينعكس أصلاً
   في غالبية مكوّنات naive-ui دون أي CSS. لولاه لكانت قائمة الثغرات أطول بكثير.

---

## 3. الملفات المتأثرة — الجرد الكامل

### جديدة (14)

```
INVENTORY.md
REFACTOR-SUMMARY.md
_pinx-vendor/VENDOR-MANIFEST.md
src/add-os/README.md
src/add-os/modules/README.md
src/add-os/design-tokens/README.md
src/add-os/lang/ar/ar.json
src/add-os/lang/ar/index.ts
src/add-os/theme-overrides/README.md
src/add-os/theme-overrides/index.scss
src/add-os/theme-overrides/rtl-styles.ts
src/add-os/theme-overrides/_rtl-gaps.scss
src/add-os/theme-overrides/RTL-REPORT.md
(+ node_modules/@fontsource-variable/cairo)
```

### معدَّلة (21 — كلها ملفات vendor، كلها مسجَّلة في المانيفست §3)

| الملف | التغيير | المانيفست |
|---|---|---|
| `src/theme/index.ts` | `rtl: true` | §3.1 |
| `src/stores/theme.ts` | تفعيل `html.dir` · `persist.pick += "rtl"` | §3.2 |
| `index.html` | `lang="ar" dir="rtl"` | §3.2 |
| `src/lang/config.ts` | `locale: "ar"` · `fallbackLocale: "en"` | §3.3 |
| `src/stores/i18n.ts` | `arDZ` / `dateArDZ` | §3.3 |
| `src/lang/locales/index.ts` | re-export `ar` | §3.3 |
| `src/lang/locales/*.json` (6) | مفتاح `locales.ar` | §3.3 |
| `src/utils/dayjs.ts` | `dayjs/locale/ar` | §3.4 |
| `src/components/common/LayoutSettings.vue` | `reset()` تقرأ الافتراضي | §3.5 |
| `package.json` | `@fontsource-variable/cairo` | §3.6 |
| `src/assets/scss/fonts.scss` | Cairo + `--font-family-arabic` | §3.6 |
| `src/design-tokens.json` | مكدّسات الخطوط | §3.6 |
| `figma-tokens.json` | مكدّسات الخطوط | §3.6 |
| `src/assets/scss/index.scss` | استيراد طبقة الـ override | §3.7 |
| `src/app-layouts/common/rtlProvider.ts` | `...addOsRtlStyles` | §3.8 |
| `src/tailwind.css` | 3 قواعد بخصائص منطقية | §3.9 |

### محذوفة (21) — الاستثناء المعتمد صراحةً

كل `.DS_Store`. **قاعدة «لا حذف» بقيت سارية على كل ما عداها.**

---

## 4. يحتاج قرار بشري

### أولوية عليا — تؤثّر على وحدات قادمة

| # | البند | الخلفية | المرجع |
|---|---|---|---|
| **1** | **شكل الأرقام في الواجهة** — هندية `٠١٢٣` أم لاتينية `0123`؟ وهل يختلف بالسياق؟ | الوضع اليوم لاتيني ومتسق. **توصية:** مُنسِّق واحد في `add-os/` يمرّ عبره كل رقم | [RTL §5.6](src/add-os/theme-overrides/RTL-REPORT.md) |
| **2** | **تنسيق مبالغ SYP** | `Intl` مع `currency:"SYP"` **يحذف الكسور** (صفر منازل في CLDR). مع `DECIMAL` = فقدان دقّة صامت في العرض | [RTL §5.6](src/add-os/theme-overrides/RTL-REPORT.md) |
| **3** | **تسمية الأشهر** — «أغسطس» أم «آب» أم «أوت»؟ | **تعارض قائم اليوم:** منتقي التاريخ يعرض «أوت» (مغاربية)، وdayjs «أغسطس». naive-ui لا يصدّر إلا `arDZ` | [RTL §5.5](src/add-os/theme-overrides/RTL-REPORT.md) |
| **4** | **إزاحة القائمة الجانبية في RTL** | تبقى يساراً. **يستحيل إصلاحها بـ CSS** (نمط سطري ديناميكي). يحتاج تأكيدك البصري أولاً | [RTL §5.3](src/add-os/theme-overrides/RTL-REPORT.md) |
| **5** | **مصدر التصميم الرسمي** | 3 خيارات مطروحة. مؤجَّل حتى تصل هوية ADD البصرية | [design-tokens/README](src/add-os/design-tokens/README.md) |

### قرارات تصميمية

| # | البند | الوضع الحالي |
|---|---|---|
| 6 | موضع شارة العدّاد (`n-badge`) | القالب يفرض LTR (أعلى اليمين) عمداً. اصطلاح RTL: أعلى اليسار |
| 7 | اتجاه مفتاح التبديل (`n-switch`) | لا ينعكس. الاصطلاحات متباينة |
| 8 | أيقونة علم العربية | `LocaleSwitch` يبني `circle-flags:${code}` — لا يوجد علم لرمز `ar` |
| 9 | الهوية البصرية | شعارات Pinx الستة + وسوم meta (`pinx.vercel.app`، `@DVERSEStudio`) |

### قرارات هندسية

| # | البند | التفصيل | المرجع |
|---|---|---|---|
| 10 | **فرض الحدّ الفاصل آلياً؟** | قاعدة `no-restricted-imports` أو فحص CI يمنع استيراد `add-os/` من خارجها. يحوّل الالتزام من بشري إلى مفروض | [MANIFEST §5](_pinx-vendor/VENDOR-MANIFEST.md) |
| ~~11~~ | ~~**خطأ CSS قائم**~~ **سقط** | `ar(` بدل `var(` في زخرفة خطوط الشجرة. زال البند مع حذف الزخرفة بكاملها | [MANIFEST §3.19](_pinx-vendor/VENDOR-MANIFEST.md) |
| 12 | **أخطاء type-check القائمة** | 18 خطأ في ملفَّي Kanban. نصلحها أم نتركها؟ (ملفات توضيحية) | — |
| 13 | **أخطاء lint القائمة** | خطآن في `useNotifications.ts` و`theme.ts`. قابلان للإصلاح بـ `--fix` | — |
| 14 | **`unplugin-vue-components`** | مضبوط على `src/components/cards` فقط. نوسّعه لوحدات ADD OS أم نستورد صراحةً؟ | [modules/README](src/add-os/modules/README.md) |
| 15 | **6 ملفات override غير مستوردة عالمياً** | `apexchart` · `jvm` · `prosemirror` · `quill` · `shepherd` · `vcalendar` — تُستورد داخل الصفحات. مقصود أم سهو؟ | [INVENTORY](INVENTORY.md) |
| 16 | **ثغرة كامنة** | `n-progress` فيه `padding-left` على المؤشّر. لا أثر اليوم (`show-indicator=false`)، يصبح ثغرة عند تفعيله | [RTL §5.4](src/add-os/theme-overrides/RTL-REPORT.md) |

---

## 5. الخطوات اليدوية المتبقّية

### 🔴 الفحص البصري لـ RTL — إلزامي قبل أي وحدة

**لم يُفتح متصفح في هذه المهمة إطلاقاً.** كل معالجة SCSS فرضية مبنيّة على قراءة المصدر.

```bash
npm run dev
```

بالترتيب:

1. **القائمة الجانبية** — الأولوية القصوى ([RTL §5.3](src/add-os/theme-overrides/RTL-REPORT.md)).
   افتحي قائمة متداخلة **في اللغتين** وتحقّقي: هل العناصر الفرعية مُزاحة عن جهة القراءة
   (اليمين في العربية · اليسار في الإنجليزية) بمقدار أكبر من عنوان القسم؟
   خطوط الشجرة حُذفت، فلا شيء يُفحص منها ([MANIFEST §3.19](_pinx-vendor/VENDOR-MANIFEST.md)).
   ⚠️ **هذا البند تحديداً شحن مكسوراً في LTR مرّة**: الإزاحة كانت تعمل في العربية فقط،
   لأن نمط naive-ui السطري `padding-left: 0px` كان يبتلعها في الإنجليزية. فلا تكفي
   معاينة العربية وحدها.
2. **الشريط العلوي** — الإشعارات والصفحات المثبّتة (`n-popover` — عولج) ·
   قائمة المستخدم (`n-dropdown`) · مسار التنقّل · مبدّل اللغة (`n-popselect`).
3. **الخط** — هل يُعرض Cairo فعلاً؟ (افحصي عنصراً في DevTools: `--font-family-arabic`).
   تحقّقي من الأوزان والتشكيل والأرقام.
4. **`Percentage.vue`** — تباعد سهم الاتجاه والحشوة ([RTL §4.2](src/add-os/theme-overrides/RTL-REPORT.md)).
5. **نماذج المصادقة** — `src/views/Auth/Login.vue`.
6. **الثبات** — بدّلي RTL من لوحة الإعدادات، أعيدي التحميل، وتحقّقي أن الاختيار نجا.
   ثم اضغطي «إعادة تعيين» وتحقّقي أنه يعود إلى RTL لا LTR.

### 🟡 قبل الوحدة الأولى

- حسم البنود 1–3 في §4 (الأرقام · العملة · الأشهر) — تُبنى وحدة المحفظة عليها.
- حسم البند 5 (مصدر التصميم) — يحدّد أين تعيش ألوان ADD.
- حسم البند 14 (`unplugin-vue-components`).
- عند إعادة كتابة `Navbar/items.tsx`: تنفيذ إصلاح إزاحة القائمة ([RTL §5.3](src/add-os/theme-overrides/RTL-REPORT.md)).

### 🔴 مهمة الهوية البصرية — قائمة إلزامية قبل الشحن

بقايا مؤكَّدة من قالب Pinx ومن مشاريع أخرى. **لا يجوز شحن أيٍّ منها.**
عولجت في المرحلة 5 بندان حاجبان (الصور الخارجية في السطح الإنتاجي، ونسبة التذييل)؛
وهذه الأربعة الباقية مؤجَّلة عمداً لأنها تُنفَّذ مع استبدال الأصول البصرية:

> **أُغلق في Sprint 0:** كل روابط مورّد القالب — تذييل الشريط الجانبي، والإشعار
> الدعائي التلقائي، وقائمة الأفاتار، ولوحة الإعدادات. المانيفست §3.18.
> تحقّقت من مخرجات البناء: **صفر إشارات** إلى `pinx-docs` أو `themeforest` أو
> `dverse.studio` في `dist`.

| # | البند | الموقع | لماذا يُمنع شحنه |
|---|---|---|---|
| 1 | **`SOCFortress logo`** في `alt` و`aria-label` | [Logo.vue:7-8](src/app-layouts/common/Logo.vue#L7) | علامة **مشروع آخر**. الأخطر: قارئ الشاشة سينطق اسم شركة أخرى لكل مستخدم كفيف |
| 2 | `<meta name="author" content="D*VERSE Studio">` و`twitter:creator="@DVERSEStudio"` | [index.html:50,61](index.html#L50) | نسبة تأليف لطرف ثالث في بيانات الصفحة |
| 3 | وسوم Pinx: `<title>` · `apple-mobile-web-app-title` · `og:*` · `twitter:*` · canonical إلى `pinx.vercel.app` | [index.html](index.html) (~43 إشارة) | هوية القالب التجارية، ورابط canonical يشير إلى موقع القالب |
| 4 | 6 شعارات `brand-logo_*` · 11 نصّ `Lorem ipsum` · ~86 صورة `picsum`/`pravatar` في صفحات showcase | `src/assets/images/` · `src/views/**` · `src/components/cards/extra/` | أصول القالب. صور showcase تزول مع حذف الديمو |

### 🟢 متى تشائين

- الهوية البصرية: الشعارات ووسوم meta (البند 9).
- تنظيف صفحات القالب التوضيحية — **مهمة منفصلة**، خارج نطاق هذه.
- `dist/` تولّدت من عمليات التحقق ببناء فعلي؛ مُدرجة في `.gitignore`.

---

## 6. القواعد التي حكمت هذه المهمة

| القاعدة | الالتزام |
|---|---|
| لا حذف ولا إبعاد لأي ملف | ✅ — استثناء وحيد معتمد صراحةً: `.DS_Store` (21) |
| لا تعديل مباشر على منطق مكوّنات Pinx | ⚠️ — **تماس واحد**: `LayoutSettings.vue` §3.5. ما عداه إعدادات أو أسطر استيراد |
| لا افتراضات | ✅ — 16 بنداً في «يحتاج قرار بشري» |
| ملخّص بعد كل مرحلة | ✅ |
| كل تماس vendor مسجَّل فوراً | ✅ — 21 ملفاً في [MANIFEST §3](_pinx-vendor/VENDOR-MANIFEST.md) |
| لا ادّعاء تحقّق بصري | ✅ — موسوم صراحةً في كل معالجة |
