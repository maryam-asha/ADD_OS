import type { Translatable } from "@/add-os/modules/hr/types/hr"
import { h } from "vue"
import EmployeeAvatar from "@/add-os/modules/hr/components/ui/EmployeeAvatar.vue"
import { translated } from "@/add-os/modules/hr/utils/translated"

/** A table cell naming an employee: their initials, the name, and the employee number under it when there is one. */
export function employeeCell(employee: { name: Translatable; employee_number?: string | null } | null | undefined) {
	return h("div", { class: "flex items-center gap-3 py-1" }, [
		h(EmployeeAvatar, { name: employee?.name }),
		h("div", { class: "flex min-w-0 flex-col gap-0.5" }, [
			h("span", { class: "font-semibold text-sm" }, translated(employee?.name)),
			employee?.employee_number ? h("span", { class: "text-xs text-secondary font-mono", dir: "ltr" }, employee.employee_number) : null
		])
	])
}
