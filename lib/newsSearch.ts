import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function getPlayerNews(playerName: string, team: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `You are an AFL news researcher. Based on your knowledge of AFL players up to your training cutoff, provide a brief factual summary of the player's recent form, playing style, injury history, and any relevant notes. Be specific and factual. If you don't have reliable information, say so. Keep it under 150 words.`
        },
        {
          role: 'user',
          content: `Provide a factual player profile and recent form notes for ${playerName} who plays for ${team} in the AFL. Include: playing style, typical fantasy scoring patterns, any known injury history, and what conditions affect their output (home/away, opponent type, role in team).`
        }
      ],
      temperature: 0.3,
    })
    return completion.choices[0]?.message?.content || 'No additional information available.'
  } catch {
    return 'Could not retrieve player information.'
  }
}

export async function getTeamNews(teams: string[]): Promise<Record<string, string>> {
  const uniqueTeams = [...new Set(teams)]
  const results: Record<string, string> = {}

  await Promise.all(
    uniqueTeams.map(async (team) => {
      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 200,
          messages: [
            {
              role: 'system',
              content: 'You are an AFL analyst. Provide brief factual notes about an AFL team relevant to fantasy scoring. Keep under 100 words.'
            },
            {
              role: 'user',
              content: `What should AFL Fantasy Draft managers know about ${team} this season? Focus on: team structure, which positions score well against them defensively, injury concerns, and general form.`
            }
          ],
          temperature: 0.3,
        })
        results[team] = completion.choices[0]?.message?.content || ''
      } catch {
        results[team] = ''
      }
    })
  )

  return results
}