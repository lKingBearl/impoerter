export async function onRequest(context) {

    const requestUrl = new URL(context.request.url);
    const apiUrl = requestUrl.searchParams.get("url");

    if (!apiUrl) {
        return json({
            error: "Missing API URL"
        }, 400);
    }

    try {

        const response = await fetch(apiUrl, {
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0"
            }
        });

        if (!response.ok) {

            return json({
                error: "API request failed",
                status: response.status
            }, 500);
        }

        const rawData = await response.json();

        // DEBUG FIRST
        // return json(rawData);

        const normalized = normalizeCharacter(rawData);

        return json(normalized);

    } catch (err) {

        return json({
            error: err.message
        }, 500);
    }
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

        stats: data?.stats || {},

        items: (data?.items || []).map(item => ({

            slot:
                item?.inventoryId,

            name:
                item?.name,

            baseType:
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

            properties:
                item?.properties || [],

            requirements:
                item?.requirements || [],

            sockets:
                item?.sockets || [],

            socketedItems:
                item?.socketedItems || []
        })),

        passives:
            data?.passives || [],

        skills:
            data?.skills || []
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
