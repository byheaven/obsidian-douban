import SettingsManager from "../../douban/setting/SettingsManager";
import {requestUrl, RequestUrlParam, RequestUrlResponse} from "obsidian";
import {log} from "../Logutil";
import {i18nHelper} from "../../lang/helper";

export default class MobileHttpUtil {
	public static httpRequestGet(url: string, headers: any, settingsManager?: SettingsManager): Promise<RequestUrlResponse> {
		return this.request(url, headers, settingsManager, {method: "GET"});
	}

	public static request(url: string, headers: any, settingsManager?: SettingsManager, options: any = {}): Promise<RequestUrlResponse> {
		return this.requestInner(url, headers, options, 0, settingsManager);
	}

	private static async requestInner(url: string, headers: any, options: any, times: number, settingsManager?: SettingsManager): Promise<RequestUrlResponse> {
		const requestHeaders: Record<string, string> = {};
		Object.entries(headers || {}).forEach(([key, value]) => {
			const lowerKey = key.toLowerCase();
			if (value != null && value !== '' && lowerKey !== 'host' && lowerKey !== 'content-length') {
				requestHeaders[key] = String(value);
			}
		});

		const requestUrlParam: RequestUrlParam = {
			url,
			method: options.method || "GET",
			headers: requestHeaders,
			body: options.body,
			throw: false,
		};

		return await requestUrl(requestUrlParam)
			.then(response => {
				if (response && response.text.indexOf('https://sec.douban.com/a') > 0) {
					log.notice(i18nHelper.getMessage('130105'));
					settingsManager?.debug(`Obsidian-Douban:获取异常网页如下:\n${response}`);
				}
				if ([301, 302, 303, 307, 308].includes(response.status)) {
					if (times >= 5) {
						throw new Error('重定向次数过多');
					}
					const location = response.headers['location'];
					settingsManager?.debug(`Obsidian-Douban:获取重定向地址如下:\n${location}`);
					if (!location) {
						throw new Error('重定地址错误');
					}
					const redirectUrl = new URL(location, url).toString();
					const redirectHeaders = this.mergeResponseCookies(headers, response.headers);
					const redirectOptions = {...options};
					if ([301, 302, 303].includes(response.status)) {
						redirectOptions.method = "GET";
						delete redirectOptions.body;
					}
					return this.requestInner(redirectUrl, redirectHeaders, redirectOptions, times + 1, settingsManager);
				}
				settingsManager?.debug(`Obsidian-Douban:获取网页如下:\n${response}`);
				return response;
			})
			.catch(e => {
				if (e.toString().indexOf('403') > 0) {
					throw log.error(i18nHelper.getMessage('130105'), e);
				}
				throw log.error(i18nHelper.getMessage('130101').replace('{0}', e.toString()), e);
			});
	}

	private static mergeResponseCookies(headers: any, responseHeaders: Record<string, string>): Record<string, string> {
		const result = {...(headers || {})};
		const currentCookieKey = Object.keys(result).find(key => key.toLowerCase() === 'cookie');
		const currentCookie = currentCookieKey ? result[currentCookieKey] : '';
		const setCookieKey = Object.keys(responseHeaders || {}).find(key => key.toLowerCase() === 'set-cookie');
		const setCookie = setCookieKey ? responseHeaders[setCookieKey] : '';
		if (!setCookie) {
			return result;
		}

		const cookies = new Map<string, string>();
		const addCookie = (cookie: string) => {
			const pair = cookie.split(';', 1)[0].trim();
			const separator = pair.indexOf('=');
			if (separator > 0) {
				cookies.set(pair.substring(0, separator).trim(), pair.substring(separator + 1).trim());
			}
		};
		String(currentCookie).split(';').forEach(addCookie);
		addCookie(setCookie);
		if (currentCookieKey && currentCookieKey !== 'Cookie') {
			delete result[currentCookieKey];
		}
		result.Cookie = Array.from(cookies.entries()).map(([name, value]) => `${name}=${value}`).join('; ');
		return result;
	}
}
