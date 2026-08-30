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
						The supplied PNG, not Logo.vue: this page wants the full lockup —
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

				<p class="mt-6 text-center text-sm text-[var(--add-auth-panel-text)]">
					{{ t("auth.shell.tagline") }}
				</p>
			</main>
		</div>
	</n-config-provider>
</template>

<script lang="ts" setup>
import type { GlobalThemeOverrides } from "naive-ui"
import { NButton, NConfigProvider } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { component, DEFAULT_MODE } from "@/add-os/theme/tokens"
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

const authAction = component[DEFAULT_MODE].auth

/**
 * `suppl` mirrors `hover`, exactly as the success ramp it references does
 * (`semantic.light.success.suppl === success.hover`). Supplied explicitly
 * because the vendor's `getThemeColors()` derives hover by LIGHTENING, which
 * drops every light-mode hover below AA — see .claude/rules/tokens-and-color.md.
 */
const authThemeOverrides: GlobalThemeOverrides = {
	common: {
		primaryColor: authAction.actionBase,
		primaryColorHover: authAction.actionHover,
		primaryColorPressed: authAction.actionPressed,
		primaryColorSuppl: authAction.actionHover
	}
}
</script>
