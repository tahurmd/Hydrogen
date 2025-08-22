# Hydrogen Periodic Table API

Open-source periodic table data, API-powered by Cloudflare Workers + D1.  
Easily query any element by atomic number, symbol, name, or group.

---

## 🌐 API Base URL
https://hydrogen.mdtahur23.workers.dev

text

---

## 📢 Endpoints

| Route                                         | Description                                 |
|-----------------------------------------------|---------------------------------------------|
| `/elements`                                   | List all elements                           |
| `/elements/{atomicNumber}`                    | Get element by atomic number (e.g. `/8`)    |
| `/elements/symbol/{symbol}`                   | Get element by symbol (case-insensitive)    |
| `/elements/name/{name}`                       | Get element by name (case-insensitive)      |
| `/elements?groupNumber=N`                     | Filter by group ("groupNumber": 1–18)       |

---

## 💡 Example Requests

Get element Oxygen (atomic #8):

curl https://hydrogen.mdtahur23.workers.dev/elements/8



Get by symbol (Lithium):

curl https://hydrogen.mdtahur23.workers.dev/elements/symbol/Li



Get all Alkali metals (groupNumber 1):

curl "https://hydrogen.mdtahur23.workers.dev/elements?groupNumber=1"


---

## 🔎 Sample Response

{
"atomicNumber": 8,
"symbol": "O",
"name": "Oxygen",
"category": "diatomic nonmetal",
"groupNumber": 16,
"period": 2,
"block": "p",
"atomicMass": 15.999,
"standardState": "gas",
"density": { "value": 1.429, "conditions": "0°C, 1 atm" },
"meltingPoint": { "value": 54.36, "unit": "K" },
"boilingPoint": { "value": 90.2, "unit": "K" },
"electronegativity": 3.44,
"electronConfiguration": "1s2 2s2 2p4",
"discoveredBy": "Carl Wilhelm Scheele and Joseph Priestley",
"discoveryYear": 1774,
"summary": "Oxygen is a highly reactive nonmetal essential for combustion and respiration.",
"oxidationStates": [-2, -1, 1, 2],
"uses": ["steel production", "medical oxygen", "rocket fuel oxidizer", "water treatment"],
"sources": ["air separation", "water electrolysis", "photosynthesis"]
}



---

## ⚙️ Developer Documentation

- **Schema:** See [`schemas/element.schema.json`](schemas/element.schema.json) for the JSON model.
- **Stack:** Node.js 18+, Cloudflare D1, Wrangler, SQLite, Ajv
- **Data:** 118 elements, validated and normalized.

## 🔨 Local Workflow

npm install
npm run validate # Validate JSON files
npm run import-d1 # Generate import.sql for DB
npm run schema:create # (re)create schema on D1 (local)
npm run schema:create:remote # (re)create schema on D1 (cloud)
npm run deploy-data:remote # Import elements into cloud D1
npm run deploy # Deploy the Worker API



---

## 🚩 License

MIT © mdtahur23 and contributors

---

## 🙌 Contributing

Pull requests, issues and forks welcome!  
See CONTRIBUTING.md for guidelines.

---

## 👏 Attribution

See element `"attribution"` fields and CREDITS.md for sources and references.

---

**Live API:** [https://hydrogen.mdtahur23.workers.dev](https://hydrogen.mdtahur23.workers.dev)