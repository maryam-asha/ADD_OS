<template>
	<n-card>
		<template #header>
			<div class="flex items-center gap-3">
				<n-avatar round :src="avatar" :size="30" :img-props="{ alt: 'avatar' }" />
				<span>
					{{ name }}
				</span>
			</div>
		</template>
		<template #default>
			<n-rate readonly allow-half :default-value="4.5" color="#FFB600" />
			<p class="mt-2" v-html="text" />
		</template>
	</n-card>
</template>

<script setup lang="ts">
import { faker } from "@faker-js/faker"
import { NAvatar, NCard, NRate } from "naive-ui"

const avatar = faker.image.avatarGitHub()
const name = faker.person.fullName()
const text = faker.lorem.sentences(3, "<br/><br/>") + faker.lorem.paragraph()
</script>
