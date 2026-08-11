<template>
	<div class="icon" :class="{ boxed }" :style="`--size:${boxSize}px`">
		<div v-if="boxed" class="bg" />
		<Icon v-if="$slots.default" :size="iconFinalSize">
			<slot />
		</Icon>
		<Icon v-else :size="iconFinalSize" :name="iconName" />
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import Icon from "@/components/common/Icon.vue"
import { useThemeStore } from "@/stores/theme"

const {
	iconName,
	color,
	boxSize = 40,
	iconSize = 28,
	boxed = false
} = defineProps<{
	boxSize?: number
	iconSize?: number
	iconName?: string
	boxed?: boolean
	color?: string
}>()

const themeStore = useThemeStore()
const primaryColor = computed(() => themeStore.style["primary-color"])
const iconColor = computed(() => color || primaryColor.value)
const iconBoxedSize = computed(() => (boxSize / 100) * 45)
const iconFinalSize = computed(() => (boxed ? iconBoxedSize.value : iconSize))
</script>

<style scoped lang="scss">
.icon {
	color: v-bind(iconColor);
	width: var(--size);
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;

	&.boxed {
		height: var(--size);

		.bg {
			background-color: v-bind(iconColor);
			opacity: 0.1;
			position: absolute;
			top: 0;
			left: 0;
			border-radius: 50%;
			width: 100%;
			height: 100%;
		}
	}
}
</style>
