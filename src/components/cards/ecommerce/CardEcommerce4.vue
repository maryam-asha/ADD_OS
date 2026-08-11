<template>
	<n-card hoverable content-class="p-0!">
		<div class="xs:flex-row xs:items-stretch flex flex-col">
			<div class="flex basis-3/5 flex-col">
				<div class="card-header flex items-center justify-between">
					<div>
						<span>
							{{ title }}
						</span>
					</div>
				</div>
				<div class="card-content grow">
					<div class="mb-3">
						<n-rate readonly allow-half :default-value="5" color="#FFB600" />
					</div>
					<p v-html="text" />
					<div class="divider" />
					<div class="features flex justify-around">
						<Icon :size="20" :name="CheckIcon" />
						<Icon :size="20" :name="StarIcon" />
						<Icon :size="20" :name="ShieldIcon" />
						<Icon :size="20" :name="PremiumIcon" />
						<Icon :size="20" :name="EcoIcon" />
					</div>
				</div>
			</div>
			<div class="card-info flex basis-2/5 flex-col items-center justify-between">
				<div class="mb-4">
					<n-radio-group v-model:value="subscription" name="subscription" class="bg-default rounded-lg">
						<n-radio-button value="monthly" label="Monthly" />
						<n-radio-button value="yearly" label="Yearly" />
					</n-radio-group>
				</div>
				<div class="mb-4 text-xl">
					<div v-if="subscription === 'monthly'">
						<strong>$29</strong>
						<span>/month</span>
					</div>
					<div v-if="subscription === 'yearly'">
						<strong>$299</strong>
						<span>/year</span>
						<br />
						<small class="text-secondary">$24,90/month</small>
					</div>
				</div>
				<n-button type="primary">
					<template #icon>
						<Icon :name="PremiumIcon" />
					</template>
					Subscribe now
				</n-button>
			</div>
		</div>
	</n-card>
</template>

<script setup lang="ts">
import { faker } from "@faker-js/faker"
import { NButton, NCard, NRadioButton, NRadioGroup, NRate } from "naive-ui"
import { ref } from "vue"
import Icon from "@/components/common/Icon.vue"

const CheckIcon = "fluent:checkmark-starburst-16-regular"
const StarIcon = "fluent:star-16-regular"
const ShieldIcon = "fluent:shield-keyhole-16-regular"
const PremiumIcon = "fluent:premium-24-regular"
const EcoIcon = "material-symbols:eco-outline"

const subscription = ref("monthly")

const title = faker.lorem.sentence({ min: 2, max: 4 }).replace(".", "")
const text = faker.lorem.sentences(2, "<br/><br/>") + faker.lorem.paragraph()
</script>

<style scoped lang="scss">
.n-card {
	overflow: hidden;

	.card-header {
		box-sizing: border-box;
		display: flex;
		align-items: center;
		font-weight: 700;
		font-family: var(--font-family-display);
		font-size: var(--n-title-font-size);
		padding: var(--n-padding-top) var(--n-padding-left) var(--n-padding-bottom) var(--n-padding-left);
	}

	.card-content {
		box-sizing: border-box;
		padding: 0 var(--n-padding-left) var(--n-padding-bottom) var(--n-padding-left);
		font-size: var(--n-font-size);
	}

	.card-info {
		box-sizing: border-box;
		transition:
			background-color 0.3s var(--n-bezier),
			border-color 0.3s var(--n-bezier);
		background-clip: padding-box;
		background-color: var(--n-action-color);
		padding: var(--n-padding-bottom) var(--n-padding-left);
	}

	.divider {
		background-color: var(--border-color);
		margin: 20px 0;
		margin-left: calc(var(--n-padding-left) * -1);
		margin-right: calc(var(--n-padding-left) * -1);
		height: 1px;
	}
}
</style>
