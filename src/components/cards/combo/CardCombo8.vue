<template>
	<n-card>
		<div class="card-wrap flex justify-between">
			<div class="item-box">
				<CardCombo7 show-percentage>
					<template #icon>
						<n-avatar round src="/images/logo-1.png" :size="30" :img-props="{ alt: 'company-1-logo' }" />
					</template>
				</CardCombo7>
			</div>
			<div class="divider">
				<div class="line" />
			</div>
			<div class="item-box">
				<CardCombo7 show-percentage>
					<template #icon>
						<n-avatar round src="/images/logo-2.png" :size="30" :img-props="{ alt: 'company-2-logo' }" />
					</template>
				</CardCombo7>
			</div>
		</div>
	</n-card>
</template>

<script setup lang="ts">
import { NAvatar, NCard } from "naive-ui"
</script>

<style scoped lang="scss">
.n-card {
	container-type: inline-size;

	.card-wrap {
		height: 100%;
		width: 100%;
		overflow: hidden;

		.item-box {
			width: calc(50% - 24px);
		}
		.divider {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			width: 48px;

			.line {
				width: 1px;
				background-color: var(--border-color);
				flex-grow: 1;
			}
		}

		@container (max-width:500px) {
			flex-direction: column;
			gap: 30px;

			.item-box {
				width: 100%;
			}

			.divider {
				display: none;
			}
		}
	}
}
</style>
