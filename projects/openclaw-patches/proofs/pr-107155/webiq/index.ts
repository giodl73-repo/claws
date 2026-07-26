import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "webiq",
  name: "WebIQ startup proof provider",
  register(api) {
    api.registerWebSearchProvider({
      id: "webiq",
      label: "WebIQ",
      hint: "Host-proxied proof provider",
      requiresCredential: false,
      envVars: [],
      placeholder: "",
      signupUrl: "https://example.invalid",
      credentialPath: "plugins.entries.webiq.config.webSearch.apiKey",
      getCredentialValue: () => undefined,
      setCredentialValue: () => {},
      createTool: () => null,
    });
  },
});
