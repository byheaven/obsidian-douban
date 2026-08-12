import {App, ButtonComponent, Modal, TextAreaComponent} from "obsidian";
import DoubanPlugin from "../../main";
import HandleContext from "../data/model/HandleContext";
import {i18nHelper} from "../../lang/helper";

export default class DoubanBatchImportModal extends Modal {
	private value = '';
	private running = false;

	constructor(app: App, private plugin: DoubanPlugin, private context: HandleContext) {
		super(app);
	}

	onOpen() {
		this.contentEl.createEl('h3', {text: i18nHelper.getMessage('batchImportTitle')});
		this.contentEl.createEl('p', {text: i18nHelper.getMessage('batchImportDesc')});
		const textarea = new TextAreaComponent(this.contentEl)
			.setPlaceholder('https://movie.douban.com/subject/3742360/\nhttps://book.douban.com/subject/2567698/')
			.onChange(value => this.value = value);
		textarea.inputEl.rows = 12;
		textarea.inputEl.addClass('obsidian_douban_batch_urls');

		const controls = this.contentEl.createDiv({cls: 'obsidian_douban_search_controls'});
		new ButtonComponent(controls)
			.setButtonText(i18nHelper.getMessage('110004'))
			.setCta()
			.onClick(async () => {
				if (this.running) {
					return;
				}
				this.running = true;
				const urls = this.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
				await this.plugin.batchImportUrls(urls, this.context);
				this.close();
			});
		new ButtonComponent(controls)
			.setButtonText(i18nHelper.getMessage('110005'))
			.onClick(() => this.close());
	}

	onClose() {
		this.contentEl.empty();
	}
}
