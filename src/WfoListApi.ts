import WfoPlugin from '../main';

export class WfoListApi{
    plugin: WfoPlugin;

    constructor(plugin: WfoPlugin){
        // so we have access to the rest of the 
        // plugin - especially the settings
        this.plugin = plugin;
    }

    getCurrentClassificationVersion(){

    }

    getSettingsClassificationVersion(){
        
    }

    getTaxonSuggestions(terms: string, callback:(n: WfoName)=> void){

        let q = `query{
                taxonNameSuggestion(termsString: \"${terms}\" limit: 30){
                    id
                    fullNameStringHtml
                    currentPreferredUsage{
                        id
                        hasName{
                            id
                            fullNameStringHtml
                        }
                    }
                }
            }`;

        // run a query
        fetch(this.plugin.settings.apiUrl, {
            method: "POST",
            headers: {},
            body: JSON.stringify({ query: q }),
          })
            .then(r => r.json())
            .then(data => {
                if(data && data.data && data.data.taxonNameSuggestion){
                    data.data.taxonNameSuggestion.map((n: WfoName) => callback(n));
                }else{
                    console.log('Failed to find names');
                    console.log(data);
                }

            })


        // do nothing if we have less than trh

    }


}

/*
    A set of interfaces that describe the data returned by a json call
*/

export interface WfoName {
    id: string;
    fullNameStringHtml: string;
    currentPreferredUsage: WfoTaxon | null;
}

export interface WfoTaxon{
    id: string;
    hasName: WfoName;
    hasSynonym: WfoName[];
    hasPart: WfoTaxon[];
    isPartOf: WfoTaxon[]; 
}
