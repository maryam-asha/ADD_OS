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
		<div class="auth-shell flex min-h-screen bg-[var(--add-body)]">
			<!--
				The dark panel carries the brand the way the member app's hero card does.
				Hidden below the project's `mobile` breakpoint, where the member app
				itself is a single column.
				`aria-hidden` because it is decoration: the accessible name of this page
				comes from the heading in the sheet, and the logo is repeated there.
			-->
			<aside
				aria-hidden="true"
				class="mobile:flex hidden basis-1/2 flex-col justify-between bg-[var(--add-auth-panel-background)] p-12 text-[var(--add-auth-panel-text)]"
			>
				<Logo type="small" dark />

				<p class="text-2xl leading-relaxed font-semibold text-[var(--add-auth-panel-text)]">
					{{ t("auth.shell.tagline") }}
				</p>

				<span />
			</aside>

			<main class="flex grow items-center justify-center p-6">
				<div class="bg-surface rounded-add-large shadow-add-raised w-full max-w-md p-8">
					<n-button v-if="showBack" text class="mb-6" @click="emit('back')">
						<Icon :name="backIcon" :size="20" />
						<span class="ms-2">{{ t("auth.common.back") }}</span>
					</n-button>

					<!-- The panel is hidden on small screens, so the mark is repeated here. -->
					<div class="mobile:hidden mb-6 flex">
						<Logo type="small" />
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
import { component, DEFAULT_MODE } from "@/add-os/theme/tokens"
import Logo from "@/app-layouts/common/Logo.vue"
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
