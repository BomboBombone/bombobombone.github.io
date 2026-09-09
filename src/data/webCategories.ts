export interface WebCategoryDefinition {
  id: string;
  slug: string;
  name: string;
  label: string;
  category: string;
  protect: string;
}

export const webCategories: WebCategoryDefinition[] = [
  { id: 'web-rce', slug: 'rce', name: '.web.rce', label: 'Path traversal to code execution', category: 'XenForo / Path traversal', protect: 'ERW-' },
  { id: 'web-oauth', slug: 'oauth', name: '.web.oauth', label: 'OAuth2', category: 'XenForo / OAuth2', protect: 'ER--' },
  { id: 'web-auth', slug: 'auth', name: '.web.auth', label: 'Authentication', category: 'XenForo / Authentication', protect: 'ER--' },
  { id: 'web-authz', slug: 'authz', name: '.web.authz', label: 'Authorization', category: 'XenForo / Authorization', protect: 'ER--' },
  { id: 'web-pay', slug: 'payments', name: '.web.pay', label: 'Payments', category: 'XenForo / Payments', protect: 'ER--' },
  { id: 'web-ssrf', slug: 'ssrf', name: '.web.ssrf', label: 'Server-side request forgery', category: 'XenForo / SSRF', protect: 'ER--' },
  { id: 'web-xss', slug: 'xss', name: '.web.xss', label: 'Cross-site scripting', category: 'XenForo / XSS', protect: 'ER--' },
  { id: 'web-info', slug: 'disclosure', name: '.web.info', label: 'Information disclosure', category: 'XenForo / Information disclosure', protect: 'R---' },
  { id: 'web-dos', slug: 'dos', name: '.web.dos', label: 'Denial of service', category: 'XenForo / Denial of service', protect: 'ER--' },
];

export const webCategoryFor = (category: string) => webCategories.find((definition) => definition.category === category);
