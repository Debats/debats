export default {
    root: '/',
    subjects: '/s',
    publicFigures: '/p',
    getFor: {
        subject: (s) => `/s/${s.slug}`,
        publicFigure: (pf) => `/p/${pf.slug}`,
    },
    manual: '/mode-d-emploi',
    about: '/a-propos',
    contact: '/contact',
    external: {
        twitter: 'https://twitter.com/debatsco',
    },
};
