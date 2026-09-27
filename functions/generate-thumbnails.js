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
                    error: "Falta indicar el tema del vídeo."
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        let number = Number(amount) || 3;

        if (![3, 5].includes(number)) {
            number = 3;
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
Eres un experto profesional en diseño de miniaturas para YouTube, TikTok e Instagram.

IMPORTANTE:
No generes ninguna imagen.
Solo proporciona conceptos y descripciones para que el creador pueda diseñar la miniatura.

Crea exactamente ${number} conceptos de miniaturas diferentes.

Tema del vídeo:
${topic}

Plataforma:
${platform || "YouTube"}

Estilo:
${style || "VIRAL"}

Cada concepto debe incluir:

- title: nombre corto del concepto
- concept: explicación clara de cómo debería verse la miniatura
- elements: elementos, personajes, objetos o imágenes que deberían aparecer
- text: texto corto recomendado para colocar en la miniatura
- style: estilo visual, composición, iluminación y sensación
- why: explicación breve de por qué podría conseguir clics

Reglas:

- El texto de la miniatura debe ser corto.
- No pongas demasiado texto.
- Los conceptos deben ser muy diferentes entre sí.
- Deben llamar la atención inmediatamente.
- Deben funcionar específicamente para el tema indicado.
- No inventes información que no tenga relación con el vídeo.
- No generes imágenes.

Devuelve ÚNICAMENTE JSON válido con esta estructura:

{
  "concepts": [
    {
      "title": "...",
      "concept": "...",
      "elements": "...",
      "text": "...",
      "style": "...",
      "why": "..."
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
            return new Response(
                JSON.stringify({
                    error: "Ha ocurrido un error al generar los conceptos."
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
                    error: "Gemini no devolvió conceptos."
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