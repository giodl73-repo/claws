/**
 * plugin-specs.mjs — generates a list of synthetic 3rd-party plugin specs.
 * 50 plugin domains × 1-2 maturity variations = ~70-100 happy-path specs.
 *
 * Run via: node scripts/run-gen.mjs (which imports this and feeds gen-plugin-fixture.mjs)
 */

const DOMAINS = {
  // domain → list of [pluginName, [tools], optionalSkills]
  // tools: each is [id, risk(1-5), caps[]]
  communication: [
    ['discord', [['post-message', 2, ['COMMUNICATE']], ['list-channels', 1, ['READ']], ['react', 1, ['COMMUNICATE']]]],
    ['slack', [['post-message', 2, ['COMMUNICATE']], ['list-channels', 1, ['READ']], ['upload-file', 3, ['COMMUNICATE', 'WRITE']]]],
    ['telegram', [['send-message', 2, ['COMMUNICATE']], ['get-updates', 1, ['READ']]]],
    ['signal', [['send-message', 2, ['COMMUNICATE']], ['list-conversations', 1, ['READ']]]],
    ['whatsapp', [['send-message', 2, ['COMMUNICATE']], ['list-chats', 1, ['READ']]]],
    ['sms', [['send-sms', 5, ['COMMUNICATE', 'IRREVERSIBLE_EXTERNAL']]]],
    ['voice-call', [['initiate-call', 5, ['COMMUNICATE', 'IRREVERSIBLE_EXTERNAL']], ['list-recent', 1, ['READ']]]],
    ['email', [['send-email', 5, ['COMMUNICATE', 'IRREVERSIBLE_EXTERNAL']], ['read-inbox', 2, ['READ', 'COMMUNICATE']]]],
    ['matrix', [['send-message', 2, ['COMMUNICATE']], ['list-rooms', 1, ['READ']]]],
  ],
  productivity: [
    ['notion', [['read-page', 1, ['READ']], ['write-page', 3, ['WRITE']], ['search', 1, ['READ']]]],
    ['obsidian', [['read-note', 1, ['READ']], ['write-note', 3, ['WRITE']], ['link-graph', 1, ['READ']]]],
    ['things', [['create-todo', 3, ['WRITE']], ['list-todos', 1, ['READ']]]],
    ['trello', [['create-card', 3, ['WRITE']], ['list-boards', 1, ['READ']], ['move-card', 3, ['WRITE']]]],
    ['todoist', [['create-task', 3, ['WRITE']], ['list-tasks', 1, ['READ']]]],
    ['clickup', [['create-task', 3, ['WRITE']], ['list-spaces', 1, ['READ']]]],
    ['asana', [['create-task', 3, ['WRITE']], ['list-projects', 1, ['READ']]]],
    ['linear', [['create-issue', 3, ['WRITE']], ['list-issues', 1, ['READ']], ['close-issue', 3, ['WRITE']]]],
    ['apple-notes', [['read-note', 1, ['READ']], ['create-note', 3, ['WRITE']]]],
    ['apple-reminders', [['create-reminder', 3, ['WRITE']], ['list-reminders', 1, ['READ']]]],
  ],
  developer: [
    ['github', [['create-issue', 3, ['WRITE', 'COMMUNICATE']], ['list-prs', 1, ['READ']], ['merge-pr', 5, ['IRREVERSIBLE_EXTERNAL', 'WRITE']]]],
    ['gitlab', [['create-mr', 3, ['WRITE', 'COMMUNICATE']], ['list-issues', 1, ['READ']]]],
    ['npm', [['publish', 5, ['IRREVERSIBLE_EXTERNAL', 'WRITE']], ['search', 1, ['READ']]]],
    ['docker', [['build-image', 2, ['WRITE']], ['list-containers', 1, ['READ']], ['push-image', 5, ['IRREVERSIBLE_EXTERNAL']]]],
    ['kubernetes', [['list-pods', 1, ['READ']], ['apply-manifest', 5, ['WRITE', 'FLEET_PRIVILEGED']]]],
    ['gh-issues', [['create-issue', 3, ['WRITE', 'COMMUNICATE']], ['comment', 2, ['COMMUNICATE']]]],
    ['mcporter', [['list-mcp-servers', 1, ['READ']], ['register-server', 3, ['WRITE']]]],
  ],
  media: [
    ['spotify', [['play-track', 2, ['COMMUNICATE']], ['search', 1, ['READ']], ['queue', 2, ['WRITE']]]],
    ['youtube', [['search', 1, ['READ']], ['get-transcript', 1, ['READ']]]],
    ['sonos', [['play', 2, ['COMMUNICATE']], ['list-rooms', 1, ['READ']]]],
    ['tts', [['synthesize', 2, ['WRITE']], ['list-voices', 1, ['READ']]]],
    ['whisper', [['transcribe', 2, ['READ', 'WRITE']], ['detect-language', 1, ['READ']]]],
    ['video-frames', [['extract', 2, ['READ', 'WRITE']]]],
    ['nano-pdf', [['extract-text', 1, ['READ']], ['split-pages', 2, ['READ', 'WRITE']]]],
  ],
  system: [
    ['shell', [['exec', 5, ['IRREVERSIBLE_EXTERNAL']]]],
    ['ssh', [['exec-remote', 5, ['IRREVERSIBLE_EXTERNAL', 'FLEET_PRIVILEGED']], ['copy-file', 4, ['WRITE']]]],
    ['filesystem', [['read', 1, ['READ']], ['write', 3, ['WRITE']], ['list', 1, ['READ']], ['delete', 5, ['IRREVERSIBLE_EXTERNAL']]]],
    ['screenshot', [['capture', 1, ['READ']], ['capture-window', 1, ['READ']]]],
    ['camsnap', [['take-photo', 2, ['READ']]]],
    ['system-info', [['get-cpu', 1, ['READ']], ['get-memory', 1, ['READ']], ['get-uptime', 1, ['READ']]]],
  ],
  search: [
    ['brave-search', [['web-search', 1, ['READ', 'COMMUNICATE']]]],
    ['google-search', [['web-search', 1, ['READ', 'COMMUNICATE']]]],
    ['semantic-search', [['index', 2, ['READ', 'WRITE']], ['query', 1, ['READ']]]],
    ['blogwatcher', [['list-feeds', 1, ['READ']], ['fetch', 1, ['READ']]]],
  ],
  ai_ml: [
    ['openai', [['chat-complete', 2, ['COMMUNICATE']], ['embed', 1, ['COMMUNICATE']]]],
    ['anthropic', [['chat-complete', 2, ['COMMUNICATE']]]],
    ['gemini', [['chat-complete', 2, ['COMMUNICATE']]]],
    ['ollama', [['generate', 2, ['COMMUNICATE']], ['list-models', 1, ['READ']]]],
    ['vllm', [['generate', 2, ['COMMUNICATE']]]],
  ],
  finance: [
    ['stripe', [['create-charge', 5, ['IRREVERSIBLE_EXTERNAL', 'COMMUNICATE']], ['list-customers', 1, ['READ']]]],
    ['ordercli', [['place-order', 5, ['IRREVERSIBLE_EXTERNAL']], ['list-orders', 1, ['READ']]]],
  ],
  home: [
    ['openhue', [['set-light', 2, ['COMMUNICATE']], ['list-lights', 1, ['READ']]]],
    ['homekit', [['set-state', 2, ['COMMUNICATE']], ['list-accessories', 1, ['READ']]]],
  ],
  work: [
    ['jira', [['create-ticket', 3, ['WRITE', 'COMMUNICATE']], ['search', 1, ['READ']]]],
    ['confluence', [['read-page', 1, ['READ']], ['write-page', 3, ['WRITE']]]],
    ['sharepoint', [['read-doc', 1, ['READ']], ['write-doc', 3, ['WRITE']]]],
    ['microsoft-teams', [['send-message', 2, ['COMMUNICATE']], ['create-meeting', 3, ['WRITE', 'COMMUNICATE']]]],
    ['zoom', [['create-meeting', 3, ['WRITE', 'COMMUNICATE']]]],
    ['1password', [['get-secret', 4, ['READ', 'IDENTITY']]]],
  ],
};

const MATURITY = {
  alpha: { skills: false, workflows: false, hasManifest: true, hasDoctorContract: false, hasLintRules: false },
  typical: { skills: true, workflows: false, hasManifest: true, hasDoctorContract: false, hasLintRules: false },
  rich: { skills: true, workflows: true, hasManifest: true, hasDoctorContract: true, hasLintRules: false },
  enterprise: { skills: true, workflows: true, hasManifest: true, hasDoctorContract: true, hasLintRules: true },
};

function makeSpec(domain, pluginName, toolDefs, maturity) {
  const m = MATURITY[maturity];
  const tools = toolDefs.map(([id, risk, caps]) => ({ id, risk, caps }));
  return {
    slug: `plugin-${pluginName}-${maturity}`,
    pluginName,
    domain,
    maturity,
    tools,
    skills: m.skills ? tools.slice(0, 2).map((t) => t.id) : [],
    workflows: m.workflows ? [`${pluginName}-flow.lobster`] : [],
    hasManifest: m.hasManifest,
    hasDoctorContract: m.hasDoctorContract,
    hasLintRules: m.hasLintRules,
  };
}

const ALL_SPECS = [];
for (const [domain, plugins] of Object.entries(DOMAINS)) {
  for (const [pluginName, toolDefs] of plugins) {
    // Two variations per plugin: typical + rich (rich is more interesting for testing)
    ALL_SPECS.push(makeSpec(domain, pluginName, toolDefs, 'typical'));
    ALL_SPECS.push(makeSpec(domain, pluginName, toolDefs, 'rich'));
  }
}

export { ALL_SPECS };
