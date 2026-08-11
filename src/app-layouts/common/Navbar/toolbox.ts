import { h } from "vue"
import { RouterLink } from "vue-router"
import { renderIcon } from "@/utils"

const ToolboxIcon = "carbon:tool-box"

export default {
	label: "Toolbox",
	key: "Toolbox",
	icon: renderIcon(ToolboxIcon),
	children: [
		{
			label: () =>
				h(
					RouterLink,
					{
						to: {
							name: "Toolbox-RefreshTool"
						}
					},
					{
						default: () => "Refresh Tool"
					}
				),
			key: "Toolbox-RefreshTool"
		},
		{
			label: () =>
				h(
					RouterLink,
					{
						to: {
							name: "Toolbox-Tour"
						}
					},
					{
						default: () => "Tour"
					}
				),
			key: "Toolbox-Tour"
		}
	]
}
