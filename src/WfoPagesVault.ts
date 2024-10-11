import { Vault, stringifyYaml, getFrontMatterInfo, htmlToMarkdown, TFile, parseYaml } from 'obsidian';
import WfoPlugin from '../main';
import { WfoTaxon } from './WfoListApi';

export class WfoPagesVault{

    plugin: WfoPlugin;
    vault: Vault;
    pagesFolderPath: string;
    
    constructor(plugin: WfoPlugin){
        this.plugin = plugin;
        this.vault = plugin.app.vault; // make a shortcut

        // Set up the pages folder
        this.pagesFolderPath = "wfo-pages";
        const pagesFolder = this.vault.getFolderByPath(this.pagesFolderPath);
        if(!pagesFolder){
            this.vault.createFolder(this.pagesFolderPath);
        }
        
    }

    /**
     * This will add and/or update
     * a taxon page given a wfo id.
     * It does a fresh call to get the most data it needs.
     * 
     * @param wfoId 
     * 
     */
    addUpdatePage(wfoId: string, forceFetch: boolean = false){

        // does the taxon page exist?
        const pagePath = this.pagesFolderPath + '/' + wfoId + '.md';
        let pageFile = this.vault.getFileByPath(pagePath);
        if(!pageFile){
            // just create a blank page if it doesn't exist
            // then call for it to be populated
            this.vault.create(pagePath, '').then(f => {this.populatePage(wfoId, f, forceFetch)});
        }else{
            // it exists so we can straight call for it to be populated.
            this.populatePage(wfoId, pageFile, forceFetch)
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
    populatePage(wfoId: string, pageFile: TFile, forceFetch: boolean){

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
                        this.populatePageCached(wfoId, pageFile, fm['wfoTaxon'], fmText, bodyText);
                    }else{
                        // there is no wfoTaxon property so we must fetch it
                        this.plugin.wfoListApi.fetchTaxon(wfoId, taxon => {
                            console.log("Fetching taxon");
                            // insert the taxon into the front matter
                            fm['wfoTaxon'] = taxon;
                            // make a new verion of the front matter as a string
                            fmText = "---\n" +  stringifyYaml(fm)  + "\n---\n";
                            // send that off to the populate page now it is cached
                            this.populatePageCached(wfoId, pageFile, taxon, fmText, bodyText);
                        });
                    }
                }else{
                    // no front matter so we must fetch to populate
                    this.plugin.wfoListApi.fetchTaxon(wfoId, taxon => {
                        console.log("Fetching taxon");
                        // create a denovo front matter object
                        let freshFm: any = {};
                        freshFm['wfoTaxon'] = taxon;
                        // make a new verion of the front matter as a string
                        let fmText = "---\n" +  stringifyYaml(freshFm)  + "---\n";

                        // send that off to the populate page now it is cached
                        // not the txt is just the txt because there was nothing beginning it
                        this.populatePageCached(wfoId, pageFile, taxon, fmText, txt);

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
    populatePageCached(wfoId: string, pageFile: TFile, taxon: WfoTaxon, frontMatterText: string, bodyText: string){

        let newBody = bodyText + htmlToMarkdown(taxon.hasName.fullNameStringHtml) + "\n----\n";
        this.vault.modify(pageFile, frontMatterText + newBody);

    }

}