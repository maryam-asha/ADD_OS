import type { KitchenOrder } from "@/add-os/modules/kitchen/types/kitchen"

/**
 * The i18n key naming how an order is paid: on the bill, or paid by wallet
 * (the company's or the member's), card or cash. Null while nothing has been
 * paid yet, so no tag claims a payment that has not happened.
 */
export function paymentLabelKey(order: Pick<KitchenOrder, "payment">): string | null {
	const { choice, wallet_owner_type: owner, paid } = order.payment
	if (choice === "bill") return "kitchen.card.onBill"
	if (!paid) return null
	if (choice === "wallet") return owner === "company" ? "kitchen.reception.payment.companyWallet" : "kitchen.reception.payment.wallet"
	return `kitchen.reception.payment.${choice}`
}
