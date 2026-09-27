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
                    error: "No se ha configurado la API de Gemini en Cloudflare."
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
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
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

        const responseText = await response.text();

        if (!responseText) {
            console.error("Gemini devolvió una respuesta vacía.");

            return new Response(
                JSON.stringify({
                    error: "Gemini devolvió una respuesta vacía."
                }),
                {
                    status: 502,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        let data;

        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error("Respuesta no válida de Gemini:", responseText);

            return new Response(
                JSON.stringify({
                    error: "Gemini devolvió una respuesta que no es JSON válido."
                }),
                {
                    status: 502,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        if (!response.ok) {
            console.error("Error Gemini:", data);

            return new Response(
                JSON.stringify({
                    error:
                        data?.error?.message ||
                        "Ha ocurrido un error al generar las ideas."
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
            console.error("Gemini no devolvió contenido:", data);

            return new Response(
                JSON.stringify({
                    error: "Gemini no devolvió contenido."
                }),
                {
                    status: 502,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        let result;

        try {
            result = JSON.parse(text);
        } catch (parseError) {
            console.error("Gemini devolvió JSON inválido:", text);

            return new Response(
                JSON.stringify({
                    error: "Gemini no devolvió el formato JSON esperado."
                }),
                {
                    status: 502,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

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
        console.error("Error en generate-ideas:", error);

        return new Response(
            JSON.stringify({
                error: "Ha ocurrido un error al generar las ideas."
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