<template>
	<div class="page flex flex-col gap-5">
		<div class="card-row flex flex-col gap-5 md:flex-row">
			<div class="card-wrap basis-full md:basis-1/2">
				<CardCombo1 title="Sales" class="h-full">
					<template #icon>
						<CardComboIcon :icon-name="SalesIcon" boxed />
					</template>
				</CardCombo1>
			</div>
			<div class="card-wrap basis-full md:basis-1/2">
				<CardCombo1 title="Subscribers" type="bar" class="h-full" :chart-color="style['extra1-color']">
					<template #icon>
						<CardComboIcon :icon-name="SubscribersIcon" boxed :color="style['extra1-color']" />
					</template>
				</CardCombo1>
			</div>
		</div>
		<div class="card-row flex flex-col gap-5 lg:flex-row">
			<div class="card-wrap xs:flex-row flex basis-full flex-col gap-5 lg:basis-1/2">
				<div class="flex basis-full lg:basis-1/2">
					<CardCombo2 title="Reports" centered class="bg-extra-2! h-full text-white!">
						<template #icon>
							<CardComboIcon :icon-name="ReportsIcon" boxed :box-size="50" color="white" />
						</template>
					</CardCombo2>
				</div>
				<div class="flex basis-full lg:basis-1/2">
					<div class="flex w-full flex-col gap-5">
						<CardCombo2 title="Issues" horizontal>
							<template #icon>
								<CardComboIcon
									:icon-name="ErrorIcon"
									boxed
									:box-size="50"
									:color="style['extra4-color']"
								/>
							</template>
						</CardCombo2>
						<CardCombo2 title="Completed" horizontal>
							<template #icon>
								<CardComboIcon :icon-name="CompletedIcon" boxed :box-size="50" />
							</template>
						</CardCombo2>
					</div>
				</div>
			</div>
			<div class="card-wrap xs:flex-row flex basis-full flex-col gap-5 lg:basis-1/2">
				<div class="flex basis-full lg:basis-1/2">
					<div class="flex w-full flex-col gap-5">
						<CardCombo2 title="Pending" horizontal>
							<template #icon>
								<CardComboIcon :icon-name="PendingIcon" :box-size="50" :color="style['extra3-color']" />
							</template>
						</CardCombo2>
						<CardCombo2 title="Shipped" horizontal>
							<template #icon>
								<CardComboIcon :icon-name="ShippedIcon" :box-size="50" :color="style['extra1-color']" />
							</template>
						</CardCombo2>
					</div>
				</div>
				<div class="flex basis-full lg:basis-1/2">
					<CardCombo2 title="Earned" centered class="h-full" currency="USD">
						<template #icon>
							<CardComboIcon :icon-name="RevenueIcon" :box-size="50" />
						</template>
					</CardCombo2>
				</div>
			</div>
		</div>
		<div class="card-row flex flex-col gap-5 lg:flex-row">
			<div class="card-wrap flex basis-full flex-col gap-5 lg:basis-1/2">
				<CardCombo3 class="grow" />

				<CardCombo8 />

				<div class="flex flex-col gap-5 md:flex-row lg:flex-col xl:flex-row">
					<CardCombo6
						card-wrap
						title-left="Computer"
						title-right="Tablet"
						value-left="75.6k"
						value-right="143.7k"
					>
						<template #iconLeft>
							<CardComboIcon :icon-name="ComputerIcon" boxed :box-size="30" />
						</template>
						<template #iconRight>
							<CardComboIcon :icon-name="TabletIcon" boxed :box-size="30" />
						</template>
					</CardCombo6>

					<CardCombo6 card-wrap show-divider-lines hide-versus-icon />
				</div>
			</div>
			<div class="card-wrap flex basis-full flex-col gap-5 lg:basis-1/2">
				<div class="flex flex-col gap-5 sm:flex-row">
					<CardCombo7 card-wrap>
						<template #icon>
							<CardComboIcon :icon-name="SalesIcon" boxed />
						</template>
					</CardCombo7>

					<CardCombo4
						title="Activities"
						card-wrap
						vertical
						val-string="32.9K"
						percentage
						:percentage-props="{
							value: 2.45,
							direction: 'up'
						}"
					>
						<template #icon>
							<CardComboIcon :icon-name="ActivityIcon" :color="style['extra2-color']" />
						</template>
					</CardCombo4>
				</div>

				<CardCombo5 />

				<div class="flex flex-col gap-5 sm:flex-row">
					<CardCombo4
						title="Uploaded"
						val-string="137.5 GB"
						card-wrap
						percentage
						:percentage-props="{
							value: 1.96,
							direction: 'down'
						}"
					>
						<template #icon>
							<CardComboIcon :icon-name="UploadsIcon" boxed />
						</template>
					</CardCombo4>

					<CardCombo4
						title="Users"
						card-wrap
						val-string="248.3K"
						percentage
						:percentage-props="{
							value: 2.45,
							direction: 'up'
						}"
					/>
				</div>

				<div class="flex flex-col gap-5 md:flex-row lg:flex-col xl:flex-row">
					<CardCombo7 card-wrap hide-header />

					<CardCombo7 card-wrap show-percentage hide-info />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { computed } from "vue"
import { useThemeStore } from "@/stores/theme"

const RevenueIcon = "carbon:money"
const SubscribersIcon = "carbon:user-multiple"
const SalesIcon = "carbon:shopping-cart"
const ReportsIcon = "carbon:report"
const ErrorIcon = "carbon:debug"
const ActivityIcon = "carbon:activity"
const UploadsIcon = "carbon:cloud-upload"
const CompletedIcon = "carbon:checkmark-outline"
const PendingIcon = "carbon:hourglass"
const ShippedIcon = "carbon:send"
const TabletIcon = "carbon:tablet"
const ComputerIcon = "carbon:screen"

const themeStore = useThemeStore()

const style = computed(() => themeStore.style)
</script>
