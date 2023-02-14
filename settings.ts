import { App, PluginSettingTab, Setting } from 'obsidian';
import type AdvancedNewFilePlugin from './main';

export class MyPluginSettingsTab extends PluginSettingTab {
  plugin: AdvancedNewFilePlugin;

  constructor(app: App, plugin: AdvancedNewFilePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'My Plugin Settings' });

    new Setting(containerEl)
      .setName('OpenAI API Key')
      .setDesc('Enter your OpenAI API key here.')
      .addText((text) =>
        text
          .setPlaceholder('API key')
          .setValue(this.plugin.settings.OPEN_AI_KEY)
          .onChange(async (value) => {
            this.plugin.settings.OPEN_AI_KEY = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
