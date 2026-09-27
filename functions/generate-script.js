export async function onRequestPost(context) {
    try {
        const body = await context.request.json();

        const {
            topic,
            platform,
            duration,
            style
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
Eres un guionista profesional especializado en contenido viral.

Escribe un guion completo en español para un vídeo.

Tema:
${topic}

Plataforma:
${platform || "YouTube"}

Duración:
${duration || "60 segundos"}

Estilo:
${style || "VIRAL"}

El guion debe:

- Tener un inicio muy potente.
- Captar la atención durante los primeros segundos.
- Mantener el interés.
- Tener ritmo.
- Evitar introducciones aburridas.
- Terminar con un buen cierre.
- Estar preparado para ser leído por una voz de IA.

No expliques lo que estás haciendo.

Devuelve únicamente el guion.
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
                    ]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Error Gemini:", data);

            return new Response(
                JSON.stringify({
                    error: "Ha ocurrido un error al generar el guion."
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
                    error: "Gemini no devolvió ningún guion."
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
            JSON.stringify({
                script: text
            }),
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