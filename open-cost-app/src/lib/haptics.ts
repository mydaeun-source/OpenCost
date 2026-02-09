/**
 * Haptic utility for tactile feedback on mobile devices.
 * Uses navigator.vibrate if supported.
 */

export const haptic = {
    // Light tap for standard button clicks
    light: () => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(10)
        }
    },

    // Medium impact for successful actions (e.g., order created)
    medium: () => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(30)
        }
    },

    // Heavy/Double impact for errors or critical warnings
    heavy: () => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([40, 30, 40])
        }
    },

    // Success pattern (fast double tap)
    success: () => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([15, 30, 15])
        }
    }
}
