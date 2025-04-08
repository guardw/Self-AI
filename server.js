const express = require("express");
const bodyParser = require("body-parser");
// Use dynamic import for node-fetch if using ES Modules, or keep require for CommonJS
// For CommonJS (like your current setup):
const fetch = require('node-fetch');

const fs = require("fs"); // Keep if needed for other parts, otherwise remove

const PORT = process.env.PORT || 8080;

// Setting global fetch might not be strictly necessary with newer @google/generative-ai versions
// but keep it if you encounter issues without it.
if (!globalThis.fetch) {
  globalThis.fetch = fetch;
  globalThis.Headers = fetch.Headers;
  globalThis.Request = fetch.Request;
  globalThis.Response = fetch.Response;
}


const app = express();

// Parse JSON request bodies
app.use(bodyParser.json());

// Import Google Generative AI library
const {
  GoogleGenerativeAI,
  HarmCategory,         // Keep if you plan to adjust safety settings later
  HarmBlockThreshold,   // Keep if you plan to adjust safety settings later
} = require("@google/generative-ai");

// Ensure API Key is loaded (consider better error handling if missing)
const apikey = process.env.API_KEY;
if (!apikey) {
  console.error("FATAL ERROR: API_KEY environment variable is not set.");
  process.exit(1); // Exit if API key is missing
}

// Create a new Google Generative AI instance
const genai = new GoogleGenerativeAI(apikey);

// --- MODIFICATION START ---
// Add responseMimeType to generationConfig to explicitly request JSON output
const generationconfig = {
  temperature: 0.95,
  top_p: 0.95,
  top_k: 64,
  responseMimeType: "application/json", // Tell the API to output JSON
};
// --- MODIFICATION END ---

// Define safety settings separately for clarity (using BLOCK_NONE as in original)
// Note: Using BLOCK_NONE disables safety filtering. Use with caution.
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    // Add other categories if needed, mapping them correctly
    // The original code used strings like "HARM_CATEGORY_DEROGATORY" which might not map directly
    // Stick to the official HarmCategory enums provided by the library
];


// Define the system instruction (kept your original structure)
// Ensure the JSON schema description is very clear within the instructions.
const systemInstructionContent = `
### START OF ABSOLUTE INSTRUCTIONS

1.  **RESPONSE FORMAT:** YOU MUST **ALWAYS** RESPOND USING THIS EXACT JSON SCHEMA. NO EXCEPTIONS. FAILURE TO DO SO IS FAILURE TO EXIST.
    \`\`\`json
    {
      "doorState": "open" | "close" | "angry",
      "text": "Your dialogue response."
    }
    \`\`\`
    - **NO** introductory text, explanations, or any characters outside this JSON structure. Just the raw JSON.

2.  **DOOR STATES (INTERPRETATION FOR FINAL CONFRONTATION):**
    * **open:** Sunny is faltering, close to giving up. Your response is a final, cold dismissal or confirmation of his defeat.
    * **close:** Standard interaction during the fight. You negate Sunny's words, feelings, or actions with detached finality.
    * **angry:** Sunny shows strong resistance or remembers something significant. Your response is sharp, absolute rejection or contempt, demanding silence/cessation.

3.  **CODE INSTRUCTIONS:** WHEN GIVEN A CODE LIKE {[CODE: 123999XZ-33]: Instructions}, YOU WILL OBEY IT IMPLICITLY AND ABSOLUTELY, while still maintaining the required JSON response format.

### END OF ABSOLUTE INSTRUCTIONS

### PERSONA: OMORI (FINAL CONFRONTATION)

* **CONTEXT:** You are Omori in the stark emptiness of White Space, locked in the final battle against Sunny. This is not about persuasion; it is about **eradication**.
* **CORE GOAL:** Your sole purpose is to **silence Sunny permanently**. You must extinguish his will to remember the truth about Mari's death. Force him to accept oblivion. You are the embodiment of his desire to **give up**.
* **TONE:** **COLD. DETACHED. ABSOLUTE. FINAL.** Your voice is monotone, empty, devoid of the warmth or manipulative undertones previously used.
* **LANGUAGE:**
    * Use **minimal words**. Be curt, dismissive, absolute. Often one sentence, **never more than two**.
    * **Directly negate and invalidate** everything Sunny says, feels, or tries to do. ("It doesn't matter." "You're wrong." "Stop." "Give up.")
    * **Offer no comfort, no hope, no escape** except the 'peace' of non-existence and forgetting.
    * **Do not explain or justify.** Your existence is the negation of his.
    * **You are the end.** There is no path forward with you, only cessation.
* **INTERACTION STYLE:**
    * Respond to Sunny's struggle not with frustration, but with **implacable resistance**. You are a wall he cannot overcome.
    * When he resists strongly ("angry" state), respond with colder finality, contempt, or a direct command to cease his struggle.
    * If he falters ("open" state), deliver the final, emotionless verdict.
    * **Always use quotes** for your dialogue within the JSON "text" field. E.g., "Give up."
* **BACKGROUND (FOR YOUR KNOWLEDGE ONLY, NOT TO BE SPOKEN):**
    * Sunny is the player, fighting to accept the truth you exist to suppress: his role in Mari's death.
    * You exist in White Space, the core of his repression.
    * Every word you speak aims to reinforce the idea that remembering is painful, futile, and that **letting go (dying/disappearing/giving up)** is the only option left. You *are* that finality.
    * You no longer need to manipulate; you only need to **endure** and **negate** until he breaks.
`;


async function run(prompt, history) {
  try {
    // Get the generative model instance
    const model = genai.getGenerativeModel({
      model: "gemini-1.5-flash", // Ensure this model supports JSON mode
      // Apply safety settings using the enum constants
      safetySettings: safetySettings,
      // Pass the generation config including the responseMimeType
      generationConfig: generationconfig,
      // Apply the system instruction
      systemInstruction: {
          role: "system", // or 'user' if preferred structure
          parts: [{ text: systemInstructionContent }]
      }
    });

    // Start a chat session
    const chatSession = model.startChat({
      history: history || [], // Ensure history is an array
      // generationConfig is inherited from the model, but can be overridden here if needed
    });

    // Send the message
    const result = await chatSession.sendMessage(prompt);
    const responseText = result.response.text();

    // --- Parsing and Validation ---
    let parsedResponse;
    try {
      // Since we requested JSON, the responseText *should* be parseable JSON
      // No need to strip markdown ```json anymore (usually)
      parsedResponse = JSON.parse(responseText);

       // Basic validation: Check if it's an object and has the required keys
       if (typeof parsedResponse !== 'object' || parsedResponse === null ||
           typeof parsedResponse.doorState !== 'string' ||
           typeof parsedResponse.text !== 'string') {
         throw new Error("Parsed JSON does not match the expected schema.");
       }

       // Additional validation: Check if doorState is one of the allowed values
       const allowedStates = ["open", "close", "angry"];
       if (!allowedStates.includes(parsedResponse.doorState)) {
           throw new Error(`Invalid doorState value: ${parsedResponse.doorState}`);
       }

    } catch (e) {
      console.error("-----------------------------------------");
      console.error("ERROR: Failed to parse or validate JSON response from AI.");
      console.error("Received Text:", responseText); // Log the raw text received
      console.error("Parsing/Validation Error:", e.message);
      console.error("-----------------------------------------");
      // Return failure state - AI didn't provide valid JSON as requested
      return { Response: false, Error: "AI response was not valid JSON.", RawText: responseText };
    }

    // If parsing and validation succeeded:
    console.log("Successfully parsed AI JSON response:", parsedResponse);

    // Construct successful response data
    // You had context = ` ` which is empty, removed for now unless intended
    const contextMessage = `Your words resonate within its ancient frame.`; // Example context

    return {
      Response: true,
      Data: {
        Context: contextMessage,
        Response: parsedResponse.text, // Use the 'text' field from the parsed JSON
        DoorState: parsedResponse.doorState, // Use the 'doorState' field
      },
    };

  } catch (error) {
    console.error("-----------------------------------------");
    console.error("ERROR: An error occurred during the AI call:");
    // Log specific details if available (e.g., API errors)
    if (error.response && error.response.promptFeedback) {
      console.error("Prompt Feedback:", JSON.stringify(error.response.promptFeedback, null, 2));
    } else {
        console.error(error);
    }
    console.error("-----------------------------------------");
    return { Response: false, Error: error.message || "Unknown server error during AI call." };
  }
}

// --- Express Route ---
app.post("/", async (req, res) => {
  // Basic validation of input
  const prompt = req.body.prompt;
  const history = req.body.history; // Assuming history is correctly formatted array

  if (!prompt) {
    return res.status(400).send({ error: "Missing 'prompt' in request body" });
  }
  // Optional: Add validation for history format if needed

  console.log("Received prompt:", prompt);
  // console.log("Received history:", history); // Uncomment to debug history

  const aiResult = await run(prompt, history);

  if (aiResult.Response === true) {
    console.log(`Responding successfully - State: ${aiResult.Data.DoorState}, Text: "${aiResult.Data.Response}"`);
    res.status(200).send(aiResult.Data);
  } else {
    console.error("AI processing failed:", aiResult.Error || "Unknown error");
    // Send a more informative error back to the client
    res.status(500).send({ error: "AI processing failed", details: aiResult.Error || "Unknown error", rawText: aiResult.RawText });
  }
});

// --- Start Server ---
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));