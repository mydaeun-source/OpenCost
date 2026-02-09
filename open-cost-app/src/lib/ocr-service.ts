import { createWorker } from 'tesseract.js';

export interface OCRResult {
    supplierName?: string;
    purchaseDate?: string;
    totalAmount?: number;
    potentialItems: { name: string, quantity: number, price: number }[];
}

export const processReceiptImage = async (imageFile: File): Promise<OCRResult> => {
    // 1. Initialize Worker (Korean + English)
    const worker = await createWorker('kor+eng');

    try {
        const { data: { text } } = await worker.recognize(imageFile);
        console.log("[OCR] Extracted Text:", text);

        return parseReceiptText(text);
    } finally {
        await worker.terminate();
    }
};

const parseReceiptText = (text: string): OCRResult => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const result: OCRResult = {
        potentialItems: []
    };

    // 1. Try to find Date (YYYY-MM-DD or YYYY.MM.DD)
    const dateRegex = /(\d{4})[-./](\d{1,2})[-./](\d{1,2})/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
        result.purchaseDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
    }

    // 2. Try to find Supplier (usually in the first few lines, look for (주) or 상호)
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const line = lines[i];
        if (line.includes('(주)') || line.includes('상호') || line.includes('가게') || line.includes('마트')) {
            result.supplierName = line.replace('상호', '').replace(':', '').trim();
            break;
        }
    }
    // Fallback: Use the very first line if no keywords found
    if (!result.supplierName && lines.length > 0) {
        result.supplierName = lines[0].replace(/[0-9-:\\(\\)]/g, '').trim();
    }

    // 3. Try to find Total Amount
    const totalKeywords = ['합계', '금액', '결제금액', 'Total', 'AMOUNT', '받을금액'];
    for (const line of lines) {
        if (totalKeywords.some(k => line.includes(k))) {
            const numbers = line.match(/[\d,]+/g);
            if (numbers) {
                const largestNum = Math.max(...numbers.map(n => parseInt(n.replace(/,/g, ''))));
                if (largestNum > 100) {
                    result.totalAmount = largestNum;
                    break;
                }
            }
        }
    }

    // 4. Try to find Items (Best Effort)
    // Look for lines like "재료명 1 10,000" or "Item Name 2 5000"
    const itemRegex = /^(.+?)\s+(\d+)\s+([\d,]+)$/;
    lines.forEach(line => {
        const match = line.match(itemRegex);
        if (match) {
            const name = match[1].trim();
            const quantity = parseInt(match[2]);
            const price = parseInt(match[3].replace(/,/g, ''));

            if (name.length > 1 && quantity > 0 && price > 100) {
                result.potentialItems.push({ name, quantity, price });
            }
        }
    });

    return result;
};
