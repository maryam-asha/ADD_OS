<template>
	<div class="sidebar-footer bg-body rounded-lg" :class="{ collapsed }">
		<span class="sidebar-footer__version">{{ versionLabel }}</span>
	</div>
</template>

<script lang="ts" setup>
import { computed } from "vue"
import { ADD_OS_VERSION_LABEL, ADD_OS_VERSION_SHORT } from "@/add-os/version"

/**
 * ADD OS: mirrors VerticalNav/SidebarFooter.vue — the template's two outbound
 * links (vendor docs, marketplace "Buy now") were removed. See that file, and
 * VENDOR-MANIFEST §3.18, for the reasoning.
 */
const { collapsed = false } = defineProps<{
	collapsed?: boolean
}>()

const versionLabel = computed<string>(() => (collapsed ? ADD_OS_VERSION_SHORT : ADD_OS_VERSION_LABEL))
</script>

<style lang="scss" scoped>
.sidebar-footer {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 34px;
	padding-block: 6px;
	padding-inline: 8px;
	overflow: hidden;

	&__version {
		// Fills the row and centres its own text, so centring does not depend on
		// the flex alignment alone.
		flex: 1 1 auto;
		text-align: center;
		font-family: var(--font-family-mono);
		font-size: 12px;
		line-height: 1;
		color: var(--fg-secondary-color);
		opacity: 0.65;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		// A version string reads left-to-right in any interface direction.
		direction: ltr;
		transition: opacity 0.3s var(--bezier-ease);
	}

	&:hover .sidebar-footer__version {
		opacity: 1;
	}

	&.collapsed {
		.sidebar-footer__version {
			font-size: 10px;
		}
	}
}
</style>
