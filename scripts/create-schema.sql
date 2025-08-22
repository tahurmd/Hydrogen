-- Main elements table matching your schema structure
CREATE TABLE IF NOT EXISTS elements (
  atomicNumber      INTEGER PRIMARY KEY CHECK (atomicNumber BETWEEN 1 AND 118),
  symbol            TEXT UNIQUE NOT NULL,
  name              TEXT UNIQUE NOT NULL,
  category          TEXT NOT NULL,
  groupNumber       INTEGER, 
  period            INTEGER NOT NULL,
  block             TEXT NOT NULL,
  atomicMass        REAL,
  standardState     TEXT,
  
  -- Density object flattened
  densityValue      REAL,
  densityConditions TEXT,
  
  -- MeltingPoint object flattened  
  meltingPointValue REAL,
  meltingPointUnit  TEXT,
  
  -- BoilingPoint object flattened
  boilingPointValue REAL,
  boilingPointUnit  TEXT,
  
  -- IonizationEnergy object flattened
  ionizationEnergyValue REAL,
  ionizationEnergyUnit  TEXT,
  
  electronegativity     REAL,
  electronConfiguration TEXT,
  discoveredBy          TEXT,
  discoveryYear         INTEGER,
  summary               TEXT NOT NULL
);

-- Normalized tables for arrays
CREATE TABLE IF NOT EXISTS oxidation_states (
  atomicNumber    INTEGER NOT NULL,
  oxidationState  INTEGER NOT NULL,
  FOREIGN KEY (atomicNumber) REFERENCES elements(atomicNumber)
);

CREATE TABLE IF NOT EXISTS element_uses (
  atomicNumber    INTEGER NOT NULL,
  useDescription  TEXT NOT NULL,
  FOREIGN KEY (atomicNumber) REFERENCES elements(atomicNumber)
);

CREATE TABLE IF NOT EXISTS element_sources (
  atomicNumber      INTEGER NOT NULL,
  sourceDescription TEXT NOT NULL,
  FOREIGN KEY (atomicNumber) REFERENCES elements(atomicNumber)
);

CREATE TABLE IF NOT EXISTS element_attributions (
  atomicNumber     INTEGER NOT NULL,
  attributionText  TEXT NOT NULL,
  FOREIGN KEY (atomicNumber) REFERENCES elements(atomicNumber)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_elements_symbol ON elements(symbol);
CREATE INDEX IF NOT EXISTS idx_elements_name ON elements(name);
CREATE INDEX IF NOT EXISTS idx_elements_category ON elements(category);
CREATE INDEX IF NOT EXISTS idx_elements_period ON elements(period);
CREATE INDEX IF NOT EXISTS idx_elements_group ON elements(groupNumber);
