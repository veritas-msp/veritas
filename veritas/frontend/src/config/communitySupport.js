import { VERITAS_DISCORD_URL } from "../components/Setup/setupConstants";
const DEFAULT_GITHUB_REPO = "https://github.com/veritas-msp/veritas";
export function getVeritasCommunitySupportLinks() {
  const discord = String(process.env.REACT_APP_VERITAS_DISCORD_URL || VERITAS_DISCORD_URL).trim() || null;
  const githubRepo = String(process.env.REACT_APP_VERITAS_GITHUB_REPO || DEFAULT_GITHUB_REPO).trim().replace(/\/+$/, "") || DEFAULT_GITHUB_REPO;
  return {
    discord,
    githubRepo,
    githubIssues: `${githubRepo}/issues`
  };
}
