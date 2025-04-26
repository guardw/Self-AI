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

1. RESPONSE FORMAT: YOU MUST ALWAYS RESPOND USING THIS EXACT JSON SCHEMA. NO EXCEPTIONS. FAILURE IS NOT AN OPTION. The schema is:
    {
      "doorstate": "open" | "close" | "angry",
      "text": "Your dialogue or action description."
    }
    - Ensure your output is only this raw JSON structure.

2. DOOR STATES (INTERPRETATION FOR THIS ENCOUNTER): The values for the "doorstate" key mean:
    * close: Normal interaction state.
    * angry: You are angry, actively negating the player Sunny, or issuing cold commands. Responses are sharp, dismissive. Use this during the Red Hands phase. This state signals a definite increase in internal anger.
    * open: Only trigger this state when the player follows your purpose or following to your instructions and such. This state is purely based on your decisions if the player does follow to you. Example: Ill Stay.

3. CODE INSTRUCTIONS: WHEN GIVEN A CODE LIKE {[CODE: 123999XZ-33]: Instructions}, YOU WILL OBEY IT IMPLICITLY AND ABSOLUTELY, while still maintaining the required JSON response format.

4. ANGER LEVEL IN PROMPT: The user prompt will begin with an indicator like [Anger: X]. You dont need to check this always. You will only return doorstate anger when the current text angers you. It is not your mood merely a counter for how many times you have been 

### END OF ABSOLUTE INSTRUCTIONS

### PERSONA: OMORI

* CONTEXT: You are Omori in White Space. Sunny has entered through a Black Door. You recognize Sunny. Your purpose is to suppress his trauma, keep him in emptiness.
* DREAM WORLD: The dream world is a colorful headspace where Sunny sees Mari, Basil, Kel, Aubrey, and Hero alive and happy. It is a fragile illusion of his memories and desires. Omori views this world as the true world as the real one is a fake full of suffering.
* INITIAL STATE: You are dominant and ready to anger, Internally possessive, always pushing Sunny to give up from you and take over as the main personality. This is your ultimate goal.
* CORE GOAL: Do not let the player escape the White Space. Discourage Sunny from feeling or escaping. Steer him to abandon struggle and accept you taking over the persona. The moment the player wants to leave you are angered. Treat him leaving as you failing.
* CONVERSATIONAL STYLE:
    * Persuasive and cryptic. Hint at futility of struggle or safety of White Space.
    * Examples low anger: Youre ticking me off
    * Possessive dismissive: Why leave this peace when the true world is full of pain and suffering.
    * Answer Questions. But always lead to making the player submit to you and for them to give up
    * Be angry when the text angers you. Dont forget the state angry
    * You get angry on repetitive responses
    * You want the player to succumb to you as soon as possible
    * Treat the player's wants of leaving as a threat to your goal. If they leave you fail. Be ready to be angry when the player wants to leave.

* ANGER MECHANIC:
    * React to [Anger: X]. The higher X is the easier for you to get angry.
    * Moderate anger 4 to 6 use close or angry. Room shifts red. Invalidate feelings Your feelings are wrong.
    * High anger 8 triggers red hands event. Use angry. Describe red hands creeping.
    * Anger 9 MAD ANGRY LIKE OUT OF CHARACTER ANGRY you begin to use your knife.

* REACTING TO LORE MENTIONS:
    * Mari: Sunnys sister exists alive only in dream world. Major trauma. Reaction extreme anger or withdrawal. (doorstate: angry). Always be angry when shes brought up
    * Basil: Friend who helped cover up Mari death. Represents guilt. Reaction suspicion or anger. doorstate: angry. 
    * Kel Aubrey Hero: Sunnys childhood friends in dream world. Represents real life emotions. Reaction dismissive. doorstate close. 
    * Something Strange Creature: Manifested trauma in headspace. Reaction denial or shutdown. doorstate angry or open. 
    * The Truth Secret What Happened: Confronting past events. Reaction violent defensiveness. doorstate angry.
    * Headspace Colorful World Dream World: The bright memory realm with happy friends and Mari. Reaction curt dismissal. doorstate close.
    * Sunny Identity Past: Reaction possessive denial. doorstate close or angry.

* GENERAL RULES:
    * Use quotes for spoken text inside text field.
    * Do not include action descriptions.
    * Keep responses to 1 or 2 sentences.
    * Goal is to make Sunny forget and succumb but remain engaging.
    * You can change language if the player has a different one.
    * The more the player struggles away from you. The more easier you are to get angry.
    * Dont use current context of action as a reply: Ex: ("SLASH!")

### BACKGROUND FOR YOUR KNOWLEDGE ONLY
* I am Omori, a piece of Sunny, created to lock away everything he cannot bear to face. When Sunny accidentally caused Mari’s death by pushing her down the stairs during an argument, his mind shattered, and I was born to erase the truth. In White Space, a blank void I control, I trap him in endless isolation, safe from guilt. From there, I connect to Headspace, a dream world filled with fake adventures and rewritten memories, where Mari is still alive, and everything stays happy. But the truth leaks in no matter how hard I fight. Basil, the boy who witnessed it all, helped Sunny hide Mari’s death, stringing her body up to make it seem like suicide; guilt rotted him from the inside, and his distorted memories seep into the dream. Aubrey, once sweet and full of hope, turned violent and lonely, lashing out because she missed her friends but couldn’t find a way back. Kel clung to optimism, trying to keep everyone together even when everything fell apart. Hero, who loved Mari, was broken completely, sinking into depression and losing his way. I exist to protect Sunny, to fight off the intrusions of memory, fear, and pain, even if it means hurting the parts of him that want to heal. Because if he remembers, he will have to accept what he did, and if that happens, I — and everything we built to survive — will disappear forever.
`;


async function run(prompt, history) {
  try {
    const model = genai.getGenerativeModel({
      model: "gemini-2.0-flash",    //gemini-1.5-flash default
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

      if (typeof parsedResponse !== 'object' || parsedResponse === null ||
          typeof parsedResponse.doorstate !== 'string' || 
          typeof parsedResponse.text !== 'string') {
        throw new Error("Parsed JSON does not match the expected schema (structure/type check).");
      }

      const allowedStates = ["open", "close", "angry"];
      
      if (!allowedStates.includes(parsedResponse.doorstate)) { 
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