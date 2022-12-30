let Util = require("./util");
const rs = require("oci-resourcesearch");

class RessourceSearch {

    #provider = "";
    #util = ""

    constructor(provider){
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    /**
     * Obtem um volume
     */
    find(queryString){

        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Cria um array para armazenar as informações
             */
            var resources = [];

            /**
             * Cria uma variavel de ferencia para usar quando ouver o nextPage que representa uma nova requisição de paginação
             * que deve ser feito para seguir extraindo os dados
             */
            var nextPage = false;

            /**
             * Aqui criamos um looping infinito, pois não sabemos quantos requests será necessário realizar para obter as informações completas
             */
            while(true){

                /**
                 * instancia o resource 
                 */
                var searchClient = new rs.ResourceSearchClient({
                    authenticationDetailsProvider: this.#provider
                });

                /**
                 * Desativa o console
                 */
                this.#util.disableConsole();

                try {

                    /**
                     * Realizamos a consulta dos compartimentos
                     */
                     var result = await searchClient.searchResources({
                        searchDetails: {
                            query: `QUERY ${queryString}`,
                            type: "Structured",
                            matchingContextType: rs.models.SearchDetails.MatchingContextType.None
                        }
                    })
                    
                    /**
                     * Ativa o console
                     */
                    this.#util.enableConsole();
                     
                } catch (error) {
                    
                    /**
                     * Ativa o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Rejeita a promise
                     */
                    reject(error.message || error)
                }
                
                /**
                 * Varre a lista de resultados e vai adicionando no array
                 */
                (result ? result.resourceSummaryCollection.items : []).forEach(item => {
                    resources.push(item)
                });

                /**
                 * Valida se tem mais dados para serem buscados
                 */
                if(result && result.opcNextPage){

                    /**
                     * Define o nextPage para a próxima requisição
                     */
                    nextPage = result.opcNextPage;

                }else{

                    /**
                     * Retorna a promise com a lista dos compartimentos
                     */
                    return resolve(resources)
                }
            }
        })
    }
}

module.exports = RessourceSearch