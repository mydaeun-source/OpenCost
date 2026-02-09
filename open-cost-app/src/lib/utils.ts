import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatNumber(val: number | string | null | undefined) {
    if (val === null || val === undefined || val === "") return "0";
    const num = typeof val === "string" ? Number(val.replace(/,/g, "")) : val;
    if (isNaN(num)) return "0";
    return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
    });
}
