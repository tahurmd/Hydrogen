import fs from "fs/promises";
import path from "path";
import Ajv from "ajv";

const DATA_DIR = "data/elements";
const SCHEMA_FILE = "data/schemas/element.schema.json";

async function main() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const schema = JSON.parse(await fs.readFile(SCHEMA_FILE, "utf8"));
  const validate = ajv.compile(schema);

  const files = (await fs.readdir(DATA_DIR)).filter(f => f.endsWith('.json')).sort();

  let allOk = true;
  for (const filename of files) {
    const filepath = path.join(DATA_DIR, filename);
    const data = JSON.parse(await fs.readFile(filepath, "utf8"));
    const valid = validate(data);
    if (!valid) {
      allOk = false;
      console.error(`❌ ${filename} failed validation:`);
      for (const err of validate.errors) {
        console.error(`  - ${err.instancePath}: ${err.message}`);
      }
    } else {
      console.log(`✅ ${filename} is valid.`);
    }
  }
  if (!allOk) {
    process.exit(1);
  } else {
    console.log(`\nAll files validated successfully.`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
