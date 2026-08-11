<template>
	<div class="layout-settings flex items-center justify-center shadow-xl" :class="{ open }">
		<Transition mode="out-in" name="anim">
			<div v-if="!open" key="btn" class="open-btn flex items-center justify-center" @click="open = true">
				<Icon :size="24" :name="SettingsIcon" />
			</div>

			<div v-else key="form" class="ls-form flex flex-col">
				<div class="ls-header flex items-center justify-between">
					<div class="ls-title">Layout settings</div>
					<div class="ls-icon flex items-center">
						<Icon :size="20" :name="CloseIcon" @click="open = false" />
					</div>
				</div>
				<!--
					ADD OS — four sections removed. Every one was "remove, don't hide":
					a hidden dead control rots and invites re-enabling.

					· Primary color picker + palette swatches — removed with the store's
					  `setColor()`. It made every asserted contrast ratio vacuous, turned
					  brand compliance into a per-session accident, and let a user collide
					  primary with `danger` on force-unlock and revoke-access screens.
					· Theme Light/Dark — dark mode is out of scope for v1 and is now
					  structurally unreachable. The buttons toggled nothing.
					· Navbar Vertical/Horizontal — a horizontal nav for 13 sections in
					  Arabic is an unsolved design problem, not a layout option. Shipping an
					  unreviewed layout behind a toggle invites a bug report from a state
					  nobody tested. `layout` also left `persist.pick`, so a stale
					  Horizontal cannot survive with no UI left to correct it.
					· Router transition — unreviewed surface, and motion needs a
					  prefers-reduced-motion story nobody has specified yet.
				-->
				<n-scrollbar class="ls-main">
					<div class="ls-section ls-boxed-selection">
						<div class="flex flex-col gap-3">
							<div class="flex items-center justify-between">
								<div class="switch-label">
									View boxed
									<span v-if="isMobileView" class="px-1 opacity-50">desktop only</span>
								</div>
								<n-switch v-model:value="boxed" :disabled="isMobileView" size="small" />
							</div>
							<div class="flex items-center justify-between">
								<div class="switch-label">
									Toolbar boxed
									<span v-if="isMobileView" class="px-1 opacity-50">desktop only</span>
								</div>
								<n-switch
									v-model:value="toolbarBoxed"
									:disabled="!boxed || isMobileView"
									size="small"
								/>
							</div>
							<div class="flex items-center justify-between">
								<div class="switch-label">Footer visible</div>
								<n-switch v-model:value="footerShown" size="small" />
							</div>
							<div class="flex items-center justify-between">
								<!-- ADD OS: direction follows the language, so this toggles ar ⟷ en. -->
								<div class="switch-label">
									العربية / English
								</div>
								<n-switch v-model:value="rtl" size="small" />
							</div>
						</div>
					</div>

					<div class="ls-section ls-reset-selection items-center">
						<!-- ADD OS: the "Other settings" link to the template's docs site was removed —
							 an outbound link to the template vendor, unreachable from the isolated network. -->
						<n-button class="mb-3! w-full!" strong secondary type="primary" @click="reset()">
							Restore default
						</n-button>
					</div>
				</n-scrollbar>
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
// ADD OS: dropped with the four removed sections — `NColorPicker` and `NSelect`
// (their controls), `useOsTheme` (only `reset()` read it, to pick dark), and
// `Layout` / `RouterTransition` / `ThemeNameEnum` with the switches that used them.
// The `ColorPalette` / `Palette` types and the demo swatch hexes went too.
import { useWindowSize } from "@vueuse/core"
import { NButton, NScrollbar, NSwitch } from "naive-ui"
import { computed, ref } from "vue"
import { DEFAULT_LOCALE } from "@/add-os/lang/locales"
import Icon from "@/components/common/Icon.vue"
import { useLocalesStore } from "@/stores/i18n"
import { useThemeStore } from "@/stores/theme"

const SettingsIcon = "carbon:settings-adjust"
const CloseIcon = "carbon:close"

const themeStore = useThemeStore()
const localesStore = useLocalesStore()
const { width: winWidth } = useWindowSize()
const isMobileView = computed<boolean>(() => winWidth.value < 700)
const open = ref(false)

// ADD OS: direction is derived from the locale, so this switch changes the LANGUAGE.
// Writing `setRTL` directly here would allow "Arabic + LTR" / "English + RTL".
const rtl = computed({
	get: () => themeStore.isRTL,
	set: val => localesStore.setLocale(val ? "ar" : "en")
})

const boxed = computed({
	get: () => themeStore.isBoxed,
	set: val => themeStore.setBoxed(val)
})

const toolbarBoxed = computed({
	get: () => themeStore.isToolbarBoxed,
	set: val => themeStore.setToolbarBoxed(val)
})

const footerShown = computed({
	get: () => themeStore.isFooterShown,
	set: val => themeStore.setFooterShow(val)
})

/**
 * ADD OS — `reset()` restores only what a user can still change.
 *
 * Three lines were removed, and two of them were live defects rather than dead
 * code:
 *
 *   setColor(Dark,  "primary", "#00E19B")   ← Pinx GREEN, hardcoded in the component
 *   setColor(Light, "primary", "#00B27B")   ← so "Restore default" UN-BRANDED the app
 *   setTheme(useOsTheme() === "dark" ? Dark : Light)
 *                                           ← re-enabled dark mode on a dark-set
 *                                             machine, defeating the pin in
 *                                             theme/index.ts
 *
 * The palette is not resettable because it is not settable — `setColor()` is gone
 * from the store. Layout and router transition are not reset because their
 * controls are gone and `layout` no longer persists.
 */
function reset() {
	// ADD OS: reset restores the default LANGUAGE; the direction follows from it.
	localesStore.setLocale(DEFAULT_LOCALE)
	themeStore.setBoxed(true)
	themeStore.setToolbarBoxed(true)
	themeStore.setFooterShow(true)
}
</script>

<style scoped lang="scss">
.layout-settings {
	position: fixed;
	right: 10px;
	top: 50%;
	width: 50px;
	height: 50px;
	border-radius: 50px;
	background-color: var(--primary-color);
	color: var(--bg-default-color);
	transform: translateY(-50%);
	transition: all 0.3s;
	overflow: hidden;
	border: 1px solid transparent;

	.open-btn {
		cursor: pointer;
		width: 100%;
		height: 100%;
		position: absolute;
		will-change: opacity;
	}
	.ls-form {
		position: absolute;
		height: 100%;
		width: 100%;
		will-change: opacity;

		.ls-header {
			border-bottom: 1px solid var(--border-color);
			font-size: 14px;
			text-transform: uppercase;
			font-weight: 700;
			padding: 10px 14px;
			line-height: 1;
			transition: all 0.3s;

			.ls-icon {
				cursor: pointer;
				opacity: 0.6;

				&:hover {
					opacity: 1;
					color: var(--primary-color);
				}
			}
		}

		.ls-main {
			.ls-section {
				padding: 14px;
				font-size: 12px;
				display: flex;
				flex-direction: column;

				&:not(:last-child) {
					border-bottom: 1px solid var(--border-color);
				}

				.ls-label {
					font-size: 12px;
					margin-bottom: 8px;
					font-weight: 600;
					color: var(--fg-secondary-color);
				}

					// ADD OS: `&.ls-color-selection` removed with the primary-colour picker.
					// 41 lines of :deep() overrides for a control that no longer exists.

				&.ls-boxed-selection {
					.switch-label {
						font-size: 12px;
						font-weight: 600;
						color: var(--fg-secondary-color);
					}
				}

				&.ls-reset-selection {
					a {
						color: var(--fg-secondary-color);
						text-decoration-color: var(--fg-secondary-color);
					}
				}
			}
		}
	}

	&.open {
		width: 230px;
		height: 645px;
		right: 16px;
		border-radius: var(--border-radius);
		max-height: 90vh;
		max-height: 90svh;
		background-color: var(--bg-default-color);
		color: var(--fg-default-color);
		border-color: var(--border-color);
	}

	.anim-enter-active,
	.anim-leave-active {
		transition:
			opacity 0.1s var(--bezier-ease),
			transform 0.2s var(--bezier-ease);
	}

	.anim-enter-from,
	.anim-leave-to {
		opacity: 0;
		// transform: translateY(1%);
	}
}

.direction-rtl {
	.layout-settings {
		right: unset;
		left: 10px;

		.ls-form {
			.ls-header {
				direction: rtl;
			}

			// ADD OS: the RTL counterpart of the picker overrides, removed with it.
			// It was the only `:deep()` block in the RTL branch — a physical
			// `margin-left: unset` / `margin-right` pair mirroring a control that no
			// longer exists.
		}

		&.open {
			right: unset;
			left: 16px;
		}
	}
}
</style>
