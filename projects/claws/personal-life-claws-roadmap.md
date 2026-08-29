# Personal-life Claws roadmap

Date: 2026-08-21

## Frame

Awesome Claws now has 66 Claws with strong coverage across work operations,
analysis, engineering, governance, household maintenance, and orchestration.
The next clear gap is the personal-life operating layer: entertainment,
subscriptions, local life, shopping, family logistics, and personal memory.

The roadmap should keep the current Claws discipline:

- one Claw owns one durable job;
- every artifact is source-backed and reviewable;
- account, purchase, booking, cancellation, posting, trading, medical, legal,
  and financial actions remain blocked or exact-approval-bound;
- manager Claws coordinate specialist artifacts without becoming the human
  owner.

## Priority lanes

### 1. Entertainment and taste

This is the strongest immediate lane because it is useful, concrete, and
distinct from existing work/business Claws.

#### Movie and streaming organizer

Purpose: Track movies and shows someone wants to watch, favorites, watched
history, household preferences, and where titles are available across the
streaming services they have.

Artifact shape:

- title watchlist with source ids;
- availability table by service: included, rent, buy, unavailable, unknown;
- household preference and age/rating constraints;
- watched/favorite/blocked states;
- review questions and watch-night shortlist.

Boundaries:

- do not rent, buy, subscribe, cancel, rate publicly, or post;
- do not bypass regional, account, or content restrictions;
- stale or missing availability must be explicit.

Distinctness:

- differs from Travel Concierge because it compares media availability rather
  than travel inventory;
- differs from Research Monitor because it maintains personal taste and watched
  state, not a generic source watch.

#### Music organizer

Purpose: Track favorite artists, albums, playlists, releases, concerts, shared
queues, and cross-service availability.

Artifact shape:

- artist/album/track ledger;
- playlist intent map by mood, activity, person, or event;
- release and concert watch items;
- service availability and library membership;
- shared household queue or party playlist handoff.

Boundaries:

- do not change account library, publish playlists, buy tickets, message guests,
  or alter subscriptions without exact approval;
- no claims about full catalog availability when sources are partial.

Distinctness:

- pairs with Movie and Streaming Organizer but focuses on recurring listening,
  playlists, artist follows, and live music.

#### Games backlog manager

Purpose: Track owned/wanted games across stores and platforms, play status,
co-op options, family/kid constraints, and what to play next.

Artifact shape:

- platform ownership ledger;
- backlog state: unplayed, playing, paused, completed, abandoned;
- multiplayer/co-op compatibility;
- age/content constraints;
- shortlist for solo, co-op, family, or low-time sessions.

Boundaries:

- do not purchase, install, join multiplayer sessions, message players, or
  change parental controls.

### 2. Subscriptions and spending hygiene

This lane turns entertainment from a taste tracker into household operating
evidence, without becoming a financial advisor or bank operator.

#### Subscription manager

Purpose: Track recurring subscriptions, renewal dates, usage evidence, price
changes, overlap, and cancellation questions.

Artifact shape:

- subscription ledger;
- renewal calendar;
- cost and usage evidence;
- duplicate/overlap findings;
- review questions for keep/cancel/downgrade decisions.

Boundaries:

- do not cancel, subscribe, downgrade, negotiate, or contact providers;
- do not connect bank accounts or infer private spending beyond supplied
  evidence.

Distinctness:

- broader than Movie/Music because it covers all recurring services;
- narrower than Household Steward because it owns only subscription evidence.

#### Household budget steward

Purpose: Review user-supplied bills, recurring expenses, categories, and
budget questions for a household.

Artifact shape:

- supplied spending snapshot;
- bill and renewal schedule;
- category totals;
- variance and question list;
- owner-review handoff.

Boundaries:

- no banking, payment, tax, legal, credit, or investment advice;
- no cancellation or vendor contact.

### 3. Personal memory and relationships

This lane extends from tasks to life continuity.

#### Personal archive curator

Purpose: Organize personal files, notes, links, receipts, photos, warranties,
and memories into a searchable, privacy-preserving index.

Artifact shape:

- archive inventory;
- source and privacy labels;
- folder/tag proposal;
- unresolved duplicates and unknowns;
- retrieval handoff.

Boundaries:

- do not delete, move, share, publish, or infer sensitive facts;
- do not train memory or upload private material without approval.

#### Gift and relationship manager

Purpose: Track birthdays, anniversaries, gift ideas, past gifts, preferences,
shipping windows, and relationship notes.

Artifact shape:

- people and occasion ledger;
- gift idea board;
- past gift history;
- budget and shipping constraints;
- draft-only message or purchase handoff.

Boundaries:

- do not buy, send, message, or reveal private notes;
- no manipulative persuasion or sensitive inference.

#### Life timeline keeper

Purpose: Maintain a human-reviewed timeline of important trips, milestones,
family events, moves, achievements, and document pointers.

Artifact shape:

- dated event timeline;
- people/place/source references;
- media/document pointers;
- unresolved memories and questions;
- privacy-scoped sharing plan.

Boundaries:

- no public posting, face recognition, legal interpretation, or sensitive
  disclosure without exact approval.

### 4. Family and school logistics

This lane is high-value but touches minors and school systems, so it should come
after consent/privacy patterns are mature.

#### School coordinator

Purpose: Track assignments, forms, teacher notes, school calendars, supply
lists, and parent review questions.

Artifact shape:

- student-safe task ledger;
- school event calendar;
- form and deadline tracker;
- draft-only teacher communication;
- parent handoff.

Boundaries:

- do not submit forms, message teachers, change enrollment, disclose student
  details, or make education/medical/legal decisions.

#### Child activity manager

Purpose: Coordinate sports, lessons, camps, equipment, carpools, fees, and
family logistics.

Artifact shape:

- activity roster;
- schedule and location summary;
- equipment checklist;
- carpool/guardian approval state;
- blocked actions.

Boundaries:

- no registration, payment, messaging, location sharing, or pickup commitments
  without guardian approval.

### 5. Local life and discovery

This lane gives everyday usefulness while preserving external-action boundaries.

#### Restaurant and venue scout

Purpose: Track places to try, favorites, dietary constraints, accessibility,
hours, reservation options, and group preferences.

Artifact shape:

- venue shortlist;
- source freshness;
- dietary/accessibility evidence;
- reservation/purchase handoff;
- group preference notes.

Boundaries:

- do not reserve, order, pay, message, or post reviews without approval.

#### Local events watcher

Purpose: Track concerts, theater, sports, community events, and family-friendly
options.

Artifact shape:

- event watchlist;
- date/location/availability freshness;
- ticketing and accessibility notes;
- conflict view;
- review shortlist.

Boundaries:

- do not buy tickets, join waitlists, contact venues, or modify calendars
  without approval.

#### Neighborhood operations watcher

Purpose: Track trash/recycling schedules, road closures, permit notices, school
board items, local alerts, and utility work.

Artifact shape:

- neighborhood source list;
- alert and schedule ledger;
- impacted household routines;
- owner question list.

Boundaries:

- public-source only by default;
- no complaints, calls, postings, or municipal submissions without approval.

### 6. Shopping and ownership

This lane overlaps with home inventory and subscriptions but remains distinct
when scoped to purchase research and owned-item evidence.

#### Purchase researcher

Purpose: Compare products from approved sources, reviews, constraints,
warranties, return windows, and owner questions.

Artifact shape:

- candidate comparison;
- source and review-quality ledger;
- fit-to-constraints notes;
- warranty/return summary;
- purchase handoff.

Boundaries:

- do not buy, subscribe, open credit, contact sellers, or claim objective best
  without evidence.

#### Wardrobe organizer

Purpose: Track clothing inventory, sizes, outfit needs, alterations, dry
cleaning, packing lists, and gaps.

Artifact shape:

- item inventory;
- size/fit notes;
- outfit/event map;
- care/alteration list;
- shopping questions.

Boundaries:

- do not buy, donate, sell, share photos, or infer body/health details.

#### Home inventory binder

Purpose: Track possessions, serials, receipts, photos, warranty links, rooms,
and insurance-ready evidence.

Artifact shape:

- item ledger;
- photo/receipt/source pointers;
- warranty and serial state;
- room/category inventory;
- insurance question handoff.

Boundaries:

- no insurance/legal advice;
- do not expose addresses or valuables publicly;
- no claims submission without approval.

## Recommended sequence

1. **Movie and Streaming Organizer**
   - Best first choice: vivid, useful, low-risk, and clearly different from
     current Claws.
2. **Subscription Manager**
   - Natural partner to streaming/music; gives household value and spending
     hygiene without account authority.
3. **Music Organizer**
   - Builds the entertainment/taste lane and can reuse availability and
     preference patterns from movies.
4. **Gift and Relationship Manager**
   - Adds personal-memory usefulness with clear privacy boundaries.
5. **Personal Archive Curator**
   - Strong but riskier; should reuse privacy/source patterns from Care Circle
     and Gift Manager.
6. **Restaurant and Venue Scout**
   - Everyday discovery; clear reservation/order boundaries.
7. **Local Events Watcher**
   - Complements Sports Team Watcher and Restaurant/Venue Scout.
8. **School Coordinator**
   - High value but minor/privacy-sensitive; do after relationship/archive
     boundaries mature.
9. **Games Backlog Manager**
   - Useful and distinct, but lower priority than streaming/music.
10. **Home Inventory Binder**
   - Pairs with Appliance Care/Home Repair and insurance evidence.

## Manager composition opportunities

The new personal-life Claws should be designed so manager Claws can coordinate
them without absorbing their authority.

- **Household Steward** can coordinate Subscription Manager, Movie and
  Streaming Organizer, Music Organizer, School Coordinator, Child Activity
  Manager, Restaurant/Venue Scout, and Home Inventory Binder across household
  members.
- **Care Circle Coordinator** can reference Restaurant/Venue Scout, Local Events
  Watcher, Gift Manager, and School/Activity work only when recipient or
  guardian consent scopes permit it.
- **Work Chief of Staff** should generally not manage personal-life Claws except
  where work artifacts are explicitly involved, such as Presentation Producer,
  Content Operations, Research Briefing, or Meeting Intelligence.
- **Delegation Coordinator** can be the generic multi-worker proof substrate for
  Movie/Music availability checks, purchase comparisons, or archive indexing,
  but should return artifacts to the owning specialist Claw.

## Admission rules for the next wave

Each new Claw should ship with:

- proposal review against nearest existing Claws;
- structured schema, fixture, and handoff template;
- semantic validator with at least two domain-specific negative tests;
- real Control UI screenshot;
- `npm run check`;
- focused `prepare:claw` and `test:claw`;
- OpenClaw preview proof when available.

Avoid adding a new Claw if it only differs by source list. Prefer a new Claw
when it adds a distinct durable state model, authority boundary, or manager
composition role.
