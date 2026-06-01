export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Always use local mock-login to avoid CloudFront 403 blocks and domain mismatch errors on Render
export const getLoginUrl = () => {
  return `${window.location.origin}/api/mock-login`;
};

