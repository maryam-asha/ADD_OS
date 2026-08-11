# INVENTORY.md — جرد شجرة `src/` لمشروع ADD OS Dashboard

> **الحالة:** مرحلة 1 — قراءة فقط. لم يُحذف ولم يُنقل أي ملف.
> **الأساس:** قالب Pinx Vue (`pinx-vue` v1.23.0) — Vue 3.5 + TypeScript + naive-ui 2.44.1 + Tailwind 4 + Vite 8.
> **تاريخ الجرد:** 2026-08-01

## مفتاح التصنيف

| الرمز | الفئة | المعنى العملي |
|---|---|---|
| **أ** | بنية أساسية للقالب (layout / theme / router / providers) | العمود الفقري. نستخدمه كما هو، ونعدّله عبر override فقط. |
| **ب** | مكوّنات UI عامة قابلة لإعادة الاستخدام | ذخيرة جاهزة سنستهلكها في وحدات ADD OS. |
| **ج** | صفحات عرض توضيحية / تطبيقات جاهزة (demo / showcase) | مرجع بصري وكودي. **لا مساس بها في هذه المهمة.** |
| **د** | أدوات / إعدادات (utils / composables / directives / config / types) | طبقة مساعدة. |

**إحصاء سريع:** ~330 ملفاً تحت `src/` — منها ~200 ملف في الفئة (ج).

---

## أ — البنية الأساسية للقالب

### جذر التطبيق

| المسار | الوصف | ملاحظة ADD OS |
|---|---|---|
| [src/main.ts](src/main.ts) | نقطة الدخول: تركيب Pinia (+persist)، i18n، router، ApexCharts، VectorMap، GoogleMaps. يستورد `assets/scss/index.scss` و `tailwind.css`. | **نقطة دخول الأنماط** — أي override عام يجب أن يصل من هنا. |
| [src/App.vue](src/App.vue) | يختار الـ layout ديناميكياً (`VerticalNav` / `HorizontalNav` / `Blank`)، يلفّ كل شيء بـ `Provider`، يدير انتقالات الراوتر. | |
| [src/global.d.ts](src/global.d.ts), [src/vite-env.d.ts](src/vite-env.d.ts), [src/router-env.d.ts](src/router-env.d.ts), [src/i18n.d.ts](src/i18n.d.ts), [src/unplugin.components.d.ts](src/unplugin.components.d.ts) | تعريفات أنواع عامة ومولّدة. | `unplugin.components.d.ts` **مولّد آلياً** من Vite. |

### طبقة الـ Layouts — [src/app-layouts/](src/app-layouts/)

| المسار | الفئة | الوصف |
|---|---|---|
| [src/app-layouts/VerticalNav/](src/app-layouts/VerticalNav/) — `VerticalNav.vue`, `Sidebar.vue`, `SidebarHeader.vue`, `SidebarFooter.vue`, `MainContainer.vue`, `index.ts`, `main.scss`, `_mixin.scss`, `_variables.scss` | أ | التخطيط الافتراضي (شريط جانبي عمودي). **هذا هو تخطيط ADD OS المتوقع.** يحتوي معالجات `.direction-rtl` قائمة. |
| [src/app-layouts/HorizontalNav/](src/app-layouts/HorizontalNav/) — `HorizontalNav.vue`, `HeaderBar.vue`, `Sidebar.vue`, `SidebarHeader.vue`, `SidebarFooter.vue`, `MainContainer.vue`, `index.ts`, `main.scss`, `_mixin.scss`, `_variables.scss` | أ | تخطيط بديل (شريط علوي). يحتوي أيضاً معالجات `.direction-rtl`. |
| [src/app-layouts/Blank/](src/app-layouts/Blank/) — `Blank.vue`, `MainContainer.vue`, `index.ts`, `main.scss` | أ | تخطيط فارغ (يُستخدم لصفحات Auth). |
| [src/app-layouts/common/Provider.vue](src/app-layouts/common/Provider.vue) | أ | **حرج.** يغلّف `n-config-provider` بـ `:rtl`, `:theme`, `:theme-overrides`, `:locale`, `:date-locale` + مزوّدات loading-bar/message/notification/dialog. |
| [src/app-layouts/common/rtlProvider.ts](src/app-layouts/common/rtlProvider.ts) | أ | **حرج لـ RTL.** مصفوفة `rtlStyles` — 29 عنصر `unstable*Rtl` من naive-ui. مرجع المرحلة 3. |
| [src/app-layouts/common/GlobalListener.vue](src/app-layouts/common/GlobalListener.vue) | أ | مستمع أحداث عام (mitt). |
| [src/app-layouts/common/SplashScreen.vue](src/app-layouts/common/SplashScreen.vue) | أ | شاشة تحميل أولية. |
| [src/app-layouts/common/Logo.vue](src/app-layouts/common/Logo.vue) | أ | شعار متغيّر (small/large × light/dark). **سيحتاج استبدال شعار ADD.** |
| [src/app-layouts/common/MainFooter.vue](src/app-layouts/common/MainFooter.vue) | أ | تذييل الصفحة. |

### قائمة التنقّل — [src/app-layouts/common/Navbar/](src/app-layouts/common/Navbar/)

| المسار | الفئة | الوصف |
|---|---|---|
| `Navbar.vue` | أ | يبني `n-menu` من عناصر `items.tsx`. يحوي كتلة `.direction-rtl`. |
| `index.ts` | أ | مُصدِّر. |
| `items.tsx` | أ + ج | **مختلط**: بنية بناء القائمة (أ) + محتوى تجريبي فعلي للقالب (ج). **هذا الملف سيُعاد كتابته بالكامل لقائمة ADD OS.** |
| `components.tsx` | أ | مساعدات render (شارات، عناوين مجموعات). |
| `apps.ts`, `authentication.ts`, `calendars.ts`, `cards.ts`, `charts.ts`, `dashboard.ts`, `editors.ts`, `layout.ts`, `maps.ts`, `tables.ts`, `toolbox.ts` | ج | تعريفات مجموعات قائمة القالب التوضيحية. |

### شريط الأدوات — [src/app-layouts/common/Toolbar/](src/app-layouts/common/Toolbar/)

| المسار | الفئة | الوصف |
|---|---|---|
| `Toolbar.vue`, `index.ts` | أ | الحاوية. |
| `Breadcrumb.vue` | أ | مسار التنقّل (يقرأ من `useBreadcrumb`). |
| `Avatar.vue` | أ | قائمة المستخدم (`n-dropdown`). |
| `ThemeSwitch.vue`, `FullscreenSwitch.vue`, `BlurEffect.vue`, `PillWrapper.vue` | أ/ب | عناصر تحكّم. |
| `LocaleSwitch.vue` | أ | مبدّل اللغة — **نقطة تماس مع إضافة `ar`.** |
| `Search.vue` | أ | زر فتح بحث عام. |
| `Notifications.vue` | أ | `n-popover` + `n-badge`. |
| `PinnedPagesV1.vue`, `PinnedPagesV2.vue` | أ | الصفحات المثبّتة (`n-popover`، `n-badge`). |

### الثيم والمتاجر

| المسار | الفئة | الوصف |
|---|---|---|
| [src/theme/index.ts](src/theme/index.ts) | أ | `getDefaultState()` / `getThemeOverrides()` / `getCssVars()`. **مصدر كل متغيّرات CSS.** فيه `rtl: false` كقيمة ابتدائية. |
| [src/design-tokens.json](src/design-tokens.json) | أ/د | مصدر الألوان والخطوط والقياسات. مولّد/مُدار عبر `scripts/tokens-tool.js`. **مرشّح مباشر لـ `add-os/design-tokens/`.** |
| [src/stores/theme.ts](src/stores/theme.ts) | أ | متجر الثيم. يحوي `setRTL()` و `isRTL` وإضافة `direction-rtl` على `<body>`. **آلية RTL الأساسية.** لاحظ: سطر `html.dir` **معطّل بتعليق** (السطر 113). |
| [src/stores/main.ts](src/stores/main.ts) | أ | حالة عامة (`forceRefresh`). |
| [src/stores/auth.ts](src/stores/auth.ts) | أ | مصادقة وهمية (mock) — **ستُستبدل بمصادقة ADD OS.** |
| [src/stores/i18n.ts](src/stores/i18n.ts) | أ | ربط locale التطبيق بـ `naiveuiLocale` / `naiveuiDateLocale` / dayjs. **لا يحوي `ar` حالياً.** |
| [src/stores/apps/useChatStore.ts](src/stores/apps/useChatStore.ts), `useFullCalendarStore.ts`, `useMailboxStore.ts` | ج | متاجر التطبيقات التوضيحية. |

### الراوتر

| المسار | الفئة | الوصف |
|---|---|---|
| [src/router/index.ts](src/router/index.ts) | أ + ج | حارس المصادقة + `createWebHistory` (أ)، وكل مسارات القالب التوضيحية (ج). **سيُعاد بناؤه لوحدات ADD OS.** |
| [src/router/components.ts](src/router/components.ts) | ج | 466 سطراً — مسارات صفحات showcase للمكوّنات فقط. |

### الأنماط — [src/assets/scss/](src/assets/scss/)

| المسار | الفئة | الوصف |
|---|---|---|
| [src/assets/scss/index.scss](src/assets/scss/index.scss) | أ | **نقطة دخول الأنماط.** يستورد حالياً: `fonts`, `common`, `common-animations`, `router-animations`, `overrides/naive-override`. |
| `fonts.scss` | أ | خطوط Lexend / Public Sans / JetBrains Mono. **⚠️ لا يوجد خط عربي.** |
| `common.scss`, `common-animations.scss`, `router-animations.scss`, `_functions.scss` | أ | أنماط عامة. |
| `overrides/naive-override.scss` | أ | **أهم ملف لـ RTL.** ~460 سطر، منها كتلة `.direction-rtl` (السطر 247+) تعالج يدوياً: menu, select-menu, base-selection, color-picker, cascader, rate, carousel, tabs, timeline, data-table, page-header, date-panel, time-picker-panel, form, input-group, slider, transfer, popover/popconfirm. |
| `overrides/apexchart-override.scss`, `jvm-override.scss`, `prosemirror-override.scss`, `quill-override.scss`, `shepherd-override.scss`, `vcalendar-override.scss` | ج/د | overrides لمكتبات طرف ثالث. **⚠️ غير مستوردة من `index.scss`** — تُستورد محلياً داخل الصفحات التي تستخدمها. |
| [src/tailwind.css](src/tailwind.css) | أ | نقطة دخول Tailwind 4. |

### الأصول

| المسار | الفئة | الوصف |
|---|---|---|
| [src/assets/images/](src/assets/images/) | أ | شعارات Pinx الستة (`brand-logo_*`) — **ستُستبدل بشعار ADD.** + أيقونات google/facebook + placeholder. |
| [src/assets/images/ecommerce/](src/assets/images/ecommerce/) | ج | صور بضائع للبطاقات التوضيحية. |
| [src/assets/icons/](src/assets/icons/) | ج | 3 أيقونات SVG توضيحية. |

---

## ب — مكوّنات UI عامة قابلة لإعادة الاستخدام

### [src/components/common/](src/components/common/) — الأكثر أهمية لنا

| المسار | الوصف | صلة بـ ADD OS |
|---|---|---|
| `Icon.vue` | غلاف موحّد للأيقونات (Iconify). | مستخدم في كل مكان. |
| `SegmentedPage.vue` | تخطيط صفحة بشريط جانبي داخلي + محتوى. يحوي كتلة `.direction-rtl`. | **قالب ممتاز لصفحات الوحدات.** |
| `SearchDialog.vue` | حوار بحث شامل (⌘K). | قابل لإعادة التوجيه لبحث ADD OS. |
| `LayoutSettings.vue` | لوحة إعدادات التخطيط — **وفيها مفتاح تفعيل RTL** (`themeStore.setRTL`). يحوي كتلة `.direction-rtl`. | نقطة تماس مباشرة مع RTL. |
| `LtrContext.vue` | **مهم لـ RTL:** يغلّف محتوى بـ `n-config-provider :rtl="[]"` + `direction: ltr` لفرض LTR داخل واجهة RTL (أرقام، كود، مخططات). | أداة جاهزة لحالات "المحتوى اللاتيني داخل واجهة عربية". |
| `LocaleSelect.vue` | منتقي اللغة. | نقطة تماس مع `ar`. |
| `Notifications/List.vue`, `Notifications/Toolbar.vue` | قائمة الإشعارات (`n-tooltip`). `List.vue` يحوي `.direction-rtl`. | قابل للاستخدام لإشعارات ADD OS. |
| `FileDrop.vue` | منطقة سحب وإفلات ملفات. | مفيد لرفع الوثائق. |
| `ImageCropper.vue` | قص الصور (`n-upload` + vue-advanced-cropper). | صور الأعضاء. |
| `ImageLoader.vue` | تحميل صور مع placeholder. | |
| `Percentage.vue` | عرض نسبة مع اتجاه (صعود/هبوط). | مؤشرات لوحة القيادة. |
| `PasswordStrengthMeter.vue` | مقياس قوة كلمة المرور. | |
| `TestScope.vue` | مكوّن اختبار داخلي. | |

### مكوّنات عامة أخرى

| المسار | الفئة | الوصف |
|---|---|---|
| [src/components/cards/CardWrapper.vue](src/components/cards/CardWrapper.vue), `CardActions.vue`, `CardCodeExample.vue` | ب | أغلفة بطاقات عامة. `CardActions` يستخدم `n-dropdown`. مُسجَّلة تلقائياً عبر `unplugin-vue-components` (انظر `vite.config.ts` → `dirs: ["src/components/cards"]`). |
| [src/components/tables/Base.vue](src/components/tables/Base.vue) | ب | جدول أساسي. يحوي `.direction-rtl`. |
| [src/components/list/List.vue](src/components/list/List.vue) | ب | قائمة عامة (+ `data.ts`, `utils.ts` توضيحيان). |
| [src/components/charts/Apex.vue](src/components/charts/Apex.vue) | ب | غلاف ApexCharts عام. |
| [src/components/auth/AuthForm.vue](src/components/auth/AuthForm.vue), `SignIn.vue`, `SignUp.vue`, `ForgotPassword.vue`, `Settings.vue`, `types.d.ts` | ب | نماذج مصادقة كاملة. **أساس قابل للتكييف لتسجيل دخول فريق التشغيل.** |
| [src/components/editors/Tiptap/](src/components/editors/Tiptap/), [src/components/editors/Milkdown/](src/components/editors/Milkdown/) | ب/ج | محرّرات نصّية مغلّفة. |
| [src/components/maps/leaflet/Map.vue](src/components/maps/leaflet/Map.vue), `maplibre/Map.vue` | ب/ج | أغلفة خرائط. |
| [src/components/profile/ProfileActivity.vue](src/components/profile/ProfileActivity.vue), `ProfileSettings.vue` | ب/ج | أقسام صفحة الملف الشخصي. |

---

## ج — صفحات عرض توضيحية / تطبيقات جاهزة

> **لا مساس بها في هذه المهمة.** مُصنّفة للعلم فقط.

### تطبيقات جاهزة

| المسار | الوصف |
|---|---|
| [src/views/Apps/Chat.vue](src/views/Apps/Chat.vue) | تطبيق محادثة (`n-dropdown`). |
| [src/views/Apps/Kanban.vue](src/views/Apps/Kanban.vue) + [src/components/apps/Kanban/](src/components/apps/Kanban/) (`ColumnEditor`, `TaskCard`, `TaskEditor`) | لوحة كانبان. |
| [src/views/Apps/Mailbox.vue](src/views/Apps/Mailbox.vue) + [src/components/apps/Mailbox/](src/components/apps/Mailbox/) (`ActionToolbar`, `ComposeView`, `Email`, `EmailContent`, `EmailToolbar`, `Navigator`) | صندوق بريد (`n-menu`, `n-dropdown`, `n-tooltip`). |
| [src/views/Apps/Notes.vue](src/views/Apps/Notes.vue) | ملاحظات (`n-upload`). |
| [src/views/Apps/Calendars/FullCalendar.vue](src/views/Apps/Calendars/FullCalendar.vue) + [src/components/apps/FullCalendar/EventEditor.vue](src/components/apps/FullCalendar/EventEditor.vue) | تقويم (`n-date-picker`). **مسار فعّال في الراوتر.** مرجع مباشر لوحدة حجز القاعات لاحقاً. |
| [src/views/Apps/Calendars/VueCal.vue](src/views/Apps/Calendars/VueCal.vue) | تقويم بديل. مساره **معطّل بتعليق** في `router/index.ts`. |
| [src/mock/](src/mock/) — `chat.ts`, `fullcalendar.ts`, `kanban.ts`, `mailbox.ts`, `notes.ts` | بيانات وهمية لما سبق. |

### صفحات showcase للمكوّنات

| المسار | العدد | الوصف |
|---|---|---|
| [src/views/Components/](src/views/Components/) | 74 ملف `.vue` | صفحة عرض لكل مكوّن naive-ui (Affix … Watermark) + [data-table-components/](src/views/Components/data-table-components/) (5 ملفات). **هذه هي المصدر الأساسي لاستخدامات `n-menu`/`n-date-picker`/`n-tabs`/… في نتائج البحث — استخدامات توضيحية لا إنتاجية.** |
| [src/views/Cards/](src/views/Cards/) | 5 | `Basic`, `Combo`, `Ecommerce`, `Extra`, `List` — تعرض [src/components/cards/](src/components/cards/) (36 بطاقة في `basic/`, `combo/`, `ecommerce/`, `extra/`, `social/`). |
| [src/views/Charts/](src/views/Charts/) | 2 | `ApexCharts`, `ChartJS` — تعرض [src/components/charts/demo-pages/](src/components/charts/demo-pages/) (9 ملفات) + `DemoApex.vue`, `data.ts`. |
| [src/views/Tables/](src/views/Tables/) | 3 + 9 + assets | `Base`, `DataTable`, `Grid` + [data-tables-components/](src/views/Tables/data-tables-components/) + [grid-assets/](src/views/Tables/grid-assets/) (RevoGrid plugins، مولّدات بيانات). |
| [src/views/Maps/](src/views/Maps/) | 4 | `GoogleMaps`, `Leaflet`, `MapLibre`, `VectorMap`. |
| [src/views/Editors/](src/views/Editors/) | 3 | `Milkdown`, `Quill`, `Tiptap`. |
| [src/views/Layout/](src/views/Layout/) | 3 | `FullWidth`, `LeftSidebar`, `RightSidebar`. |
| [src/views/Toolbox/](src/views/Toolbox/) | 2 | `RefreshTool`, `Tour` (Shepherd.js). |
| [src/views/Dashboard/](src/views/Dashboard/) | 2 | `Analytics` (الصفحة الافتراضية — **مُستوردة بشكل ثابت في الراوتر**)، `eCommerce`. |
| [src/views/](src/views/) (جذر) | 5 | `Icons.vue`, `MultiLanguage.vue`, `Profile.vue`, `Typography.vue`, `NotFound.vue`. `NotFound` **بنية أساسية (أ)** فعلياً. |
| [src/views/Auth/](src/views/Auth/) | `Login.vue`, `main.scss` | **فئة (أ) فعلياً** — صفحة الدخول الحقيقية. |

---

## د — أدوات / إعدادات

### Composables — [src/composables/](src/composables/)

| المسار | الوصف |
|---|---|
| `useBreadcrumb.ts` | ضبط مسار التنقّل لكل صفحة. **سيُستخدم في كل صفحة وحدة.** |
| `useGlobalActions.ts` | تسجيل اختصارات/إجراءات عامة. |
| `useLoadingBarSetup.ts` | ربط شريط التحميل بالراوتر. |
| `useNotifications.ts` | واجهة إشعارات. |
| `useSearchDialog.ts` | فتح/إغلاق حوار البحث. |
| `useThemeSwitch.ts` | تبديل الثيم (مع View Transitions). |
| `useFullscreenSwitch.ts` | ملء الشاشة. |
| `useHideLayoutFooter.ts` | إخفاء التذييل لصفحة بعينها. |

### Utils / Directives / Emitter

| المسار | الوصف |
|---|---|
| [src/utils/index.ts](src/utils/index.ts) | `isMobile()` وأدوات متفرقة. |
| [src/utils/theme.ts](src/utils/theme.ts) | `getThemeColors`, `colorToArray`, `expandPattern`, `getTypeValue`. |
| [src/utils/auth.ts](src/utils/auth.ts) | `authCheck()` — حارس الراوتر. **سيُعاد بناؤه لصلاحيات ADD OS.** |
| [src/utils/dayjs.ts](src/utils/dayjs.ts) | إعداد dayjs + locales. **⚠️ لا يستورد locale عربي.** |
| [src/directives/v-hl.ts](src/directives/v-hl.ts) | توجيه إبراز الكود (highlight.js). |
| [src/emitter/index.ts](src/emitter/index.ts) | ناقل أحداث mitt. |

### i18n — [src/lang/](src/lang/)

| المسار | الوصف |
|---|---|
| `index.ts` | إنشاء نسخة `createI18n` + تصدير `i18nGlobal`. |
| `config.ts` | `getI18NConf()` — locale افتراضي `"en"`، `legacy: false`. الأنواع `LocaleCodes` / `MessageSchema` مشتقة آلياً من `locales/index.ts`. |
| `locales/index.ts` | يصدّر: `de`, `en`, `es`, `fr`, `it`, `jp`. **⚠️ لا يوجد `ar`.** |
| `locales/*.json` | 6 ملفات ترجمة. |

### Types — [src/types/](src/types/)

| المسار | الوصف |
|---|---|
| `theme.d.ts` | `Layout`, `RouterTransition`, `ThemeNameEnum`. |
| `auth.d.ts` | أنواع المصادقة. |
| `common.d.ts` | `RecursiveKeyOf` (يُستخدم لاشتقاق مفاتيح i18n بأمان الأنواع). |
| `vue-cal/`, `vuevectormap/` | تعريفات لمكتبات طرف ثالث. |

### اختبارات

| المسار | الوصف |
|---|---|
| [src/components/\_\_tests\_\_/SampleComponent.spec.ts](src/components/__tests__/SampleComponent.spec.ts) | اختبار Vitest واحد (مستثنى من `tsconfig.app.json`). |

### ملفات نظام (خارج التصنيف)

`src/.DS_Store` وما يماثله في 11 مجلداً فرعياً — مخلّفات macOS. **لم تُحذف** التزاماً بالقاعدة 1.

---

## ملاحظات مهمة استُخلصت أثناء الجرد (مدخلات للمراحل 2–4)

1. **`ar` غير موجود إطلاقاً.** لا في `src/lang/locales/`، ولا في `naiveuiLocales` داخل [src/stores/i18n.ts](src/stores/i18n.ts)، ولا في [src/utils/dayjs.ts](src/utils/dayjs.ts). — يُعالَج في المرحلة 3.

2. **`rtl: false` هو الافتراضي** في [src/theme/index.ts](src/theme/index.ts) (السطر 21)، وهو **غير مُدرج في `persist.pick`** داخل [src/stores/theme.ts](src/stores/theme.ts) (السطر 187) — أي أن تفعيل RTL يدوياً من لوحة الإعدادات **لا يُحفظ عبر إعادة التحميل**. مرشّح لقرار بشري.

3. **`html.dir` معطّل بتعليق** في [src/stores/theme.ts:113](src/stores/theme.ts#L113). القالب يعتمد فقط على كلاس `.direction-rtl` على `<body>`، لا على سمة `dir` الأصلية للمتصفح. له أثر على سلوك المتصفح الأصلي (اختيار النص، التمرير، الحقول).

4. **لا خط عربي** في [src/assets/scss/fonts.scss](src/assets/scss/fonts.scss) — الخطوط الحالية (Lexend / Public Sans) لا تدعم العربية. مرشّح لقرار بشري.

5. **غالبية استخدامات مكوّنات naive-ui "غير المغطّاة بـ RTL" مصدرها صفحات showcase** في [src/views/Components/](src/views/Components/)، لا كود إنتاجي. التمييز ضروري في المرحلة 3 لتحديد الأولوية.

6. **`overrides/*.scss` عدا `naive-override` غير مستوردة عالمياً** — تُستورد داخل الصفحات. أي override جديد لنا يجب أن يُضاف صراحةً إلى [src/assets/scss/index.scss](src/assets/scss/index.scss).

7. **`unplugin-vue-components` يراقب `src/components/cards` فقط** ([vite.config.ts:29](vite.config.ts#L29)) — أي مكوّنات ADD OS جديدة تحتاج استيراداً صريحاً، أو توسيع `dirs`.

8. **حدود القالب ليست دائماً على مستوى الملف.** أوضح مثال: [src/app-layouts/common/Navbar/items.tsx](src/app-layouts/common/Navbar/items.tsx) و[src/router/index.ts](src/router/index.ts) — كلاهما يخلط بنية أساسية بمحتوى توضيحي. هذا يحدّ من صرامة أي `VENDOR-MANIFEST`؛ يُعالَج في المرحلة 2.
