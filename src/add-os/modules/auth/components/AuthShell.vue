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
		<div
			class="auth-shell relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--add-auth-panel-background)] p-6"
		>
			<!--
				Decoration only, hence aria-hidden: two offset rounded panels behind the
				card, the way the member app stacks surfaces. Tinted from `surface` with
				an opacity modifier rather than a literal rgba(), so they stay a token
				reference and the no-hardcoded-values rule holds.
			-->
			<div aria-hidden="true" class="pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex">
				<div class="rounded-add-large bg-surface/5 absolute size-96 -translate-x-32 -translate-y-24" />
				<div class="rounded-add-large border-surface/10 absolute size-96 translate-x-32 translate-y-24 border" />
			</div>

			<main class="relative flex w-full max-w-md flex-col items-center">
				<div class="bg-surface rounded-add-large shadow-add-overlay w-full p-8">
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
					<div class="mb-6 flex justify-center">
						<img :src="logoLockup" :alt="t('common.logoAlt')" class="h-12 w-auto" />
					</div>

					<h1 class="text-text-primary mb-2 text-center text-2xl font-bold">{{ title }}</h1>
					<p v-if="subtitle" class="text-text-secondary mb-8 text-center">{{ subtitle }}</p>

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
