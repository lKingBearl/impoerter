export async function onRequest(context) {
    const url = new URL(context.request.url);
    const targetPoeUrl = url.searchParams.get('url');

    if (!targetPoeUrl) {
        return new Response('Missing URL parameter', { status: 400 });
    }

    try {
        const response = await fetch(targetPoeUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'RSC': '1' // <--- THE MAGIC KEY: Forces the server to return raw JSON chunks instead of HTML
            }
        });
        
        const data = await response.text();

        return new Response(data, {
            headers: { 
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*' 
            }
        });
    } catch (err) {
        return new Response('Error fetching data from poe.ninja', { status: 500 });
    }
}
