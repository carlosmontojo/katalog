import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// --- Vision Analysis ---
export async function analyzeProductImage(imageUrl: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    try {
        // Fetch the image
        const imageResp = await fetch(imageUrl);
        const imageBuffer = await imageResp.arrayBuffer();

        const prompt = `
        Analyze this product image for a furniture/home decor catalog.
        Extract visual attributes in JSON format:
        {
            "color": "string (e.g. Navy Blue)",
            "material": "string (e.g. Velvet, Oak Wood)",
            "style": "string (e.g. Mid-century Modern, Minimalist)",
            "shape": "string (e.g. Rectangular, Round)",
            "visual_description": "string (short description of what is seen)"
        }
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: Buffer.from(imageBuffer).toString("base64"),
                    mimeType: imageResp.headers.get("content-type") || "image/jpeg",
                },
            },
        ]);

        const text = result.response.text();
        return cleanJson(text);
    } catch (error) {
        console.error("Vision Analysis Error:", error);
        return {}; // Fail gracefully
    }
}

// --- Text/Agentic Analysis ---
export async function categorizeProduct(title: string, description: string, context: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro", generationConfig: { responseMimeType: "application/json" } });

    const prompt = `
    Categorize this product based on the following info:
    Title: ${title}
    Description: ${description}
    Context: ${context.slice(0, 500)}

    Return JSON:
    {
        "category": "string (Main category, e.g. Sofas)",
        "subcategory": "string (Specific type, e.g. Sectional Sofa)",
        "keywords": ["string", "string"],
        "is_product": boolean (true if this is definitely a sellable product, false if it's a part/accessory or garbage)
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (error) {
        console.error("Categorization Error:", error);
        return { category: "Uncategorized", is_product: true };
    }
}

// Helper to clean markdown code blocks if Gemini returns them despite JSON mode
function cleanJson(text: string) {
    try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch {
        return {};
    }
}
