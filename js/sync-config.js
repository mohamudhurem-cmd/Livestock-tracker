// Sync backend config: a private GitHub repo holding one JSON file with the
// household's shared data. GITHUB_TOKEN is a fine-grained Personal Access Token
// scoped ONLY to that one repo with "Contents: Read and write" permission — it
// is visible in this app's public source code, same as any other client-side
// config, so keep its scope as narrow as possible (one repo, one permission).
// If it's ever exposed more broadly than intended, regenerate/revoke it from
// github.com/settings/tokens.

const GITHUB_OWNER = 'mohamudhurem-cmd';
const GITHUB_REPO = 'Livestock-data';
const GITHUB_TOKEN = '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';
const GITHUB_PATH = 'data.json';
