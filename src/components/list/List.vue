<template>
	<div class="list flex flex-col gap-4">
		<div v-for="item of list" :key="item.name" class="item flex items-center">
			<div class="image flex items-center">
				<img v-if="image" :alt="item.name" :src="item.image" width="40" height="40" />
				<n-avatar
					v-if="!image"
					:size="40"
					:style="{
						color: item.fgcolor,
						backgroundColor: item.bgcolor
					}"
					:img-props="{ alt: 'avatar' }"
				>
					{{ item.code }}
				</n-avatar>
			</div>
			<div class="info grow">
				<div class="name">{{ item.name }}</div>
				<div v-if="!hideSubtitle" class="adjective">{{ item.adjective }}</div>
			</div>
			<div class="value flex items-center" :class="item.direction">
				<div v-if="!hideValue" class="amount">{{ item.amount }}</div>
				<Percentage
					v-if="!percentage.hide"
					v-bind="percentage"
					:direction="item.direction"
					:value="item.percentage"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { NAvatar } from "naive-ui"
import { computed, ref } from "vue"
import Percentage from "@/components/common/Percentage.vue"
import { useThemeStore } from "@/stores/theme"
import { getAirline, getColors, getCompany } from "./data"

interface ListPercentage {
	hide?: boolean
	useColor?: boolean
	useOpacity?: boolean
	useBackground?: boolean
	progress?: "line" | "circle" | false
	icon?: "arrow" | "operator" | false
}
type DataType = "company" | "airline" | "colors"

const {
	dataType = "company",
	image = false,
	hideValue = false,
	hideSubtitle = false,
	minWidth = "initial",
	percentage = {
		hide: false,
		useColor: true,
		useBackground: false,
		useOpacity: false,
		icon: "arrow",
		progress: false
	}
} = defineProps<{
	dataType?: DataType
	image?: boolean
	hideValue?: boolean
	hideSubtitle?: boolean
	percentage?: ListPercentage
	minWidth?: string
}>()

const themeStore = useThemeStore()

const palette = computed(() =>
	[
		themeStore.style["extra1-color"] || "",
		themeStore.style["extra2-color"] || "",
		themeStore.style["extra3-color"] || "",
		themeStore.style["extra4-color"] || ""
	].filter(o => !!o)
)

let data = getCompany(8, {
	palette: palette.value,
	alphaFG: 1,
	alphaBG: 0.1
})
if (dataType === "company") {
	data = getCompany(8, {
		palette: palette.value,
		alphaFG: 1,
		alphaBG: 0.1
	})
}
if (dataType === "airline") {
	data = getAirline(8, {
		palette: palette.value,
		alphaFG: 1,
		alphaBG: 0.1
	})
}
if (dataType === "colors") {
	data = getColors(6)
}

const list = ref(data)
</script>

<style scoped lang="scss">
.list {
	min-width: v-bind(minWidth);
	.item {
		gap: 20px;
		.image {
			img {
				min-width: 40px;
				border-radius: var(--border-radius-small);
			}
			.n-avatar {
				font-size: 12px;
				position: relative;
			}
		}
		.info {
			line-height: 1.25;

			.name {
				font-size: 16px;
			}
			.adjective {
				margin-top: 4px;
				font-size: 14px;
				opacity: 0.6;
			}
		}
		.value {
			font-size: 16px;
			gap: 10px;
			.amount {
				font-weight: 500;
				white-space: nowrap;
			}
		}
	}
}
</style>
