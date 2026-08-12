import en from './locale/en';
import zhCN from './locale/zh-cn';
import {getLanguage} from 'obsidian';

const localeMap: { [k: string]: Partial<typeof en> } = {
	en,
	zh: zhCN,
};

export default class I18nHelper {
	public getMessage(str: keyof typeof en | string, ...params: any[]): string {
		const lang = this.getCurrentLanguage();
		const locale = localeMap[lang];
		if (!locale) {
			console.error('Error: obsidian douban locale not found', lang);
		}
		// @ts-ignore
		let val:string = (locale && locale[str]) || en[str];
		if (params) {
			for (let i:number = 0;i < params.length;i++) {
				val = this.replaceAll(i, val, params[i])
			}
		}
		return val;
	}

	private getCurrentLanguage(): string {
		let language = '';
		try {
			language = typeof getLanguage === 'function' ? getLanguage() : '';
		} catch (_error) {
			// Obsidian can still be initializing while plugin modules are evaluated.
		}
		if (!language && typeof window !== 'undefined') {
			language = window.localStorage?.getItem('language') || '';
		}
		language = language.toLowerCase();
		return language === 'zh-cn' || language === 'zh-hans' || language.startsWith('zh') ? 'zh' : 'en';
	}

	private replaceAll(index: number, message: string, replace: string): string {
		const placeholderRegex = new RegExp(`\\{${index}:([^}]+)\\}`);
		const match = message.match(placeholderRegex);
		if (!match) {
			return message.replaceAll(`{${index}}`, replace);
		}
		const defaultValue = match ? match[1] : '';

		// If replace is undefined or null, use the default value
		const replacement = (replace === undefined || replace === null) ? defaultValue : replace;

		// Replace the specific placeholder with the replacement value
		return message.replace(placeholderRegex, replacement);
	}
}

export const i18nHelper: I18nHelper = new I18nHelper();
