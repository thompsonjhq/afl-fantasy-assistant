import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function analyzeWithGroq(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    max_tokens: 2048,
  })

  return completion.choices[0]?.message?.content || 'No response generated'
}