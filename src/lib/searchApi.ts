import { WebSearchResult } from '../types/database';

export async function fetchLiveWebSearch(query: string): Promise<WebSearchResult[]> {
  if (!query.trim()) return [];

  const cleanQuery = query.trim();
  // Wikipedia OpenSearch API endpoint (CORS-friendly with origin=*)
  const endpoint = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
    cleanQuery
  )}&limit=12&namespace=0&format=json&origin=*`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error('Search request failed with status ' + res.status);
    const data = await res.json();

    // Format: [query, [titles], [descriptions], [urls]]
    const titles: string[] = data[1] || [];
    const snippets: string[] = data[2] || [];
    const urls: string[] = data[3] || [];

    const results: WebSearchResult[] = titles.map((title, index) => {
      // Create readable snippet or fallback
      let snippet = snippets[index] || '';
      if (!snippet || snippet.length < 5) {
        snippet = `Explore encyclopedic and live factual knowledge about ${title} on Wikipedia.`;
      }
      return {
        title,
        snippet,
        url: urls[index] || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      };
    });

    return results;
  } catch (err) {
    console.error('Error fetching live web results:', err);
    throw new Error('Unable to complete web search. Please check your network connection.');
  }
}
