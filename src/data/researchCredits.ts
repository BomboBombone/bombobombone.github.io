export interface ResearchCredit {
  cve: string;
  slug: string;
  advisory: string;
}

export const researchCredits: ResearchCredit[] = [
  { cve: 'CVE-2026-73309', slug: 'cve-2026-73309', advisory: 'https://www.vulncheck.com/advisories/xenforo-authentication-bypass-via-oauth2-token-endpoint' },
  { cve: 'CVE-2026-73310', slug: 'cve-2026-73310', advisory: 'https://www.vulncheck.com/advisories/xenforo-oauth2-authorization-code-token-theft-via-redirect-uri-bypass' },
  { cve: 'CVE-2026-73311', slug: 'cve-2026-73311', advisory: 'https://www.vulncheck.com/advisories/xenforo-oauth2-authorization-code-reuse' },
  { cve: 'CVE-2026-73312', slug: 'cve-2026-73312', advisory: 'https://www.vulncheck.com/advisories/xenforo-refresh-token-replay-via-expired-access-token' },
  { cve: 'CVE-2026-73313', slug: 'cve-2026-73313', advisory: 'https://www.vulncheck.com/advisories/xenforo-mfa-bypass-via-passkey-tfa-provider' },
  { cve: 'CVE-2026-73314', slug: 'cve-2026-73314', advisory: 'https://www.vulncheck.com/advisories/xenforo-signature-verification-bypass-via-paypal-rest-webhook' },
  { cve: 'CVE-2026-73315', slug: 'cve-2026-73315', advisory: 'https://www.vulncheck.com/advisories/xenforo-ssrf-via-paypal-rest-webhook-handler' },
  { cve: 'CVE-2026-73316', slug: 'cve-2026-73316', advisory: 'https://www.vulncheck.com/advisories/xenforo-payment-replay-via-paypal-rest-payment-provider' },
  { cve: 'CVE-2026-73317', slug: 'cve-2026-73317', advisory: 'https://www.vulncheck.com/advisories/xenforo-missing-authorization-via-acp-cache-rebuild-dispatcher' },
  { cve: 'CVE-2026-73318', slug: 'cve-2026-73318', advisory: 'https://www.vulncheck.com/advisories/xenforo-missing-authorization-via-force-agreement-controller' },
  { cve: 'CVE-2026-73319', slug: 'cve-2026-73319', advisory: 'https://www.vulncheck.com/advisories/xenforo-xss-via-dynamic-redirect-handler' },
  { cve: 'CVE-2026-73320', slug: 'cve-2026-73320', advisory: 'https://www.vulncheck.com/advisories/xenforo-unauthenticated-information-disclosure-via-unfurl-endpoint' },
  { cve: 'CVE-2026-73321', slug: 'cve-2026-73321', advisory: 'https://www.vulncheck.com/advisories/xenforo-uncontrolled-recursion-dos-via-bbcode-parser' },
  { cve: 'CVE-2026-74239', slug: 'cve-2026-74239', advisory: 'https://www.vulncheck.com/advisories/xenforo-path-traversal-via-style-archive-importer-on-windows' },
];
