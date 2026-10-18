import type { Translatable } from "@/add-os/modules/hr/types/hr"
import { h } from "vue"
import { translated } from "@/add-os/modules/hr/utils/translated"

/** A table cell naming an employee: the name, and the employee number under it when there is one. */
export function employeeCell(employee: { name: Translatable; employee_number?: string | null } | null | undefined) {
	return h("div", { class: "flex flex-col gap-0.5 py-1" }, [
		h("span", { class: "font-semibold text-sm" }, translated(employee?.name)),
		employee?.employee_number ? h("span", { class: "text-xs text-secondary font-mono", dir: "ltr" }, employee.employee_number) : null
	])
}
