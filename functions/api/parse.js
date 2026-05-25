export async function onRequest(context) {

    const requestUrl = new URL(context.request.url);
    const inputUrl = requestUrl.searchParams.get("url");

    if (!inputUrl) {
        return json({ error: "Missing URL" }, 400);
    }

    try {

        // If user already pasted API URL, just use it
        if (inputUrl.includes("/api/")) {
            return await fetchAndReturn(inputUrl);
        }

        // Otherwise parse profile URL
        const parsed = parsePoeNinjaUrl(inputUrl);

        if (!parsed) {
            return json({ error: "Invalid profile URL" }, 400);
        }

        const { account, league, character } = parsed;

        // STEP 1: TRY DIRECT API (no model ID)
        const baseApiUrl =
            `https://poe.ninja/poe2/api/profile/characters/${account}/${league}/${character}/model`;

        let response = await fetch(baseApiUrl, {
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0"
            }
        });

        let text = await response.text();

        // If that fails, fallback to HTML scrape for model id
        if (!response.ok || !isJson(text)) {

            const htmlResponse = await fetch(inputUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0"
                }
            });

            const html = await htmlResponse.text();

            const match =
                html.match(/model\/(\d+)/);

            if (!match) {
                return json({
                    error: "Could not resolve model ID (site changed again)"
                }, 500);
            }

            const modelId = match[1];

            const apiUrl =
                `https://poe.ninja/poe2/api/profile/characters/${account}/${league}/${character}/model/${modelId}`;

            return await fetchAndReturn(apiUrl);
        }

        return json(JSON.parse(text));

    } catch (err) {
        return json({
            error: err.message
        }, 500);
    }
}

async function fetchAndReturn(url) {

    const res = await fetch(url, {
        headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
    });

    const text = await res.text();

    if (!isJson(text)) {
        return json({
            error: "Response not JSON",
            preview: text.substring(0, 2000)
        }, 500);
    }

    const data = JSON.parse(text);

    return json(normalizeCharacter(data));
}

function isJson(text) {
    return text.trim().startsWith("{") || text.trim().startsWith("[");
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
            name: data?.character?.name || data?.name,
            level: data?.character?.level || data?.level,
            class: data?.character?.class || data?.class
        },

        stats: data?.stats || {},

        items: (data?.items || []).map(item => ({
            slot: item?.inventoryId,
            name: item?.name,
            type: item?.typeLine,
            rarity: item?.rarity,
            implicits: item?.implicitMods || [],
            explicits: item?.explicitMods || [],
            crafted: item?.craftedMods || [],
            sockets: item?.sockets || []
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
