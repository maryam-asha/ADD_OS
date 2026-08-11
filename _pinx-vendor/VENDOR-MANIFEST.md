# VENDOR-MANIFEST.md — الحدّ الفاصل بين قالب Pinx وكود ADD OS

> **الغاية:** أن نبقى قادرين على ترقية قالب Pinx مستقبلاً دون أن نضيّع تغييراتنا داخل ملفاته.
> **الأساس:** `pinx-vue` v1.23.0
> **تاريخ الإصدار:** 2026-08-01 (بعد المرحلة 2أ)
> **المرجع الكامل للملفات:** [`INVENTORY.md`](../INVENTORY.md)

---

## 0. النهج المختار: فصل منطقي، لا فيزيائي

**لم تُنقل أي ملفات.** هذا المجلد يحتوي وثيقة واحدة فقط — لا كود.

### لماذا

القالب مبنيّ على **الاسم المستعار المطلق `@/` = `src/`**، وهو مستخدَم عبر الشجرة كلها.
نقل ملفات القالب إلى `src/_pinx-vendor/` كان سيتطلّب:

| الأثر | التفصيل |
|---|---|
| إعادة كتابة مئات الاستيرادات | كل `@/components/...` و`@/views/...` و`@/stores/...` |
| كسر 466 سطر راوتر | `() => import("@/views/...")` — استيرادات ديناميكية لا يمسّها أي مُعيد بناء آلي بأمان |
| كسر `unplugin-vue-components` | مضبوط على مسار حرفي `dirs: ["src/components/cards"]` |
| كسر استيرادات SCSS النسبية | `@import "./variables"` داخل كل layout |
| **إفساد الترقية نفسها** | ملفات منقولة = تعارضات دمج في كل ملف عند أي تحديث للقالب — أي عكس الهدف تماماً |

وقاعدة المهمة صريحة: **الأولوية لعدم كسر أي استيراد قائم.**

### البديل المطبَّق

الحدّ الفاصل يُفرَض بثلاث آليات لا بموقع الملف:

1. **مساحة اسم واحدة لكودنا:** كل ما نكتبه في [`src/add-os/`](../src/add-os/) — لا استثناء.
2. **هذه الوثيقة:** قائمة صريحة بما لا يُعدَّل، وبما هو مختلط، وبكل نقطة تماس معتمدة.
3. **طبقة override نشطة:** [`src/add-os/theme-overrides/index.scss`](../src/add-os/theme-overrides/index.scss)
   مستوردة كآخر سطر في نقطة دخول أنماط القالب، فتكسب أسبقية التتالي دون تعديل ملفاته.

**كلفة النهج:** الفصل غير مفروض آلياً — لا build أو lint يمنع تعديل ملف vendor.
الالتزام بشري، وهذه الوثيقة هي أداته. مقترح لسدّ ذلك في القسم 5.

---

## 1. الفئة (أ) — vendor نقي: لا يُعدَّل

أي حاجة لتغيير سلوك هنا ⟵ اذهب إلى `src/add-os/theme-overrides/` أو غلّف المكوّن، ولا تعدّله.

### 1.1 التخطيطات — `src/app-layouts/` (57 ملفاً)

```
src/app-layouts/Blank/**                    (4)   Blank.vue · MainContainer.vue · index.ts · main.scss
src/app-layouts/VerticalNav/**              (9)   VerticalNav · Sidebar · SidebarHeader · SidebarFooter
                                                  MainContainer · index.ts · main.scss · _mixin · _variables
src/app-layouts/HorizontalNav/**           (10)   + HeaderBar.vue
src/app-layouts/common/Provider.vue               ⚠️ حسّاس — n-config-provider (rtl/theme/locale)
src/app-layouts/common/rtlProvider.ts             ⚠️ حسّاس — مصفوفة rtlStyles
src/app-layouts/common/GlobalListener.vue
src/app-layouts/common/SplashScreen.vue
src/app-layouts/common/Logo.vue
src/app-layouts/common/MainFooter.vue
src/app-layouts/common/Toolbar/**          (13)   Toolbar · Avatar · Breadcrumb · Search · Notifications
                                                  ThemeSwitch · FullscreenSwitch · LocaleSwitch · BlurEffect
                                                  PillWrapper · PinnedPagesV1 · PinnedPagesV2 · index.ts
src/app-layouts/common/Navbar/Navbar.vue
src/app-layouts/common/Navbar/components.tsx
src/app-layouts/common/Navbar/index.ts
```

**استثناءان من هذا المجلد** مصنَّفان "مختلط" في القسم 2: `Navbar/items.tsx` وملفات مجموعات القائمة.

### 1.2 الأنماط — `src/assets/` (29 ملفاً)

```
src/assets/scss/index.scss                        ⚠️ نقطة تماس معتمدة — انظر 3.7
src/assets/scss/fonts.scss                        ⚠️ نقطة تماس معتمدة — انظر 3.6
src/assets/scss/common.scss
src/assets/scss/common-animations.scss
src/assets/scss/router-animations.scss
src/assets/scss/_functions.scss
src/assets/scss/overrides/naive-override.scss     ⚠️ حسّاس — كتلة .direction-rtl (~215 سطراً)
src/assets/scss/overrides/apexchart-override.scss
src/assets/scss/overrides/jvm-override.scss
src/assets/scss/overrides/prosemirror-override.scss
src/assets/scss/overrides/quill-override.scss
src/assets/scss/overrides/shepherd-override.scss
src/assets/scss/overrides/vcalendar-override.scss
src/assets/images/**                       (13)   ⚠️ brand-logo_* ستُستبدل بشعار ADD (مهمة لاحقة)
src/assets/icons/**                         (3)
```

### 1.3 المكوّنات — `src/components/` (90 ملفاً)

```
src/components/common/**                   (15)   ⚠️ LayoutSettings.vue نقطة تماس — انظر 3.5
                                                  Icon · SegmentedPage · SearchDialog · LtrContext
                                                  LocaleSelect · FileDrop · ImageCropper · ImageLoader
                                                  Percentage · PasswordStrengthMeter · TestScope
                                                  Notifications/List · Notifications/Toolbar
src/components/auth/**                      (6)
src/components/cards/**                    (30)   ⚠️ مسجَّلة تلقائياً — vite.config.ts dirs
src/components/tables/Base.vue
src/components/list/**                      (3)
src/components/charts/**                   (14)
src/components/editors/**                   (7)
src/components/maps/**                      (2)
src/components/profile/**                   (2)
src/components/apps/**                     (10)   FullCalendar · Kanban · Mailbox
src/components/__tests__/SampleComponent.spec.ts
```

### 1.4 المنطق والأدوات

```
src/composables/**                          (8)
src/directives/v-hl.ts                      (1)
src/emitter/index.ts                        (1)
src/types/**                                (6)
src/utils/index.ts
src/utils/theme.ts
src/utils/auth.ts
src/utils/dayjs.ts                                ⚠️ نقطة تماس معتمدة — انظر 3.4
src/theme/index.ts                                ⚠️ نقطة تماس معتمدة — انظر 3.1
src/stores/main.ts
src/stores/auth.ts
src/stores/theme.ts                               ⚠️ نقطة تماس معتمدة — انظر 3.2
src/stores/i18n.ts                                ⚠️ نقطة تماس معتمدة — انظر 3.3
src/stores/apps/**                          (3)
src/lang/index.ts
src/lang/config.ts                                ⚠️ نقطة تماس معتمدة — انظر 3.3
src/lang/locales/*.json                     (6)   ⚠️ نقطة تماس معتمدة — انظر 3.3
src/lang/locales/index.ts                         ⚠️ نقطة تماس معتمدة — انظر 3.3
src/mock/**                                 (5)
```

### 1.5 العروض التوضيحية — `src/views/` (133 ملفاً)

كتلة واحدة صمّاء. **لا تُقرأ للتعديل — تُقرأ كمرجع بصري وكودي فقط.**

```
src/views/Components/**                    (81)   صفحة showcase لكل مكوّن naive-ui
src/views/Cards/**                          (5)
src/views/Charts/**                         (2)
src/views/Tables/**                        (16)
src/views/Maps/**                           (4)
src/views/Editors/**                        (3)
src/views/Layout/**                         (3)
src/views/Toolbox/**                        (2)
src/views/Apps/**                           (6)
src/views/Dashboard/**                      (2)   ⚠️ Analytics.vue مستورد ثابتاً في الراوتر
src/views/Icons.vue · MultiLanguage.vue · Profile.vue · Typography.vue
```

**استثناءان** (بنية أساسية فعلياً، وليسا عرضاً توضيحياً):
`src/views/Auth/Login.vue` + `src/views/Auth/main.scss` · `src/views/NotFound.vue`

### 1.6 إعدادات الجذر

```
vite.config.ts · vitest.config.ts · cypress.config.ts
tsconfig*.json · eslint.config.mjs · .prettierrc.json
tailwind.config.js · scripts/tokens-tool.js
Dockerfile · docker-compose.yml
package.json                                      ⚠️ نقطة تماس معتمدة — انظر 3.6
index.html                                        ⚠️ نقطة تماس معتمدة — انظر 3.2
figma-tokens.json                                 ⚠️ نقطة تماس معتمدة — انظر 3.6
src/design-tokens.json                            ⚠️ مولَّد — انظر 3.6
```

---

## 2. الفئة (ب) — ملفات مختلطة: ستُعاد كتابتها جزئياً لصالح ADD OS

هذه الملفات **ليست vendor نقياً**. كل واحد منها يخلط بنيةً أساسية بمحتوى توضيحي
**داخل الملف الواحد**، فلا يصحّ وسمه بـ "لا يُعدَّل" ولا حذفه.

> **قاعدة التعامل:** يُعدَّل الجزء التوضيحي فقط، وتُترك البنية كما هي.
> كل تعديل هنا مقصود ومخطَّط — لا يُحسب اختراقاً للحدّ الفاصل.

| الملف | الجزء الأساسي (يبقى) | الجزء التوضيحي (سيُستبدل) | متى |
|---|---|---|---|
| [src/router/index.ts](../src/router/index.ts) | `createWebHistory` · حارس `authCheck` · مسار `/` · `NotFound` · `Login` | كل مسارات `Apps` و`Cards` و`Charts` و`Tables` و`Maps` و`Editors` و`Layout` و`Toolbox` و`Dashboard` | مع كل وحدة |
| [src/router/components.ts](../src/router/components.ts) | — (466 سطراً، توضيحي بالكامل) | الملف كله | مهمة التنظيف اللاحقة |
| [src/app-layouts/common/Navbar/items.tsx](../src/app-layouts/common/Navbar/items.tsx) | منطق بناء عناصر `n-menu` وتجميعها | محتوى قائمة القالب بالكامل | **الوحدة الأولى** |
| [src/app-layouts/common/Navbar/](../src/app-layouts/common/Navbar/) — `apps.ts` `authentication.ts` `calendars.ts` `cards.ts` `charts.ts` `dashboard.ts` `editors.ts` `layout.ts` `maps.ts` `tables.ts` `toolbox.ts` (11) | — | مجموعات قائمة توضيحية بالكامل | **الوحدة الأولى** |
| [src/stores/auth.ts](../src/stores/auth.ts) + [src/utils/auth.ts](../src/utils/auth.ts) | شكل الحارس وواجهة المتجر | مصادقة وهمية (mock) | وحدة الصلاحيات |
| [src/app-layouts/common/Logo.vue](../src/app-layouts/common/Logo.vue) + `src/assets/images/brand-logo_*` (6) | منطق small/large × light/dark | أصول Pinx البصرية | مهمة الهوية البصرية |
| [index.html](../index.html) | بنية الصفحة | وسوم meta وعنوان وروابط Pinx (`pinx.vercel.app`، `@DVERSEStudio`) | مهمة الهوية البصرية |

---

## 3. نقاط التماس المعتمدة مع ملفات vendor

سجلّ كامل وصريح لكل ملف قالب مسّته المرحلة 2أ، ولماذا تعذّر تنفيذه من `add-os/`.
**عند ترقية Pinx: راجع هذا الجدول ملفاً ملفاً.**

### 3.1 `src/theme/index.ts`
```diff
- rtl: false,
+ rtl: true,   // ADD OS: Arabic RTL is the base mode, not an option
```
**لماذا هنا:** `getDefaultState()` هو حالة متجر Pinia الابتدائية. تجاوزها من الخارج
يعني حقن حالة بعد الإقلاع — وميض LTR مرئي عند كل تحميل.

### 3.2 اتجاه المستند
| الملف | التغيير |
|---|---|
| [src/stores/theme.ts](../src/stores/theme.ts) | تفعيل `html.dir` (كان معطّلاً بتعليق في القالب) داخل `setCssGlobalVars()` — مع الإبقاء على كلاس `.direction-rtl`؛ الآليتان معاً |
| [src/stores/theme.ts](../src/stores/theme.ts) | إضافة `"rtl"` إلى `persist.pick` |
| [index.html](../index.html) | `<html lang="en">` ← `<html lang="ar" dir="rtl">` |

**لماذا هنا:** الأولان داخل جسم دالة في متجر — لا يمكن تجاوزهما بـ CSS.
والثالث يسبق إقلاع JS بالكامل، وهو الغرض منه (منع وميض LTR في أول رسمة).

### 3.3 منظومة i18n
| الملف | التغيير |
|---|---|
| [src/lang/config.ts](../src/lang/config.ts) | `locale: "en"` ← `"ar"` · وإضافة `fallbackLocale: "en"` |
| [src/stores/i18n.ts](../src/stores/i18n.ts) | إضافة `{ code: "ar", ui: arDZ, date: dateArDZ }` إلى `naiveuiLocales` |
| [src/lang/locales/index.ts](../src/lang/locales/index.ts) | **سطر re-export واحد** نحو `@/add-os/lang/ar` |
| [src/lang/locales/en.json](../src/lang/locales/en.json) | مفتاح `locales` = `{ ar, en }` |

**لماذا هنا:** نوع `MessageSchema` مشتقّ آلياً من `locales/index.ts`؛ لا سبيل لحقن لغة
من خارجه. وبنية المفاتيح يجب أن تتطابق بين اللغتين، وإلا انكسر `RecursiveKeyOf<MessageSchema>`.

> في المرحلة 2أ مسّ هذا البند **ستة** ملفات JSON. بعد تقليص اللغات (القسم 3-ب) بقي `en.json` وحده.

**التخفيف:** الترجمة العربية نفسها كلها في [`src/add-os/lang/ar/`](../src/add-os/lang/ar/).
ملف القالب يحمل سطراً واحداً، ولن يحتاج تعديلاً مجدداً مهما أضفنا من وحدات —
الدمج يجري في [`add-os/lang/ar/index.ts`](../src/add-os/lang/ar/index.ts).

### 3.4 `src/utils/dayjs.ts`
```diff
+ import "dayjs/locale/ar"
```
**لماذا هنا:** الوحدة تستورد locales كأثر جانبي (side-effect imports) قبل التصدير.

### 3.5 `src/components/common/LayoutSettings.vue`
```diff
- themeStore.setRTL(false)
+ themeStore.setRTL(getDefaultState().rtl)
```
**لماذا هنا:** دالة `reset()` كانت تكتب `false` كقيمة صريحة. مع السياسة الجديدة كان زر
"إعادة التعيين" سيقلب التطبيق كلّه إلى LTR بصمت.

**التبرير:** التغيير يحفظ **نيّة** الكود الأصلي بدل أن يخالفها — كل سطور `reset()` تعكس
الافتراضيات، وهذا السطر صار يقرأ الافتراضي بدل تكراره يدوياً. أي أنه يقلّل التباعد عن
القالب لا يزيده. **مع ذلك يبقى تعديل منطق داخل مكوّن Pinx**، وهو التماس الوحيد من نوعه.

### 3.6 الخط العربي
| الملف | التغيير |
|---|---|
| [package.json](../package.json) | `+ @fontsource-variable/cairo@^5.3.0` |
| [src/assets/scss/fonts.scss](../src/assets/scss/fonts.scss) | استيراد Cairo + تعريف `--font-family-arabic` |
| [src/design-tokens.json](../src/design-tokens.json) | `var(--font-family-arabic)` في مقدّمة `fontFamily.default` و`.display` |
| [figma-tokens.json](../figma-tokens.json) | نفس التغيير في `font-families-default` و`-display` |

**لماذا هنا:** مكدّسات الخطوط تصل إلى naive-ui وTailwind عبر متغيّرات CSS يكتبها متجر
الثيم **سطرياً على `<html>`** — والأنماط السطرية تغلب أي قاعدة `:root` في ملف خارجي.
الحلّ: أن يشير التوكن نفسه إلى `var(--font-family-arabic)`.

**لماذا الملفان معاً:** `src/design-tokens.json` **مولَّد** من `figma-tokens.json` عبر
`npm run design-tokens`. تعديل المولَّد وحده كان سيُمحى عند أول توليد.

**التخفيف:** الخط مُسمّى في **مكان واحد فقط** (`--font-family-arabic` في `fonts.scss`).
تبديله لاحقاً = تغيير سطرين، دون لمس أي توكن.

### 3.7 `src/assets/scss/index.scss`
```diff
+ @import "@/add-os/theme-overrides/index.scss";
```
**لماذا هنا:** لا سبيل لحقن أنماط في نقطة دخول Vite دون سطر استيراد.
**آخر سطر عمداً:** عند تساوي التخصّص يفوز آخر ما يُعلَن، فتغلب قواعدُنا دون `!important`.
سطر واحد يفتح الباب لكل overrides ADD OS مستقبلاً دون العودة إلى هذا الملف.

### 3.8 `src/app-layouts/common/rtlProvider.ts`  *(المرحلة 3)*
```diff
+ import { addOsRtlStyles } from "@/add-os/theme-overrides/rtl-styles"
  ...
  	unstableScrollbarRtl,
+ 	...addOsRtlStyles
  ]
```
**لماذا هنا:** `Provider.vue` يستورد `rtlStyles` من هذا الملف حصراً، ويمرّرها إلى
`n-config-provider`. لا سبيل لحقن عناصر RTL إضافية من الخارج.

**ما أُضيف:** `unstablePopoverRtl` و`unstableUploadsRtl` — عنصرا RTL رسميان من naive-ui
تركهما القالب غير مسجَّلَين رغم أن مكوّنيهما مستخدمان إنتاجياً.

**التخفيف:** القائمة نفسها وتبريرها في [`src/add-os/theme-overrides/rtl-styles.ts`](../src/add-os/theme-overrides/rtl-styles.ts).
ملف القالب يحمل سطرين لن يحتاجا تعديلاً مجدداً مهما أضفنا من عناصر.

### 3.9 `src/tailwind.css`  *(المرحلة 3)*
```diff
  blockquote {
-   padding-left: 1em;
-   border-left: 4px solid var(--border-color);
+   padding-inline-start: 1em;
+   border-inline-start: 4px solid var(--border-color);
  }
- ul { padding-left: 20px; }
- ol { padding-left: 20px; }
+ ul { padding-inline-start: 20px; }
+ ol { padding-inline-start: 20px; }
```
**لماذا هنا:** أنماط `@layer base` للتطبيق نفسه (لا naive-ui). خصائص فيزيائية كانت ستنقلب
في RTL. الخاصية المنطقية تتكيّف مع `dir` تلقائياً.

**لماذا هذا الشكل تحديداً:** حلّها بـ override كان سيتطلّب كتلة `.direction-rtl` دائمة —
أي **نقطة تماس مستقبلية إضافية**. الخاصية المنطقية تعمل في الاتجاهين وتُلغي الحاجة لأي
تجاوز، فهي الأقل كلفة على الترقية رغم كونها تعديلاً في ملف vendor.

### 3.10 ربط اللغة بالاتجاه  *(المرحلة 5 — البند 1)*

الاتجاه صار **مشتقاً** من اللغة. المدخل الوحيد القابل للكتابة هو `locale`.

| الملف | التغيير |
|---|---|
| `src/stores/theme.ts` | سطران في `startWatchers()`: استدعاء `bindDirectionToLocale(this)` |
| `src/stores/i18n.ts` | `availableLocales` تُرشَّح بـ `isSupportedLocale` |
| `src/components/common/LayoutSettings.vue` | مفتاح RTL صار يبدّل **اللغة**؛ و`reset()` يستعيد اللغة الافتراضية |
| `index.html` | سكربت ما-قبل-الرسم يقرأ `__persisted__i18n` ويضبط `lang`/`dir` |

**لماذا هنا:**
- `startWatchers()` يُستدعى مرة واحدة من `initTheme()` في `Provider.vue`، وبحلولها يكون
  متجر اللغات حيّاً (يُنشأ في setup الخاص بـ `Provider.vue`).
- مفتاح `LayoutSettings` كان يكتب `setRTL` مباشرة — أي أنه كان **منفذاً لحالة متناقضة**
  (عربي + LTR). لا سبيل لسدّه من الخارج.
- سكربت `index.html` **يجب** أن يسبق تحميل أي وحدة، فلا يمكنه الاستيراد من `add-os/`.
  قائمة لغات RTL مكرَّرة فيه عمداً وموثَّقة بتعليق يشير إلى المصدر.

**التخفيف:** منطق الربط كله في
[`src/add-os/lang/bindDirectionToLocale.ts`](../src/add-os/lang/bindDirectionToLocale.ts)
و[`locales.ts`](../src/add-os/lang/locales.ts). الملفات أعلاه تحمل نقاط وصل فقط.
يحرسها [`__tests__/direction.spec.ts`](../src/add-os/lang/__tests__/direction.spec.ts) — 9 اختبارات،
منها اختبار يربط شكل الحفظ بما يقرأه سكربت `index.html`، فأي انحراف يكسر الاختبار لا الواجهة.

### 3.11 ترجمة النصوص التشغيلية  *(المرحلة 5 — البند 2)*

11 نصّاً إنجليزياً مكتوباً داخل المكوّنات، استُبدل بمفاتيح i18n. القالب **لا يستخدم i18n
لواجهته إطلاقاً** — فهذه أول مفاتيح واجهة حقيقية في المشروع.

| الملف | النصوص |
|---|---|
| [Toolbar/Notifications.vue](../src/app-layouts/common/Toolbar/Notifications.vue) | `notifications.title` ×2 · `common.viewAll` |
| [Toolbar/PinnedPagesV2.vue](../src/app-layouts/common/Toolbar/PinnedPagesV2.vue) | `shortcuts.title` |
| [Toolbar/Search.vue](../src/app-layouts/common/Toolbar/Search.vue) | `common.search` |
| [common/SearchDialog.vue](../src/components/common/SearchDialog.vue) | `common.search` |
| [common/Notifications/List.vue](../src/components/common/Notifications/List.vue) | `notifications.setAsRead` · `common.delete` |
| [common/Notifications/Toolbar.vue](../src/components/common/Notifications/Toolbar.vue) | `common.clear` · `notifications.markAllAsRead` |
| [common/ImageCropper.vue](../src/components/common/ImageCropper.vue) | `common.close` · `common.save` |

**لماذا هنا:** النصوص مكتوبة داخل قوالب المكوّنات. لا سبيل لترجمتها من الخارج.

**النطاق:** الفئة 🔴 فقط — مكوّنات vendor ثابتة غير مجدولة للاستبدال.
مؤجَّل: `LayoutSettings` (حتى يُحسم شحن أداة الإعدادات) · `auth/*` و`Navbar/*` و`Logo.vue`
(تُترجَم مع إعادة كتابتها).

**التخفيف:** المفاتيح كلها في [`add-os/lang/`](../src/add-os/lang/)، ويحرس التطابق بين
اللغتين [`__tests__/messages.spec.ts`](../src/add-os/lang/__tests__/messages.spec.ts).

### 3.12 إزالة الصور الخارجية من السطح الإنتاجي  *(المرحلة 5 — البند 2.7)*

```diff
- iconImage: `https://i.pravatar.cc/56?_=${Math.random()}`   (×3)
+ iconImage: AVATAR_PLACEHOLDER
- :src="image || 'https://picsum.photos/seed/IqZMU/900/300'"
+ :src="image || IMAGE_PLACEHOLDER"
```

| الملف | التغيير |
|---|---|
| [common/SearchDialog.vue](../src/components/common/SearchDialog.vue) | 3 مراجع `i.pravatar.cc` |
| [cards/CardActions.vue](../src/components/cards/CardActions.vue) | مرجع `picsum.photos` واحد |

**لماذا هنا — قيد معماري لا تفضيل:** ADD OS يعمل على شبكة VPN معزولة. أي صورة من مضيف
خارجي إمّا تفشل (صورة مكسورة) أو — إن كان المنفذ مفتوحاً — **تسرّب أنماط استخدام إلى
طرف ثالث من داخل شبكة مغلقة**.

**المصدر البديل:** [`add-os/assets/placeholders.ts`](../src/add-os/assets/placeholders.ts) —
`AVATAR_PLACEHOLDER` صورة SVG مضمَّنة كـ data URI (صفر طلبات شبكة بحكم البناء)،
و`IMAGE_PLACEHOLDER` أصل القالب المحلي `assets/images/placeholder.png` (تحقّقت أنه محلي فعلاً).

**النطاق:** السطح الإنتاجي فقط. تبقى ~86 إشارة في صفحات showcase (فئة ج) وتزول معها.

### 3.13 إزالة نسبة التأليف من التذييل  *(المرحلة 5 — البند 2.7)*

[`app-layouts/common/MainFooter.vue`](../src/app-layouts/common/MainFooter.vue)

أُزيل «Made with ♥ By **D\*VERSE Studio**» — وهو **رابط خارجي حيّ** إلى `dverse.studio`
كان يظهر في تذييل كل صفحة. استُبدل بـ `Aleppo Digital District © {{ year }}`.

**لماذا هنا:** نسبة ظاهرة لمؤلّف القالب داخل نظام ADD الداخلي.
بنية التذييل وسلوك `boxed` وأنماطه **لم تُمسّ** — استُبدل محتوى `.copy` وحده،
وأُزيل استيرادا `BrainIcon` و`Icon` اللذان صارا بلا استخدام.

### 3.14 التقويم الشامي  *(المرحلة 5 — البندان 3 و4)*

| الملف | التغيير |
|---|---|
| [src/utils/dayjs.ts](../src/utils/dayjs.ts) | `applyArabicCalendar(dayjs)` بعد استيراد locale الـ `ar` |
| [src/stores/i18n.ts](../src/stores/i18n.ts) | `date: dateArDZ` ← `date: dateArLevantine` |

**لماذا هنا:**
- `utils/dayjs.ts` هو نقطة دخول dayjs الوحيدة في المشروع. تصحيح أسماء الأشهر فيها
  يغطّي أي كود يستخدم dayjs مباشرة، بسطر واحد.
- `naiveuiDateLocale` يُقرأ من هذا المتجر ويُمرَّر إلى `n-config-provider`. لا سبيل
  لحقن locale تاريخ من الخارج.

**ما يحلّه:** naive-ui لا يصدّر إلا `dateArDZ` وهو جزائري («أوت»)، وdayjs `ar` يقول
«أغسطس» — تعارض داخل التطبيق الواحد. الآن الثلاثة تقرأ من
[`add-os/utils/format/calendar.ts`](../src/add-os/utils/format/calendar.ts).

**التخفيف:** المنطق كله في `add-os/utils/format/`. `applyArabicCalendar` تستقبل نسخة
dayjs كوسيط بدل استيراد `@/utils/dayjs`، فلا يعتمد `add-os` على من يستدعيه.
يحرسه [اختبار](../src/add-os/utils/format/__tests__/format.spec.ts) يثبت الطرفين:
أن `dateArDZ` يقول «أوت» فعلاً، وأن غلافنا يقول «آب».

### 3.15 الأيقونات دون اتصال  *(Sprint 0 — البند 1.5)*

| الملف | التغيير |
|---|---|
| [src/components/common/Icon.vue](../src/components/common/Icon.vue) | `loadIcon()` ← `getIcon()` |
| [src/main.ts](../src/main.ts) | `registerLocalIcons()` قبل التركيب |
| [vite.config.ts](../vite.config.ts) | إضافة `stripIconifyRemoteApi()` + `optimizeDeps.exclude` |
| [package.json](../package.json) | سكربت `icons` + 12 حزمة `@iconify-json` كاعتمادات تطوير |
| [tsconfig.vitest.json](../tsconfig.vitest.json) | تضمين `scripts/build-icons.js` ليتمكّن اختبار الانحراف من استيراده |

**المشكلة:** `@iconify/vue` يحلّ أي أيقونة غير مسجَّلة بطلب HTTP إلى ثلاثة مضيفين عامّين
(`api.iconify.design` · `api.simplesvg.com` · `api.unisvg.com`). ADD OS معزول على VPN،
فالنتيجة **واجهة بلا أيقونات إطلاقاً** — أو تسريب أنماط استخدام إن كان المنفذ مفتوحاً.
نفس فئة الصور البعيدة (§3.12)، لكنها تصيب كل أيقونة في المنتج لا مرجعين.

**لماذا هنا:**
- `Icon.vue` هو من يستدعي `loadIcon` — دالة الجلب نفسها. لا سبيل لتعطيلها من الخارج.
- التسجيل يجب أن يسبق أول رسم، و`main.ts` هي النقطة الوحيدة قبل `mount()`.
- سلاسل المضيفين ثابتة على مستوى الوحدة في `@iconify/vue`، فتُشحن سواء استُدعيت أم لا.
  إزالتها تحتاج تحويلاً وقت البناء.

**ثلاث طبقات، كل واحدة لازمة:**
1. `npm run icons` يستخرج المستخدَم فعلياً (229 أيقونة، 12 مجموعة) إلى
   [`icons.generated.json`](../src/add-os/assets/icons.generated.json).
2. `getIcon()` بدل `loadIcon()` — بحث محلي، **لا مسار شبكة أصلاً**. لولاها لبقي أي اسم
   غير مسجَّل يسقط إلى الشبكة.
3. إضافة Vite تستبدل المضيفين الثلاثة بمسار محلي خامل — فحتى استدعاء عرضي مستقبلاً
   لا يغادر الشبكة. **عرض Iconify للـ SVG لم يُمسّ إطلاقاً؛ سلاسل المضيفين فقط.**

**التحقق:** بناء نظيف ⟵ **صفر إشارات** للمضيفين الثلاثة في `dist`، ووجود
`__iconify-api-disabled` يثبت أن الإضافة عملت، وبيانات SVG مؤكَّدة في الحزمة.

**التخفيف:** المنطق كله في [`add-os/assets/icons.ts`](../src/add-os/assets/icons.ts)
و[`scripts/build-icons.js`](../scripts/build-icons.js). ويحرس التوليدَ من التقادم
[اختبار](../src/add-os/assets/__tests__/icons.spec.ts) يعيد تشغيل الماسح ويقارن —
فنسيان `npm run icons` يكسر اختباراً بدل أن يُخفي أيقونة بصمت.

### 3.16 مبدّل اللغة — نصّ بلا أعلام  *(Sprint 0)*

| الملف | التغيير |
|---|---|
| [Toolbar/LocaleSwitch.vue](../src/app-layouts/common/Toolbar/LocaleSwitch.vue) | حُذف `renderLabel` وأيقونة العلم؛ الخيار يحمل الاسم المترجَم مباشرةً |
| [common/LocaleSelect.vue](../src/components/common/LocaleSelect.vue) | نفس التغيير |

**لماذا:** كلاهما كان يرسم `circle-flags:${localeCode}`. اللغة ليست دولة — العربية لغة
عدة دول والإنجليزية عالمية — والرمزان لم يكونا يُحلّان أصلاً: `circle-flags:ar` هو علم
**الأرجنتين**، و`circle-flags:en` غير موجود.

**لماذا هنا:** الأعلام تُرسم داخل دالة `renderLabel` في المكوّنين. لا سبيل لإزالتها من الخارج.

**تبسيط مصاحب:** التسمية صارت تأتي من `locales.*` عبر `computed` يقرأ `t`، فتُترجَم مع
تبديل اللغة. سقطت الحاجة إلى `renderLabel` و`h()` واستيراد `Icon`.

هذا يحسم القرار المعلّق «أيقونة علم العربية» في REFACTOR-SUMMARY.

### 3.17 قائمة ADD OS والراوتر  *(Sprint 0 — البنود 2 · 3 · 4)*

| الملف | التغيير |
|---|---|
| [Navbar/items.tsx](../src/app-layouts/common/Navbar/items.tsx) | **أُعيدت كتابته** — يبني القائمة من `@/add-os/navigation/sections` |
| [Navbar/Navbar.vue](../src/app-layouts/common/Navbar/Navbar.vue) | `:indent="0"` · خطوط الشجرة بخصائص منطقية · إصلاح `ar(` ← `var(` · حذف تعويض `--dash-offset` الخاص بـ RTL |
| [VerticalNav/SidebarFooter.vue](../src/app-layouts/VerticalNav/SidebarFooter.vue) · [HorizontalNav/SidebarFooter.vue](../src/app-layouts/HorizontalNav/SidebarFooter.vue) | `:indent="0"` |
| [router/index.ts](../src/router/index.ts) | **أُعيدت كتابته** — `createAddOsRoutes()` بدل مسارات القالب |
| [Toolbar/Breadcrumb.vue](../src/app-layouts/common/Toolbar/Breadcrumb.vue) | ترجمة مفاتيح `meta.title` ومقاطع المسار + إعادة البناء عند تبديل اللغة |

**لماذا هنا:**
- `items.tsx` و`router/index.ts` مصنَّفان **مختلطَين** في القسم 2 ومجدولان لإعادة الكتابة
  في «الوحدة الأولى». هذا هو موعدهما — لا اختراق للحدّ الفاصل.
- `:indent` خاصية مكوّن، و`padding-left` الذي تولّده naive-ui **نمط سطري** لا يمكن
  تجاوزه بأي قاعدة. تصفيره من الخارج مستحيل.
- خطوط الشجرة أنماط `scoped` داخل `Navbar.vue`؛ تجاوزها من الخارج يعني صراع تخصّص،
  وفصلها عن الإزاحة يضمن انفكاكهما عند أول تعديل.
- `Breadcrumb.vue` يبني التسميات في `beforeResolve`، خارج دورة الرسم — فلا سبيل
  لترجمتها من الخارج ولا لجعلها تتبع اللغة.

**البنية:** المحتوى في [`add-os/navigation/sections.ts`](../src/add-os/navigation/sections.ts) —
مصدر واحد يقود القائمة **والراوتر** معاً، فلا يمكن أن يشير عنصر قائمة إلى مسار غير موجود.
ملفات مجموعات القائمة القديمة (`apps.ts` · `cards.ts` · …) لم تعد مستورَدة؛ باقية على القرص.

**التحقق:** [`navigation.spec.ts`](../src/add-os/navigation/__tests__/navigation.spec.ts) —
14 اختباراً على تطابق القائمة/المسارات/الترجمات، وعلى أن مقصد `/` صفحة موجودة في قسم فعّال.

### 3.18 إزالة روابط مورّد القالب  *(Sprint 0)*

القرار المعتمد كان رابطَي `SidebarFooter`. وأثناء التنفيذ كشف فحص مخرجات البناء
**ثلاثة مواضع أخرى من الفئة نفسها**، فأُزيلت كلها بالمبرّر ذاته.

| الملف | ما أُزيل |
|---|---|
| [VerticalNav/SidebarFooter.vue](../src/app-layouts/VerticalNav/SidebarFooter.vue) · [HorizontalNav/SidebarFooter.vue](../src/app-layouts/HorizontalNav/SidebarFooter.vue) | «Documentation» (موقع توثيق المورّد) و«Buy now» (صفحة بيع القالب) |
| [Toolbar/Notifications.vue](../src/app-layouts/common/Toolbar/Notifications.vue) | 🔴 **إشعار دعائي تلقائي** بعد 10 ثوانٍ من الإقلاع: «You can buy this template on Themeforest» مع زر يفتح صفحة البيع |
| [Toolbar/Avatar.vue](../src/app-layouts/common/Toolbar/Avatar.vue) | رابط «Documentation» ثالث · وعنصر «Profile» الذي صار يشير إلى مسار محذوف |
| [common/LayoutSettings.vue](../src/components/common/LayoutSettings.vue) | رابط «Other settings» إلى توثيق المورّد |

**لماذا هنا:** كلها نصوص وعناصر داخل قوالب المكوّنات أو دوال `h()`. لا سبيل لإزالتها من الخارج.

**أخطرها إشعار `Notifications.vue`:** إعلان يُطلق نفسه داخل لوحة تشغيل داخلية،
ويفتح تبويباً خارجياً. أفلت من الجرد السابق لأنه نصّ داخل كائن TypeScript لا في قالب HTML.

**تصحيح انحدار:** عنصر «Profile» في `Avatar.vue` كان ينادي `name: "Profile"` — وهو مسار
حذفناه مع مسارات القالب (§3.17). لولا إزالته لأطلق تحذير راوتر ولم ينتقل إلى شيء.
لا شاشة ملف شخصي في ADD OS بعد؛ يعود العنصر حين تُبنى.

**ما حلّ محلّها:** تذييل الشريط الجانبي يعرض الإصدار — `ADD OS v0.1.0` موسّعاً و`v0.1.0`
مطوياً — من [`add-os/version.ts`](../src/add-os/version.ts). متمركز بـ `justify-content`
و`text-align: center` وحشوات `padding-inline/block`، فيعمل في الاتجاهين بلا قواعد خاصة.
ليس مفتاح i18n: اسم منتج ورقم إصدار، ولا كلمات تُترجَم فيه (وحارس التكافؤ يرفض بحقّ
قيمة عربية بلا حرف عربي). قائمة الأفاتار أبقت «تسجيل الخروج» بمفتاح `common.logout`.

**التحقق:** بناء نظيف ⟵ **صفر إشارات** إلى `pinx-docs` أو `themeforest` أو `dverse.studio`
في `dist`. بقيت إشارة واحدة في مصدر `views/MultiLanguage.vue` — صفحة توضيحية غير موصولة
بالراوتر، فلا تدخل الحزمة، وتزول مع حذف صفحات الديمو.

---

### 3.19 تصحيحات بعد أول فحص بصري حقيقي  *(Sprint 0)*

ثلاثة تصحيحات كشفها المستخدم في المتصفح — أول تحقّق بصري فعلي. لا ملف vendor جديد:
الثلاثة في ملفات ملموسة سابقاً (§3.13 · §3.17 · §3.18)، فأعداد §4 لا تتغيّر.

| # | الملف | التغيير | السبب |
|---|---|---|---|
| 1 | [common/MainFooter.vue](../src/app-layouts/common/MainFooter.vue) | `justify-end` ⟵ `justify-center` | انحدار من §3.13: استبدلنا **محتوى** التذييل ولم نراجع **محاذاته**. `justify-end` يدفع المحتوى إلى الحافة الخلفية — في RTL هي اليسرى الفيزيائية. سطر حقوق محايد مكانه الوسط، والوسط يقرأ نفسه في الاتجاهين. |
| 2 | [common/Navbar/Navbar.vue](../src/app-layouts/common/Navbar/Navbar.vue) | حُذفت زخرفة «خطوط الشجرة» بكاملها، ومعها كتلة `.direction-rtl` | التفصيل أدناه |
| 3 | [VerticalNav/SidebarFooter.vue](../src/app-layouts/VerticalNav/SidebarFooter.vue) · [HorizontalNav/SidebarFooter.vue](../src/app-layouts/HorizontalNav/SidebarFooter.vue) | `flex: 1 1 auto` + `text-align: center` على نصّ الإصدار | تشديد لتمركز §3.18: صار النصّ يملأ السطر ويتمركز بنفسه، فلا يعتمد التمركز على محاذاة flex وحدها. |

**عن حذف خطوط الشجرة (2):** كان القالب يرسم جذعاً رأسياً وشرطة لكل صف بـ pseudo-elements
مثبَّتة على إزاحة **29px معايَرة يدوياً** — مقيسة على `padding-left` السطري الذي يولّده
naive-ui، وهو **بالضبط** ما استبدلناه بحشو منطقي لإصلاح RTL (RTL-REPORT §5.3).
فصارت الخطوط ترسم فوق التسميات.

حُذفت ولم تُعايَر، لأن:

- **زخرفية بحتة** — التسلسل يحمله أيقونة القسم وقفزة الإزاحة وسهم التوسّع؛
- **هندستها يجب أن تتفق مع إزاحة لا تراها**، فتنكسر عند أول تغيير في أي من القيمتين؛
- **كانت تخفي CSS باطلاً**: `ar(--dash-height)` بدل `var(…)` — يُلغي تصريح `top` الخاص
  بها بصمت. أي أن أحداً لم ينظر إليها فعلاً منذ كُتبت.

إن أُريدت عودتها، تُبنى من نفس المتغيّر الذي يقود الإزاحة، وتُفحص في متصفح في الاتجاهين.

**التحقق:** `dash-offset` · `dash-width` · `repeating-linear-gradient` ⟵ **صفر إشارات**
في CSS المبنيّ. `.justify-center` وقواعد `.sidebar-footer` مشحونة.
`vue-tsc` = 18 خطأ في ملفَّي Kanban (الأساس) · `eslint` = خطآن قائمان أصلاً · البناء ناجح.

---

### 3.20 هوية ADD البصرية — طبقة التوكنات  *(المرحلة 1 من مهمة الهوية)*

صار **`src/add-os/theme/tokens.ts`** المصدر الوحيد للتصميم، وكل ما دونه **مولَّد**
عبر `npm run tokens` (`scripts/build-tokens.js`).

> **لا ملف vendor جديد.** الملفات الستّة أدناه **كلها نقاط تماس قائمة سابقاً**
> (§3.1 · §3.2 · §3.6 · §3.9)، فأعداد §4 لا تتغيّر. هذا البند يوسّعها لا يضيف إليها.

| # | الملف | التغيير | يوسّع |
|---|---|---|---|
| 1 | [figma-tokens.json](../figma-tokens.json) · [src/design-tokens.json](../src/design-tokens.json) | **صارا مولَّدَين** من `tokens.ts`. لوحة ADD بدل لوحة Pinx. | §3.6 |
| 2 | [src/assets/scss/fonts.scss](../src/assets/scss/fonts.scss) | أُعيدت كتابته: Poppins (لاتيني) + **Noto Sans Arabic** (عربي). حُذف Cairo وLexend وPublic Sans. مُبدَّلان: `--font-family-latin` و`--font-family-arabic`. | §3.6 |
| 3 | [src/tailwind.css](../src/tailwind.css) | **سطر `@import` واحد** نحو `add-os/theme/tokens.generated.css`. | §3.9 |
| 4 | [src/theme/index.ts](../src/theme/index.ts) | `themeName` مثبَّت على `Light`؛ حُذف استيراد `useOsTheme`. | §3.1 |
| 5 | [src/stores/theme.ts](../src/stores/theme.ts) | حُذف `"themeName"` من `persist.pick`. | §3.2 |
| 6 | [package.json](../package.json) | `+ @fontsource/poppins` · `+ @fontsource/noto-sans-arabic` · سكربت `tokens`. | §3.6 |

**لماذا سطر Tailwind (3) في ملف القالب:** توجيه `@theme` لا تعالجه إلا خطّ أنابيب
Tailwind نفسه، و`src/tailwind.css` هي نقطة دخوله الوحيدة. طبقة SCSS الخاصة بنا
خطّ أنابيب آخر، فلو وُضع التوجيه فيها لتُجوهل بصمت. متغيّراتنا كلها بسابقة `--add-`
فلا تتعارض مع متغيّرات القالب التي يكتبها متجر الثيم **سطرياً على `<html>`** —
والأنماط السطرية تغلب أي قاعدة `:root`، فإعادة تعريفها من الخارج كانت ستكون كوداً ميتاً.

**لماذا تثبيت الوضع الفاتح (4 و5):** الوضع الداكن **خارج النطاق** في v1 (القرار Q7).
كان السطر `useOsTheme().value === "dark" ? Dark : Light` — أي أن جهازاً مضبوطاً على
الداكن يُقلع التطبيق على `darkTheme` الخاص بـ naive-ui، فتملأ افتراضياتُه كلَّ ما لا
تغطّيه تجاوزاتنا الفاتحة، مع كلاس `.theme-dark` على `<html>` يفعّل صيغة `dark:` في
Tailwind وقواعد `.theme-dark` في القالب. النتيجة **وضع داكن نصف مُنسَّق** — وهو أسوأ
من غيابه. و`themeName` كان محفوظاً، فقيمة مخزَّنة قديماً كانت ستعيده.

`useOsTheme` كان مستورداً لذلك السطر وحده، فحذفُه يمنع خطأ متغيّر غير مستخدم.

**طبقة حماية ثالثة لا تلمس أي ملف قالب:** `colors.dark` في التوكنات المولَّدة
**نسخة مطابقة** لـ `colors.light`، فلا يوجد إعداد يُنتج شاشة غير منسَّقة.

**العودة إلى الوضع الداكن لاحقاً:** أضِف مفتاح `dark` في `tokens.ts`، واقلب
`DARK_MODE_SUPPORTED`، وأعِد فحص نظام التشغيل هنا، وأعِد `themeName` إلى `persist.pick`.

**الأصول محلية بالكامل:** حزمتا `@fontsource` تشحنان `woff2` بمسارات **نسبية**
و`font-display: swap` مضبوطاً أصلاً، ولا يُستورد إلا المقطع المستخدَم فعلاً
(`latin` لـ Poppins و`arabic` لـ Plex). قيد العزل الشبكي محفوظ بحكم البناء.

**التحقق:** `vue-tsc` = **18 خطأ في ملفَّي Kanban فقط** — نفس الأساس تماماً، وصفر
أخطاء في كودنا · `eslint` نظيف · البناء ناجح · صفر ألوان Pinx في الحزمة · صفر
إشارات إلى Cairo أو Lexend أو Public Sans.

وحرس الأيقونات أثبت نفسه فعلياً: أسماء `STATUS_ICONS` الأربعة الجديدة كسرت
`icons.spec.ts` حتى شُغِّل `npm run icons` — أي أن أيقونة غير مشحونة تكسر اختباراً
بدل أن تختفي بصمت في شبكة معزولة.

---

### 3.21 تصحيحات ما بعد المرحلة 1  *(مهمة الهوية — جولة التدقيق)*

| # | الملف | التغيير | الحالة |
|---|---|---|---|
| 1 | [scripts/tokens-tool.js](../scripts/tokens-tool.js) | **مسار الاستيراد مُعطَّل** بـ `refuseImport()`، وحُذفت `importTokens()` (89 سطراً) ومعها `node:os` و`text` و`GLOBAL_KEYS`/`TYPO_KEYS`/`COLOR_KEYS`/`COLOR_SUFFIX_REGEX`. | **تماس جديد** |
| 2 | [src/main.ts](../src/main.ts) | حُذف تسجيل `@fawmi/vue-google-maps`. | **تماس جديد** |
| 3 | [Navbar/items.tsx](../src/app-layouts/common/Navbar/items.tsx) | `sectionIcon()` يغلّف أيقونة القسم المؤجَّل بكلاس خاص. | ضمن §3.17 |
| 4 | [src/assets/scss/fonts.scss](../src/assets/scss/fonts.scss) | + مقطع `latin` من Noto (وزنان) للأرقام حصراً. | ضمن §3.20 |
| 5 | [package.json](../package.json) | − `@fawmi/vue-google-maps` · − `@fontsource-variable/cairo` · − `@fontsource/lexend` · − `@fontsource/public-sans` · − `@fontsource/ibm-plex-sans-arabic`. | ضمن §3.20 |

**(1) لماذا تعطيل الاستيراد:** هدفا كتابة الأداة — `src/design-tokens.json`
و`figma-tokens.json` — صارا **مولَّدَين** من `tokens.ts`. فاستيراد لوحة من Figma كان
**يبدو ناجحاً ثم يُمحى بصمت** عند أول `npm run tokens`: عمل بشري يضيع دون تحذير.
لم تُترك الدالة معطَّلة بل حُذفت — دالةٌ ميتة كل أثرها إتلاف العمل هي خطر على بعد
نداء واحد من إعادة الوصل. والاتجاه المعاكس (تصدير) يبقى عاملاً، ورسالته الختامية
تقول صراحةً إن الملف مولَّد.

**لم يُقترح الكتابة back إلى `tokens.ts`:** ملف TypeScript مكتوب بيد بشرية يحمل
مبرّراً وقياس تباين لكل قيمة، وأي codegen فوقه يمسح بالضبط التوثيق الذي يجعله موثوقاً.

**(2) لماذا حذف خرائط Google:** الإضافة تحقن `<script>` من مضيف خارجي عند تركيب أي
مكوّن خريطة. المُحمِّل خامل (lazy) ولا مسار في ADD OS يرسم خريطة، فلم يُطلَق شيء —
لكن «آمن حتى يوصل أحدهم خريطة» عدٌّ تنازلي لا ضمان، على شبكة عزلُها يحرس أقفال أبواب
فعلية. `maplibre-gl` باقٍ ويعمل مع خادم بلاطات داخلي إن لزمت الخرائط.

**(3) لماذا غلاف الأيقونة:** الأيقونة **شقيقة** التسمية لا ابنتها، فكلاس
`.add-os-nav-soon` على التسمية لا يصلها — ولذلك كان `opacity` القديم يعتّم النصّ
وحده ويترك الأيقونة كاملة القوة، خلافاً لما وصف نفسه به.

**الحرس الجديد:** [`add-os/__tests__/no-external-urls.spec.ts`](../src/add-os/__tests__/no-external-urls.spec.ts)
يُسقط البناء عند أي مرجع `http(s)://` خارج قائمة سماح مُعلَّلة سطراً بسطر — يمسح
`dist` كاملاً وسطحَ ADD OS المصدري. عزل الشبكة صار مفروضاً باختبار لا بذاكرة بشرية.

**التحقق:** `vue-tsc` = 18 (الأساس، ملفَّا Kanban وحدهما) · `eslint` نظيف ·
الاختبارات **158/158 ناجحة في 9 ملفات** (67 أساساً + 82 توكنات + 9 عزل شبكي) ·
البناء ناجح · **صفر إشارات إلى مضيف خرائط Google في `dist`** ·
حزم الخطوط المثبَّتة = عائلات `@font-face` المشحونة بالضبط (Poppins · Noto Sans Arabic · JetBrains Mono).

---

### 3.22 إزالة تعديل الثيم وقت التشغيل + إحكام الأسرار  *(مهمة الهوية — جولة القرارات)*

المبدأ الحاكم: **حذف عنصر التحكّم لا يُزيل القدرة.** القدرة تعود مع أول شاشة إعدادات
يبنيها أحدهم. فأُزيلت القدرات نفسها، لا واجهاتها فقط.

| # | الملف | التغيير | الحالة |
|---|---|---|---|
| 1 | [src/stores/theme.ts](../src/stores/theme.ts) | حُذفت `setColor()` — **المسار الوحيد للكتابة في لوحة التوكنات**. وحُذفت `setTheme` · `setThemeLight` · `setThemeDark` · `toggleTheme` — كل مسارات الكتابة إلى `themeName`. وحُذفت `layout` و`routerTransition` من `persist.pick`. | ضمن §3.2 |
| 2 | [src/components/common/LayoutSettings.vue](../src/components/common/LayoutSettings.vue) | حُذفت 4 أقسام: منتقي اللون الأساسي + الحوامل، Light/Dark، Vertical/Horizontal، انتقال الراوتر. و~50 سطر SCSS معلَّق. و`reset()` صُحِّحت. | ضمن §3.5 |
| 3 | [Toolbar/Toolbar.vue](../src/app-layouts/common/Toolbar/Toolbar.vue) | حُذف `<ThemeSwitch />` واستيرادُه. | **تماس جديد** |
| 4 | `Toolbar/ThemeSwitch.vue` · `composables/useThemeSwitch.ts` | **مَحذوفان** | **حذف معتمد** |
| 5 | [common/SearchDialog.vue](../src/components/common/SearchDialog.vue) | حُذف إجراء لوحة الأوامر «Toggle dark mode» وثابت `DarkModeIcon`. | ضمن §3.12 |
| 6 | [src/main.ts](../src/main.ts) | `+ assertEnv()` قبل التركيب. | ضمن §3.21 |
| 7 | `.gitignore` · `.env` · `.env.production` · `.env.example` · `.env.sample` | إحكام الأسرار — انظر [`docs/SECRETS-RESOLUTION.md`](../docs/SECRETS-RESOLUTION.md). | **تماس جديد** |

**(1) لماذا حُذفت `setColor()`:** كل نسبة تباين يؤكّدها هذا المشروع مُختبَرة ضدّ
`add-os/theme/tokens.ts`. أي تجاوز وقت التشغيل يجعل تلك التأكيدات **جوفاء** — خضراء
في CI وكاذبة في المنتج. واختبارٌ لا يمكن أن يفشل في الحالة التي وُجد لأجلها أسوأ من
غياب الاختبار، لأنه يصنع ثقةً زائفة. ويُضاف: الدليل يُسند لـ `#007F91` دورَه، فمفتاحٌ
يبدّله المستخدم يجعل الالتزام بالهوية حادثاً لكل جلسة؛ ومستخدمٌ يضبط الأساسي على أحمر
يصادمه مع `danger` في شاشات فيها فتح قسري وسحب صلاحيات.

**(1) لماذا حُذفت دوال `themeName` الأربع:** تثبيت الافتراضي وإزالته من الحفظ منعا
الوصول إلى الوضع الداكن **عند الإقلاع**، وأبقياه متاحاً **وقت التشغيل**: ثلاثة أسطح
كانت لا تزال تنادي `toggleTheme()` — زرّ الشريط، و`useThemeSwitch()`، و**إجراء في
لوحة الأوامر بلا أي حضور بصري**. نقرة واحدة كانت تسلّم `darkTheme` الخاص بـ naive-ui
إلى تجاوزاتنا الفاتحة وحدها. `themeName` صار **للقراءة فقط**؛ الحاصلات باقية.

**(2) عيبان حيّان كشفتهما `reset()`** — لا كود ميت:
`setColor(…, "#00E19B" / "#00B27B")` أي **أخضر Pinx مثبَّتاً داخل المكوّن**، فزرّ
«إعادة التعيين» كان **يُزيل هوية ADD**؛ و`setTheme(osTheme === "dark" ? Dark : Light)`
الذي كان يُعيد تفعيل الوضع الداكن على جهاز مضبوط عليه، فيُبطل التثبيت في `theme/index.ts`.

**الحرّاس الثلاثة:**
[`no-runtime-theming.spec.ts`](../src/add-os/__tests__/no-runtime-theming.spec.ts) (19 تأكيداً) ·
[`no-secrets.spec.ts`](../src/add-os/__tests__/no-secrets.spec.ts) (12) ·
[`no-external-urls.spec.ts`](../src/add-os/__tests__/no-external-urls.spec.ts) (10).

قائمة السماح في حرس الروابط **تُقلّم نفسها**: أُضيف تأكيد يفشل إذا بقي مدخلٌ لمضيف
لم يعد يظهر في البناء. صلاحيةٌ ميتة هي الطريق الذي تتسلّل منه تبعية حقيقية لاحقاً.
سقط بذلك مدخلان: `maps.googleapis.com` مع إضافة الخرائط، و`api.org` مع إفراغ المتغيّر.

**درسٌ تكرّر ثلاث مرات:** الحرس أوقف تعليقاتنا نحن — في `icons.ts` و`main.ts`
و`config/env.ts` — لأنها كانت تكتب المضيف مع المخطَّط (`https://`). الحلّ كان **تعديل
النصّ** لا إضعاف القاعدة: يُكتب اسم المضيف مجرَّداً. أما في `no-runtime-theming` فالعكس
كان صحيحاً: هناك حُذفت التعليقات قبل الفحص، لأن المتجر يوثّق كل دالة محذوفة **باسمها**،
وتلك التوثيقات هي سبب فهم القارئ لاحقاً لماذا لا تعود. وأُستُثنيت ملفات الحرس الثلاثة
من فحص الكود لأنها تعرّف الأنماط التي تمنعها — فحصها بها دوريّ.

**التحقق النهائي:** `vue-tsc` = 18 (الأساس) · `eslint` نظيف في كودنا وخطآن قائمان
أصلاً في ملفَّي vendor (`useNotifications.ts` · `utils/theme.ts`) · **190/190 اختباراً
في 11 ملفاً** · البناء ناجح · صفر إشارات في `dist` إلى مضيف خرائط Google أو MapTiler
أو `api.org` · صفر أثر لقيمتَي المفتاح في الشجرة.

---

## 3-ب. حذف معتمد — تقليص اللغات  *(المرحلة 5)*

> **استثناء ثانٍ معتمد صراحةً من قاعدة «لا حذف»**، محدود بهذه الملفات الخمسة.
> القاعدة تبقى سارية على كل ما عداها.

```
src/lang/locales/de.json     ❌ محذوف
src/lang/locales/es.json     ❌ محذوف
src/lang/locales/fr.json     ❌ محذوف
src/lang/locales/it.json     ❌ محذوف
src/lang/locales/jp.json     ❌ محذوف
```

**السبب:** `MessageSchema` مشتقّ من `src/lang/locales/index.ts`. مع بقاء الستّ، كان كل مفتاح
ترجمة تضيفه أي وحدة ADD OS يستلزم تكراره في **ستة ملفات** لمجرد إبقاء النوع سليماً.
ADD OS ثنائي اللغة، فالعبء بلا مقابل.

**التنظيف المصاحب:**

| الملف | التغيير |
|---|---|
| `src/lang/locales/index.ts` | يصدّر `en` + `ar` فقط |
| `src/lang/locales/en.json` | مفتاح `locales` صار `{ ar, en }` |
| `src/add-os/lang/ar/ar.json` | مفتاح `locales` صار `{ ar, en }` |
| `src/stores/i18n.ts` | حُذفت استيرادات `deDE`/`esAR`/`frFR`/`itIT`/`jaJP` وتواريخها، و`naiveuiLocales` صارت سطرين، وسقط تحويل `jp → ja` |
| `src/utils/dayjs.ts` | صار يستورد `ar` + `en` فقط |

**التحقق:** `vue-tsc` بعد الحذف = **18 خطأ في ملفَّي Kanban فقط** — نفس الأساس تماماً،
وصفر أخطاء تخصّ `MessageSchema` أو `RecursiveKeyOf` أو أي locale.
الاختبارات: 10/10 ناجحة. `eslint`: خطآن قائمان أصلاً. البناء ناجح.

**ملاحظة:** لم يبقَ في `src` أي إشارة إلى اللغات المحذوفة (تحقّقت بالبحث).

---

## 4. الخلاصة العددية

| الفئة | العدد | الحالة |
|---|---|---|
| ملفات `src/` الإجمالية | 383 | (369 عند المرحلة 2ب −5 محذوفة +19 جديدة) |
| منها كود ADD OS (`src/add-os/`) | 26 | كودنا |
| منها ملفات مختلطة (القسم 2) | 23 | تُعدَّل جزئياً بخطة |
| منها vendor | 334 | **لا يُعدَّل** |

ملفات مختلطة خارج `src/`: `index.html` — فيصير مجموع القسم 2 = **24 ملفاً**.

| نقاط التماس (القسم 3) | العدد |
|---|---|
| داخل `src/` | 24 |
| خارج `src/` (`index.html` · `package.json` · `figma-tokens.json`) | 3 |
| **المجموع** | **27 ملفاً** |

**موزَّعة على:** i18n وربط الاتجاه (§3.3 · §3.10) · الخط (§3.6) · الاتجاه (§3.2) ·
`LayoutSettings` (§3.5) · نقطة دخول الأنماط (§3.7) · الحالة الابتدائية (§3.1) ·
`rtlProvider` (§3.8) · `tailwind.css` (§3.9) · الترجمة (§3.11، 7 ملفات) ·
الصور المحلية (§3.12، ملفان) · التذييل (§3.13) · التقويم (§3.14، ملفان).

> العدد ارتفع من 18 إلى 27 في المرحلة 5. لكن خمسة ملفات تماس سابقة
> (`de/es/fr/it/jp.json`) زالت مع تقليص اللغات — انظر القسم 3-ب.

ملفات التماس داخل `src/` محسوبة ضمن الـ 339 — فهي تبقى ملفات vendor، مسّها مسجَّل ومبرَّر.
و`index.html` مذكور في القسمين 2 و3 معاً لأنه فعلاً كلاهما: مسّته المرحلة 2أ (`dir`/`lang`)،
وسيُعاد جزء منه لاحقاً (وسوم Pinx).

**التماس الوحيد الذي يمسّ منطق مكوّن Pinx هو 3.5.** ما عداه إعدادات أو نقاط استيراد.

---

## 5. الحفاظ على الحدّ الفاصل

### عند إضافة كود جديد
1. الوجهة الافتراضية دائماً `src/add-os/`.
2. إن بدا تعديل ملف قالب ضرورياً، تحقّق أولاً: هل يمكن عبر override في `theme-overrides/`؟
   عبر تغليف المكوّن؟ عبر متغيّر CSS؟
3. إن تعذّر فعلاً — عدّل، **وأضِف بنداً إلى القسم 3 في الالتزام (commit) نفسه.**

### عند ترقية Pinx
1. راجع القسم 3 بنداً بنداً وأعِد تطبيق كل تماس على الملفات الجديدة.
2. راجع القسم 2 — الملفات المختلطة أعلى المرشّحين لتعارضات الدمج.
3. تحقّق من `rtlStyles` في `rtlProvider.ts`: هل أضافت naive-ui صادرات `unstable*Rtl`
   جديدة تُغني عن بعض overrides الـ RTL عندنا؟
4. أعد قراءة كتلة `.direction-rtl` في `naive-override.scss` قبل الاعتماد على `RTL-REPORT.md`.

### مقترح لفرض القاعدة آلياً (يحتاج قرار بشري)
قاعدة ESLint من نوع `no-restricted-imports` أو فحص في CI يمنع أي مسار خارج
`src/add-os/` من الاستيراد منه — عدا الاستثناء المسجَّل في 3.3.
هذا يحوّل الالتزام من بشري إلى مفروض آلياً. **غير مطبَّق** — خارج نطاق هذه المهمة.
