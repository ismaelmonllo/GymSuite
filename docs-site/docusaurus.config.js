// @ts-check
// Configuracion de Docusaurus para GymSuite docs

import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'GymSuite Docs',
  tagline: 'Documentacion tecnica de GymSuite',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
    faster: true,
  },

  // URL de produccion (ajustar tras primer deploy en Vercel)
  url: 'https://gymsuite-docs.vercel.app',
  baseUrl: '/',

  organizationName: 'isma01mm',
  projectName: 'GymSuite',

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'ignore',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/docusaurus-social-card.jpg',
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: 'GymSuite',
        logo: {
          alt: 'GymSuite Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Documentacion',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [],
        copyright: `Copyright © ${new Date().getFullYear()} GymSuite. Ismael Monjas Llorente.`,
      },
      prism: {
        theme: prismThemes.oneLight,
        darkTheme: prismThemes.oneDark,
      },
    }),
};

export default config;
