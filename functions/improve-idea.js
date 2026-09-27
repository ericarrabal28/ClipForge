export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        const { idea, platform, style } = body;

        if (!idea) {
            return new Response(
                JSON.stringify({
                    error: "Falta indicar la idea del vídeo."
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
Eres un experto profesional en creación de contenido viral.

Mejora esta idea de vídeo sin cambiar completamente su concepto.

IDEA ORIGINAL:
${idea}

PLATAFORMA:
${platform || "YouTube"}

ESTILO:
${style || "VIRAL"}

La idea mejorada debe:

- Mantener el concepto principal.
- Ser más interesante.
- Generar curiosidad.
- Tener potencial de retención.
- Adaptarse a la plataforma.
- Evitar clickbait falso.
- Ser realista y fácil de convertir en vídeo.

Crea también un hook potente.

Devuelve ÚNICAMENTE JSON válido:

{
  "improvedIdea": "...",
  "hook": "...",
  "improvements": "...",
  "viralPotential": "...",
  "finalTip": "..."
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
                    error: "Ha ocurrido un error al mejorar la idea."
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
                    error: "Gemini no devolvió la idea mejorada."
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