# Experiment E: Data & Research

**Unit**: search-and-research (352), data-and-analytics (39)
**Total skills**: 391

---

## Governance Angle

### Risk Classification Defaults

| Sub-group | Default Risk | Count (est.) | Rationale |
|---|---|---|---|
| Web search (Brave, Google, Bing) | **R2 READ** | ~40 | Read-only web queries |
| Academic research (arXiv, papers) | **R2 READ** | ~35 | Read-only paper access |
| Memory/knowledge base | **R3 TRANSFORM** | ~50 | Store/retrieve agent memory |
| Market data (stocks, crypto) | **R2 READ** (query) / **R5 TRANSACT** (trade) | ~45 | Read prices vs. execute trades |
| CRM/lead generation | **R3 TRANSFORM** | ~25 | Enrich/store contact data |
| Shopping/product search | **R2 READ** | ~20 | Product comparison |
| Flight/hotel search | **R2 READ** | ~15 | Travel search |
| File/document analysis | **R2 READ** | ~30 | Parse and extract |
| Social media intelligence | **R2 READ** | ~25 | Read/analyze social feeds |
| Content generation | **R3 TRANSFORM** | ~30 | Generate text/reports |
| Data analytics | **R3 TRANSFORM** | ~39 | Analyze/visualize data |

### Data Sensitivity Labels

| Label | Description | Applicable skills |
|---|---|---|
| **PII** | Personal identifiable information | `lead-generation`, `lead-extractor`, `happenstance`, `didit-face-search` |
| **FINANCIAL** | Stock prices, portfolio data | `finance-search-agent`, `financial-reconciler`, `fred-navigator` |
| **MEDICAL** | Health/clinical data | `clarity-clinical`, `hira-hospital`, `medical-specialty-briefs` |
| **GEOLOCATION** | Location data | `camino-*` series (7 skills), `ipinfo` |
| **CREDENTIAL** | API keys, tokens | `bagman` (key management) |
| **CONTENT-WEB** | Web-scraped content | All web search skills -- injection risk |

### Key Governance Risks

1. **Indirect prompt injection**: Web search results can contain adversarial instructions. Skills like `bing-search`, `hybrid-deep-search`, `exa-tool` fetch arbitrary web content. **Highest injection risk after browser category.**
2. **Data exfiltration**: Memory skills (`agent-brain`, `cortex-ai`, `engram`) persist data. Without labels, sensitive data could be stored in unencrypted memory.
3. **PII in lead generation**: `lead-generation`, `lead-extractor`, `lead-researcher` collect personal data. GDPR/CCPA compliance required.
4. **Academic integrity**: `academic-writer`, `academic-writing-refiner` generate academic text. Governance should flag potential plagiarism/fabrication.
5. **Financial advice**: `crypto-cog` claims "#1 on DeepResearch Bench"; users may treat agent output as investment advice. Disclaimer policy required.

### Read vs Write Classification

| Action | Risk | Example skills |
|---|---|---|
| **Search** (read web) | R2 | `bing-search`, `aisa-multi-source-search` |
| **Fetch** (download data) | R2 | `arxiv-watcher`, `amazon-data` |
| **Store** (persist to memory) | R3 | `agent-brain`, `enhanced-memory` |
| **Enrich** (add data to records) | R3 | `data-enricher`, `crm-data-cleaner` |
| **Generate** (create content) | R3 | `content-research`, `kitful` |
| **Publish** (post externally) | R4 | `agentarxiv`, `agentx-news` |
| **Trade** (execute financial) | R5 | `cabin` (book flights with USDC) |

### Replace / Complement / Enable Matrix

| Skill | Relationship | Notes |
|---|---|---|
| `clarity-gate` | **COMPLEMENT** | Epistemic quality verification for RAG; complements claws data labels |
| `osint-graph-analyzer` | **ENABLE** | Knowledge graphs from OSINT; uses @claws/data for typed access |
| `data-lineage-tracker` | **ENABLE** | Data origin tracking; aligns with @claws/audit |
| `truthcheck` | **COMPLEMENT** | Fact-checking claims; complements claws content verification |
| `blacksnow` | **ENABLE** | Pre-news risk signals; uses @claws/data for signal ingestion |

---

## Maker Angle

### @claws/data for Typed Data Access

```typescript
import { TypedQuery, DataLabel } from '@claws/data';

// Skill author declares data sensitivity
const query = new TypedQuery({
  source: 'web-search',
  label: DataLabel.CONTENT_WEB,
  sanitize: true, // strip potential injections
  cache: '5m'
});

const results = await query.execute('latest AI research');
// Results are labeled, sanitized, and cacheable
```

### @claws/relax for Query Validation

```typescript
import { validateResults } from '@claws/relax';

// Validate search results against expected schema
const validated = validateResults(results, {
  schema: 'search-result-v1',
  required: ['title', 'url', 'snippet'],
  forbidden: ['executable_content', 'script_tags'],
  max_results: 50
});
```

### Injection Defense Patterns

```typescript
import { sanitizeWebContent } from '@claws/security';

// Strip adversarial instructions from web content
const safe = sanitizeWebContent(rawHtml, {
  strip_instructions: true,  // remove "ignore previous instructions"
  strip_scripts: true,       // remove script tags
  max_length: 10000,         // truncate
  encoding: 'utf-8'
});
```

### Templates for Data Skills

| Template | Description |
|---|---|
| `skill-web-searcher` | Web search with injection defense and content labeling |
| `skill-data-enricher` | Data enrichment with PII detection and labeling |
| `skill-academic-reader` | Academic paper access with citation tracking |
| `skill-market-data` | Financial data with read-only enforcement and disclaimer |
| `skill-memory-store` | Agent memory with encryption and data labels |

### Key Maker Recommendations

1. **Content sanitization**: `@claws/security/sanitizeWebContent` required for all web-fetching skills
2. **Data labeling**: `@claws/data/label` auto-detects PII, FINANCIAL, MEDICAL in fetched data
3. **Query validation**: `@claws/relax` validates that fetched data matches expected schema
4. **Injection defense**: Default policy strips adversarial instructions from web content

---

## Summary Statistics

- Total skills analyzed: 391
- R2 READ skills: ~200 (51%)
- R3 TRANSFORM skills: ~120 (31%)
- R4 EXECUTE skills: ~30 (8%)
- R5 TRANSACT skills: ~10 (3%)
- PII-handling skills: ~30 (8%)
- Web content skills (injection risk): ~100 (26%)
- claws REPLACE: 0 | COMPLEMENT: 2 | ENABLE: 3
