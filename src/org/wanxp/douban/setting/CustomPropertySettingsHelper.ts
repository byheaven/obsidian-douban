import {i18nHelper} from "../../lang/helper";
import SettingsManager from "./SettingsManager";
import {CustomProperty} from "./model/CustomProperty";
import {ButtonComponent, DropdownComponent, Setting, TextComponent} from "obsidian";
import {SupportType, SupportTypeMap} from "../../constant/Constsant";

export function constructCustomPropertySettingsUI(containerEl: HTMLElement, manager: SettingsManager) {
	const overview = containerEl.createDiv('obsidian_douban_section_card');
	overview.createEl('p', {
		cls: 'obsidian_douban_custom_property_intro',
		text: i18nHelper.getMessage('1242')
	});
	const customProperties = manager.plugin.settings.customProperties;
	new Setting(overview)
		.setClass('obsidian_douban_custom_property_header')
		.setDesc(i18nHelper.getMessage('1241'))
		.addButton((button) => {
			button.setButtonText(i18nHelper.getMessage('124101'));
			button.setTooltip(i18nHelper.getMessage('124101'));
			button.setIcon('plus');
			button.onClick(async () => {
				customProperties.push({name: '', value: '', field: SupportType.all});
				constructCustomPropertyUI(list, customProperties, manager);
			});
		});
	const list = containerEl.createDiv('custom-property-list');
	constructCustomPropertyUI(list, customProperties, manager);
}

export function constructCustomPropertyUI(containerEl: HTMLElement, customProperties: CustomProperty[], manager: SettingsManager) {
	containerEl.empty();
	for(let i: number = 0; i < customProperties.length; i++) {
		addFilterInput(customProperties[i], containerEl, customProperties, manager, i);
	}
}



function addFilterInput(data: CustomProperty, el: HTMLElement, customProperties: CustomProperty[] , manager: SettingsManager, idx: number) {
	const item = el.createDiv('obsidian_douban_custom_property_item');

	const nameControl = item.createDiv('obsidian_douban_custom_property_field');
	nameControl.createEl('label', { text: i18nHelper.getMessage('124102') });
	const nameField = new TextComponent(nameControl);
	nameField.setPlaceholder(i18nHelper.getMessage('124103'))
		.setValue(data.name)
		.onChange(async (value) => {
			if (!value) {
				return;
			}
			customProperties[idx].name = value;
			await manager.plugin.saveSettings();
		});
	const nameEl = nameField.inputEl;
	nameEl.addClass('obsidian_douban_settings_input');

	const valueControl = item.createDiv('obsidian_douban_custom_property_field');
	valueControl.createEl('label', { text: i18nHelper.getMessage('124104') });
	const valueField = new TextComponent(valueControl);
	valueField.setPlaceholder(i18nHelper.getMessage('124105'))
		.setValue(data.value)
		.onChange(async (value) => {
			if (!value) {
				return;
			}
			customProperties[idx].value = value;
			await manager.plugin.saveSettings();
		});
	const valueEl = valueField.inputEl;
	valueEl.addClass('obsidian_douban_settings_input');

	const typeControl = item.createDiv('obsidian_douban_custom_property_field');
	typeControl.createEl('label', { text: i18nHelper.getMessage('124106') });
	const fieldsDropdown = new DropdownComponent(typeControl);
	for (const fieldSelect in SupportType) {
		fieldsDropdown.addOption(fieldSelect, i18nHelper.getMessage(fieldSelect));
	}
	let dataFieldValue = data.field;
	if(typeof dataFieldValue === 'string') {
		// @ts-ignore
		dataFieldValue = SupportTypeMap[dataFieldValue];
	}
	fieldsDropdown.setValue(dataFieldValue)
		.onChange(async (value: SupportType) => {
			customProperties[idx].field = value;
			await manager.plugin.saveSettings();
		});
	const fieldSelectEl = fieldsDropdown.selectEl;
	fieldSelectEl.addClass('obsidian_douban_settings_input');

	const removeControl = item.createDiv('obsidian_douban_custom_property_remove');
	const extractButton = new ButtonComponent(removeControl);
	extractButton.setIcon('minus-with-circle');
	extractButton.setTooltip(i18nHelper.getMessage('124107'));
	extractButton.onClick(async () => {
		customProperties.splice(idx, 1);
		constructCustomPropertyUI(el, customProperties, manager);
		await manager.plugin.saveSettings();
	});
	const extractButtonEl = extractButton.buttonEl;
	extractButtonEl.addClass('obsidian_douban_settings_button');
}
