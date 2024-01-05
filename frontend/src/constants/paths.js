export default {
  root: '/',
  subjects: '/s',
  publicFigures: '/p',
  getFor: {
    subject: s => `/s/${s.slug}`,
    publicFigure: pf => `/p/${pf.slug}`,
  },
  manual: '/guide',
  about: '/about',
  contact: '/contact',
  external: {
    twitter: 'https://twitter.com/debatsco',
  },
};
