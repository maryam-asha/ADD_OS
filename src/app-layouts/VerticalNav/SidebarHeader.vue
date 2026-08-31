<template>
	<div class="sidebar-header flex items-center justify-between gap-4">
		<!-- ADD OS: centred in its box in both states, not only when collapsed. -->
		<div class="flex grow justify-center">
			<Logo
				v-if="logoSmall"
				type="small"
				max-height="32px"
				class="animate-[fade_calc(var(--sidebar-anim-duration)*2)_forwards_calc(var(--sidebar-anim-duration)/2)] opacity-0"
			/>
			<!--
				ADD OS: the expanded sidebar shows the full ADD lockup — the same
				`logo-dark.png` the login screen uses, so the menu and the sign-in
				page read as one product.

				It replaces `<Logo type="large">`, which resolved to
				`brand-logo_large_light.svg`. That file is not in the repo, so the
				expanded sidebar was rendering a broken image on every page.
			-->
			<img
				v-if="!logoSmall"
				:src="logoLockup"
				:alt="t('common.logoAlt')"
				class="h-11 w-auto max-w-full animate-[fade_calc(var(--sidebar-anim-duration)*2)_forwards_calc(var(--sidebar-anim-duration)/2)] object-contain opacity-0"
			/>
		</div>
		<Transition name="fade" mode="out-in">
			<div v-if="showPin" class="sidebar-pin flex items-center">
				<Icon :size="20" @click="sidebarCollapsed = !sidebarCollapsed">
					<span class="i-large">
						<Iconify v-if="sidebarCollapsed" :icon="CircleRegular" />
						<Iconify v-if="!sidebarCollapsed" :icon="DotCircleRegular" />
					</span>
					<span class="i-small">
						<Iconify v-if="!sidebarCollapsed" :icon="CloseOutline" />
					</span>
				</Icon>
			</div>
		</Transition>
	</div>
</template>

<script lang="ts" setup>
import { Icon as Iconify } from "@iconify/vue"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import Logo from "@/app-layouts/common/Logo.vue"
import logoLockup from "@/assets/images/logo-dark.png"
import Icon from "@/components/common/Icon.vue"
import { useThemeStore } from "@/stores/theme"

const { logoSmall } = defineProps<{
	logoSmall?: boolean
}>()

const { t } = useI18n()
const CircleRegular = "fa6-regular:circle"
const DotCircleRegular = "fa6-regular:circle-dot"
const CloseOutline = "carbon:chevron-left"
const themeStore = useThemeStore()
const showPin = computed<boolean>(() => !logoSmall)
const sidebarCollapsed = computed({
	get(): boolean {
		return themeStore.sidebar.collapsed
	},
	set() {
		themeStore.toggleSidebar()
	}
})
</script>

<style lang="scss" scoped>
@import "./variables";

.sidebar-header {
	height: var(--toolbar-height);
	min-height: var(--toolbar-height);

	.sidebar-pin {
		height: 100%;

		:deep() {
			.n-icon {
				cursor: pointer;

				.i-large {
					opacity: 0.3;
					transition: opacity var(--sidebar-anim-ease) var(--sidebar-anim-duration);
				}

				&:hover {
					opacity: 1;

					.i-large {
						opacity: 1;
					}
				}
			}
		}

		.i-large {
			display: block;
		}
		.i-small {
			display: none;
		}
		@media (max-width: $sidebar-bp) {
			.i-large {
				display: none;
			}
			.i-small {
				display: block;
			}
		}

		&.fade-enter-from,
		&.fade-leave-to {
			opacity: 0;
		}
	}
}

.direction-rtl {
	.sidebar-header {
		.sidebar-pin {
			.i-small {
				svg {
					transform: rotateY(180deg);
				}
			}
		}
	}
}
</style>
