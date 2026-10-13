<template>
	<!--
		These screens were once the ONE place in the dashboard with a green call to
		action, because the member app's auth screens are green and the dashboard's
		`primary` was Deep Teal. As of 2026-08-31 the whole dashboard follows the
		member app and `primary` IS that green, so nothing here is special any more
		— the CTA is simply `primary`, and this shell overrides no button colour.
		See the REVERSAL note in tokens.ts and
		docs/superpowers/specs/2026-08-30-auth-visual-alignment-design.md §3.5.

		The 2026-09-22 reference the owner supplied puts an ORANGE button here. It
		is not built: that orange is Aleppo Economic Orange, which in this dashboard
		means `danger` and nothing else, and `tokens.spec.ts` fails if a pillar hex
		enters chrome. Logged for the brand owner — GUIDELINE-FEEDBACK.md §11 — and
		the CTA stays `primary` until they rule. See spec §7c.

		What remains below is the Input focus colour, which is genuinely local: it
		is raw Smart Olive, a PILLAR colour that may not enter the token tree.
	-->
	<n-config-provider :theme-overrides="authThemeOverrides">
		<!--
			The DASHBOARD's own composition, deliberately not the member app's.
			The phone screens are one flat warm surface because a phone has no room
			for anything else; a desktop login does. What the two share is the
			palette and the type — one identity, different medium.

			Five columns, split 3/2 — NOT the 2-up the 2026-08-30 design approved.
			Changed 2026-09-22 at the owner's request; see §7b for the full path,
			which went 50/50 → 75/25 → 70/30 → 60/40 in one session. Each step
			moved the same way: toward room for the form. 60/40 is where it landed
			once the form became a CARD, which needs margin around it that a bare
			form did not.

			Source order carries the mirroring: the panel is written first, so it
			lands on the START side in both directions — left in English, right in
			Arabic — with no RTL-only class and no separate stylesheet, the same way
			the pattern's `end-0` anchor already mirrors itself.
		-->
		<div class="auth-shell bg-surface grid min-h-screen lg:grid-cols-5">
			<section
				class="relative hidden min-h-screen overflow-hidden bg-[var(--add-auth-panel-background)] px-10 py-12 text-[var(--add-auth-panel-text)] lg:col-span-3 lg:flex lg:flex-col lg:justify-between xl:px-16"
				aria-labelledby="auth-panel-title"
			>
				<!--
					── REVERSAL, 2026-09-22 (same day, second attempt) ──────────────────
					The first build of this redesign put the motif at 52rem and
					`opacity-25`, anchored top-trailing, BEHIND the text block. Rendered,
					it was not a watermark at all: at that size and strength it reads as
					solid green shapes, and the body copy sitting on it broke up mid-line
					and became unreadable. The owner's words were "الباترن والنصوص الكثيرة
					غير المفهومة" — and they were right.

					Three things were wrong at once, and each one alone would have been
					survivable: too large, too opaque, and overlapping the type. So all
					three are corrected together rather than tuned one at a time:

					  · `opacity-8`, not 25 — texture you feel, not shapes you read
					  · `36rem`, not 52 — it no longer spans the panel
					  · anchored BOTTOM-trailing, away from the headline, which now sits
					    at the block start with clean ground under it

					The lesson worth keeping: a watermark's opacity has to fall as its
					size rises. A large shape at 25% carries far more visual weight than
					a small one at the same number, because weight is area × strength.
				-->
				<div
					aria-hidden="true"
					class="pointer-events-none absolute bottom-0 end-0 -mb-20 -me-20 size-[36rem] opacity-8"
				>
					<img :src="pattern" alt="" class="size-full object-contain object-bottom" />
				</div>

				<!--
					One piece of copy, not five.

					The first build carried an eyebrow, a headline, a body paragraph, a
					three-item pillar row and a footer — five separate things competing in
					one panel, which is the other half of what the owner rejected. A login
					panel is not a landing page: nobody reads it, they sign in.

					What is left is the logo, the accent rule and the headline. The keys
					for the removed copy (`auth.panel.eyebrow`, `.body`, `.pillars.*`,
					`.footer`) are deleted from BOTH catalogues in the same change, per
					Invariant 4 — a removed control takes its i18n with it.
				-->
				<div class="relative flex items-center">
					<img :src="logoLight" :alt="t('common.logoAlt')" class="h-12 w-auto object-contain" />
				</div>

				<div class="relative max-w-2xl pb-8">
					<!--
						Replaces the old isolated success dot with a short accent rule,
						echoing the banner's lime-highlighted line above its headline.
						Still the same `success` ramp — the contrast-adjusted Smart Olive
						already asserted in tokens.spec.ts — no new colour introduced.
					-->
					<div aria-hidden="true" class="bg-success h-1.5 w-20 rounded-full" />
					<h2 id="auth-panel-title" class="mt-6 text-4xl font-bold leading-tight xl:text-5xl">
						{{ t("auth.panel.headline") }}
					</h2>
				</div>

				<!--
					An empty third row, so the headline sits at the panel's optical centre
					under `justify-between` rather than being pushed to the bottom edge by
					a two-child layout. Nothing is rendered into it.
				-->
				<div aria-hidden="true" />
			</section>

			<!--
				Below `lg` this is the whole screen, so the generous `px-6 sm:px-12`
				stays exactly as it was — every phone and tablet screen is unchanged.

				At `lg` the column is 40% of the viewport: 410px at 1024px, 576px at
				1440px. That is the room the CARD needs — `max-w-md` is 448px, and a
				card wants visible ground around it rather than touching the column's
				padding, which is what 30% left it doing at 1280px and below.

				`bg-surface-sunken` is the warm ground the card lifts off, from the
				reference. Both are shipping tokens — the card/ground relationship the
				palette already describes (surfaceRaised #FFFFFF over the warm neutral),
				not a new surface.
			-->
			<main
				class="bg-surface-sunken relative flex min-h-screen items-center justify-center px-6 py-10 sm:px-12 lg:col-span-2 lg:px-10 xl:px-14"
			>
				<!--
					The language switch belongs on this screen: the dashboard is Arabic-
					first with English staff, and before sign-in there is no toolbar to
					carry it. `absolute` at the block-start inline-start corner, which
					mirrors under RTL like everything else here.

					It is a REAL control — `LocaleSwitch` already ships in the toolbar and
					writes through the locales store, which derives direction. Invariant 4
					forbids shipping a control that does nothing; this one does the work.
				-->
				<div class="absolute start-6 top-6 sm:start-10 lg:start-8">
					<LocaleSwitch />
				</div>

				<div
					class="bg-surface-raised shadow-add-raised rounded-add-large w-full max-w-md p-7 sm:p-9"
				>
					<n-button v-if="showBack" text class="mb-4" @click="emit('back')">
						<Icon :name="backIcon" :size="20" />
						<span class="ms-2">{{ t("auth.common.back") }}</span>
					</n-button>

					<!--
						The supplied PNG, not Logo.vue: the design shows the full lockup —
						charcoal mark plus the green wordmark — and Logo.vue's `small`
						variant is the compact mark. `logo-dark.png` is the transparent,
						dark-ink file, which is the one that belongs on a white card.

						Hidden from `lg` up, where the panel's own light logo is on screen
						beside it — the reference shows the mark once, not twice.
					-->
					<div class="mb-7 flex justify-center lg:hidden">
						<img :src="logoLockup" :alt="t('common.logoAlt')" class="h-12 w-auto" />
					</div>

					<h1 class="text-text-primary mb-2 text-2xl font-bold">{{ title }}</h1>
					<p v-if="subtitle" class="text-text-secondary mb-7 text-sm leading-relaxed">
						{{ subtitle }}
					</p>

					<slot />

					<!--
						The reference's help line. Deliberately plain text and NOT a link:
						there is no support route, and a link to nowhere is the same no-op
						Invariant 4 forbids. The contact itself comes from i18n so an
						office can change it without a code change.
					-->
					<p class="text-text-secondary mt-7 border-t pt-5 text-center text-xs" :class="helpBorder">
						{{ t("auth.help") }}
					</p>
				</div>
			</main>
		</div>
	</n-config-provider>
</template>

<script lang="ts" setup>
import type { GlobalThemeOverrides } from "naive-ui"
import { NButton, NConfigProvider } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
// Only `brand` now: the auth CTA tokens went with the Button remap below, and
// the panel colours reach the template as CSS vars, not as imports.
import { brand } from "@/add-os/theme/tokens"
import LocaleSwitch from "@/app-layouts/common/Toolbar/LocaleSwitch.vue"
import logoLockup from "@/assets/images/logo-dark.png"
import logoLight from "@/assets/images/logo-light.png"
// The brand's own interlocking-wordmark motif, replacing the leftover Pinx
// `pattern-onboard.png` the design spec (§4) called out as not carried over.
// `-green` (not `-dark`), deliberately: `pattern-dark.svg` is filled #42474F,
// which is within one RGB step of this panel's own Charcoal Backbone ground
// (#43474F) and would blend away to nothing once alpha-composited. The green
// fill reads as a visible tonal watermark against the dark panel instead —
// the same light-on-dark relationship the printed rollup banner's line art
// has against its charcoal ground.
//
// `?url`, not the bare import: `vite-svg-loader` (vite.config.ts) makes a
// bare `*.svg` import resolve to a Vue component by default, project-wide.
// This is rendered through a plain `<img :src>`, so it needs the raw URL —
// the same `?url` suffix already used at src/components/maps/leaflet/Map.vue
// and the Tables grid-asset plugins.
import pattern from "@/assets/images/patterns/pattern-green.svg?url"
import Icon from "@/components/common/Icon.vue"
import { useThemeStore } from "@/stores/theme"

defineProps<{
	title: string
	subtitle?: string
	showBack?: boolean
}>()

const emit = defineEmits<{
	back: []
}>()

const { t } = useI18n()
const themeStore = useThemeStore()

// `pillarLabels` and `year` lived here until 2026-09-22. They went with the
// pillar row and the footer — see the panel comment above. Removed rather than
// left for "later": an unused const is the residue that makes the next reader
// think a feature is half-built.

// Named as constants rather than written inline, so `npm run icons` finds them
// by the same pattern it finds every other icon reference.
const BackIconLtr = "carbon:arrow-left"
const BackIconRtl = "carbon:arrow-right"

/**
 * The vendor's AuthForm hardcoded a left arrow, which points the wrong way in
 * Arabic — the dashboard's primary language. Direction is derived from the
 * locale (see add-os/lang/locales.ts), so reading `isRTL` cannot contradict it.
 */
const backIcon = computed<string>(() => (themeStore.isRTL ? BackIconRtl : BackIconLtr))

/**
 * The help line's top rule. A bare `border-t` would take naive's default border
 * colour; this points it at the shipping `border` token so the hairline matches
 * every other divider in the app rather than being a second opinion about it.
 */
const helpBorder = "border-[var(--add-border)]"

/**
 * ── The Button remap that used to live here is GONE, 2026-08-31 ──────────────
 *
 * It existed for one reason: the design puts a GREEN submit button on these
 * screens, and the dashboard's `primary` was Deep Teal. It was scoped to
 * `Button` rather than `common.primaryColor` so the teal "forgot password?"
 * link would not turn green with it — the link is `n-button text type="primary"`
 * and reads the same colour.
 *
 * `primary` is that green now (see the REVERSAL note in tokens.ts), so every
 * value in that block equalled what naive-ui already resolves. It repainted the
 * button its existing colour, and the link is green by design rather than by
 * accident. Deleted rather than left standing: an override that changes nothing
 * reads as protection and provides none, and the next person to move `primary`
 * would find the auth button mysteriously exempt.
 */
const authThemeOverrides: GlobalThemeOverrides = {
	/**
	 * Focus and hover on the inputs are Smart Olive, by the design owner's
	 * decision (2026-08-30).
	 *
	 * Referenced from `brand`, never written as a literal, so the one source in
	 * tokens.ts still owns the value. This does NOT make it a token: the pillar
	 * guard forbids Smart Olive as a semantic or component token value, and that
	 * stays true — nothing here is added to `semantic` or `component`.
	 *
	 * Measured, because a focus indicator is bound by WCAG 1.4.11's 3:1 against
	 * ADJACENT colours and this one sits between two:
	 *   · against the card surface (#FFFFFF) — 3.06:1, clears 3:1, barely
	 *   · against the input fill  (#EFECEB) — 2.60:1, does NOT clear 3:1
	 * The outer edge passes and the inner edge does not. Recorded rather than
	 * silently "corrected": darkening it would no longer be Smart Olive, and the
	 * choice is the design owner's to confirm. See GUIDELINE-FEEDBACK.md.
	 *
	 * `color-mix` keeps the focus glow derived from the same colour without
	 * introducing an rgba() literal, which Invariant 2 forbids in add-os.
	 */
	Input: {
		borderHover: `1px solid ${brand.smartOlive}`,
		borderFocus: `1px solid ${brand.smartOlive}`,
		boxShadowFocus: `0 0 0 2px color-mix(in srgb, ${brand.smartOlive} 20%, transparent)`,
		caretColor: brand.smartOlive,
		loadingColor: brand.smartOlive
	}
}
</script>
