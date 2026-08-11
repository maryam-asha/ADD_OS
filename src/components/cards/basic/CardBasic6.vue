<template>
	<n-card class="!bg-indigo-500 dark:!bg-teal-600" :bordered="false">
		<template #header>
			<div class="flex items-center justify-between text-white!">
				<span>Alt Background</span>
				<Icon class="icon-ring ml-3" :name="ColorIcon" />
			</div>
		</template>
		<div class="text-white!">
			Card with alternative background (light/dark). Color value from
			<strong>Tailwind</strong>
			class:
			<br />
			<br />
			<code class="block w-full p-4 text-center">class="!bg-indigo-500 dark:!bg-teal-600"</code>
		</div>
	</n-card>
</template>

<script setup lang="ts">
import { NCard } from "naive-ui"
import Icon from "@/components/common/Icon.vue"

const ColorIcon = "ion:color-fill-outline"
</script>

<style scoped lang="scss">
.icon-ring {
	background-color: rgba(var(--hover-color-rgb) / 0.15);
	width: 30px;
	height: 30px;
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
}
</style>
