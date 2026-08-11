<template>
	<div class="page">
		<div class="card-row flex flex-wrap">
			<div class="card-wrap basis-full lg:basis-1/3">
				<CardExtra1 class="h-full" title="Card with tabs" />
			</div>
			<div class="card-wrap basis-full lg:basis-1/3">
				<CardExtra2 class="h-full" />
			</div>
			<div class="card-wrap basis-full lg:basis-1/3">
				<CardExtra5 class="h-full" hide-image />
			</div>
		</div>
		<div class="card-row flex flex-wrap">
			<div class="card-wrap basis-full lg:basis-2/3">
				<CardWrapper v-slot="{ expand, reload }" class="h-full">
					<CardExtra6 class="h-full" :table-rows="6" @expand="expand" @reload="reload" />
				</CardWrapper>
			</div>
			<div class="card-wrap flex basis-full flex-col lg:basis-1/3">
				<CardExtra3 />
				<CardExtra4 class="h-full" />
			</div>
		</div>
		<div class="card-row flex flex-wrap">
			<div class="card-wrap basis-full overflow-hidden lg:basis-2/3">
				<CardExtra7 class="h-full" />
			</div>
			<div class="card-wrap flex basis-full flex-col lg:basis-1/3">
				<CardSocial1 like class="h-full" />
			</div>
		</div>
		<div class="card-row flex flex-wrap">
			<div class="card-wrap basis-full lg:basis-1/3">
				<CardSocial1 show-image show-comments />
			</div>
			<div class="card-wrap basis-full lg:basis-1/3">
				<CardSocial1 :show-image="false" show-comments like />
			</div>
			<div class="card-wrap basis-full lg:basis-1/3">
				<CardSocial1 hide-text show-image like />
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.page {
	--card-gap: 0.625em;
	.card-row {
		margin-left: calc(var(--card-gap) * -1);
		margin-right: calc(var(--card-gap) * -1);

		.card-wrap {
			padding: var(--card-gap);

			&.flex-col {
				gap: calc(var(--card-gap) * 2);
			}
		}
	}
}
</style>
