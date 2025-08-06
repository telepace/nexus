/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh"],
    localeDetection: true,
  },
  reloadOnPrerender: process.env.NODE_ENV === "development",
  localePath: "./public/locales",
};
