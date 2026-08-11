<template>
	<div class="settings flex items-center justify-between">
		<div class="layout">
			<n-button quaternary circle @click="align = 'left'">
				<template #icon>
					<Icon>
						<Iconify v-if="align === 'left'" :icon="AlignLeftActive" />
						<Iconify v-else :icon="AlignLeft" />
					</Icon>
				</template>
			</n-button>
			<n-button quaternary circle @click="align = 'center'">
				<template #icon>
					<Icon>
						<Iconify v-if="align === 'center'" :icon="AlignCenterActive" />
						<Iconify v-else :icon="AlignCenter" />
					</Icon>
				</template>
			</n-button>
			<n-button quaternary circle @click="align = 'right'">
				<template #icon>
					<Icon>
						<Iconify v-if="align === 'right'" :icon="AlignRightActive" />
						<Iconify v-else :icon="AlignRight" />
					</Icon>
				</template>
			</n-button>
		</div>
		<div class="colors">
			<n-button v-for="color of colors" :key="color" quaternary circle @click="activeColor = color">
				<template #icon>
					<Icon :color>
						<Iconify v-if="activeColor === color" :icon="SquareActive" />
						<Iconify v-else :icon="Square" />
					</Icon>
				</template>
			</n-button>
			<n-button quaternary circle @click="activeColor = primaryColor">
				<template #icon>
					<Icon :color="primaryColor">
						<Iconify v-if="activeColor === primaryColor" :icon="SquareActive" />
						<Iconify v-else :icon="Square" />
					</Icon>
				</template>
			</n-button>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { Icon as Iconify } from "@iconify/vue"
import { NButton } from "naive-ui"
import { computed, onBeforeMount } from "vue"
import Icon from "@/components/common/Icon.vue"
import { useThemeStore } from "@/stores/theme"

export type Align = "left" | "center" | "right"

const align = defineModel<Align>("align", { default: "left" })
const activeColor = defineModel<string>("activeColor", { default: "" })

const AlignLeft = "fluent:textbox-align-bottom-rotate-90-24-regular"
const AlignCenter = "fluent:textbox-align-middle-rotate-90-24-regular"
const AlignRight = "fluent:textbox-align-top-rotate-90-24-regular"
const AlignLeftActive = "fluent:textbox-align-bottom-rotate-90-24-filled"
const AlignCenterActive = "fluent:textbox-align-middle-rotate-90-24-filled"
const AlignRightActive = "fluent:textbox-align-top-rotate-90-24-filled"
const Square = "fluent:square-24-filled"
const SquareActive = "fluent:checkbox-indeterminate-24-regular"

const themeStore = useThemeStore()
const colors = computed(() =>
	[
		themeStore.style["extra1-color"] || "",
		themeStore.style["extra2-color"] || "",
		themeStore.style["extra3-color"] || "",
		themeStore.style["extra4-color"] || ""
	].filter(o => !!o)
)
const primaryColor = computed(() => themeStore.style["primary-color"] || "")

onBeforeMount(() => {
	activeColor.value = primaryColor.value
})
</script>

<style lang="scss" scoped>
.settings {
	position: fixed;
	top: 10px;
	left: 50%;
	transform: translateX(-50%);
	background-color: var(--bg-secondary-color);
	height: 44px;
	width: 300px;
	border-radius: 50px;
	padding: 5px;
	z-index: 1;

	@media (max-width: 800px) {
		width: 112px;
		.colors {
			display: none;
		}
	}
}
</style>
