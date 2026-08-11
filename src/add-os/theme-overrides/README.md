# `theme-overrides/` — طبقة تعديل الأنماط

المكان الوحيد الذي نعدّل فيه مظهر مكوّنات القالب و naive-ui **دون لمس ملفاتها**.

## كيف تصل هذه الملفات إلى الصفحة

```
src/main.ts
└── @/assets/scss/index.scss            (نقطة دخول الأنماط — ملف قالب)
    └── @/add-os/theme-overrides/index.scss   ◀── آخر سطر، لتكسب أسبقية التتالي
        └── ... ملفات الـ override عندنا
```

`index.scss` عندنا مستورد **في نهاية** ملف القالب عمداً: عند تساوي التخصّص
(specificity) يفوز آخر ما يُعلَن، فتغلب قواعدُنا قواعدَ القالب دون `!important`.

## القواعد

- ملف واحد لكل مكوّن أو موضوع، والاسم يدلّ عليه (`_menu-rtl.scss`).
- كل ملف جديد يُضاف إلى `index.scss`، وإلا فهو كود ميت.
- الأسماء تبدأ بـ `_` (partials) عدا `index.scss`.
- في قواعد RTL: اتبع نمط القالب نفسه — كتلة `.direction-rtl { ... }`
  (الكلاس يوضع على `<body>` من [`src/stores/theme.ts`](../../stores/theme.ts)).
- تجنّب `!important` إلا حيث تفرضه أنماط naive-ui السطرية، وعلّل السبب بتعليق.

## RTL

الغطاء الحالي موزّع على ثلاثة مصادر — راجعها قبل كتابة أي قاعدة جديدة كي لا تكرّرها:

1. **naive-ui:** مصفوفة `rtlStyles` في [`src/app-layouts/common/rtlProvider.ts`](../../app-layouts/common/rtlProvider.ts)
2. **القالب:** كتلة `.direction-rtl` في [`src/assets/scss/overrides/naive-override.scss`](../../assets/scss/overrides/naive-override.scss)
3. **نحن:** هذا المجلد

الجرد الكامل لما هو مغطّى وما هو ثغرة في `RTL-REPORT.md` (المرحلة 3).
