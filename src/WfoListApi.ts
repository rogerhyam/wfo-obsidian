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
                        partsCount
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

    fetchTaxon(wfoId: string,  callback:(n: WfoTaxon)=> void){


        // qualifiy the version of the taxon we are getting
        const taxonId = wfoId + '-' +this.plugin.settings.classificationVersion;
        
        let q = `query{
            taxonConceptById(taxonId: \"${taxonId}\"){
                id
                hasName{
                    ...NameParts    
                }
                hasSynonym{
                    ...NameParts
                }
                path{
                    id
                    hasName{
                        ...NameParts
                    }
                }
                hasPart{
                    id
                    hasName{
                        ...NameParts
                    }
                }
            }
        }
        fragment NameParts on TaxonName {
            id
            fullNameStringHtml
        }    
        
        `;

        // run a query
        fetch(this.plugin.settings.apiUrl, {
            method: "POST",
            headers: {},
            body: JSON.stringify({ query: q }),
        })
            .then(r => r.json())
            .then(data => {
                if(data && data.data && data.data.taxonConceptById){
                    callback(data.data.taxonConceptById);
                }else{
                    console.log('Failed to find names');
                    console.log(data);
                }

            })


    }

}



/*
    A set of interfaces that describe the data returned by a json call
*/

export interface WfoName {
    id: string;
    fullNameStringHtml: string;
    fullNameStringPlain: string;
    currentPreferredUsage: WfoTaxon | null;
}

export interface WfoTaxon{
    id: string;
    hasName: WfoName;
    path: WfoTaxon[];
    hasSynonym: WfoName[];
    hasPart: WfoTaxon[];
    isPartOf: WfoTaxon[]; 
    partsCount: number;
}

/*
    just enough to render a link
*/
export interface WfoTaxonStub{
    id: string;
    taxonId: string;
    fullNameStringHtml: string;
    fullNameStringPlain: string;
}
