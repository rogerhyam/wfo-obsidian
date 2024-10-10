import { Modal, Notice} from 'obsidian';
import WfoPlugin from '../main';
import { WfoName } from './WfoListApi';

export class WfoAddTaxonModal extends Modal {
	plugin: WfoPlugin;
	taxonList: HTMLDivElement;
	typingTimer: number;

	constructor(plugin: WfoPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onOpen() {
		this.setTitle("Add a taxon page");
		
		// the body of the modal
		const {contentEl} = this;

		// add a text input box to lookup names
		const textInput = contentEl.createEl("input", {
				type: 'text', 
				cls: 'add-taxon-input',
				placeholder: 'Start typing the taxon name or paste a full WFO ID',
			});
		textInput.addEventListener('keyup', (e: Event) => {
			// n.b. two kinds of time out
			clearTimeout(this.typingTimer);
			this.typingTimer = window.setTimeout(() => {
				this.lookupTextChange((<HTMLTextAreaElement>e.target).value);
			}, 800);
				
		});

		this.taxonList = contentEl.createDiv({cls: 'add-taxon-list'});
	}


	lookupTextChange(txt: string){

		// do nothing for short strings
		txt = txt.trim();
        if (txt.length < 3) return [];

		this.taxonList.empty();
		const notice = new Notice(`Loading names for '${txt}'`);

		// ask the API for a list of names that fit that string
		// or none
 		const names = this.plugin.wfoListApi.getTaxonSuggestions(txt, name => {
			
			// this is a callback 
			notice.hide();
			const li = this.taxonList.createDiv('add-taxon-list-item');
			if(name.currentPreferredUsage){
				// name is placed
				if(name.id == name.currentPreferredUsage.hasName.id){
					// accepted name
					const s = li.createEl('strong');
					s.innerHTML = name.fullNameStringHtml;
				}else{
					
					// synonym
					const s = li.createEl('span');
					s.innerHTML = name.fullNameStringHtml;
					
					// add in accepted
					li.createDiv('add-taxon-list-strong').innerHTML = name.currentPreferredUsage.hasName.fullNameStringHtml;
				}
			}else{
				// name is unplaced
				li.createDiv().innerHTML = name.fullNameStringHtml;
				li.createDiv('add-taxon-list-strong').textContent = ' Unplaced name';
			}
			li.setAttr('wfo-id', name.id);
			li.addEventListener('click', (e: Event) => {this.taxonSelected((<HTMLElement>e.target).getAttr('wfo-id')); console.log(e)});	
		
		});

	}

	taxonSelected(wfoId: string | null){
		//if(!wfoId) return;
		alert(wfoId);
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}