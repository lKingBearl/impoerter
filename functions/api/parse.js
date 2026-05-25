export async function onRequest(context) {

    const url = new URL(context.request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
        return new Response(
            JSON.stringify({
                error: "Missing URL"
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }

    try {

        // Fetch page HTML
        const response = await fetch(targetUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0"
            }
        });

        const html = await response.text();

        // Try extracting Next.js payload
        const match = html.match(
            /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/
        );

        if (!match) {

            return new Response(
                JSON.stringify({
                    error: "__NEXT_DATA__ not found",
                    debug:
                        "Site may use another hydration method"
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        // Parse hydration JSON
        const nextData = JSON.parse(match[1]);

        // TEMPORARY:
        // Return raw payload first
        return new Response(
            JSON.stringify(nextData, null, 2),
            {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            }
        );

    } catch (err) {

        return new Response(
            JSON.stringify({
                error: err.message
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }
}
