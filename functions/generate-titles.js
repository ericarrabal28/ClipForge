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

        let number = Number(amount) || 5;

        if (![5, 10].includes(number)) {
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
Eres un experto profesional en títulos virales y crecimiento en redes sociales.

Genera títulos y hashtags para el siguiente vídeo.

Tema del vídeo:
${topic}

Plataforma:
${platform || "YouTube"}

Estilo:
${style || "VIRAL"}

Genera exactamente ${number} títulos.

Los títulos deben:

- Ser atractivos.
- Generar curiosidad.
- Tener potencial viral.
- No ser todos iguales.
- Adaptarse a la plataforma indicada.
- Estar escritos en español natural.
- Evitar clickbait falso.

Después genera exactamente 10 hashtags relevantes.

Los hashtags deben:

- Estar relacionados con el tema.
- Ser útiles para la plataforma.
- Mezclar hashtags específicos y generales.
- No llevar números delante.

Devuelve ÚNICAMENTE JSON válido con esta estructura:

{
  "titles": [
    "Título 1",
    "Título 2",
    "Título 3"
  ],
  "hashtags": [
    "#hashtag1",
    "#hashtag2",
    "#hashtag3"
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
                    error: "Ha ocurrido un error al generar los títulos."
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
                    error: "Gemini no devolvió títulos."
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