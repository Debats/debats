import { MetadataRoute } from 'next'

// AI training crawlers — distinct from search indexing bots.
// Googlebot, Bingbot, etc. are NOT listed here: they index for search results.
// Google-Extended, GPTBot, etc. are the ones that scrape for AI model training.
const AI_TRAINING_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'Google-Extended',
  'CCBot',
  'anthropic-ai',
  'ClaudeBot',
  'Claude-Web',
  'Bytespider',
  'Diffbot',
  'Applebot-Extended',
  'PerplexityBot',
  'YouBot',
  'Amazonbot',
  'cohere-ai',
  'AI2Bot',
  'Scrapy',
  'Timpibot',
  'VelenPublicWebCrawler',
  'Omgilibot',
  'Facebookbot',
  'Meta-ExternalAgent',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/inscription/', '/api/'],
      },
      ...AI_TRAINING_BOTS.map((bot) => ({
        userAgent: bot,
        disallow: '/' as const,
      })),
    ],
    sitemap: 'https://debats.co/sitemap.xml',
  }
}
