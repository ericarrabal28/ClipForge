export async function onRequestPost(context) {
    try {
        const body = await context.request.json();

        const { topic, platform, style } = body;

        if (!topic) {
            return new Response(
                JSON.stringify({
                    error: "Falta indicar la idea del vídeo."
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
Eres un experto profesional en viralidad y crecimiento en redes sociales.

Analiza la siguiente idea de vídeo y evalúa su potencial viral.

Idea:
${topic}

Plataforma:
${platform || "YouTube"}

Estilo:
${style || "VIRAL"}

Analiza especialmente:

- Capacidad de conseguir clics.
- Capacidad de mantener la atención.
- Curiosidad que genera.
- Claridad de la propuesta.
- Potencial para ser compartida.
- Diferenciación frente a otros vídeos.

Devuelve exactamente estos campos:

- score: número entero del 1 al 100.
- clicks: explicación breve del potencial de conseguir clics.
- retention: explicación breve del potencial de retención.
- strengths: puntos fuertes de la idea.
- weaknesses: puntos débiles de la idea.
- improvements: consejos concretos para mejorarla y aumentar sus posibilidades de hacerse viral.

Sé crítico y realista.

No pongas puntuaciones exageradas simplemente por ser positivo.

Devuelve ÚNICAMENTE JSON válido con esta estructura:

{
  "score": 85,
  "clicks": "...",
  "retention": "...",
  "strengths": "...",
  "weaknesses": "...",
  "improvements": "..."
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
            return new Response(
                JSON.stringify({
                    error: "Ha ocurrido un error al analizar la idea."
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
                    error: "Gemini no devolvió el análisis."
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        return new Response(
            text,
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