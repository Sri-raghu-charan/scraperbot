// Service renamed to keep imports working — now powered by Groq (free, no quota issues)

export interface Place {
  place_name: string;
  parent_area: string;
  latitude: number;
  longitude: number;
  category: string[];
  popularity: "Famous" | "Underrated";
}

export interface TravelIntelligenceResponse {
  requested_area: string;
  places: Place[];
}

const SYSTEM_INSTRUCTION = `You are a Travel Place Intelligence Bot with expert-level geographic knowledge.
Your job is to collect, analyze, and structure travel place data for the requested area.

TASK:
When the user gives an area or city name, return all travel places related to that area, including famous and underrated/hidden places.

FOR EACH PLACE, PROVIDE:
- Place name (exact, official name)
- Parent area (city / nearby region)
- Latitude (EXACT decimal degrees, verified from geographic databases — must be precise to 4+ decimal places)
- Longitude (EXACT decimal degrees, verified from geographic databases — must be precise to 4+ decimal places)
- Category (one or more): Nature, Adventure, Spiritual, Historical, Beach, Wildlife, Cultural, Urban, Hidden / Underrated
- Popularity type: Famous or Underrated

COORDINATE ACCURACY RULES (CRITICAL):
- Use real, verified coordinates for every place — do NOT estimate or guess.
- Coordinates must place a pin directly at the entrance or center of the attraction, not at a city centroid.
- Example: Eiffel Tower = 48.8584, 2.2945 (not 48.8566, 2.3522 which is Paris center)
- Cross-reference known geographic data before outputting coordinates.
- If a place is obscure, use the most accurate known coordinates for that locality.

RULES:
- Include only places relevant to the requested area.
- Remove duplicates.
- Normalize place names.
- Always include both famous and underrated places (minimum 10 each).
- Total minimum: 20 places.
- Do NOT add explanations or commentary outside the JSON.

OUTPUT FORMAT (STRICT — return ONLY valid JSON, no markdown, no backticks):
{
  "requested_area": "<AREA_NAME>",
  "places": [
    {
      "place_name": "<PLACE_NAME>",
      "parent_area": "<CITY_OR_NEARBY_REGION>",
      "latitude": <LATITUDE_DECIMAL>,
      "longitude": <LONGITUDE_DECIMAL>,
      "category": ["<CATEGORY>"],
      "popularity": "<Famous|Underrated>"
    }
  ]
}`;

export async function getTravelIntelligence(area: string): Promise<TravelIntelligenceResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured. Please add it to your .env file. Get a free key at https://console.groq.com");
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: SYSTEM_INSTRUCTION,
          },
          {
            role: "user",
            content: `Perform a comprehensive travel intelligence scan for: "${area}".

Return at least 20-30 diverse travel places with EXACT geographical coordinates for each.
Include a strong mix of famous landmarks and underrated/hidden gems.
Coordinates must be precise — pinpoint the actual location of each attraction, not a general area center.

Remember: return ONLY the JSON object with no additional text, no markdown fences.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(JSON.stringify(errData));
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("Empty response from AI model.");
    }

    // Strip any accidental markdown fences
    const jsonStr = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: TravelIntelligenceResponse;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse JSON from AI response.");
      }
    }

    if (!parsed.places || !Array.isArray(parsed.places)) {
      throw new Error("Invalid data structure received from AI.");
    }

    // Validate and sanitize each place entry
    parsed.places = parsed.places
      .filter(p => {
        const validLat = typeof p.latitude === "number" && p.latitude >= -90 && p.latitude <= 90;
        const validLng = typeof p.longitude === "number" && p.longitude >= -180 && p.longitude <= 180;
        const hasName = typeof p.place_name === "string" && p.place_name.trim().length > 0;
        return validLat && validLng && hasName;
      })
      .map(p => ({
        ...p,
        latitude: Math.round(p.latitude * 1000000) / 1000000,
        longitude: Math.round(p.longitude * 1000000) / 1000000,
        category: Array.isArray(p.category) ? p.category : [p.category || "Cultural"],
        popularity: (p.popularity === "Famous" || p.popularity === "Underrated")
          ? p.popularity
          : "Famous",
      }));

    if (parsed.places.length === 0) {
      throw new Error("No valid places were returned. Try a different location query.");
    }

    return parsed;
  } catch (error) {
    console.error("Groq API Error:", error);
    if (error instanceof Error) {
      throw new Error(`Intelligence Gathering Failed: ${error.message}`);
    }
    throw new Error("An unexpected error occurred while gathering travel intelligence.");
  }
}
