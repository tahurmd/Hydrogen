export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    // Handle preflight requests
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Edge cache only for GETs and select API routes!
    const cacheable = (
      method === "GET" &&
      (
        path === '/elements' ||
        /^\/elements\/\d+$/.test(path) ||
        /^\/elements\/symbol\/[A-Za-z]{1,3}$/.test(path) ||
        /^\/elements\/name\/[A-Za-z]+$/.test(path)
      )
    );
    const cache = caches.default;
    if (cacheable) {
      const cached = await cache.match(request);
      if (cached) {
        // Return cached value, adding CORS header just in case
        return new Response(await cached.text(), { status: 200, headers: corsHeaders });
      }
    }

    try {
      async function enrichElement(element) {
        if (!element) return null;

        const [uses, oxidationStates, sources] = await Promise.all([
          env.DB.prepare("SELECT useDescription FROM element_uses WHERE atomicNumber = ?").bind(element.atomicNumber).all(),
          env.DB.prepare("SELECT oxidationState FROM oxidation_states WHERE atomicNumber = ?").bind(element.atomicNumber).all(),
          env.DB.prepare("SELECT sourceDescription FROM element_sources WHERE atomicNumber = ?").bind(element.atomicNumber).all()
        ]);

        element.uses = uses.results?.map(u => u.useDescription) || [];
        element.oxidationStates = oxidationStates.results?.map(o => o.oxidationState) || [];
        element.sources = sources.results?.map(s => s.sourceDescription) || [];

        return element;
      }

      // GET all elements
      if (path === "/elements" && method === "GET") {
        let sql = "SELECT * FROM elements";
        const params = [];

        if (url.searchParams.has("group")) {
          const group = Number(url.searchParams.get("group"));
          if (isNaN(group) || group < 1 || group > 18)
            return new Response(JSON.stringify({ error: "Invalid group parameter. Must be 1-18" }), { status: 400, headers: corsHeaders });
          sql += " WHERE groupNumber = ?";
          params.push(group);
        }
        if (url.searchParams.has("limit")) {
          const limit = Number(url.searchParams.get("limit"));
          if (isNaN(limit) || limit < 1 || limit > 118)
            return new Response(JSON.stringify({ error: "Invalid limit parameter. Must be 1-118" }), { status: 400, headers: corsHeaders });
          sql += params.length ? " LIMIT ?" : " LIMIT ?";
          params.push(limit);
        }
        sql += " ORDER BY atomicNumber";

        const { results } = await env.DB.prepare(sql).bind(...params).all();
        const response = new Response(JSON.stringify(results || []), {
          headers: { ...corsHeaders, "Cache-Control": "public, max-age=3600" }
        });
        if (cacheable) ctx.waitUntil(cache.put(request, response.clone())); // store in edge cache
        return response;
      }

      // GET by atomic number
      let match = path.match(/^\/elements\/(\d+)$/);
      if (match && method === "GET") {
        const atomicNumber = Number(match[1]);
        if (atomicNumber < 1 || atomicNumber > 118)
          return new Response(JSON.stringify({ error: "Invalid atomic number. Must be 1-118" }), { status: 400, headers: corsHeaders });

        const element = await env.DB.prepare("SELECT * FROM elements WHERE atomicNumber = ?")
          .bind(atomicNumber).first();

        if (!element)
          return new Response(JSON.stringify({ error: "Element not found" }), { status: 404, headers: corsHeaders });

        const enriched = await enrichElement(element);
        const response = new Response(JSON.stringify(enriched), {
          headers: { ...corsHeaders, "Cache-Control": "public, max-age=3600" }
        });
        if (cacheable) ctx.waitUntil(cache.put(request, response.clone()));
        return response;
      }

      // GET by symbol
      match = path.match(/^\/elements\/symbol\/([A-Za-z]{1,3})$/);
      if (match && method === "GET") {
        const symbol = match[1];
        const element = await env.DB.prepare("SELECT * FROM elements WHERE LOWER(symbol) = LOWER(?)")
          .bind(symbol).first();
        if (!element)
          return new Response(JSON.stringify({ error: "Element not found" }), { status: 404, headers: corsHeaders });
        const enriched = await enrichElement(element);
        const response = new Response(JSON.stringify(enriched), {
          headers: { ...corsHeaders, "Cache-Control": "public, max-age=3600" }
        });
        if (cacheable) ctx.waitUntil(cache.put(request, response.clone()));
        return response;
      }

      // GET by name
      match = path.match(/^\/elements\/name\/([A-Za-z]+)$/);
      if (match && method === "GET") {
        const name = match[1];
        const element = await env.DB.prepare("SELECT * FROM elements WHERE LOWER(name) = LOWER(?)")
          .bind(name).first();
        if (!element)
          return new Response(JSON.stringify({ error: "Element not found" }), { status: 404, headers: corsHeaders });
        const enriched = await enrichElement(element);
        const response = new Response(JSON.stringify(enriched), {
          headers: { ...corsHeaders, "Cache-Control": "public, max-age=3600" }
        });
        if (cacheable) ctx.waitUntil(cache.put(request, response.clone()));
        return response;
      }

      // API info endpoint
      if (path === "/" || path === "/api") {
        const info = {
          name: "Hydrogen Periodic Table API",
          version: "1.0.0",
          endpoints: {
            "GET /elements": "All elements (query: ?group=N&limit=N)",
            "GET /elements/{number}": "Element by atomic number",
            "GET /elements/symbol/{symbol}": "Element by symbol", 
            "GET /elements/name/{name}": "Element by name"
          },
          examples: [
            "/elements/1",
            "/elements/symbol/H",
            "/elements/name/hydrogen",
            "/elements?group=1&limit=5"
          ]
        };
        return new Response(JSON.stringify(info, null, 2), { headers: corsHeaders });
      }

      // 404
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });

    } catch (error) {
      console.error("Database error:", error);
      return new Response(JSON.stringify({
        error: "Internal server error",
        message: "Database operation failed"
      }), { status: 500, headers: corsHeaders });
    }
  }
};
