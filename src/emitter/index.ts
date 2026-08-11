import type { EventType, Emitter as Mitt } from "mitt"
import mitt from "mitt"

export const emitter = mitt()
export type Emitter<T extends Record<EventType, unknown>> = Mitt<T>
