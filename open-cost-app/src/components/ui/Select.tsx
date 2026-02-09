import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps
    extends React.SelectHTMLAttributes<HTMLSelectElement> { }

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <div className="relative">
                <select
                    className={cn(
                        "flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        className
                    )}
                    ref={ref}
                    {...props}
                >
                    {children}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                    <svg
                        width="15"
                        height="15"
                        viewBox="0 0 15 15"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 opacity-50"
                    >
                        <path
                            d="M4.93179 5.43179C4.75605 5.25605 4.75605 4.97113 4.93179 4.79539C5.10753 4.61965 5.39245 4.61965 5.56819 4.79539L7.49999 6.72718L9.43179 4.79539C9.60753 4.61965 9.89245 4.61965 10.0682 4.79539C10.2439 4.97113 10.2439 5.25605 10.0682 5.43179L7.81819 7.68179C7.73379 7.76619 7.61929 7.81359 7.49999 7.81359C7.38069 7.81359 7.26619 7.76619 7.18179 7.68179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.74393 10.2439 10.0289 10.0682 10.2046C9.89245 10.3803 9.60753 10.3803 9.43179 10.2046L7.49999 8.2728L5.56819 10.2046C5.39245 10.3803 5.10753 10.3803 4.93179 10.2046C4.75605 10.0289 4.75605 9.74393 4.93179 9.56819L7.18179 7.31819C7.26619 7.23379 7.38069 7.18639 7.49999 7.18639C7.61929 7.18639 7.73379 7.23379 7.81819 7.31819L10.0682 9.56819Z"
                            fill="currentColor"
                            fillRule="evenodd"
                            clipRule="evenodd"
                        ></path>
                    </svg>
                </div>
            </div>
        )
    }
)
Select.displayName = "Select"

export { Select }
