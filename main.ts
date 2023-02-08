import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { NewFileLocation } from './enums';
import { path } from './utils';
// Remember to rename these classes and interfaces!



export default class MyPlugin extends Plugin {

	// onload() is the function run when you open obsidian
	async onload() {
		this.addCommand({
			id: 'add-pane',
			name:  'Add a pane',
			checkCallback: (checking: boolean) => {
				const leaf = this.app.workspace.activeLeaf;
				if (leaf) {
					if (!checking){
						const new_leaf = this.app.workspace.getLeaf(true);
					}
					return true;
				}
				return false;
			}
		})

	}

	
	async createNewNote(input: string): Promise<void> {
		const { vault } = this.app;
		const { adapter } = vault;
		const prependDirInput = path.join(this.newDirectoryPath, input);
		const { dir, name } = path.parse(prependDirInput);
		const directoryPath = path.join(this.folder.path, dir);
		const filePath = path.join(directoryPath, `${name}.md`);

		try {
		const fileExists = await adapter.exists(filePath);
		if (fileExists) {
			// If the file already exists, respond with error
			throw new Error(`${filePath} already exists`);
		}
		if (dir !== '') {
			// If `input` includes a directory part, create it
			await this.createDirectory(dir);
		}
		const File = await vault.create(filePath, '');
		// Create the file and open it in the active leaf
		let leaf = this.app.workspace.getLeaf(false);
		if (this.mode === NewFileLocation.NewPane) {
			leaf = this.app.workspace.splitLeafOrActive();
		} else if (this.mode === NewFileLocation.NewTab) {
			leaf = this.app.workspace.getLeaf(true);
		} else if (!leaf) {
			// default for active pane
			leaf = this.app.workspace.getLeaf(true);
		}
		await leaf.openFile(File);
		} catch (error) {
		new Notice(error.toString());
		}
	}
	}

	onunload() {

	}

}

