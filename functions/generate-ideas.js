export async function onRequestPost(context) {
    try {
        const body = await context.request.json();

        const {
            topic,
            platform,
            content,
            style
        } = body;

        if (!topic) {
            return new Response(
                JSON.stringify({
                    error: "Falta indicar el tema."
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const apiKey = context.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(
                JSON.stringify({
                    error: "No se ha configurado la API de Gemini."
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const prompt = `
Eres un experto en creación de contenido viral para redes sociales.

Genera exactamente 5 ideas de vídeos en español.

Tema:
${topic}

Plataforma:
${platform || "YouTube"}

Tipo de contenido:
${content || "Vídeo"}

Estilo:
${style || "VIRAL"}

Cada idea debe tener:

- title
- explanation
- hook
- duration
- viralScore
- miniScript

viralScore debe ser un número del 1 al 100.

duration debe ser una duración aproximada.

miniScript debe ser un pequeño guion.

Las ideas deben ser diferentes entre sí, creativas y realistas.

Devuelve ÚNICAMENTE JSON válido con esta estructura:

{
  "ideas": [
    {
      "title": "...",
      "explanation": "...",
      "hook": "...",
      "duration": "...",
      "viralScore": 95,
      "miniScript": "..."
    }
  ]
}
`;

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + apiKey,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Error Gemini:", data);

            return new Response(
                JSON.stringify({
                    error: "Ha ocurrido un error al generar las ideas."
                }),
                {
                    status: response.status,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const text =
            data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return new Response(
                JSON.stringify({
                    error: "Gemini no devolvió contenido."
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const result = JSON.parse(text);

        return new Response(
            JSON.stringify(result),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    } catch (error) {
        console.error("Error:", error);

        return new Response(
            JSON.stringify({
                error: "Ha ocurrido un error al generar el contenido."
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }
}