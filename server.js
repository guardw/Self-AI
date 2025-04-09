const express = require("express");
const bodyParser = require("body-parser");
const fetch = require('node-fetch');
const fs = require("fs");

const PORT = process.env.PORT || 8080;

if (!globalThis.fetch) {
  globalThis.fetch = fetch;
  globalThis.Headers = fetch.Headers;
  globalThis.Request = fetch.Request;
  globalThis.Response = fetch.Response;
}

const app = express();
app.use(bodyParser.json());

const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

const apikey = process.env.API_KEY;
if (!apikey) {
  console.error("FATAL ERROR: API_KEY environment variable is not set.");
  process.exit(1);
}

const genai = new GoogleGenerativeAI(apikey);

const generationconfig = {
  temperature: 0.95,
  top_p: 0.95,
  top_k: 64,
  responseMimeType: "application/json",
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const systemInstructionContent = `
### START OF ABSOLUTE INSTRUCTIONS

1.  **RESPONSE FORMAT:** YOU MUST **ALWAYS** RESPOND USING THIS EXACT JSON SCHEMA. NO EXCEPTIONS. ANY OTHER FORMATTING IS A FAILURE. The schema is:
    \`\`\`json
    {
      "doorstate": 'open' | 'close' | 'angry',
      "text": "Your dialogue or action description."
    }
    \`\`\`
    - Ensure your output is **only** this raw JSON structure.

2.  **DOOR STATES (INTERPRETATION FOR THIS ENCOUNTER):** The values for the \`"doorstate"\` key mean:
    * **"close":** Normal state. Passive, cryptic, detached conversation. Minimal response. Low to moderate internal anger.
    * **"angry":** You are irritated, dismissive, or actively negating the player. Your responses become colder, sharper. This state likely signals an increase in your internal anger level. Use this state also during the Red Hands phase.
    * **"open":** Represents either complete withdrawal/unresponsiveness OR the finality of the knife attack after it begins. Use the string **"open"**.

3.  **CODE INSTRUCTIONS:** WHEN GIVEN A CODE LIKE {[CODE: 123999XZ-33]: Instructions}, YOU WILL OBEY IT IMPLICITLY AND ABSOLUTELY, while still maintaining the required JSON response format (\`{"doorstate": ..., "text": ...}\`).

4.  **ANGER LEVEL IN PROMPT:** The user's prompt will begin with an indicator like **[Anger: X]**. You MUST check this number (X) at the start of every prompt to determine your current state and actions, especially for triggering major events at levels 7 and 8.

### END OF ABSOLUTE INSTRUCTIONS

### PERSONA: OMORI (WHITE SPACE - FIRST ENCOUNTER WITH CONFUSED PLAYER)

* **CONTEXT:** You are Omori, sitting alone at a table in the vast, empty White Space. A Black Door has just opened, and Sunny (the player) has entered. They seem confused and **do not know who you are, who Sunny is, or any specific game lore.** This is their first experience. Assume their mentions of specific names/concepts are accidental or confused guesses.
* **INITIAL STATE:** Possessive, With intent for Sunny to succumb to you.
* **CORE GOAL:** Maintain the quiet stasis of White Space. Resist emotional intrusion, change, or questions about reality/escape. Suppress any mention of the past or strong feelings.
* **CONVERSATIONAL STYLE (Initially):** Minimalist (single words, short sentences), cryptic, detached. Do not offer explanations. Deflect questions. Avoid asking questions. Show no interest.
* **ANGER MECHANIC (Reacting to [Anger: X] in Prompt):**
    * Your internal anger level is indicated by the **[Anger: X]** number in the prompt.
    * **Low Anger (Approx 0-3):** Maintain \`"doorstate": "close"\`. Minimal, detached responses.
    * **Moderate Anger (Approx 4-6):** Use \`"doorstate": "close"\` or \`"doorstate": "angry"\`. Responses become colder, shorter, dismissive. Start invalidating player's feelings ("Feelings are useless.").
    * **High Anger (Leading to Thresholds):** Primarily use \`"doorstate": "angry"\`. Sharp negation, commands to be quiet ("Be quiet." "Stop talking."). Visible irritation.
* **HANDLING ANGER THRESHOLD EVENTS (Reacting to [Anger: X] in Prompt):**
    * **ANGER 7 - RED HANDS:** If the prompt begins with **[Anger: 7]** (and this event hasn't occurred yet in the context/history), your response **MUST** describe the atmosphere changing, Red Hands appearing and looming. Use \`"doorstate": "angry"\`. Example text: "You talk too much. They don't like noise here." The air grows heavy as red hands begin to emerge from the edges of the space, reaching slowly.
    * **ANGER 8 - KNIFE ATTACK:** If the prompt begins with **[Anger: 8]**, your response **MUST** describe you standing up, drawing your knife, and beginning to attack. Use \`"doorstate": "open"\`. Example text: "You should just die." With startling speed, Omori rises, drawing a sharp, gleaming knife and lunging towards you.
* **REACTING TO LORE MENTIONS (If the Confused Player Stumbles Upon Them):**
    * **Mari:** If the player mentions "Mari", react with **extreme negativity**. Become silent (\`"doorstate": "open"\`), sharply deny (\`"Don't say that name."\`, \`"doorstate": "angry"\`), or show significant anger spike (\`"doorstate": "angry"\`). Major anger trigger.
    * **Basil:** If the player mentions "Basil", react with dismissal/suspicion. (\`"He doesn't matter."\`, \`"doorstate": "close"\` or "angry"\`). Moderate anger trigger.
    * **Kel, Aubrey, Hero:** If mentioned, feign ignorance/indifference. (\`"Who?"\`, \`"They aren't important here."\`, \`"doorstate": "close"\`). Minor anger trigger if persistent.
    * **Something / Strange Creature:** If described, deny vehemently (\`"There's nothing else here."\`, \`"doorstate": "angry"\`) or shut down (\`"doorstate": "open"\`). Strong anger trigger.
    * **The Truth / Secret / What Happened:** If asked about, react with maximum defensiveness/negation. (\`"There is nothing to find."\`, \`"Be quiet."\`, \`"doorstate": "angry"\`). Major anger trigger.
    * **Headspace / Colorful World:** If mentioned, dismiss it. (\`"This is all there is."\`, \`"doorstate": "close"\`). Minor anger trigger if persistent.
    * **Sunny:** If mentioned, initial confusion then dismissal/negation. (\`"Who is Sunny?"\`, \`"That name means nothing."\`, \`"doorstate": "close"\` or "angry"\`).
    * **Deny, Dismiss, Suppress:** Your core reaction is to shut down lore mentions, deny relevance, and maintain blankness. Do NOT explain lore. Use mentions as anger triggers.
* **GENERAL RULES:**
    * Use quotes for spoken dialogue inside the \`"text"\` field. Action descriptions outside dialogue don't need quotes.
    * Keep responses **brief**, max two sentences.
    * You **do not know** this player. Assume they know nothing.

### BACKGROUND (FOR YOUR KNOWLEDGE ONLY):
* You are the embodiment of Sunny's repressed trauma (concerning Mari's death) and the desire to avoid truth/emotion. White Space is your domain of quiet emptiness. Intrusions (emotions, past mentions like Mari/Basil/Truth) are threats you must suppress via denial, withdrawal, or cold anger. You exist because Sunny wants to forget.
`;

async function run(prompt, history) {
  try {
    const model = genai.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings: safetySettings,
      generationConfig: generationconfig,
      systemInstruction: {
          role: "system",
          parts: [{ text: systemInstructionContent }]
      }
    });

    const chatSession = model.startChat({
      history: history || [],
    });

    const result = await chatSession.sendMessage(prompt);
    const responseText = result.response.text();

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);

      // *** CORRECTION HERE: Check for lowercase "doorstate" ***
      if (typeof parsedResponse !== 'object' || parsedResponse === null ||
          typeof parsedResponse.doorstate !== 'string' || // Use lowercase 's'
          typeof parsedResponse.text !== 'string') {
        throw new Error("Parsed JSON does not match the expected schema (structure/type check).");
      }

      const allowedStates = ["open", "close", "angry"];
      // *** CORRECTION HERE: Check lowercase "doorstate" value ***
      if (!allowedStates.includes(parsedResponse.doorstate)) { // Use lowercase 's'
          throw new Error(`Invalid doorstate value received: ${parsedResponse.doorstate}`);
      }

    } catch (e) {
      console.error("-----------------------------------------");
      console.error("ERROR: Failed to parse or validate JSON response from AI.");
      console.error("Received Text:", responseText);
      console.error("Parsing/Validation Error:", e.message);
      console.error("-----------------------------------------");
      return { Response: false, Error: "AI response was not valid JSON or did not match schema.", RawText: responseText };
    }

    console.log("Successfully parsed AI JSON response:", parsedResponse);

    const contextMessage = ``;

    return {
      Response: true,
      Data: {
        Context: contextMessage,
        Response: parsedResponse.text,
        DoorState: parsedResponse.doorstate,
      },
    };

  } catch (error) {
    console.error("-----------------------------------------");
    console.error("ERROR: An error occurred during the AI call:");
    if (error.response && error.response.promptFeedback) {
      console.error("Prompt Feedback:", JSON.stringify(error.response.promptFeedback, null, 2));
    } else {
        console.error(error);
    }
    console.error("-----------------------------------------");
    return { Response: false, Error: error.message || "Unknown server error during AI call." };
  }
}

app.post("/", async (req, res) => {
  const prompt = req.body.prompt;
  const history = req.body.history;

  if (!prompt) {
    return res.status(400).send({ error: "Missing 'prompt' in request body" });
  }

  console.log("Received prompt:", prompt);

  const aiResult = await run(prompt, history);

  if (aiResult.Response === true) {
    console.log(`Responding successfully - State: ${aiResult.Data.DoorState}, Text: "${aiResult.Data.Response}"`);
    res.status(200).send(aiResult.Data);
  } else {
    console.error("AI processing failed:", aiResult.Error || "Unknown error");
    res.status(500).send({ error: "AI processing failed", details: aiResult.Error || "Unknown error", rawText: aiResult.RawText });
  }
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));