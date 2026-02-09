"use client"

import * as React from "react"
import { Input, InputProps } from "./Input"

interface NumericInputProps extends Omit<InputProps, "value" | "onChange"> {
    value: number
    onChange: (value: number) => void
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
    ({ value, onChange, ...props }, ref) => {
        // Format number to string with commas and optional decimal
        const formatValue = (val: number | string) => {
            if (val === "" || val === undefined || val === null) return ""

            // Convert to string and strip existing commas
            const strVal = val.toString().replace(/,/g, "")
            const num = Number(strVal)

            if (isNaN(num)) return ""

            // Split into integer and fractional parts to handle typing decimal point
            const parts = strVal.split(".")
            const integerPart = Number(parts[0]).toLocaleString()

            if (parts.length > 1) {
                // Allow only up to 1 decimal place as requested (#.#)
                const fractionalPart = parts[1].substring(0, 1)
                return `${integerPart}.${fractionalPart}`
            }

            return integerPart
        }

        const [displayValue, setDisplayValue] = React.useState(formatValue(value))

        // Sync with external value changes
        React.useEffect(() => {
            setDisplayValue(formatValue(value))
        }, [value])

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            let rawValue = e.target.value.replace(/,/g, "")

            // Allow empty, single minus sign, or single decimal point at the end
            if (rawValue === "" || rawValue === "-" || rawValue === ".") {
                setDisplayValue(rawValue)
                return
            }

            // Allow only numbers and one decimal point
            if (!/^-?\d*\.?\d*$/.test(rawValue)) return

            // Handle trailing decimal point specifically during typing
            if (rawValue.endsWith(".")) {
                const numPart = rawValue.slice(0, -1)
                if (!isNaN(Number(numPart))) {
                    setDisplayValue(Number(numPart).toLocaleString() + ".")
                    return
                }
            }

            // Update internal display state with formatting
            const formatted = formatValue(rawValue)
            setDisplayValue(formatted)

            // Trigger outside onChange with the raw numeric value
            const numericValue = Number(formatted.replace(/,/g, ""))
            if (!isNaN(numericValue)) {
                onChange(numericValue)
            }
        }

        return (
            <Input
                {...props}
                ref={ref}
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleChange}
            />
        )
    }
)

NumericInput.displayName = "NumericInput"

export { NumericInput }
