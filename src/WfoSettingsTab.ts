import { App, PluginSettingTab, Setting } from 'obsidian';
import WfoPlugin from '../main';

export class WfoSettingsTab extends PluginSettingTab {
	plugin: WfoPlugin;

	constructor(app: App, plugin: WfoPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Classification Version')
			.setDesc("This is the version of the classification that will be used to arrange the taxa. If you change this then you'll have to run an update process. New versions come out in June and December each year.")
			.addText(text => text
				.setPlaceholder('Enter a valid classification ID yyyy-mm')
				.setValue(this.plugin.settings.classificationVersion)
				.onChange(async (value) => {
					this.plugin.settings.classificationVersion = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('API URL')
			.setDesc("This is the location of the API to access the WFO Plant List data. You probably don't want to change this!")
			.addText(text => text
				.setPlaceholder('https://')
				.setValue(this.plugin.settings.apiUrl)
				.onChange(async (value) => {
					this.plugin.settings.apiUrl = value;
					await this.plugin.saveSettings();
				}));
	}
}

export interface WfoPluginSettings {
	classificationVersion: string;
	apiUrl: string;
}

export const DEFAULT_SETTINGS: WfoPluginSettings = {
	classificationVersion: '2024-06',
	apiUrl: 'https://list.worldfloraonline.org/gql.php'
}