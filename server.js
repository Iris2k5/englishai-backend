import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.json({
        message: "EnglishAI Backend is running!"
    });
});

app.post("/api/chat", async (req, res) => {

    try {

        const { message } = req.body;

        console.log("User message:", message);

        if (!message || message.trim() === "") {
            return res.status(400).json({
                error: "Message is required"
            });
        }

        const response = await ai.models.generateContent({

            model: "gemini-3.6-flash",

            contents: message,

            config: {

                systemInstruction: `
You are an English tutor for Vietnamese students.

Return ONLY valid JSON.

Example:

{
  "reply": "Hello! Nice to meet you.",
  "correction": "I went to school yesterday.",
  "explanation": "Vì câu nói về quá khứ nên dùng went thay cho go.",
  "grammarScore": 70,
  "vocabularyScore": 80,
  "fluencyScore": 75
}

Rules:

- Do not use Markdown.
- Do not use \`\`\`json.
- Do not add any text before or after JSON.
- Scores must be numbers from 0 to 100.
`
            }
        });

        const rawText = response.text;

        console.log("RAW AI RESPONSE:");
        console.log(rawText);

        const cleanedText = rawText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        const result = JSON.parse(cleanedText);

        res.json({
            reply: result.reply || "",
            correction: result.correction || "",
            explanation: result.explanation || "",
            grammarScore: Number(result.grammarScore) || 0,
            vocabularyScore: Number(result.vocabularyScore) || 0,
            fluencyScore: Number(result.fluencyScore) || 0
        });

    } catch (error) {

        console.error("========== AI ERROR ==========");
        console.error(error);
        console.error("==============================");

        res.status(500).json({
            error: error.message || "AI service error"
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Server running on port ${PORT}`
    );
});