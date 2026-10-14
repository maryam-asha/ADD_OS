import type { SelectOption } from "naive-ui"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import { computed } from "vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { listBranches } from "@/add-os/services/branches"

/**
 * The branches as picker options and as names by id, in the current
 * language — the server's names are in the language of the request that
 * fetched them, so a switch would leave them behind.
 */
export function useBranchOptions() {
	const { data: branches } = useResourceList<Branch>(listBranches)

	const label = (branch: Branch) => branch.name[currentLocale.value] || branch.name.ar || branch.name.en

	return {
		branchOptions: computed<SelectOption[]>(() => branches.value.map(branch => ({ label: label(branch), value: branch.id }))),
		branchNames: computed<Record<number, string>>(() => Object.fromEntries(branches.value.map(branch => [branch.id, label(branch)])))
	}
}
