<template>
	<div class="page-auth">
		<Settings v-if="!isLogged" v-model:align="align" v-model:active-color="activeColor" />

		<div v-if="!isLogged" class="wrapper flex justify-center">
			<div v-if="align === 'right'" class="image-box basis-2/3" />
			<div class="form-box flex basis-1/3 items-center justify-center" :class="{ centered: align === 'center' }">
				<AuthForm :type />
			</div>
			<div v-if="align === 'left'" class="image-box basis-2/3" />
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { Align } from "@/components/auth/Settings.vue"
import type { FormType } from "@/components/auth/types.d"
import { computed, onBeforeMount, ref } from "vue"
import { useRoute } from "vue-router"
import { getCsrfCookie } from "@/add-os/services/auth"
import AuthForm from "@/components/auth/AuthForm.vue"
import Settings from "@/components/auth/Settings.vue"
import { useAuthStore } from "@/stores/auth"

const { formType } = defineProps<{
	formType?: FormType
}>()

const route = useRoute()
const align = ref<Align>("left")
const activeColor = ref("")
const type = ref<FormType | undefined>(formType || undefined)
const authStore = useAuthStore()
const isLogged = computed(() => authStore.isLogged)

onBeforeMount(async () => {
	if (route.query.step) {
		const step = route.query.step as FormType
		type.value = step
	}
	// prefetch CSRF cookie so forms can immediately submit (no-op in prod if unset)
	if (!isLogged.value) {
		try {
			await getCsrfCookie()
		} catch {
			/* ignore; login will surface errors */
		}
	}
})
</script>

<style lang="scss" scoped>
@import "./main.scss";

.page-auth {
	.wrapper {
		.image-box {
			background-color: v-bind(activeColor);
		}
	}
}
</style>
