import { log } from 'src/org/wanxp/utils/Logutil';
import {i18nHelper} from "../../lang/helper";
import SettingsManager from "../setting/SettingsManager";
import {constructDoubanTokenSettingsUI} from "../setting/LoginSettingsHelper";
import StringUtil from "../../utils/StringUtil";

// Credits go to zhaohongxuan's Weread Plugin : https://github.com/zhaohongxuan/obsidian-weread-plugin


export default class DoubanLoginModel {
	private modal: any;
	private containerEl: HTMLElement;
	private settingsManager: SettingsManager;
	private loginCheckInProgress = false;
	private loginCompleted = false;

	constructor(containerEl: HTMLElement, settingsManager: SettingsManager) {
		this.containerEl = containerEl;
		this.settingsManager = settingsManager;
		this.settingsManager.debug(`配置界面:初始化登录界面`)
		const { remote} = require('electron');

		const { BrowserWindow: RemoteBrowserWindow } = remote;
		this.modal = new RemoteBrowserWindow({
			parent: remote.getCurrentWindow(),
			width: 960,
			height: 540,
			show: false,
			webPreferences: {
				partition: `obsidian-douban-login-${Date.now()}`
			}
		});

		this.modal.once('ready-to-show', () => {
			this.modal.setTitle(i18nHelper.getMessage('100101'));
			this.modal.show();
		});

		const session = this.modal.webContents.session;
		const cookieChangedHandler = (_event: any, cookie: any, _cause: string, removed: boolean) => {
			if (!removed && cookie && cookie.name === 'dbcl2' && this.isDoubanHost(cookie.domain)) {
				void this.tryCompleteLogin(session);
			}
		};
		session.cookies.on('changed', cookieChangedHandler);

		this.modal.on('closed', () => {
			session.cookies.removeListener('changed', cookieChangedHandler);
			this.showCloseMessage();
			constructDoubanTokenSettingsUI(this.containerEl, this.settingsManager);
		});

		this.modal.webContents.setWindowOpenHandler(({url}: {url: string}) => {
			if (this.isDoubanUrl(url)) {
				void this.modal.loadURL(url).catch((error: Error) => {
					this.settingsManager.debug(`配置界面:登录界面跳转失败:${error.message}`);
				});
			}
			return {action: 'deny'};
		});

		this.modal.webContents.on('did-fail-load', (_event: Event, errorCode: number, errorDescription: string) => {
			this.settingsManager.debug(`配置界面:登录界面加载失败:${errorCode},${errorDescription}`);
		});

		this.modal.webContents.on('did-navigate', async (_event: any, _url: string, httpResponseCode: number) => {
			if (httpResponseCode == 403) {
				// what you want to do
				this.settingsManager.debug(`配置界面:登录界面,加载页面失败,HttpStatus:${httpResponseCode},URL:${_url}`);
				await this.modal.loadURL('data:text/html;charset=utf-8;base64,55Sx5LqO5aSa5qyh6aKR57mB6K+35rGC5pWw5o2u77yM6LGG55Oj5b2T5YmN5pqC5pe25LiN5Y+v55SoLiDor7fkuo4xMuWwj+aXtuaIljI05bCP5pe25ZCO5YaN6YeN6K+V77yM5oiW6YeN572u5L2g55qE572R57ucKOWmgumHjeaWsOaLqOWPt+aIluabtOaNoue9kee7nCk=');
			}else {
				this.settingsManager.debug(`配置界面:登录界面,加载页面成功,HttpStatus:${httpResponseCode},URL:${_url}`);
			}
		});

		this.modal.webContents.on('did-finish-load', () => {
			void this.tryCompleteLogin(session);
		});
	}

	private isDoubanHost(host: string): boolean {
		const normalizedHost = (host || '').replace(/^\./, '').toLowerCase();
		return normalizedHost === 'douban.com' || normalizedHost.endsWith('.douban.com');
	}

	private isDoubanUrl(url: string): boolean {
		try {
			const parsedUrl = new URL(url);
			return ['http:', 'https:'].includes(parsedUrl.protocol) && this.isDoubanHost(parsedUrl.hostname);
		} catch (_) {
			return false;
		}
	}

	private async tryCompleteLogin(session: any): Promise<void> {
		if (this.loginCompleted || this.loginCheckInProgress || !this.modal || this.modal.isDestroyed()) {
			return;
		}
		this.loginCheckInProgress = true;
		try {
			const cookies = await session.cookies.get({url: 'https://www.douban.com/'});
			if (!cookies.some((cookie: any) => cookie.name === 'dbcl2')) {
				return;
			}
			const cookieHeader = cookies
				.map((cookie: any) => `${cookie.name}=${cookie.value}`)
				.join('; ');
			const user = await this.settingsManager.plugin.userComponent.loginCookie(cookieHeader);
			if (user && user.login) {
				this.loginCompleted = true;
				this.settingsManager.debug(`配置界面:登录界面豆瓣登录成功, 信息:id:${StringUtil.confuse(user.id)}:, 用户名:${StringUtil.confuse(user.name)}`)
				try {
					await session.clearStorageData({
						origin: 'https://www.douban.com',
						storages: ['cookies']
					});
				} catch (error) {
					this.settingsManager.debug(`配置界面:登录成功后清理豆瓣Cookie失败:${error}`);
				}
				this.onClose();
			} else {
				this.settingsManager.debug(`配置界面:登录界面豆瓣登录失败, Cookie未能成功获取用户信息`)
			}
		} catch (error) {
			this.settingsManager.debug(`配置界面:登录界面验证失败:${error}`);
		} finally {
			this.loginCheckInProgress = false;
		}
	}

	async doLogin() {
		try {
			this.settingsManager.debug(`配置界面:登录界面加载登录页面`)
			await this.modal.loadURL('https://accounts.douban.com/passport/login');
		} catch (error) {
			log.error(i18nHelper.getMessage('100101'), error)
		}
	}

	onClose() {
		this.settingsManager.debug(`配置界面:登录界面关闭, 自动退出登录界面`)
		if (this.modal && !this.modal.isDestroyed()) {
			this.modal.close();
		}
	}

	onReload() {
		this.settingsManager.debug(`配置界面:登录界面重新加载`)
		this.modal.reload();
	}

	private showCloseMessage() {
		if(this.settingsManager.plugin.userComponent.isLogin()) {
			this.settingsManager.debug(`配置界面:登录界面关闭, 登录成功`)
		}else {
			this.settingsManager.debug(`配置界面:登录界面关闭, 登录失败`)
		}
	}
}
