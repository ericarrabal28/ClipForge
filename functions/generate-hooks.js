export async function onRequestPost(context) {
    try {
        const body = await context.request.json();

        const {
            topic,
            platform,
            style,
            amount
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

        let number = Number(amount) || 5;

        if (![5, 10, 15].includes(number)) {
            number = 5;
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
Eres un experto en hooks virales para redes sociales.

Genera exactamente ${number} hooks diferentes en español.

Tema:
${topic}

Plataforma:
${platform || "YouTube"}

Estilo:
${style || "VIRAL"}

Los hooks deben:

- Ser muy llamativos.
- Captar la atención inmediatamente.
- Generar curiosidad.
- Evitar frases genéricas.
- Ser diferentes entre sí.
- Estar pensados para los primeros segundos del vídeo.

Devuelve ÚNICAMENTE JSON válido con esta estructura:

{
  "hooks": [
    "Hook 1",
    "Hook 2",
    "Hook 3"
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
            return new Response(
                JSON.stringify({
                    error: "Ha ocurrido un error al generar los hooks."
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
                    error: "Gemini no devolvió hooks."
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