<template>
	<footer class="footer py-4" :class="{ boxed }">
		<!--
			ADD OS: the template's "Made with ♥ by D*VERSE Studio" credit — a live outbound
			link to the template author's site — was removed. It has no place in the footer
			of an internal ADD system. The `boxed` behaviour and all styling are untouched.

			`justify-end` became `justify-center`: the credit was meant to sit at the
			trailing edge, which in RTL put it against the LEFT margin. A neutral copyright
			line belongs in the middle, and centre reads the same in both directions.
		-->
		<div class="wrap flex items-center justify-center gap-3">
			<div class="copy">Aleppo Digital District © {{ year }}</div>
		</div>
	</footer>
</template>

<script lang="ts" setup>
import { ref } from "vue"

const { boxed } = defineProps<{
	boxed: boolean
}>()

const year = ref(new Date().getFullYear())
</script>

<style lang="scss" scoped>
.footer {
	width: 100%;
	max-width: 100%;
	overflow: hidden;
	font-size: 13px;

	.wrap {
		overflow: hidden;
		width: 100%;
		max-width: 100%;
		margin: 0 auto;
		padding: 0 var(--view-padding);

		.copy {
			line-height: 1.6;

			a {
				font-weight: bold;
				text-decoration: none;
			}
			* {
				display: inline;
			}
			i {
				display: inline-block;
			}
		}
	}

	&.boxed {
		.wrap {
			max-width: var(--boxed-width);
		}
	}

	@media (max-width: 700px) {
		font-size: 10px;

		i.n-icon {
			font-size: 18px !important;
		}
	}
}
</style>
