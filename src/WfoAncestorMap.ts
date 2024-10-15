
import {getFrontMatterInfo, parseYaml} from 'obsidian';
import WfoPlugin from "../main";
import { WfoListApi, WfoTaxon, WfoTaxonStub } from "./WfoListApi";


/**
 * This class represents a mapping of 
 * all the ancestor descendant relationships
 * in the current files.
 * 
 */
export default class WfoAncestorMap{
    plugin: WfoPlugin;
    pagesFolderPath: string;
    dataPath: string;
    ancestorMap: Map<string, WfoTaxonStub[]>;

    constructor(plugin: WfoPlugin){
        this.plugin = plugin;
   
        // Set up the pages folder if it isn't there
        this.pagesFolderPath = "wfo-pages";
        const pagesFolder = this.plugin.app.vault.getFolderByPath(this.pagesFolderPath);
        if(!pagesFolder){
            this.plugin.app.vault.createFolder(this.pagesFolderPath);
        }

        // does the json file exist
        this.dataPath = this.pagesFolderPath + '/ancestors.json';
        let dataFile = this.plugin.app.vault.getFileByPath(this.dataPath);
        if(!dataFile){

            // file does not exist so create it.
            this.plugin.app.vault.create(this.dataPath, JSON.stringify([])).then(f => {
                
                this.loadFile(); // so the map is initialised.

                // work through the taxon files and add them.
                this.plugin.app.vault.getFolderByPath(this.pagesFolderPath)?.children.map(f => {
                    if(f.name.match('^wfo-[0-9]{10}\.md$')){
                        
                        const file = this.plugin.app.vault.getFileByPath(f.path);
                        
                        if(file != null){

                            this.plugin.app.vault.read(file).then(txt => {
                                const fmInfo = getFrontMatterInfo(txt);
                                if(fmInfo != null){
                                    const fm = parseYaml(fmInfo.frontmatter);
                                    if('wfoTaxon' in fm){
                                        this.addTaxon(fm['wfoTaxon']);
                                    }
                                }
                            });// reading file

                        } // file exists
                    
                    } // is a taxon file

                });// working through taxon files

            }); // creating data file
        }else{
            this.loadFile();
        }
        
    }

    private loadFile(){
        const dataFile = this.plugin.app.vault.getFileByPath(this.dataPath);
        if(dataFile != null){
            this.plugin.app.vault.read(dataFile).then(
                json => {
                   this.ancestorMap = new Map(JSON.parse(json));
                }
            );
        }
    } 

    private saveFile(){
        const dataFile = this.plugin.app.vault.getFileByPath(this.dataPath);
        if(dataFile != null){
            this.plugin.app.vault.modify(dataFile, JSON.stringify([...this.ancestorMap.entries()]));
        } 
    }

    public addTaxon(taxon: WfoTaxon){

        // taxon is a descendant of all the id's in its path
        taxon.path.map(ancestor => {
            
            // create a map entry if there isn't one for this ancestor
            if(this.ancestorMap.get(ancestor.hasName.id) == null){
                this.ancestorMap.set(ancestor.hasName.id, []);
            }

            // add self to each ancestor's list of descendants
            const stub: WfoTaxonStub = {id: taxon.hasName.id, taxonId: taxon.id, fullNameStringHtml: taxon.hasName.fullNameStringHtml} 
            if(this.ancestorMap.get(ancestor.hasName.id)?.indexOf(stub) === -1){
                this.ancestorMap.get(ancestor.hasName.id)?.push(stub);
            }
 
        });

        this.saveFile();
        this.plugin.wfoPagesVault.updateIndexPage();
  
    }

    public removeTaxon(taxon: WfoTaxon){

        // remove self from each of the descendant lists
        taxon.path.map(ancestor => {
            if(this.ancestorMap.get(ancestor.hasName.id) !== null){
                let newAncestorList = this.ancestorMap.get(ancestor.hasName.id)?.filter(stub => stub.id !== taxon.hasName.id);
                if(!newAncestorList) newAncestorList = [];
                this.ancestorMap.set(
                    ancestor.hasName.id,
                    newAncestorList
                )
            }
        });

        // remove self ancestors
        this.ancestorMap.delete(taxon.hasName.id);
        this.saveFile();
        this.plugin.wfoPagesVault.updateIndexPage();

    }

    public  getDescendantsTaxa(taxon: WfoTaxon): WfoTaxonStub[]{
        return this.getDescendantsTaxaFromWfoId(taxon.hasName.id);


    }  

    public getDescendantsTaxaFromWfoId(wfoId: string){

        if(typeof this.ancestorMap.get(wfoId) !== 'undefined'){
            return this.ancestorMap.get(wfoId)!;
        }else{
            return [];
        }

    }

}