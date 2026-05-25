export async function onRequest(context) {

    const requestUrl = new URL(context.request.url);
    const inputUrl = requestUrl.searchParams.get("url");

    if (!inputUrl) {
        return json({
            error: "Missing URL"
        }, 400);
    }

    try {

        let apiUrl = inputUrl;

        // If normal profile URL pasted
        if (
            inputUrl.includes("/profile/") &&
            !inputUrl.includes("/api/")
        ) {

            // Fetch profile HTML SERVER SIDE
            const htmlResponse = await fetch(inputUrl, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0"
                }
            });

            const html =
                await htmlResponse.text();

            // Find API model endpoint
            const match =
                html.match(
                    /\/poe2\/api\/profile\/characters\/.*?\/model\/\d+/
                );

            if (!match) {

                return json({
                    error:
                        "Could not locate model API URL"
                }, 500);
            }

            apiUrl =
                "https://poe.ninja" +
                match[0];
        }

        // Fetch actual JSON
        const apiResponse =
            await fetch(apiUrl, {
                headers: {
                    "Accept":
                        "application/json",
                    "User-Agent":
                        "Mozilla/5.0",
                    "Referer":
                        "https://poe.ninja/"
                }
            });

        const text =
            await apiResponse.text();

        let rawData;

        try {

            rawData =
                JSON.parse(text);

        } catch {

            return json({
                error:
                    "Response was not JSON",
                preview:
                    text.substring(0, 4000)
            }, 500);
        }

        const normalized =
            normalizeCharacter(rawData);

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

        items:
            (data?.items || []).map(item => ({

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
                "Content-Type":
                    "application/json",
                "Access-Control-Allow-Origin":
                    "*"
            }
        }
    );
}
