import type { Ref } from "vue"
import { watch } from "vue"

/**
 * Plays a short chime when a list a screen shows gains an item it has not
 * shown before: a kitchen order reaching the board, or one waiting for
 * reception. It watches the ids the screen already loads, so it rings the
 * same whether the update came from the real-time channel or from polling.
 *
 * The first load only learns what is there, silently. An item leaving, or
 * changing status in place, is not an arrival. `rebase()` re-learns the list
 * without ringing, for a reload that shows a different slice of it (another
 * page), which is not new work arriving.
 *
 * The sound is synthesised with the Web Audio API, so there is no sound file
 * to ship and nothing is fetched. A browser that has not been interacted with
 * yet may keep audio suspended; the chime is then silently skipped.
 */
export function useNewArrivalChime(items: Ref<readonly { id: number }[]>, play: () => void = playChime): { rebase: () => void } {
	const seen = new Set<number>()
	let learning = true

	function learn(): void {
		for (const item of items.value) seen.add(item.id)
	}

	watch(
		() => items.value.map(item => item.id),
		ids => {
			if (learning) {
				learn()
				learning = false
				return
			}

			const arrived = ids.some(id => !seen.has(id))
			learn()
			if (arrived) play()
		}
	)

	return {
		rebase(): void {
			learning = true
		}
	}
}

let context: AudioContext | null = null

/** Two short rising notes, quiet enough for a desk that hears it all day. */
export function playChime(): void {
	try {
		const Ctor = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
		if (!Ctor) return
		context ??= new Ctor()
		const ctx = context
		if (ctx.state === "suspended") void ctx.resume().catch(() => undefined)

		const notes = [880, 1320]
		notes.forEach((frequency, index) => {
			const start = ctx.currentTime + index * 0.18
			const osc = ctx.createOscillator()
			const gain = ctx.createGain()
			osc.type = "sine"
			osc.frequency.value = frequency
			gain.gain.setValueAtTime(0.0001, start)
			gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02)
			gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16)
			osc.connect(gain).connect(ctx.destination)
			osc.start(start)
			osc.stop(start + 0.18)
		})
	} catch {
		// No audio device, or the browser refused: the screen still updates.
	}
}
