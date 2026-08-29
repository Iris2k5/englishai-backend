import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { spawn } from "child_process";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const MODEL_PATH =
    process.env.MODEL_PATH ||
    "/models/englishai-qwen-Q4_K_M.gguf";

const LLAMA_SERVER =
    process.env.LLAMA_SERVER ||
    "llama-server";

let llamaProcess = null;
let llamaReady = false;

/*
 * Start llama.cpp
 */
function startLlamaServer() {

    console.log("Starting llama.cpp...");
    console.log("Model:", MODEL_PATH);

    llamaProcess = spawn(LLAMA_SERVER, [
        "-m",
        MODEL_PATH,

        "--host",
        "127.0.0.1",

        "--port",
        "8080",

        "-c",
        "2048",

        "-ngl",
        "0"
    ]);

    llamaProcess.stdout.on("data", (data) => {

        const output = data.toString();

        console.log("[llama]", output);

        if (
            output.includes("server is listening") ||
            output.includes("HTTP server listening")
        ) {
            llamaReady = true;
            console.log("AI model is ready!");
        }
    });

    llamaProcess.stderr.on("data", (data) => {

        console.log("[llama]", data.toString());
    });

    llamaProcess.on("error", (error) => {

        console.error("Failed to start llama-server:");
        console.error(error);
    });

    llamaProcess.on("exit", (code) => {

        console.log(
            `llama-server exited with code ${code}`
        );

        llamaReady = false;
    });
}


/*
 * Health check
 */
app.get("/", (req, res) => {

    res.json({
        message: "EnglishAI AI Backend is running!",
        model: "EnglishAI-Qwen-1.5B-Q4_K_M",
        llamaReady
    });
});


/*
 * AI status
 */
app.get("/api/status", async (req, res) => {

    try {

        const response = await fetch(
            "http://127.0.0.1:8080/health"
        );

        const data = await response.json();

        res.json({
            online: true,
            model: "EnglishAI-Qwen-1.5B-Q4_K_M",
            llamaReady,
            llama: data
        });

    } catch (error) {

        res.json({
            online: false,
            model: "EnglishAI-Qwen-1.5B-Q4_K_M",
            llamaReady: false
        });
    }
});


/*
 * EnglishAI chat
 */
app.post("/api/chat", async (req, res) => {

    try {

        const { message } = req.body;

        console.log("User message:", message);

        if (!message || message.trim() === "") {

            return res.status(400).json({
                error: "Message is required"
            });
        }

        const systemPrompt = `
You are EnglishAI, an English tutor for Vietnamese students.

Return ONLY valid JSON.

Required format:

{
  "reply": "",
  "correction": "",
  "explanation": "",
  "grammarScore": 0,
  "vocabularyScore": 0,
  "fluencyScore": 0
}

Rules:

- Explain mistakes in Vietnamese.
- Correct the user's English.
- Scores must be numbers from 0 to 100.
- Do not use Markdown.
- Do not use code blocks.
- Return JSON only.
`;

        const prompt = `${systemPrompt}

User:
${message}

EnglishAI:
`;

        const response = await fetch(
            "http://127.0.0.1:8080/completion",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    prompt: prompt,
                    n_predict: 256,
                    temperature: 0.2,
                    top_p: 0.9,
                    stop: ["</s>"]
                })
            }
        );

        if (!response.ok) {

            const errorText = await response.text();

            console.error(
                "llama-server error:",
                errorText
            );

            return res.status(500).json({
                error: "AI inference failed"
            });
        }

        const data = await response.json();

        const rawText =
            data.content ||
            data.response ||
            "";

        console.log("AI raw response:");
        console.log(rawText);

        /*
         * Remove accidental Markdown code blocks
         */
        const cleanedText = rawText
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        /*
         * Find JSON if model adds extra text
         */
        const start = cleanedText.indexOf("{");
        const end = cleanedText.lastIndexOf("}");

        if (start === -1 || end === -1) {

            return res.status(500).json({
                error: "AI returned invalid JSON",
                raw: cleanedText
            });
        }

        const jsonText =
            cleanedText.substring(
                start,
                end + 1
            );

        const result = JSON.parse(jsonText);

        res.json({

            reply: result.reply || "",

            correction:
                result.correction || "",

            explanation:
                result.explanation || "",

            grammarScore:
                Number(result.grammarScore) || 0,

            vocabularyScore:
                Number(result.vocabularyScore) || 0,

            fluencyScore:
                Number(result.fluencyScore) || 0

        });

    } catch (error) {

        console.error(
            "========== AI ERROR =========="
        );

        console.error(error);

        console.error(
            "=============================="
        );

        res.status(500).json({
            error:
                error.message ||
                "AI service error"
        });
    }
});


/*
 * Start HTTP server
 */
app.listen(PORT, () => {

    console.log(
        `EnglishAI backend running on port ${PORT}`
    );

    startLlamaServer();
});
