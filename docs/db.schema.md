# Database Schema for hydrogen (Periodic Table Project)

## 1. elements
| Field               | Type     | Notes                        |
|---------------------|----------|------------------------------|
| atomicNumber        | INTEGER  | PRIMARY KEY, 1–118           |
| symbol              | TEXT     | Unique, not null             |
| name                | TEXT     | Unique, not null             |
| category            | TEXT     |                              |
| groupNum            | INTEGER  | NULL allowed                 |
| period              | INTEGER  | NOT NULL                     |
| block               | TEXT     | s, p, d, f                   |
| atomicMass          | REAL     |                              |
| standardState       | TEXT     | [solid, liquid, gas, unknown]|
| density             | REAL     | kg/m³                        |
| densityConditions   | TEXT     |                              |
| meltingPoint        | REAL     | Kelvin                       |
| boilingPoint        | REAL     | Kelvin                       |
| electronegativity   | REAL     | Pauling scale                |
| electronConfiguration | TEXT   |                              |
| discoveredBy        | TEXT     |                              |
| discoveryYear       | INTEGER  |                              |
| summary             | TEXT     |                              |

## 2. oxidation_states
| atomicNumber | oxidationState |
|--------------|---------------|

## 3. uses
| atomicNumber | useDescription |

## 4. sources
| atomicNumber | sourceDescription |

## 5. metadata
| key          | value            |
