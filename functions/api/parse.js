export async function onRequest(context) {

    const requestUrl = new URL(context.request.url);
    const profileUrl = requestUrl.searchParams.get("url");

    if (!profileUrl) {
        return json({
            error: "Missing profile URL"
        }, 400);
    }

    try {

        // Parse poe.ninja URL
        const parsed = parsePoeNinjaUrl(profileUrl);

        if (!parsed) {
            return json({
                error: "Invalid poe.ninja URL"
            }, 400);
        }

        const {
            account,
            league,
            character
        } = parsed;

        // STEP 1:
        // Get page HTML to discover model ID
        const htmlResponse = await fetch(profileUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        const html = await htmlResponse.text();

        // Find model endpoint in HTML
        const modelMatch = html.match(
            /\/api\/profile\/characters\/.*?\/model\/(\d+)/
        );

        if (!modelMatch) {
            return json({
                error: "Model ID not found"
            }, 500);
        }

        const modelId = modelMatch[1];

        // STEP 2:
        // Build actual API URL
        const apiUrl =
            `https://poe.ninja/poe2/api/profile/characters/${account}/${league}/${character}/model/${modelId}`;

        // STEP 3:
        // Fetch actual structured data
        const apiResponse = await fetch(apiUrl, {
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0"
            }
        });

        const rawData = await apiResponse.json();

        // STEP 4:
        // Normalize for LLMs
        const normalized = normalizeCharacter(rawData);

        return json(normalized);

    } catch (err) {

        return json({
            error: err.message
        }, 500);
    }
}

function parsePoeNinjaUrl(url) {

    const match = url.match(
        /profile\/(.+?)\/(.+?)\/character\/(.+?)(#|$)/
    );

    if (!match) {
        return null;
    }

    return {
        account: match[1],
        league: match[2],
        character: match[3]
    };
}

function normalizeCharacter(data) {

    return {

        character: {
            name: data?.character?.name,
            level: data?.character?.level,
            class: data?.character?.class
        },

        defence: {
            life: data?.stats?.life,
            mana: data?.stats?.mana,
            energyShield: data?.stats?.energyShield,
            movementSpeed: data?.stats?.movementSpeed,
            armour: data?.stats?.armour,
            evasion: data?.stats?.evasion
        },

        resistances: {
            fire: data?.stats?.fireResistance,
            cold: data?.stats?.coldResistance,
            lightning: data?.stats?.lightningResistance,
            chaos: data?.stats?.chaosResistance
        },

        items: (data?.items || []).map(item => ({
            slot: item?.inventoryId,
            name: item?.name,
            type: item?.typeLine,
            rarity: item?.rarity,

            implicits: item?.implicitMods || [],
            explicits: item?.explicitMods || [],

            socketedItems: item?.socketedItems || []
        })),

        passives: data?.passives || [],

        skills: data?.skills || []
    };
}

function json(data, status = 200) {

    return new Response(
        JSON.stringify(data, null, 2),
        {
            status,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        }
    );
}
