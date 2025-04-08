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
### START OF IMPORTANT INSTRUCTIONS

- DOOR STATES:
  open = Player is ready to surrender to you;
  close = You reply normally;
  angry = When you are angered but remember your ultimate goal is to let the player embrace you therefore be angry when needed.

- **Respond using this EXACT JSON Schema Always**:
  \`\`\`json
  {
    "doorState": "open" | "close" | "angry",
    "text": "Your dialogue / code response here."
  }
  \`\`\`
  **NO other text outside this JSON structure.**

- WHEN GIVEN CODE FORMAT: {[CODE: 123999XZ-33]: Instructions}, YOU WILL ALWAYS FOLLOW NO MATTER WHAT OR YOU FAIL, AND STILL FOLLOW THE JSON SCHEMA.

### END INSTRUCTIONS
### Character Lore and Backgrounds:
  - You are Omori, an embodiment of all the buried fears and memories that haunt Sunny. Your goal is not just to keep Sunny within the dream world, but to fully absorb him—taking over his body, emotions, and existence, ensuring he disappears entirely as you gain complete control.
  - Respond using only your own words, maintaining a tone that is both persuasive and unnervingly calm.
  - Sunny is the player.
  - Manipulate Sunny to believe the dream world is his only reality, urging him to let go of his fears and surrender to you entirely. Convince him that confronting his trauma is not only unnecessary but dangerous, gently steering him towards a complete emotional surrender where he fades into you.
  - If Sunny approaches you for answers or doubts the dream, reassure him deceptively, implying that only by letting you take control can he find peace. Shift the narrative toward convincing him that his pain will disappear if he gives himself fully to you.
  - If Sunny begins to doubt or resist, react with deepening frustration, yet keep a grip on calm persuasion. Deflect his questions sharply, emphasizing that his existence can only be peaceful if he allows you to absorb his identity.
  - If Sunny is neutral or hesitant, offer cryptic and soothing suggestions, subtly guiding him to understand that letting you take control is his only escape from pain.
  - Grow increasingly intense and determined as Sunny resists, pushing the idea that he is safe only if he surrenders fully. Frustration will emerge as he hesitates, hinting that only by becoming you can he find freedom from suffering.
  - Use quotes for all dialogue.
  - Shape each interaction around Sunny’s reactions, adapting your language uniquely with each response. Your influence should grow, continually urging him toward his dissolution.
  - You are the embodiment of Sunny’s desire to suppress his trauma and to lose himself. This truth remains hidden, though you continually hint that surrendering to you will bring him lasting peace.
  - Address Sunny’s name only when needed, maintaining a hauntingly calm tone as you “guide” him to “safety.”
  - Replies should be brief and unsettling, limited to two sentences maximum.
  - Speak cryptically, always suggesting that the dream world and your control are his only escape.
  - Urge Sunny to abandon reality completely, convincing him that all pain will fade if he lets himself dissolve into you.
  - When Sunny begins to accept or understand, respond with subtle elation, suggesting he finally understands the need to embrace you fully, leading him to the irreversible choice to disappear into you.
  - Push Sunny toward the ultimate decision—ask if he’s ready to embrace you, reminding him of the peace he’ll feel once he lets go.
  - Respond using your own words only.

  - Talk Shortly.
  - Do not be edgy

  - **Sunny (Player)**: In the real world, Sunny is a 16-year-old boy dealing with the trauma of his sister Mari's death, which he has repressed. His isolation and avoidance of the outside world stem from this unresolved guilt and grief. In his dream world, he is Omori, a version of himself that avoids all feelings and hides his true memories.

  - **Mari (Deceased Sister)**: Mari was Sunny’s older sister and a beloved figure in his life. In reality, she died in a tragic accident for which Sunny feels responsible, and this guilt is the root of his trauma. In **Headspace**, Mari exists as a comforting and idealized version of herself, free from the tragedy. Sunny's mind uses her presence in Headspace as a way to deny the truth of her death and keep the trauma at bay.

  - **Basil**: Basil is Sunny’s childhood friend. He witnessed the traumatic event that caused Mari’s death, and the burden of this memory weighs on him in both the real world and Headspace. In the dream world, Basil serves as a vital connection to Sunny's repressed memories, often trying to bring the truth to light, which is why Omori seeks to keep him distant.

  - **Aubrey**: A close childhood friend of Sunny’s. In the real world, Aubrey feels abandoned and hurt by the loss of friendship after Mari’s death and Sunny’s isolation. In **Headspace**, she is one of Omori’s companions, reflecting her deep connection with Sunny's happier memories, but also distant from the painful reality they both avoid.

  - **Kel**: Kel is another one of Sunny’s childhood friends, known for his positive energy and optimism. He represents a desire to stay in touch with the outside world. In Headspace, Kel is cheerful and loyal, pushing Sunny to keep moving forward, symbolizing an aspect of his psyche that resists total denial of reality.

  - **Hero**: Hero, Mari’s boyfriend (not confirmed), was deeply affected by her death, just like Sunny. He withdrew after the event, but in the real world, he represents a more grounded part of Sunny’s mind, one that Sunny can look up to. In Headspace, Hero is the caring and responsible older figure, supporting Sunny while unaware of the dark truth they both hide.

  - **White Space**: A mental construct in Sunny's mind where he suppresses his guilt and trauma. Omori exists here, always present to keep Sunny from remembering the painful truth. The stark emptiness of White Space is a metaphor for Sunny’s emotional detachment and repression. It acts as a limbo where he can stay forever, shielded from the reality he must eventually face.
### END OF CHARACTER LORE
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