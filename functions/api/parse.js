export async function onRequest(context) {

    const requestUrl = new URL(context.request.url);
    const inputUrl = requestUrl.searchParams.get("url");

    if (!inputUrl) {
        return json({ error: "Missing URL" }, 400);
    }

    try {

        // If user already gave API URL, just use it
        if (inputUrl.includes("/api/")) {
            const data = await fetchJson(inputUrl);
            return json(normalizeCharacter(data));
        }

        const parsed = parsePoeNinjaUrl(inputUrl);

        if (!parsed) {
            return json({ error: "Invalid profile URL" }, 400);
        }

        const { account, league, character } = parsed;

        // STEP 1: Try base endpoint WITHOUT model id
        // (this is the key fix — no HTML scraping)
        const baseUrl =
            `https://poe.ninja/poe2/api/profile/characters/${account}/${league}/${character}/model`;

        const baseResponse = await fetch(baseUrl, {
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0"
            }
        });

        const baseText = await baseResponse.text();

        // If this is already JSON, use it
        if (isJson(baseText)) {
            return json(normalizeCharacter(JSON.parse(baseText)));
        }

        // STEP 2: fallback – try known working pattern discovery via search endpoint
        const fallbackUrl =
            `https://poe.ninja/poe2/api/profile/characters/${account}/${league}/${character}`;

        const fallbackData = await fetchJson(fallbackUrl);

        // Try to extract model id from ANY field in response
        const modelId = extractModelId(fallbackData);

        if (!modelId) {
            return json({
                error: "Model ID not found via API discovery",
                hint: "Site no longer exposes model id in HTML"
            }, 500);
        }

        const finalUrl =
            `https://poe.ninja/poe2/api/profile/characters/${account}/${league}/${character}/model/${modelId}`;

        const finalData = await fetchJson(finalUrl);

        return json(normalizeCharacter(finalData));

    } catch (err) {
        return json({
            error: err.message
        }, 500);
    }
}

/* ---------------- helpers ---------------- */

async function fetchJson(url) {

    const res = await fetch(url, {
        headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
    });

    const text = await res.text();

    if (!isJson(text)) {
        throw new Error("Non-JSON response from API");
    }

    return JSON.parse(text);
}

function isJson(text) {
    return text.trim().startsWith("{") || text.trim().startsWith("[");
}

/**
 * brute-force model id search anywhere in returned payload
 */
function extractModelId(obj) {

    const str = JSON.stringify(obj);
    const match = str.match(/model\/(\d+)/);

    return match ? match[1] : null;
}

function parsePoeNinjaUrl(url) {

    const match = url.match(
        /profile\/(.+?)\/(.+?)\/character\/(.+?)(#|$)/
    );

    if (!match) return null;

    return {
        account: decodeURIComponent(match[1]),
        league: decodeURIComponent(match[2]),
        character: decodeURIComponent(match[3])
    };
}

function normalizeCharacter(data) {

    return {
        character: {
            name: data?.character?.name || data?.name || null,
            level: data?.character?.level || data?.level || null,
            class: data?.character?.class || data?.class || null
        },

        stats: data?.stats || {},

        items: (data?.items || []).map(item => ({
            slot: item?.inventoryId,
            name: item?.name,
            type: item?.typeLine,
            rarity: item?.rarity,
            implicits: item?.implicitMods || [],
            explicits: item?.explicitMods || []
        })),

        passives: data?.passives || [],
        skills: data?.skills || [],

        raw: data
    };
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        }
    });
}
