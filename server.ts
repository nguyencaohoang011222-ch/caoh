import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini SDK on server-side
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Interface for Gemini response item
export interface VocabItemRaw {
  word: string;
  partOfSpeech: string;
  ipa: string;
  nghiaChinh: string;
  nghiaPhu?: string;
  dongNghia?: string;
  traiNghia?: string;
  tuLoaiKhac?: string;
  gioiTu?: string;
  collocations?: string;
  viDu: string[];
}

// API endpoint to generate vocabulary details
app.post("/api/generate-vocab", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not configured.",
      });
    }

    const { words } = req.body as { words: string[] };

    if (!words || !Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: "Please provide a non-empty list of words." });
    }

    // Clean and filter input words
    const cleanedWords = words
      .map((w) => w.trim())
      .filter((w) => w.length > 0)
      .slice(0, 100); // Limit max 100 words per request

    if (cleanedWords.length === 0) {
      return res.status(400).json({ error: "No valid words found in input." });
    }

    // Process in batches of up to 10 words for high quality and speed
    const BATCH_SIZE = 10;
    const batches: string[][] = [];
    for (let i = 0; i < cleanedWords.length; i += BATCH_SIZE) {
      batches.push(cleanedWords.slice(i, i + BATCH_SIZE));
    }

    const results: VocabItemRaw[] = [];

    for (const batch of batches) {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Generate vocabulary information in Vietnamese and English for the following English words/phrases:
${batch.join(", ")}

Requirements for each word:
- word: the English word/phrase provided (e.g., "agitated")
- partOfSpeech: part of speech abbreviation in English e.g., "adj", "v", "n", "adv", "phr v"
- ipa: IPA pronunciation wrapped in slashes e.g., "/'ædʒ.ɪ.teɪ.tɪd/"
- nghiaChinh: main Vietnamese meaning e.g., "lo lắng, bất an"
- nghiaPhu: secondary Vietnamese meaning if any e.g., "kích động" (or empty string "")
- dongNghia: English synonyms e.g., "anxious, upset, disturbed" (or empty string "")
- traiNghia: English antonyms e.g., "calm, composed" (or empty string "")
- tuLoaiKhac: other word forms in the family e.g., "agitate (v), agitation (n)" (or empty string "")
- gioiTu: associated prepositions e.g., "agitated about" (or empty string "")
- collocations: natural English collocations e.g., "become agitated, visibly agitated" (or empty string "")
- viDu: array of 2 natural example sentences in English showing clear usage.
`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                partOfSpeech: { type: Type.STRING },
                ipa: { type: Type.STRING },
                nghiaChinh: { type: Type.STRING },
                nghiaPhu: { type: Type.STRING },
                dongNghia: { type: Type.STRING },
                traiNghia: { type: Type.STRING },
                tuLoaiKhac: { type: Type.STRING },
                gioiTu: { type: Type.STRING },
                collocations: { type: Type.STRING },
                viDu: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["word", "partOfSpeech", "ipa", "nghiaChinh", "viDu"],
            },
          },
        },
      });

      if (response.text) {
        try {
          const parsed = JSON.parse(response.text.trim()) as VocabItemRaw[];
          results.push(...parsed);
        } catch (e) {
          console.error("Failed to parse JSON response for batch:", response.text, e);
        }
      }
    }

    return res.json({ items: results });
  } catch (error: any) {
    console.error("Error generating vocab:", error);
    return res.status(500).json({ error: error?.message || "Server error while processing vocabulary." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
