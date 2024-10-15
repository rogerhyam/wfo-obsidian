import { Vault, stringifyYaml, getFrontMatterInfo, htmlToMarkdown, TFile, parseYaml, MarkdownView } from 'obsidian';
import WfoPlugin from '../main';
import { WfoTaxon } from './WfoListApi';
import WfoAncestorMap  from './WfoAncestorMap';

export class WfoPagesVault{

    plugin: WfoPlugin;
    vault: Vault;
    pagesFolderPath: string;
    ancestorMap: WfoAncestorMap;
    
    constructor(plugin: WfoPlugin){
        this.plugin = plugin;
        this.vault = plugin.app.vault; // make a shortcut

        // Set up the pages folder
        this.pagesFolderPath = "wfo-pages";
        const pagesFolder = this.vault.getFolderByPath(this.pagesFolderPath);
        if(!pagesFolder){
            this.vault.createFolder(this.pagesFolderPath);
        }

        // create an ancestor map
        this.ancestorMap = new WfoAncestorMap(this.plugin);
        
    }

    /**
     * This will add and/or update
     * a taxon page given a wfo id.
     * It does a fresh call to get the most data it needs.
     * 
     * @param wfoId 
     * @param forceFetch By default we use the data present in the head of the file if it is there. True to force collection from API.
     * @param alreadyUpdated Once we are in a recursion of updates we add ourselves to this list to break any loops.
     * 
     */
    addUpdatePage(namePlain: string, wfoId: string, forceFetch: boolean = false, alreadyUpdated: string[] = []){

        //do nothing if it is not well formed
        if(namePlain.length < 1) return;

        if(alreadyUpdated.includes(namePlain)){
            return; // do nothing as we have already been updated
        }else{
            alreadyUpdated.push(namePlain); // add ourselves so we can't be updated again
        }
        
        // does the taxon page exist?
        const pagePath = this.pagesFolderPath + '/' + namePlain + '.md';
        let pageFile = this.vault.getFileByPath(pagePath);
        if(!pageFile){
            // just create a blank page if it doesn't exist
            // then call for it to be populated
            this.vault.create(pagePath, '').then(f => {
                this.populatePage(namePlain, wfoId, f, forceFetch, alreadyUpdated);
            });
        }else{
            // it exists so we can straight call for it to be populated.
            this.populatePage(namePlain, wfoId, pageFile, forceFetch, alreadyUpdated);
        }

        

    }

    /**
     * We update the taxon metadata in the page before 
     * we move to actually writing in the visible area
     * 
     * @param wfoId The id of the name of this taxaon
     * @param pageFile The file for this taxon
     * @param forceFetch True if we want to fetch the data from the API even if it is already present.
     */
    populatePage(namePlain: string, wfoId: string, pageFile: TFile, forceFetch: boolean, alreadyUpdated: string[]){

        this.vault.read(pageFile).then(
            txt => {

                // we are in and have the txt of the file.
                const fmInfo = getFrontMatterInfo(txt);
    
                if(fmInfo.exists && !forceFetch){
                    // we have front matter but is it any good?
                    const fm = parseYaml(fmInfo.frontmatter);
                    
                    let fmText = txt.substring(0, fmInfo.contentStart);
                    const bodyText = txt.substring(fmInfo.contentStart);

                    if('wfoTaxon' in fm){
                        this.populatePageCached(namePlain, pageFile, fm['wfoTaxon'], fmText, bodyText, forceFetch, alreadyUpdated);
                    }else{
                        // there is no wfoTaxon property so we must fetch it
                        this.plugin.wfoListApi.fetchTaxon(wfoId, taxon => {
                            console.log("Fetching taxon");
                            // insert the taxon into the front matter
                            fm['wfoTaxon'] = taxon;

                            // add this taxon to the ancestors map
                            this.ancestorMap.addTaxon(taxon);

                            // make a new verion of the front matter as a string
                            fmText = "---\n" +  stringifyYaml(fm)  + "\n---\n";

                            // send that off to the populate page now it is cached
                            this.populatePageCached(namePlain, pageFile, taxon, fmText, bodyText, forceFetch, alreadyUpdated);

                        });
                    }
                }else{
                    // no front matter so we must fetch to populate
                    this.plugin.wfoListApi.fetchTaxon(wfoId, taxon => {
                        // create a denovo front matter object
                        let freshFm: any = {};
                        freshFm['wfoTaxon'] = taxon;
                        // make a new verion of the front matter as a string
                        let fmText = "---\n" +  stringifyYaml(freshFm)  + "---\n";

                        // send that off to the populate page now it is cached
                        // not the txt is just the txt because there was nothing beginning it
                        this.populatePageCached(namePlain, pageFile, taxon, fmText, txt, forceFetch, alreadyUpdated);

                    });

                }
            
            });  

    }

    /**
     * Only changes content beyond the front matter
     * in line with the frontMatter passed in
     * @param wfoId 
     * @param pageFile 
     * @param frontMatter 
     */
    populatePageCached(namePlain: string, pageFile: TFile, taxon: WfoTaxon, frontMatterText: string, bodyText: string, forceFetch: boolean, alreadyUpdated: string[]){

        // all the text before the first ---- are belong to us.

        // the user text is added back onto the end of the file once we create it
        let userTxt = bodyText.substring(bodyText.search("\n----\n") + 6);

        let wfoContent = "";

        // Parent links
        taxon.path.reverse().map(ancestor => {

            // don't do ourselves
            if(ancestor.hasName.fullNameStringPlain == namePlain) return;

            // work through the others to the root
            const pagePath = this.pagesFolderPath + '/' +  ancestor.hasName.fullNameStringPlain + '.md';
            let pageFile = this.vault.getFileByPath(pagePath);
            if(pageFile){
                // the file exists so we should include a link to it.
                const nameMd = htmlToMarkdown(ancestor.hasName.fullNameStringHtml);
                const fileName = ancestor.hasName.fullNameStringPlain + '.md';
                wfoContent = `${wfoContent} [${nameMd}](${fileName})\n`;
                this.addUpdatePage(ancestor.hasName.fullNameStringPlain, forceFetch, alreadyUpdated);
            }
        });

        // title
        wfoContent = wfoContent + "# " + htmlToMarkdown(taxon.hasName.fullNameStringHtml) + "\n";

        // children links
        taxon.hasPart.map(kid => {

            // We can't find descendants if they don't exist as files....
            // we need to have a list of all the descendants somewhere
            const pagePath = this.pagesFolderPath + '/' +  kid.hasName.fullNameStringPlain + '.md';
            let pageFile = this.vault.getFileByPath(pagePath);
            if(pageFile){
                // the file exists so we should include a link to it.
                const nameMd = htmlToMarkdown(kid.hasName.fullNameStringHtml);
                const fileName = kid.hasName.fullNameStringPlain + '.md';
                wfoContent = `${wfoContent} [${nameMd}](${fileName})\n`;
                this.addUpdatePage(kid.hasName.fullNameStringPlain, kid.hasName.id, forceFetch, alreadyUpdated);
            }
        });

        // update all the descendant pages so they can update their breadcrumb trails 
        // back up the tree.
        this.ancestorMap.getDescendantsTaxa(taxon).map(descendantStub =>{
            this.addUpdatePage(descendantStub.fullNameStringPlain, descendantStub.id, forceFetch, alreadyUpdated);
        });

        // synonym links
      
        // marker at the end of our section
        wfoContent = wfoContent  + "\n\n----\n";

        this.vault.modify(pageFile, frontMatterText + wfoContent + userTxt);

        //this.plugin.app.metadataCache.fileToLinktext

    }

    focusOnPage(pageFile: TFile){
        const leaf = this.plugin.app.workspace.getLeaf(false); // false = open in the current tab - creating a new leaf
        leaf.openFile(pageFile); // file: TFile
    }

    focusOnTaxon(namePlain: string){
        const pagePath = this.pagesFolderPath + '/' + namePlain + '.md';
        let pageFile = this.vault.getFileByPath(pagePath);
        if(pageFile){
            this.focusOnPage(pageFile);
        }
    }

    /**
     * Get a handle on the currently focussed taxon page
     * so we can do things to it.
     */
    getCurrentTaxonWfoId(){
        const file = this.plugin.app.workspace.getActiveFile();
        const namePlain = file?.basename;
        if(namePlain){
            return namePlain;
        }else{
            return '';
        }
    }

    public updateIndexPage(){

        // FIXME - got to here..

    }


}

