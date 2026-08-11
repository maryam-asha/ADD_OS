<template>
	<div class="pill-wrapper flex items-center gap-3" :class="{ bordered }">
		<slot />
	</div>
</template>

<script setup lang="ts">
const { bordered } = defineProps<{ bordered?: boolean }>()
</script>

<style lang="scss" scoped>
.pill-wrapper {
	background-color: var(--bg-sidebar-color);
	color: var(--fg-default-color);
	border-radius: 50px;
	padding: 6px;
	transition: all 0.3s;

	&.bordered {
		border: 1px solid var(--border-color);
	}
}
</style>
