/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CompileError, MessageContext } from "vue-i18n";
import { createI18n } from "vue-i18n";
import { IntlMessageFormat } from "intl-messageformat";
import en from "~~/locales/en.json";
import fr from "~~/locales/fr.json";

const localeLoaders = import.meta.glob("~//locales/**.json");
const availableLanguages = Object.keys(localeLoaders).map(path => path.slice(9, -5));

async function loadLocale(i18n: any, language: string) {
  if (i18n.global.availableLocales.includes(language)) return;
  const loader = localeLoaders[`/locales/${language}.json`] || localeLoaders[`../locales/${language}.json`];
  if (!loader) return;
  const module: any = await loader();
  i18n.global.setLocaleMessage(language, module.default ?? module);
}

export default defineNuxtPlugin(({ vueApp }) => {
  function checkDefaultLanguage() {
    let matched = null;
    const languages = availableLanguages;
    const matching = navigator.languages.filter(lang => languages.some(l => l.toLowerCase() === lang.toLowerCase()));
    if (matching.length > 0) {
      matched = matching[0];
    }
    if (!matched) {
      languages.forEach(lang => {
        const languagePartials = navigator.language.split("-")[0];
        if (lang.toLowerCase() === languagePartials) {
          matched = lang;
        }
      });
    }
    return matched;
  }
  const preferences = useViewPreferences();
  const i18n = createI18n({
    fallbackLocale: "en",
    globalInjection: true,
    legacy: false,
    locale: preferences.value.language || checkDefaultLanguage() || "en",
    messageCompiler,
    // Keep only the primary French locale and the English fallback in the
    // startup bundle. Every other locale is split into a lazy chunk.
    messages: { fr, en },
  });
  vueApp.use(i18n);

  watch(
    () => preferences.value.language,
    async language => {
      if (!language) return;
      await loadLocale(i18n, language);
      i18n.global.locale.value = language;
    }
  );

  const initialLanguage = String(i18n.global.locale.value);
  if (!i18n.global.availableLocales.includes(initialLanguage)) {
    void loadLocale(i18n, initialLanguage).then(() => {
      i18n.global.locale.value = initialLanguage;
    });
  }

  return {
    provide: {
      i18nGlobal: i18n.global,
    },
  };
});

export const messageCompiler: (
  message: string | any,
  {
    locale,
    key,
    onError,
  }: {
    locale: any;
    key: any;
    onError: any;
  }
) => (ctx: MessageContext) => unknown = (message, { locale, key, onError }) => {
  if (typeof message === "string") {
    /**
     * You can tune your message compiler performance more with your cache strategy or also memoization at here
     */
    const formatter = new IntlMessageFormat(message, locale);
    return (ctx: MessageContext) => {
      return formatter.format(ctx.values);
    };
  } else {
    /**
     * for AST.
     * If you would like to support it,
     * You need to transform locale messages such as `json`, `yaml`, etc. with the bundle plugin.
     */
    if (onError) {
      onError(new Error("not support for AST") as CompileError);
    }
    return () => key;
  }
};
