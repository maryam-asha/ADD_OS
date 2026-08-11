# RTL-REPORT.md — فحص RTL ساكن لسطح ADD OS الإنتاجي

> ⚠️ **حدود هذا التقرير:** الفحص **كودي ساكن بالكامل**. لا متصفح، ولا تحقّق بصري.
> كل معالجة أدناه **فرضية مبنيّة على قراءة المصدر**، تحتاج تأكيداً بشرياً بالعين.
> ما يرد في عمود «تحقّق بصري» بـ **مطلوب** لم يُرَ قط في متصفح.
>
> **تاريخ الفحص:** 2026-08-02 · **naive-ui:** 2.44.1 · **قالب:** pinx-vue 1.23.0

---

## 1. سطح الفحص

**مشمول (إنتاجي):**
`src/app-layouts/**` · `src/components/common/**` · `src/components/auth/**` ·
`src/assets/scss/**` · `src/tailwind.css` · `src/add-os/**`

**مستثنى (توضيحي):** `src/views/**` — ومنها 81 صفحة showcase في `views/Components/`،
و`src/components/{cards,charts,apps,editors,maps,list,tables,profile}/**`.
استخداماتها توضيحية لا إنتاجية (اكتشاف الجرد رقم 5)، فلا وزن لها في ترتيب الأولويات.

**مستثنى رغم وجوده في `app-layouts/`:** [`PinnedPagesV1.vue`](../../app-layouts/common/Toolbar/PinnedPagesV1.vue) —
تحقّقت أن [`Toolbar.vue:43`](../../app-layouts/common/Toolbar/Toolbar.vue#L43) يستورد `PinnedPagesV2` وحده.
V1 ملف ميّت عملياً، وهو **الملف الوحيد** في السطح الإنتاجي الذي يحوي أدوات Tailwind
اتجاهية (`pr-`, `rounded-l`).

---

## 2. طبقات غطاء RTL الثلاث

| # | الطبقة | الملف | الحجم |
|---|---|---|---|
| 1 | عناصر naive-ui الرسمية | [`rtlProvider.ts`](../../app-layouts/common/rtlProvider.ts) | 29 عنصراً (قالب) **+ 2 أضفناهما** |
| 2 | override يدوي للقالب | [`naive-override.scss`](../../assets/scss/overrides/naive-override.scss) كتلة `.direction-rtl` | ~215 سطراً |
| 3 | override ADD OS | [`_rtl-gaps.scss`](./_rtl-gaps.scss) | ثغرتان |

**+ الطبقة الصفر (من المرحلة 2أ):** `<html dir="rtl">` صار مفعّلاً. هذا وحده يضبط
تدفّق flex/grid وترتيب النصّ في **غالبية** مكوّنات naive-ui دون أي CSS إضافي — وهو
السبب الرئيسي في أن عدد الثغرات المتبقية صغير.

### ماذا يوفّر naive-ui 2.44.1 فعلياً

36 عنصر `unstable*Rtl`. القالب سجّل 29. الستة الباقية (عدا Badge):

| العنصر | مُستخدَم إنتاجياً؟ | الإجراء |
|---|---|---|
| `unstablePopoverRtl` | **نعم** — Notifications · PinnedPagesV2 · (ويرثه n-tooltip و n-popselect) | ✅ **سُجِّل** |
| `unstableUploadsRtl` | **نعم** — ImageCropper.vue | ✅ **سُجِّل** |
| `unstableBadgeRtl` | نعم | ❌ معطّل عمداً — انظر §5.1 |
| `unstablePageHeaderRtl` | لا (showcase فقط) | مؤجَّل — [`rtl-styles.ts`](./rtl-styles.ts) يذكره جاهزاً |
| `unstableTreeSelectRtl` | لا (showcase فقط) | مؤجَّل |
| `unstableInputOtpRtl` | لا (غير مستخدَم إطلاقاً) | مؤجَّل |

---

## 3. الجدول الرئيسي — مكوّنات naive-ui في السطح الإنتاجي

| المكوّن | مُستخدَم إنتاجياً؟ (أين) | مغطّى بـ rtlProvider؟ | مُعالَج في naive-override؟ | نوع المعالجة | تحقّق بصري |
|---|---|---|---|---|---|
| `n-menu` | ✅ Navbar · SidebarFooter ×2 | ❌ لا يوفّره naive-ui | ✅ `direction` · هوامش الأيقونات · عنوان المجموعة · الحالة المطوية | **مُعالَج جزئياً** — ثغرة اتجاه الإزاحة، §5.3 | **مطلوب — أولوية عليا** |
| `n-popover` | ✅ Notifications · PinnedPagesV1/V2 | ✅ **أضفناه** | جزئياً (popconfirm فقط) | تسجيل عنصر naive-ui | **مطلوب** |
| `n-tooltip` | ✅ Notifications/List | ✅ **يرث Popover** | — | تسجيل عنصر naive-ui | **مطلوب** |
| `n-popselect` | ✅ LocaleSwitch | ✅ Popover + Select | ✅ `base-select-menu` | لا يحتاج إضافة | **مطلوب** |
| `n-dropdown` | ✅ Toolbar/Avatar | ❌ لا يوفّره naive-ui | ✅ `v-binder-follower` | كافٍ — تحقّقت أن `dropdown/index.cssr` لا يحوي هوامش فيزيائية غير متماثلة؛ يعتمد `width` وflex | **مطلوب** |
| `n-upload` | ✅ ImageCropper | ✅ **أضفناه** | جزئياً (حالة خطأ form-item) | تسجيل عنصر naive-ui | **مطلوب** |
| `n-badge` | ✅ Notifications · PinnedPagesV2 · Navbar tsx | ❌ **معطّل عمداً** | ✅ `direction: ltr` قسري | **قرار تصميمي** §5.1 | — |
| `n-breadcrumb` | ✅ Toolbar/Breadcrumb | ❌ لا يوفّره naive-ui | ❌ | **لا يحتاج CSS** — تحقّقت أن الفاصل `margin: 0 8px` متماثل، والتدفّق يتبع `dir`. لكن أنيميشن الدخول عولج، §4.2 | **مطلوب** |
| `n-switch` | ✅ LayoutSettings | ❌ لا يوفّره naive-ui | ❌ | **قرار تصميمي** §5.2 | — |
| `n-progress` | ✅ Percentage | ❌ لا يوفّره naive-ui | ❌ | **لا يحتاج حالياً** — `line-fill` في التدفّق الطبيعي (`position: relative; max-width:%`) فينعكس مع `dir` تلقائياً. ثغرة كامنة: `padding-left` على المؤشّر عند `show-indicator` §5.4 | **مطلوب** |
| `n-split` | ✅ SegmentedPage | ❌ لا يوفّره naive-ui | القالب يعالجه في `SegmentedPage.vue` نفسه | لا تدخّل | **مطلوب** |
| `n-select` | ✅ LayoutSettings · LocaleSelect | ✅ | ✅ | مُعالَج | **مطلوب** |
| `n-scrollbar` | ✅ 8 ملفات | ✅ | — | مُعالَج | **مطلوب** |
| `n-drawer` | ✅ Notifications | ✅ | — | مُعالَج | **مطلوب** |
| `n-modal` | ✅ ImageCropper · SearchDialog | ✅ (Card/Dialog) | ✅ | مُعالَج | **مطلوب** |
| `n-form` / `n-form-item` | ✅ auth ×3 | ❌ لا يوفّره naive-ui | ✅ inline gap · حشوة التسمية | مُعالَج | **مطلوب** |
| `n-input` | ✅ SignUp · auth | ✅ | — | مُعالَج | **مطلوب** |
| `n-avatar` | ✅ Toolbar/Avatar | ❌ (AvatarGroup فقط) | ✅ توسيط `translateX` | لا يحتاج (توسيط متماثل) | — |
| `n-button` · `n-tag` · `n-card` · `n-divider` · `n-checkbox` · `n-empty` · `n-spin` · `n-color-picker` | ✅ متفرقة | ✅ | ✅ | مُعالَج | — |

**غير مستخدَم إنتاجياً إطلاقاً** (وردت في نصّ المهمة الأصلي): `n-date-picker` · `n-time-picker` ·
`n-tabs` · `n-cascader` · `n-tree-select` · `n-page-header` · `n-timeline` · `n-transfer` ·
`n-slider` · `n-rate` · `n-carousel` · `n-mention` · `n-anchor` · `n-calendar`.
جميعها محصورة في `views/Components/**`. **وكلها معالَجة أصلاً** في كتلة `.direction-rtl`
داخل `naive-override.scss` — لم أضف لها شيئاً.

---

## 4. ما عولج فعلياً في هذه المرحلة

### 4.1 خصائص منطقية في المصدر — [`src/tailwind.css`](../../tailwind.css)

أنماط أساسية للتطبيق نفسه (لا naive-ui)، فالحلّ المنطقي هو الأنظف ولا يحتاج أي override:

```diff
  blockquote {
-   padding-left: 1em;
-   border-left: 4px solid var(--border-color);
+   padding-inline-start: 1em;
+   border-inline-start: 4px solid var(--border-color);
  }
- ul  { padding-left: 20px; }
- ol  { padding-left: 20px; }
+ ul  { padding-inline-start: 20px; }
+ ol  { padding-inline-start: 20px; }
```

**تعمل في الاتجاهين بلا كتلة `.direction-rtl`، وبلا نقطة تماس مستقبلية.**
مسجَّل في VENDOR-MANIFEST §3.9. تحقّقت من مخرجات البناء:
`blockquote{border-inline-start:4px solid var(--border-color);padding-inline-start:1em;display:block}`

### 4.2 override في [`_rtl-gaps.scss`](./_rtl-gaps.scss)

ثغرتان داخل أنماط `scoped` لمكوّنات القالب — لا يمكن حلّهما بخاصية منطقية دون تعديل vendor:

| الملف | الثغرة | المعالجة |
|---|---|---|
| [`Percentage.vue`](../../components/common/Percentage.vue) | `.percentage-icon { margin-right: 3px }` و`.with-background { padding-right: 6px }` — تقع على الحافة **الأمامية** في RTL | تصفير الفيزيائي + `margin-inline-end` / `padding-inline-end` |
| [`Breadcrumb.vue`](../../app-layouts/common/Toolbar/Breadcrumb.vue) | `.anim-enter-from { transform: translateX(-5px) }` — العناصر تنزلق من اليسار بينما المسار ينمو يساراً في RTL | `translateX(5px)` |

ملاحظة تقنية: أنماط `scoped` تحمل `[data-v-*]`، لذا كُرِّر `.anim-enter-from` لمعادلة
التخصّص، والاعتماد على ترتيب المصدر (ملفنا مستورد آخراً). موثَّق داخل الملف.

### 4.3 تسجيل عنصرَي RTL من naive-ui — [`rtl-styles.ts`](./rtl-styles.ts)

`unstablePopoverRtl` + `unstableUploadsRtl`، مضافان عبر spread في `rtlProvider.ts`
(سطران، مسجَّل في VENDOR-MANIFEST §3.8).

**لماذا هذا أفضل من كتابة SCSS:** يقلب أنماط المكوّن في مصدرها، وتصونه naive-ui عبر الترقيات.

**التحقّق:** فحصت مخرجات البناء —
``name:`Popover`,style:K(`popover`,[U(`rtl`,`…`` و``name:`Upload`,style:K(`upload`,[U(`rtl`,`…``
موجودان في الحزمة (لم يكونا قبل التغيير).

---

## 5. ثغرات لم تُعالَج — تحتاج قراراً بشرياً

### 5.1 🔴 موضع الشارة (`n-badge`) — قرار تصميمي

القالب يفرض `direction: ltr` على `.n-badge` **ويعطّل `unstableBadgeRtl` بتعليق صريح** —
قرار متعمَّد من مؤلّف Pinx. النتيجة: عدّاد الإشعارات يبقى أعلى **اليمين** في الواجهة العربية.

في واجهات RTL الاصطلاح الشائع أن ينتقل إلى أعلى **اليسار**.

**السؤال:** نُبقي سلوك القالب أم نفعّل `unstableBadgeRtl`؟
التفعيل = سطر واحد في [`rtl-styles.ts`](./rtl-styles.ts) + إزالة `.n-badge { direction: ltr }`
من `naive-override.scss` (نقطة تماس vendor جديدة).

### 5.2 🟡 اتجاه مفتاح التبديل (`n-switch`) — قرار تصميمي

naive-ui لا يوفّر RTL للـ Switch إطلاقاً. المقبض يستخدم `left` مطلقاً + `transform`،
فيبقى يبدأ من اليسار ويتحرّك يميناً عند التفعيل — **نفس سلوك LTR**.

الاصطلاحات متباينة: Material Design يعكسه في RTL، وأنظمة أخرى تُبقيه.
مستخدَم حالياً في `LayoutSettings.vue` فقط، لكنه سيكثر في نماذج ADD OS.

**السؤال:** نعكسه أم نُبقيه؟ العكس يحتاج override يدوياً (لا دعم من naive-ui).

### 5.3 ✅ اتجاه إزاحة القائمة الجانبية (`n-menu`) — **عولجت** (Sprint 0، البند 3)

> **حُلّت** عند إعادة كتابة `items.tsx`، كما كان مخطَّطاً. النصّ الأصلي محفوظ أدناه للسياق.
>
> **ما نُفِّذ:**
> - `:indent="0"` و`:root-indent="0"` على كل `n-menu` (Navbar + SidebarFooter ×2).
> - الإزاحة تُطبَّق الآن بـ `padding-inline-start` متدرّجة (18 · 36 · 54 · 72) في
>   [`_nav.scss`](./_nav.scss) — تنعكس تلقائياً، ولا كتلة `.direction-rtl` أصلاً.
> - `padding-right: 18px` المثبَّت داخل naive-ui يُتجاوَز بحشو منطقي على الجهتين.
> - خطوط شجرة القائمة **حُذفت** (لاحقاً — MANIFEST §3.19). كانت مثبَّتة على إزاحة
>   `--dash-offset: 29px` مقيسة على النمط السطري الذي استبدلناه، فصارت ترسم فوق التسميات.
>   ومعها سقط تعويض RTL وعيب `ar(--dash-height)` القائم في القالب (§6.1).
>
> #### ⚠️ تصحيح جوهري — الإصلاح الأول كان ناقصاً في LTR
>
> نصّ هذا القسم كان يقول إن `indent=0` «يُسقط النمط السطري تماماً لأن `0 && …` قيمة
> زائفة». **هذا خطأ، وهو ما أخفى العلّة.** `MenuOptionContent` يبني النمط كـ
> ``paddingLeft && `${paddingLeft}px` ``، فإزاحة 0 تنتج **العدد 0**: زائف، لكنه ليس
> `null`/`undefined` — وVue لا يتخطّى إلا هذين. فكل عنصر يشحن فعلاً
> `style="padding-left: 0px"`، وهو تصريح سطري يتغلّب على أي قاعدة عادية من الأنماط
> على الجهة اليسرى الفيزيائية:
>
> | الاتجاه | `padding-inline-start` يقابل | النتيجة |
> |---|---|---|
> | RTL | `padding-right` | لا تضارب ⟶ الإزاحة تعمل |
> | LTR | `padding-left` | تضارب ⟶ **الإزاحة تُبتلَع** |
>
> فشحنَت القائمة صحيحةً في العربية ومسطّحةً بلا إزاحة في الإنجليزية — وهو ما رآه
> المستخدم في المتصفح. الإصلاح: `!important` على الحشو المنطقي — وظيفته الحقيقية هنا،
> تجاوز نمط سطري لمكتبة خارجية لا نملك تعديلها. و`padding-inline-end` يحتاجه أيضاً،
> فهو الجهة التي تقع يساراً في RTL.
>
> **حارس:** [`__tests__/nav-indent.spec.ts`](./__tests__/nav-indent.spec.ts) يثبّت
> السلوك نفسه: يركّب `n-menu` بإزاحة 0 ويتحقّق أن النمط السطري **موجود** على كل عمق،
> وأنه غائب في الوضع الأفقي (حيث يعيد `use-menu-child.mjs` قيمة `undefined`).
> إن أسقطته نسخة لاحقة من naive-ui، يفشل الحارس ويصبح `!important` قابلاً للإزالة.
>
> **الدرس:** «تحقّقت من المصدر» لا تعني «قرأت المصدر بما يكفي». `0 && x` زائف —
> لكن السؤال لم يكن عن زيف القيمة، بل عمّا يفعله Vue بها.
>
> **⚠️ ما يبقى للفحص البصري:** بعد `!important`، هل تُزاح العناصر الفرعية عن **اليمين**
> في العربية وعن **اليسار** في الإنجليزية، بمقدار أكبر من عنوان القسم، في الاتجاهين؟

<details>
<summary>النصّ الأصلي للثغرة (قبل المعالجة)</summary>

#### 🔴 اتجاه إزاحة القائمة الجانبية (`n-menu`) — أهم ثغرة متبقية

**ما تحقّقت منه في المصدر:**

- `n-menu` تطبّق الإزاحة كـ **نمط سطري `padding-left: Npx`** محسوب بالعمق
  ([`menu/src/use-menu-child.mjs:34`](../../../node_modules/naive-ui/es/menu/src/use-menu-child.mjs)،
  و`MenuOptionContent.mjs:53`). و[`Navbar.vue:9`](../../app-layouts/common/Navbar/Navbar.vue#L9) يمرّر `:indent="18"`.
- `.n-menu-item-content` فيه `padding-right: 18px` ثابت في `index.cssr.mjs:118`.
- خطوط شجرة القائمة في `Navbar.vue` تُرسم بـ `left: var(--dash-offset)` (السطران 122 و135).

**الأثر المتوقَّع في RTL:** النصّ والأيقونات تنعكس (لأن `grid-template-areas` تتبع `direction`)،
لكن **الإزاحة وخطوط الشجرة تبقى على اليسار** — أي على الجهة المعاكسة لاتجاه القراءة.

**لماذا لم أعالجها:**
1. **يستحيل إصلاحها بـ CSS.** الإزاحة نمط سطري ديناميكي القيمة (18 · 36 · 54…) ولا يمكن
   نقلها إلى الجهة الأخرى بقاعدة ثابتة.
2. **معالجة نصفية تزيد الطين بلة.** يمكنني نقل خطوط الشجرة إلى اليمين (فهي أنماط `scoped`
   نستطيع تجاوزها)، لكن الإزاحة ستبقى يساراً، فتنفصل الخطوط عن العناصر التي تصفها.
3. **مؤشّر على نيّة مؤلّف القالب:** كتلة `.direction-rtl` في `Navbar.vue:174` تغيّر
   `--dash-offset` من 29px إلى 25px **دون** تغيير `left` إلى `right` — ما يوحي بأنه رأى
   الحالة في RTL وضبط الإزاحة على بقائها يساراً.

**الإصلاح الصحيح (موصى به، غير منفَّذ):** تمرير `:indent="0"` و`:root-indent="0"` إلى
`n-menu`، وتوليد الإزاحة بأنفسنا عبر `padding-inline-start` في مُصيِّر العناصر، وقلب خطوط
الشجرة إلى `inset-inline-start`.

**التوقيت المنطقي:** عند إعادة كتابة [`items.tsx`](../../app-layouts/common/Navbar/items.tsx) —
وهو مجدوَل أصلاً لـ«الوحدة الأولى» في VENDOR-MANIFEST §2.

**مطلوب منك أولاً:** تأكيد بصري أن المشكلة تظهر فعلاً كما وصفتُها. إن كانت مقبولة بصرياً، يسقط البند.

</details>

### 5.4 🟢 مؤشّر شريط التقدّم — ثغرة كامنة

`progress/src/styles/index.cssr.mjs` فيه `padding-left: 14px` (و`4px`) على المؤشّر النصّي.
لا أثر اليوم: الاستخدام الإنتاجي الوحيد في `Percentage.vue` يمرّر `:show-indicator="false"`.
**يصبح ثغرة فور استخدام `show-indicator`** في لوحات ADD OS.

### 5.5 🔴 تسمية الأشهر — تعارض فعلي بين مكتبتين

**قِسته برمجياً، والنتيجة تعارض حقيقي:**

| المصدر | 2026-08-02 | يظهر في |
|---|---|---|
| `dateArDZ` (naive-ui — date-fns `arDZ`) | `2 أوت 2026` | كل مكوّنات التاريخ في naive-ui |
| `dayjs` locale `ar` | `2 أغسطس 2026` | أي تنسيق نكتبه نحن |

**«أوت» تسمية مغاربية**، غير مألوفة في سوريا. و**naive-ui لا يصدّر إلا `arDZ`** —
لا `ar` ولا `arSA` ولا `arEG`.

بدائل `date-fns` المتاحة (قِستها كلها):

| Locale | أغسطس |
|---|---|
| `ar` · `arEG` · `arSA` | **أغسطس** ✅ يطابق dayjs |
| `arDZ` · `arTN` | أوت |
| `arMA` | غشت |

**نقطة إضافية:** بلاد الشام تستخدم كثيراً **«آب»** — ولا يوفّرها أيٌّ من المذكورين.

**الإصلاح (سهل، لكنه يحتاج قرارك):** بناء `NDateLocale` خاص بنا في `add-os` —
البنية `{ name, locale }` فقط:
```ts
import { ar } from "date-fns/locale"

export const dateArADD = { name: "ar", locale: ar }
```
يستبدل `dateArDZ` في [`stores/i18n.ts`](../../stores/i18n.ts).
⚠️ يستلزم إضافة `date-fns` كاعتماد صريح في `package.json` (موجودة اليوم كاعتماد غير مباشر
عبر naive-ui فقط — الاتّكال على الرفع hoisting هشّ).

**السؤال:** «أغسطس» (متسق مع dayjs) أم «آب» (شامي، يتطلّب locale مخصّصاً بالكامل)؟
**لم أغيّر شيئاً** — الاصطلاح قرار منتج لا قرار هندسي.

### 5.6 🔴 شكل الأرقام — قرار عرض في نظام مالي

**الحالة الراهنة المقيسة:** التطبيق **لا يضبط أي locale للأرقام**. النتيجة:

| المصدر | المخرَج |
|---|---|
| date-fns `arDZ` (منتقي التاريخ) | `2026-08-02` — **أرقام لاتينية** |
| dayjs `ar` | `2026-08-02` — **أرقام لاتينية** |
| `n-badge` | لاتينية (القالب يفرض `direction: ltr`) |

**فالوضع اليوم: أرقام لاتينية في كل مكان.** وهذا متسق، ومناسب لنظام مالي.

**لكن الفخّ يبدأ عند وحدة المحفظة/المدفوعات.** قِست سلوك `Intl`:

| الاستدعاء | المخرَج |
|---|---|
| `(1234567.89).toLocaleString('ar')` | `1,234,567.89` — لاتينية |
| `(1234567.89).toLocaleString('ar-SY')` | `١٬٢٣٤٬٥٦٧٫٨٩` — **هندية، وفواصل عربية** |
| `(1234567.89).toLocaleString('ar-u-nu-latn')` | `1,234,567.89` — لاتينية بالقسر |

⚠️ **تحذير منفصل ومهم لوحدة المدفوعات:**
```js
(1234567.89).toLocaleString("ar-SY", { style: "currency", currency: "SYP" })
//  ‏١٬٢٣٤٬٥٦٨ ل.س.‏   ← الكسور محذوفة!
```
الليرة السورية معرَّفة في CLDR **بصفر منازل عشرية**، فـ `Intl` **يقرّب ويحذف الكسور**.
مع مبالغ `DECIMAL` في قاعدة البيانات، هذا **فقدان دقّة صامت في العرض**.

**الأسئلة (مُدرَجة كما طلبتِ، بلا فرض أي شكل):**
1. أرقام هندية `٠١٢٣` أم لاتينية `0123` في الواجهة؟ (الأنظمة المالية والإدارية في سوريا
   تميل عملياً إلى اللاتينية.)
2. هل يختلف الجواب بين السياقات؟ (نصّ ← هندية، مبالغ/معرّفات/تواريخ ← لاتينية؟)
3. تنسيق مبالغ SYP: نعتمد `Intl` بمنازل مخصّصة (`minimumFractionDigits`) أم مُنسِّقاً
   خاصاً بنا يحفظ دقّة `DECIMAL`؟

**التوصية الهندسية:** أياً كان الجواب، ليكن **مُنسِّقاً واحداً في `add-os/`** يمرّ عبره كل
رقم في النظام — لا استدعاءات `toLocaleString` متفرّقة. هذا يجعل تغيير القرار لاحقاً سطراً واحداً.

---

## 6. ملاحظات جانبية رُصدت أثناء الفحص

### 6.1 ✅ خطأ CSS قائم في القالب — **زال مع الزخرفة** (Sprint 0)

كان في `Navbar.vue`:

```scss
top: calc(50% - calc(ar(--dash-height) / 2));
//                  ^^^  خطأ مطبعي: ar( بدل var(
```

`ar()` ليست دالة CSS صالحة ⟵ **التصريح `top` كامل يسقط**، فلا تتوسّط شرطات شجرة القائمة
عمودياً. عيب **قائم في القالب الأصلي**، يصيب القائمة الجانبية الرئيسية في الاتجاهين معاً.

**سقط البند:** الكتلة التي تحتويه حُذفت بكاملها مع زخرفة خطوط الشجرة
(MANIFEST §3.19 · §5.3 أعلاه). ولم يكن العيب هامشياً كما قُدِّر هنا — بل هو الدليل
على أن الزخرفة **لم ينظر إليها أحد** منذ كُتبت، وهو أحد أسباب حذفها بدل معايرتها.

### 6.2 ✅ الأدوات الاتجاهية لـ Tailwind: نظيفة

مسحت السطح الإنتاجي بحثاً عن `ml-` `mr-` `pl-` `pr-` `left-` `right-` `text-left`
`text-right` `border-l/r` `rounded-l/r`. **النتيجة: ملف واحد فقط** — `PinnedPagesV1.vue`
غير المستخدَم. مؤلّف القالب كان منضبطاً هنا، ولا عمل مطلوباً.

### 6.3 ✅ الخصائص الفيزيائية في تخطيطات القالب: مغطّاة

فحصت كل ملف إنتاجي يحوي خصائص فيزيائية بلا كتلة `.direction-rtl`. كلها اتضح أنها إمّا
متماثلة (`left:0; right:0`) أو توسيط (`left:50%`) أو مغطّاة في مكان آخر — مثل mixin
`page-full-view` الذي يعالجه `main.scss:23` في كلا التخطيطين.

---

## 7. الخلاصة

| البند | العدد |
|---|---|
| مكوّنات naive-ui إنتاجية مفحوصة | 19 |
| مُعالَجة أصلاً (لا عمل مطلوب) | 14 |
| **عولجت في هذه المرحلة** | **4** (Popover · Upload · Percentage · Breadcrumb) |
| + خصائص منطقية في `tailwind.css` | 3 قواعد |
| مؤجَّلة بقرار بشري | 6 (§5) |
| عيوب قائمة رُصدت | 1 (§6.1) |

**الأولوية القصوى للفحص البصري: §5.3 (إزاحة القائمة الجانبية).** هي الشاشة التي يراها
فريق التشغيل في كل لحظة، وهي الثغرة الوحيدة التي لا يمكن إصلاحها بـ CSS.

**لا شيء في هذا التقرير مؤكَّد بصرياً.**
