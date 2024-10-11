import { App, Menu, Editor, MarkdownView, Modal, Notice, Plugin } from 'obsidian';
import {WfoSettingsTab, WfoPluginSettings, DEFAULT_SETTINGS} from 'src/WfoSettingsTab'
import {WfoAddTaxonModal} from 'src/WfoAddTaxonModal'
import {WfoListApi} from 'src/WfoListApi'
import {WfoPagesVault} from 'src/WfoPagesVault'

export default class WfoPlugin extends Plugin {
	settings: WfoPluginSettings;
	wfoListApi: WfoListApi;
	wfoPagesVault: WfoPagesVault;


	async onload() {
		console.log('loading plugin');
		await this.loadSettings();

		this.wfoListApi = new WfoListApi(this);
		this.wfoPagesVault = new WfoPagesVault(this);

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Add a taxon page',
			callback: () => {
				new WfoAddTaxonModal(this).open();
			}
		});

		// same things as a menu items
		this.addRibbonIcon("leaf", "WFO Pages", (event) => {
			const menu = new Menu();
	  
			menu.addItem((item) =>
			  item
				.setTitle("Add a taxon page")
				.setIcon("documents")
				.onClick(() => {
					new WfoAddTaxonModal(this).open();
				})
			);
	  
			menu.showAtMouseEvent(event);
		  });


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new WfoSettingsTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			//console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}