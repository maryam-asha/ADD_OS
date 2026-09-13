<template>
	<!--
		These screens were once the ONE place in the dashboard with a green call to
		action, because the member app's auth screens are green and the dashboard's
		`primary` was Deep Teal. As of 2026-08-31 the whole dashboard follows the
		member app and `primary` IS that green, so nothing here is special any more
		— the CTA is simply `primary`, and this shell overrides no button colour.
		See the REVERSAL note in tokens.ts and
		docs/superpowers/specs/2026-08-30-auth-visual-alignment-design.md §3.5.

		What remains below is the Input focus colour, which is genuinely local: it
		is raw Smart Olive, a PILLAR colour that may not enter the token tree.
	-->
	<n-config-provider :theme-overrides="authThemeOverrides">
		<!--
			The DASHBOARD's own composition, deliberately not the member app's.
			The phone screens are one flat warm surface because a phone has no room
			for anything else; a desktop login does. What the two share is the
			palette and the type — one identity, different medium.
		-->
		<div class="auth-shell bg-surface grid min-h-screen lg:grid-cols-2">
			<section
				class="relative hidden min-h-screen overflow-hidden bg-[var(--add-auth-panel-background)] px-10 py-12 text-[var(--add-auth-panel-text)] lg:flex lg:flex-col lg:justify-between xl:px-16"
				aria-labelledby="auth-panel-title"
			>
				<!--
					The brand's own interlocking-wordmark pattern, corner-anchored the way
					the printed rollup banner crops it — not the full-bleed stretch the
					leftover Pinx `pattern-onboard.png` used. `end-0`/`bottom-0` so it sits
					at the trailing corner and mirrors correctly under RTL via logical
					properties, with no separate RTL stylesheet.
				-->
				<div
					aria-hidden="true"
					class="pointer-events-none absolute bottom-0 end-0 -mb-12 -me-12 size-[30rem] opacity-20"
				>
					<img :src="pattern" alt="" class="size-full object-contain object-bottom" />
				</div>

				<div class="relative flex items-center">
					<img :src="logoLight" :alt="t('common.logoAlt')" class="h-12 w-auto object-contain" />
				</div>

				<div class="relative max-w-xl pb-8">
					<!--
						Replaces the old isolated success dot with a short accent rule,
						echoing the banner's lime-highlighted line above its headline.
						Still the same `success` ramp — the contrast-adjusted Smart Olive
						already asserted in tokens.spec.ts — no new colour introduced.
					-->
					<div aria-hidden="true" class="bg-success h-1.5 w-20 rounded-full" />
					<h2 id="auth-panel-title" class="mt-6 text-4xl font-bold leading-tight xl:text-5xl">{{ title }}</h2>
					<p v-if="subtitle" class="mt-5 max-w-lg text-lg leading-relaxed opacity-80">{{ subtitle }}</p>
				</div>

				<div class="relative flex items-center gap-3 text-sm opacity-70">
					<span class="bg-success h-px w-10" />
					<span>{{ t("common.logoAlt") }}</span>
				</div>
			</section>

			<main class="flex min-h-screen items-center justify-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24">
				<div class="w-full max-w-md">
					<n-button v-if="showBack" text class="mb-4" @click="emit('back')">
						<Icon :name="backIcon" :size="20" />
						<span class="ms-2">{{ t("auth.common.back") }}</span>
					</n-button>

					<!--
						The supplied PNG, not Logo.vue: the design shows the full lockup —
						charcoal mark plus the green wordmark — and Logo.vue's `small`
						variant is the compact mark. `logo-dark.png` is the transparent,
						dark-ink file, which is the one that belongs on a white card.
					-->
					<div class="mb-8 flex justify-center lg:justify-start">
						<img :src="logoLockup" :alt="t('common.logoAlt')" class="h-12 w-auto" />
					</div>

					<h1 class="text-text-primary mb-2 text-3xl font-bold">{{ title }}</h1>
					<p v-if="subtitle" class="text-text-secondary mb-8">{{ subtitle }}</p>

					<slot />
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
