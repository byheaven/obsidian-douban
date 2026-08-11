import type SettingsManager from "../../douban/setting/SettingsManager";
import {HttpResponse} from "../model/HttpResponse";

var https: any = null;
var http: any = null;

export default class DesktopHttpUtil {

	/**
	 * get请求
	 * @param url 请求地址
	 * @param headers 请求参数
	 * @param settingsManager 设置管理器
	 */
	// Cookie: 'll="108296"; bid=xHRJLeWBrjQ; _pk_id.100001.8cb4=f8f83e81ec224a1a.1691572669.; __utmv=30149280.13103; __yadk_uid=ce95W7OsgT0iKFceWgbMSUdw1oOqxNTk; __gads=ID=62585f60f3f637d0-2234f63fc6e200a5:T=1691572672:RT=1691572672:S=ALNI_MaIqTxSWHsfpnX9nAmMHcPQEsaezg; __gpi=UID=00000c29a9f98e5b:T=1691572672:RT=1691572672:S=ALNI_MbLAq8XNoKrRPKNqGCMdgXSPZvidw; ap_v=0,6.0; __utma=30149280.135860784.1691572641.1691572641.1694509646.2; __utmc=30149280; __utmz=30149280.1694509646.2.2.utmcsr=baidu|utmccn=(organic)|utmcmd=organic; _pk_ref.100001.8cb4=%5B%22%22%2C%22%22%2C1694509648%2C%22https%3A%2F%2Fmovie.douban.com%2Ftv%2F%22%5D; _pk_ses.100001.8cb4=1; __utmt=1; dbcl2="131038721:LUssju34QFw"; ck=dCQj; push_noty_num=0; push_doumail_num=0; __utmb=30149280.3.10.1694509646'
	public static request(url: string, headers: any, settingsManager?: SettingsManager, options?: any): Promise<HttpResponse> {
		const headersInner: Record<string, string> = {};
		Object.entries(headers || {}).forEach(([key, value]) => {
			const lowerKey = key.toLowerCase();
			if (value != null && value !== '' && lowerKey !== 'accept-encoding' && lowerKey !== 'host' && lowerKey !== 'content-length') {
				headersInner[key] = String(value);
			}
		});
		const optionsInner = {
			headers: headersInner,
			...options
		}
		return new Promise((resolve, rejects) => {
			this.httpRequest(url, optionsInner, 0, resolve, rejects, settingsManager);
		})
	}

	private static httpRequest(url: string, options: any, times: number, resolve: any, rejects: any, settingsManager?: SettingsManager) {
		settingsManager?.debug(`Obsidian-Douban:从网络获取json开始:\nurl:${url}\nheaders:${JSON.stringify(options)}`);

		const {body, ...requestOptions} = options;
		requestOptions.method = requestOptions.method || "GET";
		requestOptions.headers = {...(requestOptions.headers || {})};
		let redirectCookie = requestOptions.headers.Cookie || requestOptions.headers.cookie || '';
		requestOptions.beforeRedirect = (redirectOptions: any, response: any) => {
			const setCookie = response.headers && response.headers['set-cookie'];
			if (setCookie) {
				redirectCookie = this.mergeCookies(
					redirectCookie,
					Array.isArray(setCookie) ? setCookie : [setCookie]
				);
			}
			if (redirectCookie) {
				redirectOptions.headers.Cookie = redirectCookie;
				delete redirectOptions.headers.cookie;
			}
		};

		if (body && !requestOptions.headers['Content-Length'] && !requestOptions.headers['content-length']) {
			requestOptions.headers['Content-Length'] = Buffer.byteLength(body);
		}

		try {
			const request = this.getHttpClient(url).request(url, requestOptions, function (response: any) {
				const chunks: Buffer[] = [];
				let size = 0;
				if (settingsManager) {
					settingsManager.debug(`Obsidian-Douban:从网络获取JSON完成${times}:url:\n${url}`);
					settingsManager.debug(`Obsidian-Douban:从网络获取JSON完成${times}:header:\n${JSON.stringify(response.headers)}`);
				}

				response.on("data", function (chunk: Buffer) {
					chunks.push(chunk);
					size += chunk.length;
				});

				response.on("end", function () {
					const html = Buffer.concat(chunks, size).toString();
					resolve(new HttpResponse(response.statusCode, response.headers, html));
				});
			});
			request.on("error", rejects);
			if (body) {
				request.write(body);
			}
			request.end();
		} catch (e) {
			rejects(e);
		}

	}

	private static mergeCookies(existingCookie: string, setCookies: string[]): string {
		const cookies = new Map<string, string>();
		const addCookie = (cookie: string) => {
			const pair = cookie.split(';', 1)[0].trim();
			const separator = pair.indexOf('=');
			if (separator > 0) {
				cookies.set(pair.substring(0, separator).trim(), pair.substring(separator + 1).trim());
			}
		};
		existingCookie.split(';').forEach(addCookie);
		setCookies.forEach(addCookie);
		return Array.from(cookies.entries()).map(([name, value]) => `${name}=${value}`).join('; ');
	}

	private static getHttpClient(url?: string) {
		if (url && url.startsWith("https")) {
			if (!https) {
				https = require("follow-redirects").https;
			}
			return https;
		} else {
			if (!http) {
				http = require("follow-redirects").http;
			}
			return http;
		}

	}

	/**
	 * get请求
	 * @param url 请求地址
	 * @param headers 请求参数
	 * @param settingsManager 设置管理器
	 */
	public static requestBuffer(url: string, headers: any, settingsManager?: SettingsManager): Promise<HttpResponse> {
		let options = {
			headers: headers
		}

		return new Promise((resolve, rejects) => {
			this.httpRequestGetBufferInner(url, options, 0, resolve, rejects, settingsManager);
		})
	}

	private static httpRequestGetBufferInner(url: string, options: any, times: number, resolve: any, rejects: any, settingsManager?: SettingsManager) {
		if (settingsManager) {
			settingsManager.debug(`Obsidian-Douban:从网络获取文件开始:\n${url}\nheaders:${JSON.stringify(options)}`);

			this.getHttpClient(url).get(url, {...options}, function (response: any) {
				let chunks: any = [],
					size = 0;
				if (settingsManager) {
					settingsManager.debug(`Obsidian-Douban:从网络获取文件完成${times}:url:\n${url}`);
					settingsManager.debug(`Obsidian-Douban:从网络获取文件完成${times}:header:\n${JSON.stringify(response.headers)}`);
				}

				response.on("data", function (chunk: any) {
					chunks.push(chunk)
					size += chunk.length
				})

				response.on("end", function () {
					const data = Buffer.concat(chunks, size)
					resolve(new HttpResponse(response.statusCode, response.headers, data))
				})
			})
		}
	}

}
