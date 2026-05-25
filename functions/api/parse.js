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
        // Fetch profile page HTML
        const htmlResponse = await fetch(profileUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        const html = await htmlResponse.text();

        // STEP 2:
        // Much simpler regex
        const modelMatch = html.match(/model\/(\d+)/);

        // DEBUGGING
        if (!modelMatch) {

            return json({
                error: "Model ID not found",
                debug: html.substring(0, 5000)
            }, 500);
        }

        const modelId = modelMatch[1];

        // STEP 3:
        // Build API URL
        const apiUrl =
            `https://poe.ninja/poe2/api/profile/characters/${account}/${league}/${character}/model/${modelId}`;

        // STEP 4:
        // Fetch actual structured JSON
        const apiResponse = await fetch(apiUrl, {
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0"
            }
        });

        if (!apiResponse.ok) {
            return json({
                error: "Failed to fetch API",
                status: apiResponse.status,
                apiUrl
            }, 500);
        }

        const rawData = await apiResponse.json();

        // DEBUG FIRST
        // return json(rawData);

        // STEP 5:
        // Normalize for LLM use
        const normalized = normalizeCharacter(rawData);

        return json(normalized);

    } catch (err) {

        return json({
            error: err.message,
            stack: err.stack
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
        account: decodeURIComponent(match[1]),
        league: decodeURIComponent(match[2]),
        character: decodeURIComponent(match[3])
    };
}

function normalizeCharacter(data) {

    return {

        character: {
            name:
                data?.character?.name ||
                data?.name,

            level:
                data?.character?.level ||
                data?.level,

            class:
                data?.character?.class ||
                data?.class
        },

        defence: {
            life:
                data?.stats?.life,

            mana:
                data?.stats?.mana,

            energyShield:
                data?.stats?.energyShield,

            movementSpeed:
                data?.stats?.movementSpeed,

            armour:
                data?.stats?.armour,

            evasion:
                data?.stats?.evasion
        },

        resistances: {
            fire:
                data?.stats?.fireResistance,

            cold:
                data?.stats?.coldResistance,

            lightning:
                data?.stats?.lightningResistance,

            chaos:
                data?.stats?.chaosResistance
        },

        items: (data?.items || []).map(item => ({

            slot:
                item?.inventoryId,

            name:
                item?.name,

            type:
                item?.typeLine,

            rarity:
                item?.rarity,

            implicits:
                item?.implicitMods || [],

            explicits:
                item?.explicitMods || [],

            crafted:
                item?.craftedMods || [],

            enchantments:
                item?.enchantMods || [],

            socketedItems:
                item?.socketedItems || []
        })),

        passives:
            data?.passives || [],

        skills:
            data?.skills || [],

        raw: {
            modelId:
                data?.modelId
        }
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
