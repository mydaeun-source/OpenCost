export const KAMIS_ITEMS = [
    { code: "111", name: "쌀", category: "100" },
    { code: "211", name: "밀", category: "200" },
    { code: "231", name: "콩", category: "200" },
    { code: "241", name: "감자", category: "200" },
    { code: "242", name: "고구마", category: "200" },
    { code: "312", name: "배추", category: "300" },
    { code: "313", name: "무", category: "300" },
    { code: "411", name: "양파", category: "400" },
    { code: "412", name: "마늘", category: "400" },
    { code: "414", name: "대파", category: "400" },
    { code: "511", name: "고추", category: "400" }, // 풋고추 등은 400
    { code: "512", name: "오이", category: "400" },
    { code: "513", name: "토마토", category: "400" },
    { code: "611", name: "사과", category: "600" },
    { code: "612", name: "배", category: "600" },
    { code: "911", name: "소고기", category: "900" },
    { code: "912", name: "돼지고기", category: "900" },
    { code: "913", name: "닭고기", category: "900" },
    { code: "914", name: "계란", category: "900" },
]

export interface MarketPrice {
    itemName: string
    unit: string
    price: number
    direction: 'up' | 'down' | 'same'
    changePercent: number
    date: string
}

const PROXY_URL = "https://cors-anywhere.herokuapp.com/" // Fallback for local dev if needed, but client-side fetch might have CORS
const BASE_URL = "http://www.kamis.or.kr/service/price/xml.do"

export async function fetchMarketPrice(itemCode: string, categoryCode: string): Promise<MarketPrice | null> {
    const apiKey = localStorage.getItem("KAMIS_API_KEY")
    const userId = localStorage.getItem("KAMIS_USER_ID")

    if (!apiKey || !userId) {
        console.warn("KAMIS API credentials missing in localStorage")
        return null
    }

    try {
        const today = new Date().toISOString().split('T')[0]
        const params = new URLSearchParams({
            action: "dailyPriceByCategoryList", // 일별 부류별 도·소매 가격정보
            p_product_cls_code: "01", // 01: 소매, 02: 도매
            p_item_category_code: categoryCode,
            p_regday: today,
            p_convert_kg_yn: "Y",
            p_cert_key: apiKey,
            p_cert_id: userId,
            p_returntype: "json"
        })

        const response = await fetch(`${BASE_URL}?${params.toString()}`)
        if (!response.ok) throw new Error("KAMIS Network response was not ok")

        const data = await response.json()

        // KAMIS response structure can be complex
        // data.data.item array contains the prices
        const items = data?.data?.item
        if (!items || !Array.isArray(items)) return null

        const item = items.find((it: any) => it.item_code === itemCode)
        if (!item) return null

        // Price parsing (KAMIS uses commas in strings)
        const currentPrice = parseInt(item.dpr1?.replace(/,/g, '') || "0")
        const prevPrice = parseInt(item.dpr2?.replace(/,/g, '') || "0")

        let direction: 'up' | 'down' | 'same' = 'same'
        let changePercent = 0

        if (prevPrice > 0) {
            changePercent = ((currentPrice - prevPrice) / prevPrice) * 100
            if (currentPrice > prevPrice) direction = 'up'
            else if (currentPrice < prevPrice) direction = 'down'
        }

        return {
            itemName: item.item_name,
            unit: item.unit,
            price: currentPrice,
            direction,
            changePercent: Math.abs(Math.round(changePercent * 10) / 10),
            date: today
        }
    } catch (error) {
        console.error("KAMIS Fetch Error:", error)
        return null
    }
}
