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
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Referer": "https://poe.ninja/",
                "Origin": "https://poe.ninja"
            }
        });

        // DEBUGGING RESPONSE
        const text = await response.text();

        // Try parsing JSON safely
        let rawData;

        try {
            rawData = JSON.parse(text);
        } catch {

            return json({
                error: "Response was not JSON",
                status: response.status,
                contentType: response.headers.get("content-type"),
                preview: text.substring(0, 4000)
            }, 500);
        }

        // NORMALIZE DATA
        const normalized = normalizeCharacter(rawData);

        return json(normalized);

    } catch (err) {

        return json({
            error: err.message,
            stack: err.stack
        }, 500);
    }
}

function normalizeCharacter(data) {

    return {

        character: {
            name:
                data?.character?.name ||
                data?.name ||
                null,

            level:
                data?.character?.level ||
                data?.level ||
                null,

            class:
                data?.character?.class ||
                data?.class ||
                null
        },

        stats:
            data?.stats || {},

        items: (data?.items || []).map(item => ({

            slot:
                item?.inventoryId || null,

            name:
                item?.name || null,

            baseType:
                item?.typeLine || null,

            rarity:
                item?.rarity || null,

            itemLevel:
                item?.ilvl || null,

            implicits:
                item?.implicitMods || [],

            explicits:
                item?.explicitMods || [],

            crafted:
                item?.craftedMods || [],

            enchantments:
                item?.enchantMods || [],

            fractured:
                item?.fracturedMods || [],

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
            data?.skills || [],

        raw:
            data
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
