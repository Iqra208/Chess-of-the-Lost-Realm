import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", realm: "The Lost Realm", timestamp: Date.now() });
  });

  // Dynamic Character Commentary & Piece Voice
  app.post("/api/realm/commentary", async (req, res) => {
    try {
      const {
        characterName,
        characterRole,
        realmName,
        eventType,
        moveNotation,
        san,
        isPlayerTurn,
        playerColor,
        fen,
        moveHistory,
      } = req.body;

      const ai = getAI();
      if (!ai) {
        // Fallback procedural fantasy dialogue
        const fallbackLines: Record<string, string[]> = {
          move: [
            `"The winds of ${realmName || "Aetheria"} shift with your steel."`,
            `"Every step on this enchanted board carves destiny."`,
            `"A calculated stride across the celestial grid."`,
            `"The runes hum beneath our boots as the lines align."`,
          ],
          capture: [
            `"By the ancient pact, their essence returns to stardust!"`,
            `"A devastating strike echoes through the mountain spires!"`,
            `"Blood and starlight clash on the obsidian tiles!"`,
            `"Their banner falls, but the war for the realm continues!"`,
          ],
          check: [
            `"Yield, sovereign! The blade of destiny touches your throat!"`,
            `"The celestial crown falters under siege!"`,
            `"A dire omen! The King is surrounded by ethereal flames!"`,
          ],
          checkmate: [
            `"The realm bows to the Final Grandmaster! Eternal balance is sealed!"`,
            `"The throne crumbles into legend! Checkmate across all dimensions!"`,
          ],
          pawn_ascend: [
            `"From humble soldier to radiant Champion of Light! Ascend!"`,
            `"The forgotten prophecy awakens in this valiant soul!"`,
          ],
        };
        const list = fallbackLines[eventType] || fallbackLines.move;
        const line = list[Math.floor(Math.random() * list.length)];
        return res.json({
          dialogue: line,
          loreWhisper: `The ancient spirits of ${realmName || "the Lost Realm"} acknowledge this gambit.`,
          tacticalSentiment: isPlayerTurn ? "confident" : "challenging",
        });
      }

      const prompt = `You are writing dramatic, cinematic, immersive in-game dialogue for an epic 3D fantasy chess game called "Chess of the Lost Realm".
Speaker: ${characterName || "The Ethereal Arbiter"} (Role: ${characterRole || "Guardian of the Board"}).
Current Realm: ${realmName || "Floating Aetheria"}.
Event: ${eventType} (Move: ${san || moveNotation || "stride"}, Player Turn: ${isPlayerTurn ? "Player" : "Opponent"}).
Recent Board state FEN: ${fen || "in-progress"}.

Generate a short, poetic, immersive fantasy in-character line (1 to 2 sentences max) spoken with passion, mythic wonder, or tactical wit. Keep it atmospheric and game-focused.
Also return a 1-sentence "whisper" representing the thoughts of the ancient realm.

Format output as valid JSON:
{
  "dialogue": "...",
  "loreWhisper": "...",
  "tacticalSentiment": "confident" | "defensive" | "aggressive" | "intrigued" | "solemn"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.85,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({
        dialogue: parsed.dialogue || `"The runes of ${realmName} tremble at your decision."`,
        loreWhisper: parsed.loreWhisper || "An unseen destiny draws nearer.",
        tacticalSentiment: parsed.tacticalSentiment || "intrigued",
      });
    } catch (err: any) {
      console.error("Commentary API error:", err);
      res.json({
        dialogue: `"The celestial board shimmers with arcane tension."`,
        loreWhisper: "Ancient power courses through every square.",
        tacticalSentiment: "intrigued",
      });
    }
  });

  // Grandmaster Oracle - Tactical Wisdom & Alternate Futures
  app.post("/api/realm/oracle", async (req, res) => {
    try {
      const { fen, moveHistory, evaluation, playerColor, question } = req.body;
      const ai = getAI();
      if (!ai) {
        return res.json({
          oracleTitle: "Whisper of the Ethereal Sage",
          tacticalAdvice: "Control the celestial nexus (d4/d5/e4/e5). Let your Knights claim outpost ridges and keep your King safely fortified behind runic stone.",
          alternateFuture: "If you push the f-file pawn recklessly, shadow drakes will breach your kingside ward.",
          ratingEvaluation: evaluation || "+0.3 (Even Starlight)",
        });
      }

      const prompt = `You are the Ancient Grandmaster Oracle of the Lost Chess Realm.
FEN: ${fen}
Moves played: ${moveHistory ? moveHistory.slice(-8).join(" ") : "Opening"}
Player Color: ${playerColor || "White"}
Player's inquiry: ${question || "What does the cosmic board reveal?"}

Provide sage tactical chess wisdom wrapped in high fantasy mythos. Include:
1. oracleTitle (Poetic title like 'Vision of the Frost Spires')
2. tacticalAdvice (Accurate chess concept + fantasy metaphor, 2 sentences)
3. alternateFuture (A warning or vision of what could happen in 2-3 moves)
4. ratingEvaluation (e.g. "+1.4 White holds the high crystal ground")

Respond in JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err) {
      res.json({
        oracleTitle: "Prophecy of the Runestone",
        tacticalAdvice: "Harmonize your pieces like an ancient chorus. Central domination grants mobility across all dimensional ranks.",
        alternateFuture: "A sudden diagonal thrust may shatter the opposing shield.",
        ratingEvaluation: "+0.5 Starlight favors the bold",
      });
    }
  });

  // Story Chronicles Ending Generator
  app.post("/api/realm/story-ending", async (req, res) => {
    try {
      const {
        outcome,
        totalMoves,
        capturesCount,
        heroicAscensions,
        chosenPath, // 'compassion', 'dominion', 'sacrifice', 'ascension'
        realmHistory,
      } = req.body;

      const ai = getAI();
      if (!ai) {
        return res.json({
          endingTitle: outcome === "win" ? "The Restoration of Aetheria" : "The Shadow Eclipse",
          epilogue: `As the final piece settled onto the mountain dais, the rift between Light and Shadow sealed. The legendary chessboard dissolved into glowing dust, leaving you in the quiet castle halls—holding a single golden pawn, forever marked with the crest of the Final Grandmaster.`,
          moralLesson: "Every grandmaster knows that victory is not in the pieces captured, but in the harmony left in one's wake.",
          unlockedTitle: "Keeper of the Enchanted Board",
        });
      }

      const prompt = `Write a cinematic, emotional, dreamlike fantasy epilogue for "Chess of the Lost Realm".
Outcome: ${outcome} (Player ${outcome === "win" ? "Won" : "Was Defeated"})
Moves: ${totalMoves}
Total Captures: ${capturesCount}
Pawns Ascended: ${heroicAscensions}
Chosen Path: ${chosenPath || "Balance of Starlight"}

Create an evocative conclusion. The story reveals that the magical realm was experienced through an enchanted chessboard in an ancient castle, yet the memories and emotional transformation are completely real. The player is free to step back into reality or return whenever they touch the carved king.

Return JSON:
{
  "endingTitle": "...",
  "epilogue": "...",
  "moralLesson": "...",
  "unlockedTitle": "..."
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.8,
        },
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (err) {
      res.json({
        endingTitle: "The Sovereign Dawn",
        epilogue: "The chessboard gently pulsed with starlight before fading to polished wood. You awaken back in the quiet castle, knowing the Lost Realm is at peace.",
        moralLesson: "True mastery sees the board not as a battlefield, but as a bridge between souls.",
        unlockedTitle: "Eternal Grandmaster",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lost Realm Chess server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
