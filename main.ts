import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
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
      id: 'find-chapters',
      name: 'Find Topic Chapters',
      callback: async () => {
        const activeMarkdown_name = this.app.workspace.getActiveFile()?.basename;
        const activeMarkdown = this.app.workspace.getActiveFile()
        new Notice(`${activeMarkdown_name}`)
        if (activeMarkdown_name){
          const fileContent = await this.FindChapters(activeMarkdown_name);

          if (activeMarkdown instanceof TFile){
            await this.app.vault.modify(activeMarkdown, fileContent);
          }
        }
      }
    });

    this.addCommand({
      id: 'openai-prompt',
      name: 'OpenAI Prompt',
      callback: () =>{
        new OpenAIPrompt(this.app, this.openai).open();
      }
    });
    
    this.addCommand({
      id: "create-pages",
      name: "Create Pages with List",
      callback: async () =>{
        const activeFileName = this.app.workspace.getActiveFile();
        if (activeFileName instanceof TFile){
          const content = await this.app.vault.read(activeFileName);
          const modifiedContent = this.modifyFileContent(content);
          new Notice(`${modifiedContent}`)
          await this.app.vault.modify(activeFileName, modifiedContent)
        }
      }
    });

    this.openai = new OpenAIApi(
      new Configuration({
        apiKey: this.settings.OPEN_AI_KEY,
      })
    );
  }

  onunload() {
    console.log('unloading plugin');
  }

  async FindChapters(topic: string) {
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

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private modifyFileContent(content: string): string{
    const lines = content.split('\n');
    const regex = /^\d+\.\s+/;

    const result = lines
      .filter(line => regex.test(line))
      .map(line => line.replace(regex, ''))
      .join('\n');
    
    const listArray = result.split('\n');
    const modifiedList = listArray.map((item) =>`[[${item.trim()}]]`);
    return modifiedList.join('\n');
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

    new Notice('Enter a prompt.');

    const formEl = contentEl.createEl('form');

    formEl.addEventListener('submit', async (event) => {
      event.preventDefault();

      const topic = this.topicInput.value;

      if (!topic) {
        new Notice('Please enter a prompt.');
        return;
      }
      const file = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!file) return;

      const editor = file.editor;
      const cursor = editor.getCursor();

      if (!cursor) return;

      const line = cursor?.line;
      const ch = cursor?.ch;
      const position = editor.posToOffset({ line, ch });

      const activeFile = this.app.workspace.getActiveFile();
      if (!activeFile) return;

      const content = await this.app.vault.read(activeFile);
      const newContent = await this.promptGPT(topic);

      const insertedContent = this.insertTextAtPosition(content, `- ${newContent}`, position)
      await this.app.vault.modify(activeFile, insertedContent);
      new Notice('File modified!');
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

  async promptGPT(prompt: string){
    const output = await this.openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt + "{}",
      temperature: .7,
      max_tokens: 150,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: ['{}'],
    });

    return output.data.choices[0].text?.trim().replace(/\n/g, "\n-");
  }

  private insertTextAtPosition(text:string, insert: string, position: number){
    return text.slice(0, position) + insert + text.slice(position);
  }
  
}
