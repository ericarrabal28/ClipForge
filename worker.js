export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Permitir comprobaciones del navegador
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders()
            });
        }

        // API para generar ideas
        if (url.pathname === "/api/generate-ideas" && request.method === "POST") {
            return await generateIdeas(request, env);
        }

        // Para todo lo demás, mostrar la web normal
        return env.ASSETS.fetch(request);
    }
};


function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };
}


async function generateIdeas(request, env) {
    try {
        // Comprobar que tenemos la clave de Gemini
        if (!env.GEMINI_API_KEY) {
            return jsonResponse({
                error: "No se ha configurado la API de Gemini en Cloudflare."
            }, 500);
        }

        // Comprobar el límite gratuito
        const cookieHeader = request.headers.get("Cookie") || "";

        let freeUses = 0;

        const match = cookieHeader.match(/clipforge_free_uses=(\d+)/);

        if (match) {
            freeUses = parseInt(match[1], 10);
        }

        if (freeUses >= 2) {
            return jsonResponse({
                error: "Has utilizado tus 2 generaciones gratuitas.",
                code: "FREE_LIMIT_REACHED"
            }, 403);
        }

        // Obtener los datos enviados por la página
        const body = await request.json();

        const niche = body.niche || body.tema || body.topic || "gaming";

        const prompt = `
Eres un experto en creación de contenido viral para YouTube Shorts, TikTok y Reels.

Genera exactamente 5 ideas de vídeos originales y con potencial viral.

Temática o nicho:
${niche}

Para cada idea incluye:

1. Un título llamativo.
2. Una explicación breve de la idea.
3. Un gancho inicial que consiga que la persona siga viendo el vídeo.
4. Una puntuación de potencial viral del 1 al 10.

Las ideas deben ser diferentes entre sí, concretas y fáciles de convertir en un vídeo.

IMPORTANTE:
Devuelve únicamente un JSON válido con este formato:

{
  "ideas": [
    {
      "title": "Título",
      "description": "Descripción",
      "hook": "Gancho",
      "viralScore": 9
    }
  ]
}
`;

        // Llamar a Gemini
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" +
            encodeURIComponent(env.GEMINI_API_KEY),
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

        // Error de Gemini
        if (!response.ok) {
            console.error("Error Gemini:", data);

            if (response.status === 429) {
                return jsonResponse({
                    error: "Gemini ha alcanzado temporalmente el límite de uso. Espera un poco e inténtalo de nuevo."
                }, 429);
            }

            if (response.status === 404) {
                return jsonResponse({
                    error: "El modelo de IA no está disponible actualmente."
                }, 404);
            }

            if (response.status === 503) {
                return jsonResponse({
                    error: "Gemini está recibiendo muchas solicitudes. Espera unos segundos e inténtalo de nuevo."
                }, 503);
            }

            return jsonResponse({
                error: "Gemini ha devuelto un error."
            }, 500);
        }

        // Obtener el texto generado
        const text =
            data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return jsonResponse({
                error: "Gemini no ha devuelto ningún resultado."
            }, 500);
        }

        // Convertir la respuesta de Gemini a JSON
        let result;

        try {
            result = JSON.parse(text);
        } catch (error) {
            console.error("Respuesta de Gemini no válida:", text);

            return jsonResponse({
                error: "Gemini ha devuelto una respuesta que no se puede interpretar."
            }, 500);
        }

        // Sumar una utilización gratuita
        const newFreeUses = freeUses + 1;

        return new Response(
            JSON.stringify(result),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders(),
                    "Set-Cookie":
                        `clipforge_free_uses=${newFreeUses}; Max-Age=86400; Path=/; SameSite=Lax`
                }
            }
        );

    } catch (error) {
        console.error("Error general:", error);

        return jsonResponse({
            error: "Ha ocurrido un error al generar las ideas."
        }, 500);
    }
}


function jsonResponse(data, status = 200) {
    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders()
            }
        }
    );
}
