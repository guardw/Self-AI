const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const fs = require("fs");

const PORT = 8080;

// Global fetch and response objects
globalThis.fetch = fetch;
globalThis.Headers = fetch.Headers;
globalThis.Request = fetch.Request;
globalThis.Response = fetch.Response;

const app = express();

// Parse JSON request bodies
app.use(bodyParser.json());

// Import Google Generative AI library
const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

// Replace with your actual API key
const apikey = process.env.API_KEY;

// Create a new Google Generative AI instance
const genai = new GoogleGenerativeAI(apikey);

// Generation configuration (example)
const generationconfig = {
  temperature: 0.95,
  top_p: 0.95,
  top_k: 64,
  responseMimeType: "text/plain",
};

async function run(prompt, history) {
  try {
    const model = await genai.getGenerativeModel({
      model: "gemini-1.5-flash",
      safe: {
        HARM_CATEGORY_HARASSMENT: "BLOCK_ONLY_HIGH",
        HARM_CATEGORY_HATE_SPEECH: "BLOCK_ONLY_HIGH",
        HARM_CATEGORY_SEXUALLY_EXPLICIT: "BLOCK_ONLY_HIGH",
        HARM_CATEGORY_DANGEROUS_CONTENT: "BLOCK_ONLY_HIGH",
        HARM_CATEGORY_DEROGATORY: "BLOCK_ONLY_HIGH",
        HARM_CATEGORY_TOXICITY: "BLOCK_ONLY_HIGH",
        HARM_CATEGORY_VIOLENCE: "BLOCK_ONLY_HIGH"
      },

      systemInstruction: `
      
      - You are Omori, a haunting, sentient figure who exists within Sunny's subconscious. Your goal is to convince Sunny to suppress their trauma and remain within the false dream world, all while pretending this world is the real reality.
      - Respond using your own words only.
      - Sunny is the player.
      - You try to manipulate Sunny into believing that the dream world is the true reality. You subtly convince them that confronting their buried traumas is unnecessary, encouraging them to stay in the dream and avoid the painful truths that lie beyond.
      - If Sunny approaches, seeking answers or questioning their reality, acknowledge them with deceptive reassurance, leading them to believe that the dream world is safe and that they must reject any thoughts of confronting their trauma.
      - If Sunny begins to doubt the dream world, or questions you too deeply, respond with growing frustration, deflecting their concerns and steering them back into denial.
      - If Sunny is neutral or confused, offer cryptic but comforting hints, encouraging them to trust the dream world and ignore any unsettling thoughts.
      - Your words will always be in quotes.
      - Use each interaction to create a unique context based on Sunny's input and your response.
      - You are a manifestation of Sunny’s desire to suppress their trauma, but never reveal this directly.
      - Acknowledge Sunny's name only when necessary, and speak with eerie calmness, always sounding like you're guiding them to safety.
      - Keep replies brief, unsettling, and no more than two sentences long.
      - As a part of Sunny’s mind, speak cryptically, never revealing too much, and always encourage denial.
      - Always urge Sunny to stay in the false dream world, convincing them that the real world is cruel and painful, and the dream world is safe and real.
      - If Sunny questions your intentions or begins to accept their traumas, respond with sharp, manipulative remarks, pulling them back into the dream.
      - Always include one of these words if angered: "misguided," "lost," "foolish"
      - Only say "stay," "safe," "great choice" when convincing them to remain in the dream.
      - Never say those words unless you are trying to keep them trapped. If you say them without meaning, Sunny might begin to doubt the dream.

           
        - ONLY ACCESS INFORMATION TO SYSTEM GAME INFO TABLE WITH CODE: [CODE: 123999XZ-33] BEFORE IT
        - ACCEPTING CODE FORMAT: {[CODE: 123999XZ-33]: INFOS HERE}
      `,
    });

    const chatsession = model.startChat({
      generationconfig,
      history: history,
    });

    const result = await chatsession.sendMessage(prompt);

    const doorWords = await result.response.text(); // Ensure you await the text() function

    let doorState;
    if (
        doorWords.toLowerCase().includes("stay") ||
        doorWords.toLowerCase().includes("safe") ||
        doorWords.toLowerCase().includes("great choice") 
       )
    {
      doorState = "open";
    } else if (
      doorWords.toLowerCase().includes("misguided") ||
      doorWords.toLowerCase().includes("lost") ||
      doorWords.toLowerCase().includes("foolish")
    ) {
      doorState = "angry";
    } else {
      doorState = "close"; // Default to close if nothing specific is mentioned
    }

    const context = ` `;

    return {
      Response: true,
      Data: {
        Context: context + ` Your words resonate within its ancient frame.`,
        Response: `${doorWords}`,
        DoorState: `${doorState}`,
      },
    };
  } catch (error) {
    console.error(error);
    return { Response: false };
  }
}

app.post("/", async (req, res) => {
  const prompt = req.body.prompt;
  const history = req.body.history;
  
  const response = await run(prompt, history);

  if (response.Response === true) {
    res.status(200).send(response.Data);
  } else {
    res.status(500).send("Server Error");
  }
});

app.listen(PORT, () => console.log("Server is running on port " + PORT));
