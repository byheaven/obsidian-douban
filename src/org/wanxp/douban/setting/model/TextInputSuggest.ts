import {AbstractInputSuggest, App} from "obsidian";


// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes

export abstract class TextInputSuggest<T> extends AbstractInputSuggest<T> {
	protected inputEl: HTMLInputElement;

	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
		this.inputEl = inputEl;
	}
}
