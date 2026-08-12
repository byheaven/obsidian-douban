import SettingsManager from "./SettingsManager";
import {i18nHelper} from "../../lang/helper";
import {Notice} from "obsidian";

interface VariableRow {
	name: string;
	descriptionKeySuffix?: string;
	sharedDescriptionKey?: string;
}

type VariableCopyMode = 'name' | 'description';

const BASIC_VARIABLES: VariableRow[] = [
	{name: 'id', descriptionKeySuffix: '01'},
	{name: 'title', descriptionKeySuffix: '02'},
	{name: 'type', descriptionKeySuffix: '03'},
	{name: 'score', descriptionKeySuffix: '04'},
	{name: 'scoreStar', sharedDescriptionKey: '410200'},
	{name: 'image', descriptionKeySuffix: '05'},
	{name: 'imageData.url', descriptionKeySuffix: '21'},
	{name: 'url', descriptionKeySuffix: '06'},
	{name: 'desc', descriptionKeySuffix: '07'},
	{name: 'publisher', descriptionKeySuffix: '08'},
	{name: 'datePublished', descriptionKeySuffix: '09'},
	{name: 'yearPublished', descriptionKeySuffix: '30'},
	{name: 'genre', descriptionKeySuffix: '10'},
	{name: 'currentDate', sharedDescriptionKey: '330101'},
	{name: 'currentTime', sharedDescriptionKey: '330102'}
];

const EXTRA_VARIABLE_SUFFIXES = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '22'];

const USER_VARIABLES = [
	{name: 'myTags', descriptionKey: '160226'},
	{name: 'myRating', descriptionKey: '160227'},
	{name: 'myRatingStar', descriptionKey: '160231'},
	{name: 'myState', descriptionKey: '160228'},
	{name: 'myComment', descriptionKey: '160229'},
	{name: 'myCollectionDate', descriptionKey: '160230'},
	{name: 'imageName', descriptionKey: 'imageNameDesc'},
	{name: 'popularComments', descriptionKey: 'popularCommentsDesc'}
];

export function constructTemplateVariablesUI(containerEl: HTMLElement, _manager: SettingsManager) {
	createVariableSection(
		containerEl,
		i18nHelper.getMessage('122001'),
		BASIC_VARIABLES,
		'name',
		i18nHelper.getMessage('122003'),
		i18nHelper.getMessage('122004')
	);

	const extraVariables = EXTRA_VARIABLE_SUFFIXES.map((suffix, index) => ({
		name: i18nHelper.getMessage(`3201${String(index + 1).padStart(2, '0')}`),
		descriptionKeySuffix: suffix
	}));
	createVariableSection(
		containerEl,
		i18nHelper.getMessage('122002'),
		extraVariables,
		'description',
		undefined,
		i18nHelper.getMessage('122005')
	);

	createUserVariableSection(containerEl);
}

function createVariableSection(
	containerEl: HTMLElement,
	title: string,
	variables: VariableRow[],
	copyMode: VariableCopyMode,
	summary?: string,
	help?: string
) {
	const section = containerEl.createDiv('obsidian_douban_variable_card');
	section.createEl('h3', {cls: 'obsidian_douban_variable_title', text: title});
	if (summary) {
		section.createEl('p', {cls: 'obsidian_douban_variable_summary', text: summary});
	}
	if (help) {
		section.createEl('p', {cls: 'obsidian_douban_variable_help', text: help});
	}

	createVariableTable(section, variables, copyMode);
}

function createVariableTable(containerEl: HTMLElement, variables: VariableRow[], copyMode: VariableCopyMode) {
	const scrollContainer = containerEl.createDiv('obsidian_douban_variable_table_scroll');
	const table = scrollContainer.createEl('table', {cls: 'obsidian_douban_variable_table'});
	const header = table.createEl('thead').createEl('tr');

	// 广播类型已移除，仅展示参数名及当前支持的六种内容类型。
	for (let index = 1; index <= 7; index++) {
		header.createEl('th', {
			attr: {scope: 'col'},
			text: i18nHelper.getMessage(`30010${index}`)
		});
	}

	const body = table.createEl('tbody');
	for (const variable of variables) {
		const row = body.createEl('tr');
		const nameCell = row.createEl('th', {attr: {scope: 'row'}});
		if (copyMode === 'name') {
			nameCell.createSpan({cls: 'obsidian_douban_variable_name', text: variable.name});
			makeVariableCopyable(nameCell, variable.name);
		} else {
			nameCell.setText(variable.name);
		}

		for (const description of getVariableDescriptions(variable)) {
			if (copyMode === 'description') {
				createExtraVariableCell(row, description);
			} else {
				row.createEl('td', {text: description});
			}
		}
	}
}

function createExtraVariableCell(row: HTMLTableRowElement, description: string) {
	const cell = row.createEl('td');
	const match = description.match(/^([A-Za-z][A-Za-z0-9_.]*)([:：])(.*)$/);
	if (!match) {
		cell.setText(description);
		return;
	}

	const [, variableName, separator, label] = match;
	cell.createSpan({cls: 'obsidian_douban_variable_name', text: variableName});
	cell.appendText(`${separator}${label}`);
	makeVariableCopyable(cell, variableName);
}

function getVariableDescriptions(variable: VariableRow): string[] {
	if (variable.sharedDescriptionKey) {
		return Array(6).fill(i18nHelper.getMessage(variable.sharedDescriptionKey));
	}

	return Array.from({length: 6}, (_, index) =>
		i18nHelper.getMessage(`310${index + 1}${variable.descriptionKeySuffix}`)
	);
}

function createUserVariableSection(containerEl: HTMLElement) {
	const section = containerEl.createDiv('obsidian_douban_variable_card');
	section.createEl('h3', {
		cls: 'obsidian_douban_variable_title',
		text: i18nHelper.getMessage('122010')
	});
	section.createEl('p', {
		cls: 'obsidian_douban_variable_help',
		text: i18nHelper.getMessage('160225')
	});

	const list = section.createDiv('obsidian_douban_user_variable_list');
	for (const variable of USER_VARIABLES) {
		const item = list.createDiv('obsidian_douban_user_variable_item');
		item.createSpan({cls: 'obsidian_douban_variable_name', text: variable.name});
		item.createEl('span', {text: i18nHelper.getMessage(variable.descriptionKey)});
		makeVariableCopyable(item, variable.name);
	}
}

function makeVariableCopyable(containerEl: HTMLElement, variableName: string) {
	const templateVariable = `{{${variableName}}}`;
	containerEl.addClass('obsidian_douban_variable_copy_target');
	containerEl.setAttrs({
		tabindex: '0',
		role: 'button',
		title: `${i18nHelper.getMessage('122011')} ${templateVariable}`,
		'aria-label': `${i18nHelper.getMessage('122011')} ${templateVariable}`
	});

	const copyVariable = async () => {
		try {
			await navigator.clipboard.writeText(templateVariable);
			new Notice(`${i18nHelper.getMessage('122012')} ${templateVariable}`);
		} catch (error) {
			new Notice(i18nHelper.getMessage('122013'));
		}
	};

	containerEl.addEventListener('click', copyVariable);
	containerEl.addEventListener('keydown', async (event: KeyboardEvent) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			await copyVariable();
		}
	});
}
