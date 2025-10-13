import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Explain how AI works in a few words",
  });
  console.log(response.text);
}

await main();

export default function AI() {
  return (
    <div>
      <p>Hello</p>
      <h1>World</h1>
    </div>
  );
}
