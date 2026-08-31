<template>
	<!--
		The auth screens are the ONE place in the dashboard where the call to action
		is green rather than the teal `primary`, because the member app's auth
		screens are green and both products are ADD. The remap is a build-time
		constant read from `tokens.ts` — there is no write path and no user control,
		and every ratio it introduces is asserted in `tokens.spec.ts`. See
		docs/superpowers/specs/2026-08-30-auth-visual-alignment-design.md §3.5.
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

				Each panel carries the ADD pattern with its DENSE corner pointing away
				from the card, so the two panels read as one diagonal running out of
				frame and the card sits in the calm middle of it. The artwork is a
				staircase of the wordmark with a diagonal void through it, NOT a
				seamless tile, so it is placed rather than repeated.

				Both panels anchor `bg-bottom-right`; the upper one is turned 180°, which
				lands that same dense corner at its top-left. One anchor, one rotation —
				rather than two positions that would drift apart when either is touched.

				The two axes carry DIFFERENT offsets, and that is deliberate — an equal
				offset was tried first and reverted.

				Equal offsets put the panels on a true 45° diagonal, which is the better
				composition in the abstract and the wrong one here: the viewport is wide
				and short. A panel is 24rem tall, so at 11rem down its outer edge sits
				~20rem from centre — past the bottom of a laptop window, and the shell
				clipped both panels flat against the top and bottom edges. Sacrificing
				the exact diagonal buys back the breathing room above and below the card,
				which is what actually reads.

				Horizontal has the room the vertical does not, so it takes the extra
				(13rem) and gives the pattern more exposed panel to show in.

				`-inset-6` is load-bearing, not padding: the artwork carries ~4% of
				transparent margin inside its own viewBox, so at `inset-0` it stopped
				short of the panel edge and left a visible gap. The layer is oversized
				and the panel's `overflow-hidden` crops it, so the letters bleed off the
				edge instead of floating inside it.

				Green, not the charcoal variant: the ground IS Charcoal Backbone, and
				`pattern-dark.svg` is #42474F against it — a pattern nobody could see.
			-->
			<div aria-hidden="true" class="pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex">
				<div class="rounded-add-large bg-surface/5 absolute size-96 -translate-x-52 -translate-y-28 overflow-hidden">
					<div class="bg-bottom-right absolute -inset-6 rotate-180 bg-cover bg-no-repeat opacity-25" :style="patternLayer" />
				</div>
				<div
					class="rounded-add-large border-surface/10 absolute size-96 translate-x-52 translate-y-28 overflow-hidden border"
				>
					<div class="bg-bottom-right absolute -inset-6 bg-cover bg-no-repeat opacity-25" :style="patternLayer" />
				</div>
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
import { brand, component, DEFAULT_MODE } from "@/add-os/theme/tokens"
import logoLockup from "@/assets/images/logo-dark.png"
import addPattern from "@/assets/images/patterns/pattern-green.svg?url"
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
 * Bound rather than written as a Tailwind `bg-[url(…)]`: Vite rewrites this
 * import to the hashed, content-addressed asset URL, and an arbitrary value in a
 * class would be resolved relative to the generated stylesheet instead. Size,
 * position and opacity stay in utilities — only the URL has to come from here.
 */
const patternLayer = { backgroundImage: `url(${addPattern})` }

const authAction = component[DEFAULT_MODE].auth

/**
 * Scoped to `Button`, NOT to `common.primaryColor`.
 *
 * The design puts a GREEN submit button and a DEEP TEAL "forgot password?" link
 * on the same screen. Remapping `common.primaryColor` would turn both green —
 * the link is `n-button text type="primary"`, which reads the same colour. So
 * only the filled primary button is remapped, and `primary` itself is left at
 * the dashboard's Deep Teal so text links match the design.
 *
 * Hover and pressed are supplied explicitly because the vendor's
 * `getThemeColors()` derives hover by LIGHTENING, which drops every light-mode
 * hover below AA — see .claude/rules/tokens-and-color.md.
 */
const authThemeOverrides: GlobalThemeOverrides = {
	Button: {
		colorPrimary: authAction.actionBase,
		colorHoverPrimary: authAction.actionHover,
		colorPressedPrimary: authAction.actionPressed,
		colorFocusPrimary: authAction.actionHover,
		textColorPrimary: authAction.actionOn,
		textColorHoverPrimary: authAction.actionOn,
		textColorPressedPrimary: authAction.actionOn,
		textColorFocusPrimary: authAction.actionOn,
		borderPrimary: `1px solid ${authAction.actionBase}`,
		borderHoverPrimary: `1px solid ${authAction.actionHover}`,
		borderPressedPrimary: `1px solid ${authAction.actionPressed}`,
		borderFocusPrimary: `1px solid ${authAction.actionHover}`
	},
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
