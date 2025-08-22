import fs from "fs/promises";
import path from "path";

const DATA_DIR = "data/elements";
const OUTPUT = "import.sql";

function safe(str) {
  return str == null ? "" : String(str).replace(/'/g, "''");
}

function safeNum(num) {
  return (num === null || num === undefined) ? "NULL" : num;
}

async function main() {
  const files = (await fs.readdir(DATA_DIR)).filter(f => f.endsWith('.json')).sort();
  let sql = [];

  for (const filename of files) {
    const raw = await fs.readFile(path.join(DATA_DIR, filename), "utf8");
    const element = JSON.parse(raw);

    // Extract nested object values to match your schema
    const densityValue = element.density?.value;
    const densityConditions = element.density?.conditions;
    const meltingPointValue = element.meltingPoint?.value;
    const meltingPointUnit = element.meltingPoint?.unit;
    const boilingPointValue = element.boilingPoint?.value;
    const boilingPointUnit = element.boilingPoint?.unit;
    const ionizationEnergyValue = element.ionizationEnergy?.value;
    const ionizationEnergyUnit = element.ionizationEnergy?.unit;
    const normalizedCategory = element.category
  ? element.category.replace(/\s+/g, '-').toLowerCase()
  : '';

    // Updated INSERT to match your actual schema structure
    sql.push(`
INSERT INTO elements (
  atomicNumber, symbol, name, category, groupNumber, period, block, atomicMass, standardState,
  densityValue, densityConditions, meltingPointValue, meltingPointUnit, 
  boilingPointValue, boilingPointUnit, ionizationEnergyValue, ionizationEnergyUnit,
  electronegativity, electronConfiguration, discoveredBy, discoveryYear, summary
) VALUES (
  ${element.atomicNumber},
  '${safe(element.symbol)}',
  '${safe(element.name)}',
  '${safe(normalizedCategory)}',
${safeNum(element.groupNumber)},          
  ${element.period},
  '${safe(element.block)}',
  ${safeNum(element.atomicMass)},
  '${safe(element.standardState)}',
  ${safeNum(densityValue)},
  '${safe(densityConditions)}',
  ${safeNum(meltingPointValue)},
  '${safe(meltingPointUnit)}',
  ${safeNum(boilingPointValue)},
  '${safe(boilingPointUnit)}',
  ${safeNum(ionizationEnergyValue)},
  '${safe(ionizationEnergyUnit)}',
  ${safeNum(element.electronegativity)},
  '${safe(element.electronConfiguration)}',
  '${safe(element.discoveredBy)}',
  ${safeNum(element.discoveryYear)},
  '${safe(element.summary)}'
);`.trim());

    // Rest of your array handling code stays the same
    if (Array.isArray(element.oxidationStates)) {
      for (const ox of element.oxidationStates) {
        if (ox !== null && ox !== undefined) {
          sql.push(`INSERT INTO oxidation_states (atomicNumber, oxidationState) VALUES (${element.atomicNumber}, ${ox});`);
        }
      }
    }

    if (Array.isArray(element.uses)) {
      for (const use of element.uses) {
        if (use) {
          sql.push(`INSERT INTO element_uses (atomicNumber, useDescription) VALUES (${element.atomicNumber}, '${safe(use)}');`);
        }
      }
    }

    if (Array.isArray(element.sources)) {
      for (const source of element.sources) {
        if (source) {
          sql.push(`INSERT INTO element_sources (atomicNumber, sourceDescription) VALUES (${element.atomicNumber}, '${safe(source)}');`);
        }
      }
    }

    // Add attribution handling from your schema  
    if (Array.isArray(element.attribution)) {
      for (const attr of element.attribution) {
        if (attr) {
          sql.push(`INSERT INTO element_attributions (atomicNumber, attributionText) VALUES (${element.atomicNumber}, '${safe(attr)}');`);
        }
      }
    }
  }

  await fs.writeFile(OUTPUT, sql.join("\n") + "\n");
  console.log(`✅ SQL import file created: ${OUTPUT}`);
  console.log(`Next: wrangler d1 execute hydrogen-db --file=${OUTPUT}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
