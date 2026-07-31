/* Cloudflare Worker: отдаёт статику и проксирует GitHub GraphQL с токеном.
   Токен хранится в секретах Cloudflare и в код не попадает. */

const QUERY = `
  query($login: String!) {
    user(login: $login) {
      login
      name
      avatarUrl
      followers { totalCount }
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }
      repositories(first: 100, isFork: false, ownerAffiliations: OWNER, orderBy: {field: PUSHED_AT, direction: DESC}) {
        totalCount
        nodes {
          name
          url
          stargazerCount
          pushedAt
          primaryLanguage { name color }
        }
      }
    }
  }
`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname !== "/api/github") {
      return env.ASSETS.fetch(request);
    }

    // Кэш на час, чтобы не тратить лимиты GitHub
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: "GET" });
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const gh = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env.GITHUB_TOKEN,
        "User-Agent": "personal-dashboard",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { login: env.GITHUB_LOGIN }
      })
    });

    const body = await gh.text();

    const res = new Response(body, {
      status: gh.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600"
      }
    });

    if (gh.ok) ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  }
};
