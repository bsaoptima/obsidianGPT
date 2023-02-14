import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { CreateCompletionResponseChoicesInner, Configuration, OpenAIApi } from 'openai';
import { MyPluginSettingsTab } from 'settings';

require('dotenv').config()

interface MyPluginSettings {
  OPEN_AI_KEY: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  OPEN_AI_KEY: '',
};



export default class MyPlugin extends Plugin {
  openai: OpenAIApi;
  settings: MyPluginSettings;

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new MyPluginSettingsTab(this.app, this));

    this.addCommand({
      id: 'openai-prompt',
      name: 'OpenAI Prompt',
      callback: this.onOpenAIPrompt.bind(this),
    });

    this.openai = new OpenAIApi(
      new Configuration({
        apiKey: this.settings.OPEN_AI_KEY,
      })
    );
  }

  onOpenAIPrompt(){
    new OpenAIPrompt(this.app, this.openai).open();
  }

  onunload() {
    console.log('unloading plugin');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class OpenAIPrompt extends Modal {
  topicInput: HTMLInputElement;

  constructor(app: App, private openai: OpenAIApi) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: 'OpenAI Prompt' });

    new Notice('Please enter a topic.');

    const formEl = contentEl.createEl('form');

    formEl.addEventListener('submit', async (event) => {
      event.preventDefault();

      const topic = this.topicInput.value;

      if (!topic) {
        new Notice('Please enter a topic.');
        return;
      }

      const fileName = `${topic}.md`;
      const fileContent = await this.runCompletion(topic);
      await this.app.vault.create(fileName, fileContent);
      new Notice('File created!');
      this.close();
    });

    this.topicInput = formEl.createEl('input', {
      attr: { type: 'text' },
    });

    const submitButton = formEl.createEl('button', { text: 'Submit' });

    submitButton.addEventListener('click', () => {
      formEl.dispatchEvent(new Event('submit'));
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  async runCompletion(topic: string) {
    const completion = await this.openai.createCompletion({
      model: "text-davinci-003",
      prompt: "Answer the following question: What are the main chapters of "+ topic + "?{}",
      temperature: .7,
      max_tokens: 150,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: ['{}'],
    });

    return completion?.data?.choices?.[0]?.text?.trim() || '';
  }
}






