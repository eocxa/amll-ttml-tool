import resources from "virtual:i18next-loader";
import i18n from "i18next";
import ICU from "i18next-icu";
import { initReactI18next } from "react-i18next";

type TranslationResource = typeof resources;

declare module "i18next" {
	// Extend CustomTypeOptions
	interface CustomTypeOptions {
		// Extend the resources type to include all our translation keys
		resources: {
			translation: TranslationResource;
		};
		// Add defaultNS type
		defaultNS: "translation";
		// Add returnNull type
		returnNull: false;
		// Define allowed keys for translations
		allowedKeys: keyof TranslationResource;
	}
}

const esResource = (resources as any)["es-ES"] || (resources as any)["es"] || {};

const aliasedResources = {
	...resources,
	es: esResource,
	"es-ES": esResource,
	"es-MX": esResource,
	"es-419": esResource,
	"es-US": esResource,
	"es-AR": esResource,
	"es-CO": esResource,
	"es-CL": esResource,
	"es-PE": esResource,
};

i18n
	.use(initReactI18next) // passes i18n down to react-i18next
	.use(ICU)
	.init({
		resources: aliasedResources,
		debug: import.meta.env.DEV,
		lng: "es-ES",
		fallbackLng: "es-ES",
		interpolation: {
			escapeValue: false, // react already safes from xss
		},
		returnNull: false,
	})
	.then(() => {
		const saved = localStorage.getItem("language");
		if (saved) {
			i18n.changeLanguage(saved.startsWith("es") ? "es-ES" : saved);
		} else {
			i18n.changeLanguage("es-ES");
		}
	});

export default i18n;
