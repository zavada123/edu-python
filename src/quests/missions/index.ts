import type { Mission } from "../types.ts"
import { calculator } from "./calculator.ts"
import { calculatorPro } from "./calculator-pro.ts"
import { spaceStation } from "./space-station.ts"
import { stationSecrets } from "./station-secrets.ts"

export { calculator, calculatorPro, spaceStation, stationSecrets }

/** All missions in the order of the school course. A bonus mission comes after the base mission that it extends. */
export const missions: readonly Mission[] = [spaceStation, stationSecrets, calculator, calculatorPro]
