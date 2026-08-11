<template>
	<mgl-map :center :zoom :attribution-control="false" :language="mglLanguage" @map:load="onMapLoad">
		<mgl-frame-rate-control />
		<mgl-fullscreen-control />
		<mgl-attribution-control />
		<mgl-navigation-control />
		<mgl-scale-control />
		<mgl-geolocation-control />
		<mgl-draw-control v-model:model="myDrawModel" />
		<mgl-style-switch-control :map-styles :position="controlPosition" />
		<mgl-marker :coordinates="markerCoordinates" color="#cc0000" :scale="0.5" />
	</mgl-map>
</template>

<script lang="ts" setup>
import type { Feature } from "geojson"
import type { CircleLayerSpecification, LngLatLike, Map, PropertyValueSpecification } from "maplibre-gl"
import type { DrawModel, StyleSwitchItem, ValidLanguages } from "vue-maplibre-gl"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import {
	MglAttributionControl,
	MglDefaults,
	MglDrawControl,
	MglFrameRateControl,
	MglFullscreenControl,
	MglGeolocationControl,
	MglMap,
	MglMarker,
	MglNavigationControl,
	MglScaleControl,
	MglStyleSwitchControl
} from "vue-maplibre-gl"

enum Position {
	TOP_LEFT = "top-left",
	TOP_RIGHT = "top-right",
	BOTTOM_LEFT = "bottom-left",
	BOTTOM_RIGHT = "bottom-right"
}

const mapTilerApiKey = import.meta.env.VITE_MAPTILER_API_KEY

MglDefaults.style = `https://api.maptiler.com/maps/streets/style.json?key=${mapTilerApiKey}`

const { locale } = useI18n()

const mglLanguage = computed<ValidLanguages | undefined>(() => (locale.value as ValidLanguages) ?? "en")

const mapStyles = [
	{
		name: "Streets",
		label: "Streets",
		style: `https://api.maptiler.com/maps/streets/style.json?key=${mapTilerApiKey}`
	},
	{ name: "Basic", label: "Basic", style: `https://api.maptiler.com/maps/basic/style.json?key=${mapTilerApiKey}` },
	{
		name: "Bright",
		label: "Bright",
		style: `https://api.maptiler.com/maps/bright/style.json?key=${mapTilerApiKey}`
	},
	{
		name: "Satellite",
		label: "Satellite",
		style: `https://api.maptiler.com/maps/hybrid/style.json?key=${mapTilerApiKey}`
	},
	{
		name: "Voyager",
		label: "Voyager",
		style: `https://api.maptiler.com/maps/voyager/style.json?key=${mapTilerApiKey}`
	}
] as StyleSwitchItem[]

const geoJsonSource = ref({
	type: "Feature",
	geometry: {
		type: "Polygon",
		coordinates: [
			[
				[-67.13734351262877, 45.137451890638886],
				[-66.96466, 44.8097],
				[-68.03252, 44.3252],
				[-69.06, 43.98],
				[-70.11617, 43.68405],
				[-70.64573401557249, 43.090083319667144],
				[-70.75102474636725, 43.08003225358635],
				[-70.79761105007827, 43.21973948828747],
				[-70.98176001655037, 43.36789581966826],
				[-70.94416541205806, 43.46633942318431],
				[-71.08482, 45.3052400000002],
				[-70.6600225491012, 45.46022288673396],
				[-70.30495378282376, 45.914794623389355],
				[-70.00014034695016, 46.69317088478567],
				[-69.23708614772835, 47.44777598732787],
				[-68.90478084987546, 47.184794623394396],
				[-68.23430497910454, 47.35462921812177],
				[-67.79035274928509, 47.066248887716995],
				[-67.79141211614706, 45.702585354182816],
				[-67.13734351262877, 45.137451890638886]
			]
		]
	}
} as Feature)

const librariesSourceTiles = ["https://api.librarydata.uk/libraries/{z}/{x}/{y}.mvt"]
const librariesLayerCirclesPaint = {
	"circle-radius": 5,
	"circle-color": "#1b5e20"
} as CircleLayerSpecification["paint"]

const controlPosition = ref(Position.TOP_LEFT)
const markerCoordinates = ref<LngLatLike>([13.377507, 52.516267])

const layout: { [key: string]: PropertyValueSpecification<string | number> } = {
	"line-join": "round",
	"line-cap": "round"
}
const paint: { [key: string]: PropertyValueSpecification<string | number> } = {
	"line-color": "#FF0000",
	"line-width": 8
}

const center = ref<LngLatLike>([10.288107, 49.405078])
const zoom = ref(3)
const myDrawModel = ref<DrawModel | undefined>()

function onMapLoad(e: { map: Map }) {
	const map = e.map

	if (!map.getSource("geojson")) {
		map.addSource("geojson", {
			type: "geojson",
			data: geoJsonSource.value as any
		})
	}

	if (!map.getLayer("geojson-layer")) {
		map.addLayer({
			id: "geojson-layer",
			type: "line",
			source: "geojson",
			layout,
			paint
		} as any)
	}

	if (!map.getSource("libraries")) {
		map.addSource("libraries", {
			type: "vector",
			tiles: librariesSourceTiles
		} as any)
	}

	if (!map.getLayer("libraries-layer")) {
		map.addLayer({
			id: "libraries-layer",
			type: "circle",
			source: "libraries",
			"source-layer": "libraries",
			paint: librariesLayerCirclesPaint
		} as any)
	}
}
</script>

<style lang="scss">
@use "maplibre-gl/dist/maplibre-gl.css";
@use "vue-maplibre-gl/dist/vue-maplibre-gl.css";
@use "vue-maplibre-gl/dist/draw.css"; /* optional: only needed for draw component */

.maplibregl-ctrl .maplibregl-ctrl-icon svg {
	margin: 0 auto;
	path {
		fill: #333333;
	}
}
.maplibregl-style-list {
	color: #333333;
}
</style>
