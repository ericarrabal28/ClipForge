export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const { idea, niche, platform } = body;

        if (!idea || !niche || !platform) {
            return new Response(
                JSON.stringify({
                    error: "Faltan datos para adaptar la idea."
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
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
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        const prompt = `
Eres un experto en creación de contenido viral para redes sociales.

Adapta esta idea para el nicho y plataforma indicados.

IDEA ORIGINAL:
${idea}

NICHO:
${niche}

PLATAFORMA:
${platform}

Devuelve EXACTAMENTE:

{
  "adaptedIdea": "...",
  "hook": "...",
  "audience": "...",
  "whyItWorks": "...",
  "tips": "..."
}

El resultado debe estar escrito en español natural.
No cambies completamente el concepto original.

Devuelve ÚNICAMENTE JSON válido.
`;

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + apiKey,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
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
                    error: "Ha ocurrido un error al adaptar la idea."
                }),
                {
                    status: response.status,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        const text =
            data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return new Response(
                JSON.stringify({
                    error: "Gemini no devolvió la adaptación."
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        return new Response(text, {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Error:", error);

        return new Response(
            JSON.stringify({
                error: "Ha ocurrido un error al generar el contenido."
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
}