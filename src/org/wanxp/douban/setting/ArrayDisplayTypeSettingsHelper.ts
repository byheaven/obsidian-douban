import SettingsManager from "./SettingsManager";
import {ArraySetting, DEFAULT_SETTINGS_ARRAY_NAME} from "./model/ArraySetting";
import {Setting, TextComponent} from "obsidian";
import {i18nHelper} from "../../lang/helper";
import {DEFAULT_SETTINGS} from "../../constant/DefaultSettings";
import {DEFAULT_SETTINGS_ARRAY_INPUT_SIZE} from "../../constant/Constsant";
import {constructArrayLengthLimitSettingsUI} from "./ArrayLengthLimitSettingsHelper";


export function arraySettingDisplayUI(containerEl: HTMLElement, manager: SettingsManager) {
	const lengthLimitSection = containerEl.createDiv('obsidian_douban_array_section');
	constructArrayLengthLimitSettingsUI(lengthLimitSection, manager);

	const displaySection = containerEl.createDiv('obsidian_douban_array_section');
	arraySettingDisplay(displaySection, manager, true);
}

export function arraySettingDisplay(containerEl: HTMLElement, manager: SettingsManager, displayExtraListTypeFlag: boolean = true) {
	containerEl.empty();
	const overview = containerEl.createDiv('obsidian_douban_section_card');
	new Setting(overview)
		.setClass('obsidian_douban_array_section_header')
		.setName(i18nHelper.getMessage('120601'))
		.setDesc( i18nHelper.getMessage('120602'))
		.addButton((button) => {
			button
				.setIcon('plus')
				.setTooltip(i18nHelper.getMessage('120607'))
				.onClick(async () => {
					await manager.addArraySetting();
					arraySettingDisplay(containerEl, manager, true);
				});
		});
	arraySettingDisplayItem(containerEl, manager, manager.getArraySetting(DEFAULT_SETTINGS_ARRAY_NAME));
	displayExtraListType(manager, containerEl);
}

function arraySettingDisplayItem(containerEl: HTMLElement, manager: SettingsManager, arraySetting:ArraySetting) {
	const card = containerEl.createDiv('obsidian_douban_array_display_card');
	const fields = card.createDiv('obsidian_douban_array_fields');
	const typeName = arraySetting.arrayName;
	const arraySettingItems = new Setting(card)
		.setClass('obsidian_douban_array_card_header')
		.setName(i18nHelper.getMessage('120604') + typeName )
		.setDesc(i18nHelper.getMessage(`120605`) + (typeName == DEFAULT_SETTINGS_ARRAY_NAME ? '' : `(${typeName})`) +`}}`)
	;
	if(typeName != DEFAULT_SETTINGS_ARRAY_NAME) {
		arraySettingItems.addButton((button) => {
			button
				.setIcon('minus-with-circle')
				.setTooltip(i18nHelper.getMessage('120606'))
				.onClick(async () => {
					await manager.removeArraySetting(arraySetting.arrayName);
					arraySettingDisplay(containerEl, manager, true);
				});
		});
	}

	const arrayStartField = fields.createDiv('obsidian_douban_array_field');
	arrayStartField.createEl('label', {text: i18nHelper.getMessage('124109')});
	const arrayStart = new TextComponent(arrayStartField);
	arrayStart.setPlaceholder(DEFAULT_SETTINGS.arrayStart)
		.setValue(arraySetting.arrayStart)
		.onChange(async (value) => {
			arraySetting.arrayStart = value;
			await manager.updateArraySetting(arraySetting);
			showArrayExample(preview, manager, arraySetting);
		});
	const arrayStartEl = arrayStart.inputEl;
	arrayStartEl.size = DEFAULT_SETTINGS_ARRAY_INPUT_SIZE;
	arrayStartEl.addClass('obsidian_douban_settings_input');

	const elementStartField = fields.createDiv('obsidian_douban_array_field');
	elementStartField.createEl('label', {text: i18nHelper.getMessage('124110')});
	const arrayElementStart = new TextComponent(elementStartField);
	arrayElementStart.setPlaceholder(DEFAULT_SETTINGS.arrayElementStart)
		.setValue(arraySetting.arrayElementStart)
		.onChange(async (value) => {
			arraySetting.arrayElementStart = value;
			await manager.updateArraySetting(arraySetting);
			showArrayExample(preview, manager, arraySetting);
		});
	const arrayElementStartEl = arrayElementStart.inputEl;
	arrayElementStartEl.addClass('obsidian_douban_settings_input');
	arrayElementStartEl.size = DEFAULT_SETTINGS_ARRAY_INPUT_SIZE;

	const separatorField = fields.createDiv('obsidian_douban_array_field');
	separatorField.createEl('label', {text: i18nHelper.getMessage('124111')});
	const arraySpiltV2 = new TextComponent(separatorField);
	arraySpiltV2.setPlaceholder(DEFAULT_SETTINGS.arraySpiltV2)
		.setValue(arraySetting.arraySpiltV2)
		.onChange(async (value) => {
			arraySetting.arraySpiltV2 = value;
			await manager.updateArraySetting(arraySetting);
			showArrayExample(preview, manager, arraySetting);
		});
	const arraySpiltV2El = arraySpiltV2.inputEl;
	arraySpiltV2El.addClass('obsidian_douban_settings_input');
	arraySpiltV2El.size = 2;

	const elementEndField = fields.createDiv('obsidian_douban_array_field');
	elementEndField.createEl('label', {text: i18nHelper.getMessage('124112')});
	const arrayElementEnd = new TextComponent(elementEndField);
	arrayElementEnd.setPlaceholder(DEFAULT_SETTINGS.arrayElementEnd)
		.setValue(arraySetting.arrayElementEnd)
		.onChange(async (value) => {
			arraySetting.arrayElementEnd = value;
			await manager.updateArraySetting(arraySetting);
			showArrayExample(preview, manager, arraySetting);
		});
	const arrayElementEndEl = arrayElementEnd.inputEl;
	arrayElementEndEl.addClass('obsidian_douban_settings_input');
	arrayElementEndEl.size = DEFAULT_SETTINGS_ARRAY_INPUT_SIZE;

	const arrayEndField = fields.createDiv('obsidian_douban_array_field');
	arrayEndField.createEl('label', {text: i18nHelper.getMessage('124113')});
	const arrayEnd = new TextComponent(arrayEndField);
	arrayEnd.setPlaceholder(DEFAULT_SETTINGS.arrayEnd)
		.setValue(arraySetting.arrayEnd)
		.onChange(async (value) => {
			arraySetting.arrayEnd = value;
			await manager.updateArraySetting(arraySetting);
			showArrayExample(preview, manager, arraySetting);
		});
	const arrayEndEl = arrayEnd.inputEl;
	arrayEndEl.addClass('obsidian_douban_settings_input');
	arrayEndEl.size = DEFAULT_SETTINGS_ARRAY_INPUT_SIZE;

	const preview = card.createDiv('array-show');
	showArrayExample(preview, manager, arraySetting);
}

function displayExtraListType(manager: SettingsManager, containerEl: HTMLElement) {
	manager.settings.arraySettings.forEach(arraySetting => {
		arraySettingDisplayItem(containerEl, manager, arraySetting);
	})
}


function showArrayExample(arrShow: HTMLDivElement, manager: SettingsManager, arraySetting:ArraySetting) {
	arrShow.empty();
	const document = new DocumentFragment();
	document.createDiv('array-show-title')
		.innerHTML = `propertyName:${manager.handleArray(['value1', 'value2', 'value3'], arraySetting)}`;

	new Setting(arrShow)
		.setName(i18nHelper.getMessage('120603'))
		.setDesc(document);

}
