import type { DataTableColumns, SelectOption } from "naive-ui"
import type { ComposerTranslation } from "vue-i18n"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { SupportedLocale } from "@/add-os/lang/locales"
import type { Device, DevicePayload, DeviceStatus, TTLockAccount } from "@/add-os/modules/access/types/access"
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { Space } from "@/add-os/modules/spatial/types/space"
import { NTag } from "naive-ui"
import { h } from "vue"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { spaceLabel } from "@/add-os/modules/spatial/config/kiosks.config"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import { formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/** Below this a lock's battery is flagged: TTLock locks warn at about 20%. */
export const LOW_BATTERY = 20

export const DEVICE_TYPES = ["lock", "gateway"] as const

export function isAccessDevice(device: Device): boolean {
	return (DEVICE_TYPES as readonly string[]).includes(device.type)
}

const STATUS_TAG: Record<DeviceStatus, { type: "success" | "default" | "error"; icon: string }> = {
	online: { type: "success", icon: STATUS_ICONS.success },
	offline: { type: "default", icon: STATUS_ICONS.info },
	faulted: { type: "error", icon: STATUS_ICONS.danger }
}

function tag(type: "success" | "default" | "error" | "warning" | "info", icon: string, label: string) {
	return h(NTag, { type, round: true, bordered: true, size: "small" }, { default: () => [h(Icon, { name: icon, size: 14 }), ` ${label}`] })
}

export interface DeviceLookups {
	spacesById: Record<number, Space>
	devicesById: Record<number, Device>
}

export function buildDeviceColumns(t: ComposerTranslation, locale: SupportedLocale, lookups: DeviceLookups): DataTableColumns<Device> {
	return [
		{
			title: t("accessDevices.columns.type"),
			key: "type",
			render: row => tag("info", row.type === "lock" ? "carbon:locked" : "carbon:wifi", t(`accessDevices.type.${row.type}`))
		},
		{
			title: t("accessDevices.columns.space"),
			key: "space_id",
			render: row => {
				if (row.space_id === null) return "—"
				const space = lookups.spacesById[row.space_id]
				return space ? spaceLabel(space, t, locale) : `#${row.space_id}`
			}
		},
		{
			title: t("accessDevices.columns.ttlockId"),
			key: "external_ref",
			render: row => (row.external_ref ? h("bdi", { dir: "ltr", class: "font-mono" }, row.external_ref) : tag("warning", STATUS_ICONS.warning, t("accessDevices.notLinked")))
		},
		{
			title: t("accessDevices.columns.status"),
			key: "status",
			render: row => {
				const look = STATUS_TAG[row.status] ?? STATUS_TAG.offline
				return tag(look.type, look.icon, t(`accessDevices.status.${row.status}`))
			}
		},
		{
			title: t("accessDevices.columns.details"),
			key: "metadata",
			render: row => deviceDetails(row, t, lookups)
		},
		{
			title: t("accessDevices.columns.syncedAt"),
			key: "synced_at",
			render: row => (row.metadata?.synced_at ? formatDateTime(row.metadata.synced_at) : "—")
		}
	]
}

/** A lock: its battery and gateway; a gateway: how many locks it reaches. */
function deviceDetails(row: Device, t: ComposerTranslation, lookups: DeviceLookups) {
	const meta = row.metadata ?? {}

	if (row.type === "gateway") {
		return meta.lock_count === undefined ? "—" : t("accessDevices.lockCount", { count: meta.lock_count })
	}

	const parts = []

	if (typeof meta.battery === "number") {
		const low = meta.battery < LOW_BATTERY
		parts.push(tag(low ? "error" : "default", low ? STATUS_ICONS.warning : "carbon:battery-full", `${meta.battery}%`))
	}

	if (meta.has_gateway === false) {
		parts.push(tag("warning", STATUS_ICONS.warning, t("accessDevices.noGateway")))
	} else if (row.parent_device_id !== null) {
		const gateway = lookups.devicesById[row.parent_device_id]
		parts.push(h("span", { class: "text-xs text-secondary" }, t("accessDevices.viaGateway", { ref: gateway?.external_ref ?? `#${row.parent_device_id}` })))
	}

	return parts.length ? h("div", { class: "flex flex-wrap items-center gap-1" }, parts) : "—"
}

/**
 * Getters, not values: the drawer registers its `optionsFrom` watchers once,
 * when it mounts, and runs them again on each new form — so they must read
 * the page's data as it is then, not as it was when the fields were built.
 */
export interface DeviceFieldContext {
	branches: () => Branch[]
	/** Spaces with the branch each one is in, from its building. */
	spaces: () => { space: Space; branchId: number | null }[]
	gateways: () => Device[]
	/** `null` when no TTLock account answers: the id is then typed by hand. */
	account: () => TTLockAccount | null
	/** The row being edited, so its own TTLock id stays offered. */
	editingId: () => number | null
}

/**
 * The TTLock id comes from the account when the server can reach it — the
 * locks and gateways not linked to another row yet — and the MAC with it
 * (`withAccountMac`), so the form never asks for what TTLock already knows.
 * Without the account both are typed.
 */
export function buildDeviceFields(ctx: DeviceFieldContext, t: ComposerTranslation, locale: SupportedLocale): FieldDescriptor<DevicePayload>[] {
	const fromAccount = ctx.account() !== null

	const refField: FieldDescriptor<DevicePayload> = fromAccount
		? {
				key: "external_ref",
				labelKey: "accessDevices.form.ttlockDevice",
				type: "select",
				required: true,
				dependsOn: "type",
				optionsFrom: parents => accountOptions(ctx, parents.type === "gateway" ? "gateway" : "lock", t),
				hint: () => t("accessDevices.form.ttlockDeviceHint")
			}
		: {
				key: "external_ref",
				labelKey: "accessDevices.form.ttlockId",
				type: "text",
				required: true,
				hint: () => t("accessDevices.form.ttlockIdHint")
			}

	return [
		{
			key: "type",
			labelKey: "accessDevices.form.type",
			type: "select",
			required: true,
			options: DEVICE_TYPES.map(type => ({ label: t(`accessDevices.type.${type}`), value: type }))
		},
		refField,
		...(fromAccount ? [] : [{ key: "hardware_mac", labelKey: "accessDevices.form.mac", type: "text", required: true } as FieldDescriptor<DevicePayload>]),
		{
			key: "branch_id",
			labelKey: "accessDevices.form.branch",
			type: "select",
			required: true,
			options: ctx.branches().map(branch => ({ label: pickLocalized(branch.name, locale), value: branch.id }))
		},
		{
			key: "space_id",
			labelKey: "accessDevices.form.space",
			type: "select",
			dependsOn: ["branch_id", "type"],
			hiddenWhen: model => model.type !== "lock",
			optionsFrom: parents =>
				ctx.spaces()
					.filter(({ space, branchId }) => space.is_lockable && (parents.branch_id == null || branchId === parents.branch_id))
					.map(({ space }) => ({ label: spaceLabel(space, t, locale), value: space.id })),
			hint: () => t("accessDevices.form.spaceHint")
		},
		{
			key: "parent_device_id",
			labelKey: "accessDevices.form.gateway",
			type: "select",
			dependsOn: ["branch_id", "type"],
			hiddenWhen: model => model.type !== "lock",
			optionsFrom: parents =>
				ctx.gateways()
					.filter(gateway => parents.branch_id == null || gateway.branch_id === parents.branch_id)
					.map(gateway => ({ label: gatewayLabel(gateway, ctx.account()), value: gateway.id })),
			hint: () => t("accessDevices.form.gatewayHint")
		}
	]
}

function accountOptions(ctx: DeviceFieldContext, type: "lock" | "gateway", t: ComposerTranslation): SelectOption[] {
	const account = ctx.account()
	if (account === null) return []

	const free = (linked: number | null) => linked === null || linked === ctx.editingId()

	if (type === "gateway") {
		return account.gateways
			.filter(gateway => free(gateway.linked_device_id))
			.map(gateway => ({
				label: `${gateway.name ?? t("accessDevices.type.gateway")} · ${gateway.gateway_id}${gateway.is_online ? "" : ` · ${t("accessDevices.status.offline")}`}`,
				value: gateway.gateway_id
			}))
	}

	return account.locks
		.filter(lock => free(lock.linked_device_id))
		.map(lock => ({ label: `${lock.name ?? t("accessDevices.type.lock")} · ${lock.lock_id}`, value: lock.lock_id }))
}

function gatewayLabel(gateway: Device, account: TTLockAccount | null): string {
	const name = account?.gateways.find(row => row.gateway_id === gateway.external_ref)?.name
	return [name, gateway.external_ref ?? `#${gateway.id}`].filter(Boolean).join(" · ")
}

/** The MAC TTLock records for the chosen id, so the row keeps the real one. */
export function withAccountMac(payload: DevicePayload, account: TTLockAccount | null): DevicePayload {
	if (account === null || payload.external_ref === null) return payload

	const mac = payload.type === "gateway"
		? account.gateways.find(row => row.gateway_id === payload.external_ref)?.mac
		: account.locks.find(row => row.lock_id === payload.external_ref)?.mac

	return { ...payload, hardware_mac: mac ?? payload.hardware_mac ?? payload.external_ref }
}

/** A gateway pairs nothing through itself, and has no room or sticker. */
export function normalizeDevicePayload(payload: DevicePayload): DevicePayload {
	return payload.type === "gateway" ? { ...payload, space_id: null, parent_device_id: null } : payload
}

export function emptyDevicePayload(): DevicePayload {
	return { type: "lock", branch_id: null, space_id: null, external_ref: null, hardware_mac: null, parent_device_id: null }
}

export function deviceToPayload(device: Device): DevicePayload {
	return {
		type: device.type === "gateway" ? "gateway" : "lock",
		branch_id: device.branch_id,
		space_id: device.space_id,
		external_ref: device.external_ref,
		hardware_mac: device.hardware_mac,
		parent_device_id: device.parent_device_id
	}
}
