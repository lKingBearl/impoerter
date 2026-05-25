export async function onRequest(context) {
    // Get the URL the user typed into the frontend
    const url = new URL(context.request.url);
    const targetPoeUrl = url.searchParams.get('url');

    if (!targetPoeUrl) {
        return new Response('Missing URL parameter', { status: 400 });
    }

    try {
        // Fetch the data server-side where CORS doesn't apply
        const response = await fetch(targetPoeUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        // Grab the raw text/HTML from the page
        const data = await response.text();

        // Send it back to your frontend
        return new Response(data, {
            headers: { 
                'Content-Type': 'text/plain',
                // Explicitly allow your frontend to read this response
                'Access-Control-Allow-Origin': '*' 
            }
        });
    } catch (err) {
        return new Response('Error fetching data from poe.ninja', { status: 500 });
    }
}
