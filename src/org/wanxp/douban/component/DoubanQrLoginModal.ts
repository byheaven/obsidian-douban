import {App, ButtonComponent, Modal, normalizePath, requestUrl, RequestUrlResponse} from "obsidian";
import * as QRCode from "qrcode";
import {i18nHelper} from "../../lang/helper";
import {log} from "../../utils/Logutil";
import SettingsManager from "../setting/SettingsManager";

const DOUBAN_LOGIN_PAGE = 'https://accounts.douban.com/passport/login';
const DOUBAN_QR_CODE_URL = 'https://accounts.douban.com/j/mobile/login/qrlogin_code';
const DOUBAN_QR_STATUS_URL = 'https://accounts.douban.com/j/mobile/login/qrlogin_status';
const QR_POLL_INTERVAL = 3000;
const QR_MAX_POLL_COUNT = 120;

export default class DoubanQrLoginModal extends Modal {
	private readonly settingsManager: SettingsManager;
	private readonly onLoginSuccess: () => void;
	private readonly cookies = new Map<string, string>();
	private qrCode: string = null;
	private pollTimer: any = null;
	private pollCount = 0;
	private consecutivePollErrors = 0;
	private polling = false;
	private closed = false;
	private sessionId = 0;
	private debugWriteQueue: Promise<void> = Promise.resolve();
	private statusEl: HTMLElement;
	private qrImageEl: HTMLImageElement;
	private refreshButton: ButtonComponent;

	constructor(app: App, settingsManager: SettingsManager, onLoginSuccess: () => void) {
		super(app);
		this.settingsManager = settingsManager;
		this.onLoginSuccess = onLoginSuccess;
	}

	onOpen(): void {
		this.closed = false;
		void this.writeDebug('modal opened', true);
		const {contentEl} = this;
		contentEl.empty();
		contentEl.addClass('obsidian_douban_qr_login');
		contentEl.createEl('h2', {text: i18nHelper.getMessage('100141')});
		contentEl.createEl('p', {text: i18nHelper.getMessage('100142')});

		const imageContainer = contentEl.createDiv('obsidian_douban_qr_image_container');
		this.qrImageEl = imageContainer.createEl('img', {
			attr: {alt: i18nHelper.getMessage('100141')}
		});
		this.qrImageEl.style.display = 'none';
		this.statusEl = contentEl.createDiv('obsidian_douban_qr_status');

		const controls = contentEl.createDiv('obsidian_douban_qr_controls');
		this.refreshButton = new ButtonComponent(controls)
			.setButtonText(i18nHelper.getMessage('100150'))
			.onClick(() => void this.loadQrCode());
		new ButtonComponent(controls)
			.setButtonText(i18nHelper.getMessage('110005'))
			.onClick(() => this.close());

		void this.loadQrCode();
	}

	onClose(): void {
		this.closed = true;
		this.sessionId++;
		this.stopPolling();
		this.contentEl.empty();
	}

	private async loadQrCode(): Promise<void> {
		this.stopPolling();
		const sessionId = ++this.sessionId;
		this.cookies.clear();
		this.qrCode = null;
		this.pollCount = 0;
		this.consecutivePollErrors = 0;
		this.polling = false;
		this.qrImageEl.style.display = 'none';
		this.refreshButton.setDisabled(true);
		this.setStatus(i18nHelper.getMessage('100143'));

		try {
			const response = await this.request(DOUBAN_QR_CODE_URL, 'POST', sessionId);
			const payload = response.json && response.json.payload;
			if (!payload || !payload.code) {
				throw new Error('Douban QR response is missing code');
			}
			void this.writeDebug('QR code metadata received');
			this.qrCode = payload.code;
			await this.renderQrImage(payload.code, payload.img, sessionId);
			if (this.closed || sessionId !== this.sessionId) {
				return;
			}
			this.qrImageEl.style.display = '';
			this.setStatus(i18nHelper.getMessage('100144'));
			this.schedulePolling(sessionId);
		} catch (error) {
			if (sessionId !== this.sessionId || this.closed) {
				return;
			}
			this.settingsManager.debug(`配置界面:移动端二维码加载失败:${error}`);
			void this.writeDebug(`QR loading failed: ${this.safeError(error)}`);
			this.setStatus(i18nHelper.getMessage('100149'), true);
		} finally {
			if (sessionId === this.sessionId && !this.closed) {
				this.refreshButton.setDisabled(false);
			}
		}
	}

	private async renderQrImage(code: string, imageUrl: string, sessionId: number): Promise<void> {
		const qrContent = this.getQrContent(code, imageUrl);
		this.qrImageEl.src = await QRCode.toDataURL(qrContent, {
			errorCorrectionLevel: 'M',
			margin: 2,
			width: 280,
			color: {
				dark: '#000000',
				light: '#ffffff'
			}
		});
		if (sessionId !== this.sessionId || this.closed) {
			throw new Error('Douban QR login session changed');
		}
		void this.writeDebug('QR image rendered locally');
	}

	private getQrContent(code: string, imageUrl?: string): string {
		if (imageUrl) {
			try {
				const pathname = new URL(imageUrl).pathname;
				const prefix = '/dae/qrgen/v2/';
				if (pathname.startsWith(prefix) && pathname.endsWith('.png')) {
					return decodeURIComponent(pathname.substring(prefix.length, pathname.length - 4));
				}
			} catch (_) {
				// Fall through to the equivalent official QR login URL.
			}
		}
		return `https://accounts.douban.com/passport/qrlogin?code=${encodeURIComponent(code)}`;
	}

	private schedulePolling(sessionId: number): void {
		if (this.closed || !this.qrCode || sessionId !== this.sessionId) {
			return;
		}
		this.pollTimer = setTimeout(() => void this.pollLoginStatus(sessionId), QR_POLL_INTERVAL);
	}

	private async pollLoginStatus(sessionId: number): Promise<void> {
		if (this.closed || !this.qrCode || this.polling || sessionId !== this.sessionId) {
			return;
		}
		if (++this.pollCount > QR_MAX_POLL_COUNT) {
			this.setStatus(i18nHelper.getMessage('100147'), true);
			return;
		}

		this.polling = true;
		let continuePolling = false;
		try {
			const response = await this.request(`${DOUBAN_QR_STATUS_URL}?code=${encodeURIComponent(this.qrCode)}`, 'GET', sessionId);
			const responseJson = response.json;
			if (!responseJson || responseJson.status !== 'success') {
				throw new Error(`Douban QR status response failed: ${responseJson?.message || 'unknown response'}`);
			}
			this.consecutivePollErrors = 0;
			const loginStatus = responseJson.payload && responseJson.payload.login_status;
			void this.writeDebug(`poll #${this.pollCount}: login_status=${loginStatus || 'missing'}`);
			switch (loginStatus) {
				case 'pending':
					this.setStatus(i18nHelper.getMessage('100144'));
					continuePolling = true;
					break;
				case 'scan':
					this.setStatus(i18nHelper.getMessage('100145'));
					continuePolling = true;
					break;
				case 'login':
					this.setStatus(i18nHelper.getMessage('100152'));
					if (!await this.completeLogin(sessionId)) {
						this.setStatus(i18nHelper.getMessage('100153'), true);
					}
					break;
				case 'invalid':
					this.setStatus(i18nHelper.getMessage('100147'), true);
					break;
				case 'cancel':
					this.setStatus(i18nHelper.getMessage('100148'), true);
					break;
				default:
					continuePolling = true;
			}
		} catch (error) {
			if (sessionId !== this.sessionId || this.closed) {
				return;
			}
			this.consecutivePollErrors++;
			console.error('OB-Douban:二维码登录状态查询失败', error);
			this.settingsManager.debug(`配置界面:二维码状态查询失败:${error}`);
			void this.writeDebug(`poll #${this.pollCount} failed: ${this.safeError(error)}`);
			if (this.consecutivePollErrors >= 3) {
				this.setStatus(i18nHelper.getMessage('100149'), true);
			}
			continuePolling = true;
		} finally {
			this.polling = false;
			if (continuePolling && sessionId === this.sessionId) {
				this.schedulePolling(sessionId);
			}
		}
	}

	private async completeLogin(sessionId: number): Promise<boolean> {
		if (sessionId !== this.sessionId || this.closed) {
			return false;
		}
		const cookie = this.getCookieHeader();
		void this.writeDebug(`completing login; cookie names=${Array.from(this.cookies.keys()).join(',') || 'none'}`);
		if (!this.cookies.has('dbcl2') || !cookie) {
			console.error('OB-Douban:扫码已确认，但状态响应未返回 dbcl2 Cookie');
			return false;
		}
		let user;
		try {
			user = await this.settingsManager.plugin.userComponent.loginCookie(cookie);
		} catch (error) {
			// dbcl2 is issued only after the user confirms the QR login. If the
			// follow-up profile request is temporarily blocked, retain that valid
			// credential and defer profile verification until it is actually needed.
			console.warn('OB-Douban:二维码凭证已获取，用户资料验证暂时失败', error);
			void this.writeDebug(`profile verification failed; QR credential retained: ${this.safeError(error)}`);
		}
		if (sessionId !== this.sessionId || this.closed) {
			return false;
		}
		if (!user || !user.id || !user.login) {
			void this.writeDebug('profile was not verified; accepting confirmed QR credential');
			user = await this.settingsManager.plugin.userComponent.acceptQrLoginCookie(cookie);
		}
		if (!user || !user.id || !user.login) {
			return false;
		}
		this.setStatus(i18nHelper.getMessage('100146'));
		void this.writeDebug(`login completed; profileVerified=${this.settingsManager.plugin.userComponent.isVerified()}`);
		log.notice(i18nHelper.getMessage('100146'));
		this.close();
		this.onLoginSuccess();
		return true;
	}

	private async request(url: string, method: string = 'GET', sessionId: number = this.sessionId): Promise<RequestUrlResponse> {
		const requestKind = this.getRequestKind(url);
		void this.writeDebug(`${requestKind} request started; method=${method}`);
		const headers: Record<string, string> = {
			Accept: 'application/json, text/plain, */*',
			'Cache-Control': 'no-cache',
			Referer: DOUBAN_LOGIN_PAGE,
			'X-Requested-With': 'XMLHttpRequest'
		};
		// The QR code itself identifies the login transaction. Do not manually
		// attach Cookie here: requestUrl rejects/strips that header on some
		// Obsidian/Electron and mobile versions. Successful status responses still
		// expose Set-Cookie, which updateCookies collects below.
		const response = await requestUrl({
			url,
			method,
			headers,
			body: method === 'POST' ? '' : undefined,
			contentType: method === 'POST' ? 'application/x-www-form-urlencoded' : undefined,
			throw: false
		});
		if (sessionId !== this.sessionId || this.closed) {
			throw new Error('Douban QR login session changed');
		}
		if (this.isDoubanUrl(url)) {
			this.updateCookies(response.headers);
		}
		void this.writeDebug(`${requestKind} response; HTTP=${response.status}; headers=${Object.keys(response.headers || {}).sort().join(',')}`);
		if (response.status < 200 || response.status >= 300) {
			throw new Error(`Douban request failed with HTTP ${response.status}`);
		}
		return response;
	}

	private updateCookies(headers: Record<string, string>): void {
		const newBid = this.getHeaderValues(headers, 'x-douban-newbid')[0];
		if (newBid) {
			this.cookies.set('bid', newBid);
		}
		const setCookieHeaders = this.getHeaderValues(headers, 'set-cookie');
		if (setCookieHeaders.length === 0) {
			return;
		}
		setCookieHeaders
			.flatMap(header => header.split(/\n|,(?=\s*[^;,=\s]+=)/))
			.forEach(cookieValue => {
				const match = cookieValue.match(/^\s*([^=;\s]+)=([^;]*)/);
				if (match) {
					this.cookies.set(match[1], match[2]);
				}
			});
	}

	private getHeaderValues(headers: Record<string, string>, name: string): string[] {
		const key = Object.keys(headers || {}).find(header => header.toLowerCase() === name.toLowerCase());
		if (!key) {
			return [];
		}
		const value: unknown = (headers as Record<string, unknown>)[key];
		if (Array.isArray(value)) {
			return value.filter(item => item != null).map(item => String(item));
		}
		return value == null ? [] : [String(value)];
	}

	private getCookieHeader(): string {
		return Array.from(this.cookies.entries())
			.map(([name, value]) => `${name}=${value}`)
			.join('; ');
	}

	private isDoubanUrl(url: string): boolean {
		try {
			const hostname = new URL(url).hostname.replace(/^\./, '').toLowerCase();
			return hostname === 'douban.com' || hostname.endsWith('.douban.com');
		} catch (_) {
			return false;
		}
	}

	private getRequestKind(url: string): string {
		if (url.startsWith(DOUBAN_QR_CODE_URL)) {
			return 'qr-code';
		}
		if (url.startsWith(DOUBAN_QR_STATUS_URL)) {
			return 'qr-status';
		}
		return 'qr-image';
	}

	private safeError(error: unknown): string {
		const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
		return message
			.replace(/([?&]code=)[^&\s]+/gi, '$1<redacted>')
			.replace(/(dbcl2=)[^;\s]+/gi, '$1<redacted>');
	}

	private writeDebug(message: string, reset: boolean = false): Promise<void> {
		const debugPath = normalizePath(`${this.app.vault.configDir}/plugins/obsidian-douban/qr-login-debug.log`);
		const line = `${new Date().toISOString()} ${message}\n`;
		this.debugWriteQueue = this.debugWriteQueue
			.then(() => reset
				? this.app.vault.adapter.write(debugPath, line)
				: this.app.vault.adapter.append(debugPath, line))
			.catch(error => {
				console.error('OB-Douban:写入二维码诊断日志失败', error);
			});
		return this.debugWriteQueue;
	}

	private stopPolling(): void {
		if (this.pollTimer != null) {
			clearTimeout(this.pollTimer);
			this.pollTimer = null;
		}
	}

	private setStatus(message: string, error: boolean = false): void {
		if (!this.statusEl || this.closed) {
			return;
		}
		this.statusEl.setText(message);
		this.statusEl.toggleClass('has_error', error);
	}
}
