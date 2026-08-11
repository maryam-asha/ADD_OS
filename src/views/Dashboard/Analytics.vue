<template>
	<div class="page">
		<div class="main-grid gap-5">
			<!-- main col -->
			<div class="main-col">
				<div class="flex h-full flex-col gap-5">
					<!-- big chart -->
					<div class="main-chart-wrap flex">
						<CardCombo3 class="h-full" />
					</div>

					<!-- four cards -->
					<div class="four-cards-wrap gap-5">
						<CardCombo4
							title="Users"
							val-string="248.3K"
							percentage
							card-wrap
							icon-box
							:percentage-props="{
								value: 2.45,
								direction: 'up'
							}"
						>
							<template #icon>
								<CardComboIcon :icon-name="UsersIcon" boxed />
							</template>
						</CardCombo4>
						<CardCombo4
							title="Page Views"
							val-string="486.9K"
							percentage
							card-wrap
							:percentage-props="{
								value: 1.88,
								direction: 'down'
							}"
						>
							<template #icon>
								<CardComboIcon :icon-name="ViewsIcon" boxed />
							</template>
						</CardCombo4>
						<CardCombo4
							title="Active Users"
							val-string="73.8K"
							percentage
							card-wrap
							:percentage-props="{
								value: 3.24,
								direction: 'up'
							}"
						>
							<template #icon>
								<CardComboIcon :icon-name="ActivityIcon" boxed />
							</template>
						</CardCombo4>
						<CardCombo4
							title="Uploads"
							val-string="42.1K"
							percentage
							card-wrap
							:percentage-props="{
								value: 0.43,
								direction: 'down'
							}"
						>
							<template #icon>
								<CardComboIcon :icon-name="UploadsIcon" boxed />
							</template>
						</CardCombo4>
					</div>

					<!-- list -->
					<div class="flex grow">
						<CardWrapper v-slot="{ expand, isExpand, reload }" class="h-full w-full grow">
							<CardActions
								:expand
								:is-expand
								:reload
								class="h-full"
								title="Leading Companies"
								:segmented="{
									content: true,
									footer: true
								}"
							>
								<template #default>
									<DemoList class="my-4" min-width="400px" />
								</template>
								<template #footer>
									<DemoChart
										type="bar"
										data-type="months"
										highlight
										class="mt-4"
										:font-color="textSecondaryColor"
									/>
								</template>
							</CardActions>
						</CardWrapper>
					</div>
				</div>
			</div>

			<!-- side col -->
			<div class="side-col">
				<div class="flex h-full flex-col gap-5">
					<!-- tiny chart -->
					<div class="flex">
						<CardCombo1 title="Sessions" class="bg-extra-1! h-full text-white!" chart-color="#ffffff">
							<template #icon>
								<CardComboIcon :icon-name="SessionsIcon" boxed color="white" />
							</template>
						</CardCombo1>
					</div>

					<!-- two cards -->
					<div class="flex gap-5">
						<CardCombo2 title="Reports" centered class="basis-1/2">
							<template #icon>
								<CardComboIcon
									:icon-name="ReportsIcon"
									boxed
									:box-size="50"
									:color="style['extra3-color']"
								/>
							</template>
						</CardCombo2>
						<CardCombo2 title="Issues" centered class="basis-1/2">
							<template #icon>
								<CardComboIcon
									:icon-name="ErrorIcon"
									boxed
									:box-size="50"
									:color="style['extra4-color']"
								/>
							</template>
						</CardCombo2>
					</div>

					<!-- map -->
					<div class="flex overflow-hidden">
						<CardExtra7
							title="Top countries"
							:segmented="{
								content: true
							}"
						/>
					</div>

					<!-- timeline -->
					<div class="timeline-wrap grow">
						<CardExtra5
							long
							lazy
							hide-image
							title="Issues timeline"
							class="h-full overflow-hidden"
							:segmented="{
								content: true
							}"
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { computed } from "vue"
import DemoChart from "@/components/charts/DemoApex.vue"
import DemoList from "@/components/list/List.vue"
import { useThemeStore } from "@/stores/theme"

const SessionsIcon = "carbon:user-multiple"
const UsersIcon = "carbon:user"
const ReportsIcon = "carbon:report"
const ErrorIcon = "carbon:debug"
const ViewsIcon = "carbon:view"
const ActivityIcon = "carbon:activity"
const UploadsIcon = "carbon:cloud-upload"

const themeStore = useThemeStore()
const style = computed(() => themeStore.style)
const textSecondaryColor = computed<string>(() => themeStore.style["fg-secondary-color"] || "")
</script>

<style lang="scss" scoped>
.page {
	.main-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-rows: repeat(1, 1fr);
		grid-template-areas: "main main side";

		@media (max-width: 1200px) {
			display: flex;
			flex-direction: column;

			.timeline-wrap {
				min-height: 400px;
				display: flex;
				flex-direction: column;

				.n-card {
					flex-grow: 1;
				}
			}
		}
	}

	.main-col {
		grid-area: main;
		container-type: inline-size;

		.main-chart-wrap {
			height: 450px;
		}

		.four-cards-wrap {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			grid-template-rows: repeat(1, minmax(0, 1fr));

			@container (max-width: 1000px) {
				grid-template-columns: repeat(2, minmax(0, 1fr));
				grid-template-rows: repeat(2, minmax(0, 1fr));
			}

			@container (max-width: 460px) {
				grid-template-columns: repeat(1, minmax(0, 1fr));
				grid-template-rows: repeat(4, minmax(0, 1fr));
			}
		}
	}
	.side-col {
		grid-area: side;
	}
}
</style>
