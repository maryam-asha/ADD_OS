import { h } from "vue"
import { RouterLink } from "vue-router"
import { renderIcon } from "@/utils"

const DashboardIcon = "carbon:dashboard"

export default {
	label: "Dashboard",
	key: "Dashboard",
	icon: renderIcon(DashboardIcon),
	children: [
		{
			label: () =>
				h(
					RouterLink,
					{
						to: {
							name: "Dashboard-Analytics"
						}
					},
					{ default: () => "Analytics" }
				),
			key: "Dashboard-Analytics"
		},
		{
			label: () =>
				h(
					RouterLink,
					{
						to: {
							name: "Dashboard-eCommerce"
						}
					},
					{ default: () => "eCommerce" }
				),
			key: "Dashboard-eCommerce"
		}
	]
}
