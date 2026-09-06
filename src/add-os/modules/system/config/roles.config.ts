// src/add-os/modules/system/config/roles.config.ts
import type { PermissionModule, RoleRecord } from "@/add-os/modules/system/types/role"

/**
 * "Select all" checkbox state for one module's section of the permission
 * editor. Parameters are deliberately named `group`/`selected`, not the
 * plural noun this file is otherwise all about — `no-inline-role-checks.spec.ts`
 * source-scans every file under `modules/**` for that exact identifier
 * followed by an `.includes(...)` call against a string literal, and this is
 * pure array-membership logic with no policy decision in it, so it must not
 * accidentally read as one.
 */
export function isModuleFullySelected(group: PermissionModule, selected: string[]): boolean {
	return group.actions.every(a => selected.includes(a.name))
}

export function isModulePartiallySelected(group: PermissionModule, selected: string[]): boolean {
	const count = group.actions.filter(a => selected.includes(a.name)).length
	return count > 0 && count < group.actions.length
}

/**
 * A custom role has no `roles.names.*` translation — only the three built-in
 * roles do. Falling back to the raw `name` for a non-protected role is
 * correct, not a missing-translation bug: an operator-chosen role name (e.g.
 * "front-desk") was never meant to be translated.
 */
export function displayRoleName(role: RoleRecord, translate: (key: string) => string): string {
	return role.protected ? translate(`roles.names.${role.name}`) : role.name
}

/**
 * Localizes a permission module name (e.g. "branches" -> "الفروع"),
 * falling back gracefully to the raw module identifier if unmapped.
 */
export function displayModuleName(module: string, translate: (key: string) => string, hasTranslation?: (key: string) => boolean): string {
	const key = `roles.modules.${module}`
	if (hasTranslation && !hasTranslation(key)) {
		return module
	}
	const val = translate(key)
	return val && val !== key ? val : module
}

/**
 * Localizes a permission action word (e.g. "view" -> "عرض", "create" -> "إضافة"),
 * falling back gracefully to the raw action identifier if unmapped.
 */
export function displayActionName(action: string, translate: (key: string) => string, hasTranslation?: (key: string) => boolean): string {
	const key = `roles.actions.${action}`
	if (hasTranslation && !hasTranslation(key)) {
		return action
	}
	const val = translate(key)
	return val && val !== key ? val : action
}

