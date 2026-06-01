export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // Always use local mock-login in localhost development environment to avoid CloudFront 403 blocks
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    !oauthPortalUrl ||
    !appId
  ) {
    return `${window.location.origin}/api/mock-login`;
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  try {
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch (e) {
    return `${window.location.origin}/api/mock-login`;
  }
};
