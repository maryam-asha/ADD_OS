<template>
	<div class="page">
		<div class="list">
			<div class="masonry">
				<CardWrapper v-slot="{ expand, isExpand, reload }">
					<CardActions :expand :is-expand :reload>
						<template #default>
							<DemoList min-width="400px" />
						</template>
						<template #footer>
							<DemoChart type="bar" data-type="months" highlight />
						</template>
					</CardActions>
				</CardWrapper>

				<CardWrapper v-slot="{ expand, isExpand, reload }">
					<CardActions :expand :is-expand :reload show-image hide-subtitle>
						<template #default>
							<DemoList min-width="400px" :percentage="{ useBackground: true, icon: 'arrow' }" />
						</template>
					</CardActions>
				</CardWrapper>

				<CardWrapper v-slot="{ expand, isExpand, reload }">
					<CardActions :expand :is-expand :reload segmented hide-subtitle>
						<template #default>
							<DemoList
								min-width="400px"
								image
								hide-value
								:percentage="{ progress: 'circle', icon: 'operator', useColor: true }"
							/>
						</template>
						<template #action>
							<DemoChart
								type="area"
								data-type="years-10"
								class="mb-4!"
								:stroke-width="3"
								:font-color="textSecondaryColor"
							/>
						</template>
					</CardActions>
				</CardWrapper>

				<CardWrapper v-slot="{ expand, isExpand, reload }">
					<CardActions :expand :is-expand :reload segmented hide-subtitle>
						<template #default>
							<DemoList min-width="400px" data-type="airline" :percentage="{ hide: true }" />
						</template>
					</CardActions>
				</CardWrapper>

				<CardWrapper v-slot="{ expand, isExpand, reload }">
					<CardActions :expand :is-expand :reload>
						<template #default>
							<DemoList
								min-width="400px"
								data-type="airline"
								image
								hide-value
								hide-subtitle
								:percentage="{ useColor: true, icon: 'operator', progress: 'line' }"
							/>
						</template>
						<template #action>
							<div class="flex justify-end p-5">
								<n-button type="primary">Full report</n-button>
							</div>
						</template>
					</CardActions>
				</CardWrapper>

				<CardWrapper v-slot="{ expand, isExpand, reload }">
					<CardActions :expand :is-expand :reload>
						<template #default>
							<DemoList
								min-width="400px"
								hide-value
								hide-subtitle
								:percentage="{ icon: 'arrow', useOpacity: true, progress: 'line' }"
							/>
						</template>
						<template #footer>
							<DemoChart type="bar" data-type="week" use-palette :font-color="textSecondaryColor" />
						</template>
					</CardActions>
				</CardWrapper>

				<CardWrapper v-slot="{ expand, isExpand, reload }">
					<CardActions :expand :is-expand :reload segmented hide-subtitle>
						<template #default>
							<DemoList
								min-width="400px"
								data-type="airline"
								image
								hide-value
								hide-subtitle
								:percentage="{ useColor: false, useOpacity: true, icon: 'operator' }"
							/>
						</template>
					</CardActions>
				</CardWrapper>

				<CardWrapper v-slot="{ expand, isExpand, reload }">
					<CardActions :expand :is-expand :reload>
						<template #default>
							<DemoList
								min-width="400px"
								hide-value
								hide-subtitle
								:percentage="{ useBackground: true, icon: 'operator' }"
							/>
						</template>
					</CardActions>
				</CardWrapper>

				<CardWrapper v-slot="{ expand, isExpand, reload }">
					<CardActions :expand :is-expand :reload>
						<template #default>
							<DemoList
								min-width="400px"
								data-type="airline"
								hide-subtitle
								:percentage="{ hide: true }"
							/>
						</template>
						<template #action>
							<DemoChart type="bar" data-type="months" highlight :color="textColor" class="pt-2 pb-3" />
						</template>
					</CardActions>
				</CardWrapper>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { NButton } from "naive-ui"
import { computed } from "vue"
import DemoChart from "@/components/charts/DemoApex.vue"
import DemoList from "@/components/list/List.vue"
import { useThemeStore } from "@/stores/theme"

const themeStore = useThemeStore()

const textColor = computed<string>(() => themeStore.style["fg-default-color"] || "")
const textSecondaryColor = computed<string>(() => themeStore.style["fg-secondary-color"] || "")
</script>

<style lang="scss" scoped>
.page {
	.list {
		container-type: inline-size;

		.masonry {
			--notes-gap: 1.25em;
			column-count: 3;
			column-gap: var(--notes-gap);

			@container (max-width: 1500px) {
				column-count: 2;
			}

			@container (max-width: 1080px) {
				column-count: 1;
			}

			.card-wrapper {
				overflow: hidden;
				margin-bottom: var(--notes-gap);
			}
		}
	}
}
</style>
