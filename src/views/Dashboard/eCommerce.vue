<template>
	<div class="page">
		<div class="main-grid gap-5">
			<div class="box-card-1">
				<CardCombo1 title="Sales" class="h-full">
					<template #icon>
						<CardComboIcon :icon-name="SalesIcon" boxed />
					</template>
				</CardCombo1>
			</div>
			<div class="box-card-2">
				<CardCombo6
					card-wrap
					title="Category overview"
					:segmented="{
						content: true
					}"
				/>
			</div>
			<div class="box-card-3">
				<CardCombo1 title="Orders" class="h-full">
					<template #icon>
						<CardComboIcon :icon-name="OrdersIcon" boxed />
					</template>
				</CardCombo1>
			</div>

			<div class="left-col">
				<div class="flex h-full flex-col gap-5">
					<div class="flex">
						<CardCombo8 />
					</div>
					<div class="flex grow">
						<CardActions
							:segmented="{
								action: false
							}"
							hide-subtitle
							show-image
							hide-menu
							:hoverable="false"
							action-box-transparent
							title="Best product"
							image="/images/headphones.jpg"
							class="h-full"
						>
							<template #default>
								<DemoList
									:hide-value="false"
									data-type="colors"
									:percentage="{ progress: 'circle', icon: 'operator', useColor: true }"
								/>
							</template>
							<template #action>
								<DemoChart
									type="area"
									data-type="week"
									hide-xaxis-labels
									:stroke-width="2"
									:font-color="textSecondaryColor"
								/>
							</template>
						</CardActions>
					</div>
				</div>
			</div>

			<div class="right-col">
				<div class="flex h-full flex-col gap-5">
					<!-- three cards -->
					<div ref="cardsContainer" class="flex w-full gap-5" :class="{ 'flex-col': isCardHorizontal }">
						<CardCombo2 title="Completed" centered :horizontal="isCardHorizontal" class="basis-1/3">
							<template #icon>
								<CardComboIcon
									:icon-name="CompletedIcon"
									boxed
									:box-size="50"
									:color="style['primary-color']"
								/>
							</template>
						</CardCombo2>
						<CardCombo2 title="Pending" centered :horizontal="isCardHorizontal" class="basis-1/3">
							<template #icon>
								<CardComboIcon
									:icon-name="PendingIcon"
									boxed
									:box-size="50"
									:color="style['extra3-color']"
								/>
							</template>
						</CardCombo2>
						<CardCombo2 title="Shipped" centered :horizontal="isCardHorizontal" class="basis-1/3">
							<template #icon>
								<CardComboIcon
									:icon-name="ShippedIcon"
									boxed
									:box-size="50"
									:color="style['extra1-color']"
								/>
							</template>
						</CardCombo2>
					</div>

					<div class="flex w-full grow gap-5" :class="{ 'flex-col': isRightColHorizontal }">
						<div class="flex h-full flex-col gap-5" :class="{ 'basis-1/2': !isSwitchChartHorizontal }">
							<div class="grow">
								<CardCombo1
									title="Revenue"
									class="bg-extra-3! h-full text-white!"
									type="bar"
									:data-count="10"
									:chart-padding-top="
										isRightColHorizontal && !isSwitchChartHorizontal ? '0px' : '100px'
									"
									currency="USD"
									chart-bar-gradient
									:chart-height="isRightColHorizontal && !isSwitchChartHorizontal ? 40 : 200"
									chart-color="#ffffff"
								>
									<template #icon>
										<CardComboIcon :icon-name="RevenueIcon" boxed color="white" />
									</template>
								</CardCombo1>
							</div>
							<CardCombo3 class="h-full" one-series />
						</div>
						<div v-if="!isSwitchChartHorizontal" class="flex h-full basis-1/2 flex-col gap-5">
							<CardCombo5 size="large" class="h-full" />
						</div>
					</div>
				</div>
			</div>

			<div class="box-bottom">
				<div class="flex flex-col gap-5">
					<CardCombo5 v-if="isSwitchChartHorizontal" size="large" />
					<CardWrapper v-slot="{ expand, isExpand, reload }" class="h-full w-full">
						<CardExtra6 class="h-full" :expand :is-expand :reload show-actions show-date :min-width="760" />
					</CardWrapper>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { useElementSize, useWindowSize } from "@vueuse/core"
import { computed, ref } from "vue"
import DemoChart from "@/components/charts/DemoApex.vue"
import DemoList from "@/components/list/List.vue"
import { useThemeStore } from "@/stores/theme"

const CompletedIcon = "carbon:checkmark-outline"
const PendingIcon = "carbon:hourglass"
const ShippedIcon = "carbon:send"
const SalesIcon = "carbon:wireless-checkout"
const OrdersIcon = "carbon:shopping-cart"
const RevenueIcon = "carbon:money"

const themeStore = useThemeStore()

const { width } = useWindowSize()
const style = computed(() => themeStore.style)
const textSecondaryColor = computed<string>(() => themeStore.style["fg-secondary-color"] || "")
const cardsContainer = ref(null)
const { width: widthCardsContainer } = useElementSize(cardsContainer)
const isCardHorizontal = computed(() => widthCardsContainer.value < 460)
const isRightColHorizontal = computed(() => width.value < 1400)
const isSwitchChartHorizontal = computed(() => width.value < 1310)
</script>

<style lang="scss" scoped>
.page {
	.main-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		grid-template-rows: repeat(1, minmax(0, 1fr));

		grid-template-areas:
			"box1 box2 box3 box3"
			"boxleft boxleft boxright boxright"
			"boxbottom boxbottom boxbottom boxbottom";

		@media (max-width: 1400px) {
			grid-template-areas:
				"box1 box1 box2 box2"
				"box3 box3 box3 box3"
				"boxleft boxleft boxright boxright"
				"boxbottom boxbottom boxbottom boxbottom";
		}
		@media (max-width: 1000px) {
			grid-template-areas:
				"box1 box1 box2 box2"
				"box3 box3 box3 box3"
				"boxleft boxleft boxleft boxleft"
				"boxright boxright boxright boxright"
				"boxbottom boxbottom boxbottom boxbottom";
		}
		@media (max-width: 560px) {
			grid-template-areas:
				"box1 box1 box1 box1"
				"box2 box2 box2 box2"
				"box3 box3 box3 box3"
				"boxleft boxleft boxleft boxleft"
				"boxright boxright boxright boxright"
				"boxbottom boxbottom boxbottom boxbottom";
		}
	}

	.box-card-1 {
		grid-area: box1;
	}
	.box-card-2 {
		grid-area: box2;
	}
	.box-card-3 {
		grid-area: box3;
	}
	.box-bottom {
		grid-area: boxbottom;
	}
	.left-col {
		grid-area: boxleft;
	}
	.right-col {
		grid-area: boxright;
	}
}
</style>
