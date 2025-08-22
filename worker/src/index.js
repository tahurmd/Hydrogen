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

    // Edge cache for GET requests
    const cacheable = (
      method === "GET" &&
      (
        path === '/elements' ||
        /^\/elements\/\d+$/.test(path) ||
        /^\/elements\/symbol\/[A-Za-z]{1,3}$/.test(path) ||
        /^\/elements\/name\/[A-Za-z]+$/.test(path) ||
        path === '/elements/categories' ||
        path === '/elements/liquid' ||
        path === '/elements/gas'
      )
    );
    const cache = caches.default;
    if (cacheable) {
      const cached = await cache.match(request);
      if (cached) {
        return new Response(await cached.text(), { status: 200, headers: corsHeaders });
      }
    }

    try {
      // Simple filter parser - only essential filters
      function parseFilters(searchParams) {
        const filters = {
          where: [],
          params: []
        };
        
        // Category filter
        if (searchParams.has('category')) {
          filters.where.push('LOWER(category) = LOWER(?)');
          filters.params.push(searchParams.get('category'));
        }
        
        // Physical state filter
        if (searchParams.has('state')) {
          filters.where.push('LOWER(standardState) = LOWER(?)');
          filters.params.push(searchParams.get('state'));
        }
        
        // Period filter
        if (searchParams.has('period')) {
          const period = Number(searchParams.get('period'));
          if (!isNaN(period) && period >= 1 && period <= 7) {
            filters.where.push('period = ?');
            filters.params.push(period);
          }
        }
        
        // Block filter (s, p, d, f)
        if (searchParams.has('block')) {
          filters.where.push('LOWER(block) = LOWER(?)');
          filters.params.push(searchParams.get('block'));
        }
        
        // Simple temperature filters (just greater than)
        if (searchParams.has('meltingPoint')) {
          const temp = Number(searchParams.get('meltingPoint'));
          if (!isNaN(temp)) {
            filters.where.push('meltingPointValue > ?');
            filters.params.push(temp);
          }
        }
        
        if (searchParams.has('boilingPoint')) {
          const temp = Number(searchParams.get('boilingPoint'));
          if (!isNaN(temp)) {
            filters.where.push('boilingPointValue > ?');
            filters.params.push(temp);
          }
        }
        
        // Simple density filter (just greater than)
        if (searchParams.has('density')) {
          const density = Number(searchParams.get('density'));
          if (!isNaN(density)) {
            filters.where.push('densityValue > ?');
            filters.params.push(density);
          }
        }
        
        return filters;
      }

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

      // Get all unique categories
      if (path === "/elements/categories" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT DISTINCT category FROM elements WHERE category IS NOT NULL ORDER BY category").all();
        const categories = results?.map(r => r.category) || [];
        const response = new Response(JSON.stringify({ categories }), {
          headers: { ...corsHeaders, "Cache-Control": "public, max-age=3600" }
        });
        if (cacheable) ctx.waitUntil(cache.put(request, response.clone()));
        return response;
      }

      // Get liquid elements
      if (path === "/elements/liquid" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM elements WHERE standardState = 'liquid' ORDER BY atomicNumber").all();
        const enriched = await Promise.all((results || []).map(enrichElement));
        const response = new Response(JSON.stringify(enriched), {
          headers: { ...corsHeaders, "Cache-Control": "public, max-age=3600" }
        });
        if (cacheable) ctx.waitUntil(cache.put(request, response.clone()));
        return response;
      }

      // Get gas elements
      if (path === "/elements/gas" && method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM elements WHERE standardState = 'gas' ORDER BY atomicNumber").all();
        const enriched = await Promise.all((results || []).map(enrichElement));
        const response = new Response(JSON.stringify(enriched), {
          headers: { ...corsHeaders, "Cache-Control": "public, max-age=3600" }
        });
        if (cacheable) ctx.waitUntil(cache.put(request, response.clone()));
        return response;
      }

      // GET all elements with simple filtering
      if (path === "/elements" && method === "GET") {
        let sql = "SELECT * FROM elements";
        let params = [];

        // Parse filters
        const filters = parseFilters(url.searchParams);
        
        // Keep existing group filter for backward compatibility
        if (url.searchParams.has("group")) {
          const group = Number(url.searchParams.get("group"));
          if (isNaN(group) || group < 1 || group > 18)
            return new Response(JSON.stringify({ error: "Invalid group parameter. Must be 1-18" }), { status: 400, headers: corsHeaders });
          filters.where.push("groupNumber = ?");
          filters.params.push(group);
        }

        // Apply WHERE clause if any filters exist
        if (filters.where.length > 0) {
          sql += " WHERE " + filters.where.join(" AND ");
          params = [...filters.params];
        }

        // Keep existing limit logic
        if (url.searchParams.has("limit")) {
          const limit = Number(url.searchParams.get("limit"));
          if (isNaN(limit) || limit < 1 || limit > 118)
            return new Response(JSON.stringify({ error: "Invalid limit parameter. Must be 1-118" }), { status: 400, headers: corsHeaders });
          sql += " LIMIT ?";
          params.push(limit);
        }

        sql += " ORDER BY atomicNumber";

        const { results } = await env.DB.prepare(sql).bind(...params).all();
        
        // For result sets > 10, don't enrich (performance)
        const shouldEnrich = (results?.length || 0) <= 10;
        const finalResults = shouldEnrich 
          ? await Promise.all((results || []).map(enrichElement))
          : (results || []);

        const response = new Response(JSON.stringify(finalResults), {
          headers: { ...corsHeaders, "Cache-Control": "public, max-age=3600" }
        });
        if (cacheable) ctx.waitUntil(cache.put(request, response.clone()));
        return response;
      }

      // GET by atomic number (unchanged)
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

      // GET by symbol (unchanged)
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

      // GET by name (unchanged)
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

      // API info endpoint - simplified
      if (path === "/" || path === "/api") {
        const info = {
          name: "Hydrogen Periodic Table API",
          version: "1.1.0",
          endpoints: {
            "GET /elements": "All elements with optional filtering",
            "GET /elements/{number}": "Element by atomic number",
            "GET /elements/symbol/{symbol}": "Element by symbol", 
            "GET /elements/name/{name}": "Element by name",
            "GET /elements/categories": "List all categories",
            "GET /elements/liquid": "Liquid elements",
            "GET /elements/gas": "Gas elements"
          },
          filters: {
            "Basic": "?group=1&limit=5",
            "Category": "?category=noble-gas",
            "Physical state": "?state=gas",
            "Period": "?period=3",
            "Block": "?block=d",
            "Temperature": "?meltingPoint=1000 (elements with melting point > 1000K)",
            "Density": "?density=5 (elements with density > 5 g/cm³)"
          },
          examples: [
            "/elements/1",
            "/elements/symbol/H", 
            "/elements?category=alkali-metal",
            "/elements?state=gas&limit=5",
            "/elements?period=3&block=p",
            "/elements/categories"
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