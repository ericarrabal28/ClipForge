const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ No se encontró GEMINI_API_KEY en el archivo .env");
    process.exit(1);
}

const ai = new GoogleGenAI({
    apiKey: apiKey
});


// =====================================================
// CONFIGURACIÓN CLIPFORGE
// =====================================================

const MAX_FREE_USES = 2;

// PRO TEMPORAL PARA DESARROLLO
// Cuando hagamos el sistema de cuentas y pagos,
// esto será sustituido por una comprobación real.
const PRO_ENABLED =
    process.env.CLIPFORGE_PRO === "true";


// =====================================================
// CONTROL DE USOS GRATUITOS
// =====================================================

const freeUses = new Map();

function getIP(req) {

    return (
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress ||
        "unknown"
    );

}


// =====================================================
// PROTECTION PRO
// =====================================================

function requirePro(req, res, next) {

    if (!PRO_ENABLED) {

        return res.status(403).json({

            error:
                "Esta herramienta es exclusiva de ClipForge PRO.",

            code:
                "PRO_REQUIRED"

        });

    }

    next();

}


// =====================================================
// ERRORES GEMINI
// =====================================================

function handleGeminiError(error, res) {

    console.error("❌ Error Gemini:", error);

    const status =
        error?.status ||
        error?.code;

    if (status === 429) {

        return res.status(429).json({

            error:
                "Gemini ha alcanzado temporalmente el límite de uso. Espera un poco e inténtalo de nuevo."

        });

    }

    if (status === 404) {

        return res.status(404).json({

            error:
                "El modelo de IA no está disponible actualmente."

        });

    }

    if (status === 503) {

        return res.status(503).json({

            error:
                "Gemini está recibiendo muchas solicitudes. Espera unos segundos e inténtalo de nuevo."

        });

    }

    return res.status(500).json({

        error:
            "Ha ocurrido un error al generar el contenido."

    });

}


// =====================================================
// GENERADOR DE IDEAS
// =====================================================

app.post(
    "/api/generate-ideas",
    async (req, res) => {

        try {

            const ip =
                getIP(req);

            const currentUses =
                freeUses.get(ip) || 0;


            if (currentUses >= MAX_FREE_USES) {

                return res.status(403).json({

                    error:
                        "Has utilizado tus 2 generaciones gratuitas.",

                    code:
                        "FREE_LIMIT_REACHED"

                });

            }


            const {
                topic,
                platform,
                content,
                style
            } = req.body;


            if (!topic) {

                return res.status(400).json({

                    error:
                        "Falta indicar el tema."

                });

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


            const response =
                await ai.models.generateContent({

                    model:
                        "gemini-3.5-flash-lite",

                    contents:
                        prompt,

                    config: {

                        responseMimeType:
                            "application/json"

                    }

                });


            const data =
                JSON.parse(response.text);


            freeUses.set(
                ip,
                currentUses + 1
            );


            console.log(
                `💡 Ideas generadas | IP: ${ip} | Uso: ${currentUses + 1}/${MAX_FREE_USES}`
            );


            res.json(data);


        } catch (error) {

            handleGeminiError(
                error,
                res
            );

        }

    }
);


// =====================================================
// GENERADOR DE GUIONES - PRO
// =====================================================

app.post(
    "/api/generate-script",
    requirePro,
    async (req, res) => {

        try {

            const {
                topic,
                platform,
                duration,
                style
            } = req.body;


            if (!topic) {

                return res.status(400).json({

                    error:
                        "Falta indicar el tema del vídeo."

                });

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


            const response =
                await ai.models.generateContent({

                    model:
                        "gemini-3.5-flash-lite",

                    contents:
                        prompt

                });


            console.log(
                "📝 Guion generado"
            );


            res.json({

                script:
                    response.text

            });


        } catch (error) {

            handleGeminiError(
                error,
                res
            );

        }

    }
);


// =====================================================
// GENERADOR DE HOOKS - PRO
// =====================================================

app.post(
    "/api/generate-hooks",
    requirePro,
    async (req, res) => {

        try {

            const {
                topic,
                platform,
                style,
                amount
            } = req.body;


            if (!topic) {

                return res.status(400).json({

                    error:
                        "Falta indicar el tema."

                });

            }


            let number =
                Number(amount) || 5;


            if (
                ![5, 10, 15].includes(number)
            ) {

                number = 5;

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


            const response =
                await ai.models.generateContent({

                    model:
                        "gemini-3.5-flash-lite",

                    contents:
                        prompt,

                    config: {

                        responseMimeType:
                            "application/json"

                    }

                });


            const data =
                JSON.parse(response.text);


            console.log(
                `🎣 ${number} hooks generados`
            );


            res.json(data);


        } catch (error) {

            handleGeminiError(
                error,
                res
            );

        }

    }
);


// =====================================================
// GENERADOR DE TÍTULOS + HASHTAGS - PRO
// =====================================================

app.post(
    "/api/generate-titles",
    requirePro,
    async (req, res) => {

        try {

            const {
                topic,
                platform,
                style,
                amount
            } = req.body;


            if (!topic) {

                return res.status(400).json({

                    error:
                        "Falta indicar el tema del vídeo."

                });

            }


            let number =
                Number(amount) || 5;


            if (
                ![5, 10].includes(number)
            ) {

                number = 5;

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


            const response =
                await ai.models.generateContent({

                    model:
                        "gemini-3.5-flash-lite",

                    contents:
                        prompt,

                    config: {

                        responseMimeType:
                            "application/json"

                    }

                });


            const data =
                JSON.parse(response.text);


            console.log(
                `🏷️ ${number} títulos + 10 hashtags generados`
            );


            res.json(data);


        } catch (error) {

            handleGeminiError(
                error,
                res
            );

        }

    }
);


// =====================================================
// GENERADOR DE MINIATURAS - PRO
// =====================================================

app.post(
    "/api/generate-thumbnails",
    requirePro,
    async (req, res) => {

        try {

            const {
                topic,
                platform,
                style,
                amount
            } = req.body;


            if (!topic) {

                return res.status(400).json({

                    error:
                        "Falta indicar el tema del vídeo."

                });

            }


            let number =
                Number(amount) || 3;


            if (
                ![3, 5].includes(number)
            ) {

                number = 3;

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


            const response =
                await ai.models.generateContent({

                    model:
                        "gemini-3.5-flash-lite",

                    contents:
                        prompt,

                    config: {

                        responseMimeType:
                            "application/json"

                    }

                });


            const data =
                JSON.parse(response.text);


            console.log(
                `🖼️ ${number} conceptos de miniatura generados`
            );


            res.json(data);


        } catch (error) {

            handleGeminiError(
                error,
                res
            );

        }

    }
);


// =====================================================
// ANALIZADOR VIRAL - PRO
// =====================================================

app.post(
    "/api/analyze-viral",
    requirePro,
    async (req, res) => {

        try {

            const {
                topic,
                platform,
                style
            } = req.body;


            if (!topic) {

                return res.status(400).json({

                    error:
                        "Falta indicar la idea del vídeo."

                });

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


            const response =
                await ai.models.generateContent({

                    model:
                        "gemini-3.5-flash-lite",

                    contents:
                        prompt,

                    config: {

                        responseMimeType:
                            "application/json"

                    }

                });


            const data =
                JSON.parse(response.text);


            console.log(
                `📈 Idea analizada | Score: ${data.score}/100`
            );


            res.json(data);


        } catch (error) {

            handleGeminiError(
                error,
                res
            );

        }

    }
);


// =====================================================
// ADAPTADOR DE NICHO - PRO
// =====================================================

app.post(
    "/api/adapt-niche",
    requirePro,
    async (req, res) => {

        try {

            const {
                idea,
                niche,
                platform
            } = req.body;


            if (!idea || !niche || !platform) {

                return res.status(400).json({

                    error:
                        "Faltan datos para adaptar la idea."

                });

            }


            const prompt = `
Eres un experto en creación de contenido viral para redes sociales.

Tu trabajo es adaptar una idea general para que encaje perfectamente
con un nicho y una plataforma concretos.

IDEA ORIGINAL:
${idea}

NICHO:
${niche}

PLATAFORMA:
${platform}

Analiza la idea y conviértela en una versión mucho más específica,
interesante y atractiva para el público de ese nicho.

Devuelve EXACTAMENTE estos campos:

- adaptedIdea: la idea completamente adaptada al nicho.
- hook: un hook potente para comenzar el vídeo.
- audience: descripción breve del público objetivo.
- whyItWorks: explicación de por qué esta adaptación puede funcionar.
- tips: consejos prácticos para hacer el vídeo más atractivo.

Sé creativo, pero no cambies completamente el concepto original.

El resultado debe estar escrito en español natural.

Devuelve ÚNICAMENTE JSON válido con esta estructura:

{
  "adaptedIdea": "...",
  "hook": "...",
  "audience": "...",
  "whyItWorks": "...",
  "tips": "..."
}
`;


            const response =
                await ai.models.generateContent({

                    model:
                        "gemini-3.5-flash-lite",

                    contents:
                        prompt,

                    config: {

                        responseMimeType:
                            "application/json"

                    }

                });


            const data =
                JSON.parse(response.text);


            console.log(
                `🎯 Idea adaptada al nicho: ${niche}`
            );


            res.json(data);


        } catch (error) {

            handleGeminiError(
                error,
                res
            );

        }

    }
);


// =====================================================
// MEJORADOR DE IDEAS - PRO
// =====================================================

app.post(
    "/api/improve-idea",
    requirePro,
    async (req, res) => {

        try {

            const {
                idea,
                platform,
                style
            } = req.body;


            if (!idea) {

                return res.status(400).json({

                    error:
                        "Falta indicar la idea del vídeo."

                });

            }


            const prompt = `
Eres un experto profesional en creación de contenido viral.

Tu trabajo es mejorar una idea de vídeo existente sin cambiar
completamente su concepto original.

IDEA ORIGINAL:
${idea}

PLATAFORMA:
${platform || "YouTube"}

ESTILO:
${style || "VIRAL"}

Analiza la idea y crea una versión mucho más atractiva,
clara, entretenida y con mayor potencial viral.

La idea mejorada debe:

- Mantener el concepto principal.
- Ser más interesante que la original.
- Tener una propuesta clara.
- Generar curiosidad.
- Tener potencial de retención.
- Adaptarse a la plataforma.
- Adaptarse al estilo indicado.
- Evitar clickbait falso.
- Ser realista y fácil de convertir en vídeo.

Además, crea un hook potente para los primeros segundos.

Explica qué has mejorado y por qué.

Evalúa brevemente el potencial viral de la nueva versión.

Finalmente proporciona un consejo concreto para hacer el vídeo todavía mejor.

Devuelve ÚNICAMENTE JSON válido con esta estructura:

{
  "improvedIdea": "...",
  "hook": "...",
  "improvements": "...",
  "viralPotential": "...",
  "finalTip": "..."
}
`;


            const response =
                await ai.models.generateContent({

                    model:
                        "gemini-3.5-flash-lite",

                    contents:
                        prompt,

                    config: {

                        responseMimeType:
                            "application/json"

                    }

                });


            const data =
                JSON.parse(response.text);


            console.log(
                "🔥 Idea mejorada"
            );


            res.json(data);


        } catch (error) {

            handleGeminiError(
                error,
                res
            );

        }

    }
);


// =====================================================
// REINICIO DE USOS GRATUITOS CADA 24 HORAS
// =====================================================

setInterval(() => {

    freeUses.clear();

    console.log(
        "🔄 Contador Free reiniciado"
    );

}, 24 * 60 * 60 * 1000);


// =====================================================
// SERVIDOR
// =====================================================

app.listen(
    3000,
    () => {

        console.log("");
        console.log("🚀 CLIPFORGE");

        console.log(
            "🌐 http://localhost:3000"
        );

        console.log(
            "🆓 Generaciones Free: 2"
        );

        console.log(
            "🤖 Modelo: gemini-3.5-flash-lite"
        );

        console.log(
            PRO_ENABLED
                ? "💎 MODO PRO: ACTIVADO"
                : "🔒 MODO PRO: BLOQUEADO"
        );

        console.log(
            "📝 Generador de guiones: PRO"
        );

        console.log(
            "🎣 Generador de hooks: PRO"
        );

        console.log(
            "🏷️ Generador de títulos + hashtags: PRO"
        );

        console.log(
            "🖼️ Generador de miniaturas: PRO"
        );

        console.log(
            "📈 Analizador viral: PRO"
        );

        console.log(
            "🎯 Adaptador de nicho: PRO"
        );

        console.log(
            "🔥 Mejorador de ideas: PRO"
        );

        console.log("");

    }
);