let Util = require("./util");
const rs = require("oci-resourcesearch");
var trace = require('debug')('oci:trace:resourceSearch');
class RessourceSearch {

    #provider = "";
    #util = ""

    constructor(provider){
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    async* findIterator(queryString) {
        try {
            const searchClient = new rs.ResourceSearchClient({
                authenticationDetailsProvider: this.#provider,
            });

            const searchDetails = {
                searchDetails: {
                    query: `QUERY ${queryString}`,
                    type: "Structured",
                    matchingContextType: rs.models.SearchDetails.MatchingContextType.None,
                },
                limit: 1,
            };

            let hasPages = true;

            while(hasPages){
                const result = await searchClient.searchResources(searchDetails);
                if (result.opcNextPage) searchDetails.page = result.opcNextPage;
                else hasPages = false;
                yield result.resourceSummaryCollection.items[0];
            }

        } catch (error) {
            throw error;
        }
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
             * instancia o resource 
             */
            var searchClient = new rs.ResourceSearchClient({
                authenticationDetailsProvider: this.#provider
            });

            /**
             * Aqui criamos um looping infinito, pois não sabemos quantos requests será necessário realizar para obter as informações completas
             */
            while(true){

                /**
                 * Desativa o console
                 */
                this.#util.disableConsole();

                try {

                    /**
                     * Trace
                     */
                    trace(`Resource Search com criterio ${queryString} para tenancy ${this.#provider.delegate.tenancy}`);

                    /**
                     * Define o criterio de consulta
                     */
                    var search = {
                        searchDetails: {
                            query: `QUERY ${queryString}`,
                            type: "Structured",
                            matchingContextType: rs.models.SearchDetails.MatchingContextType.None,
                        },
                        limit: 500
                    }

                    /**
                     * Valida se é uma requisição de próxima pagina
                     */
                    if(nextPage){
                        search.page = nextPage;
                    }


                    /**
                     * Realizamos a consulta dos compartimentos
                     */
                    var result = await searchClient.searchResources(search)
                    
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
                 * Define um resultado
                 */
                var items = result ? result.resourceSummaryCollection.items : []

                /**
                 * Trace
                 */
                trace(`Resultado da consulta retornou ${items.length} registros para tenancy ${this.#provider.delegate.tenancy}`);                

                /**
                 * Varre a lista de resultados e vai adicionando no array
                 */
                items.forEach(item => {

                    /**
                     * Adiciona ao array
                     */
                    resources.push(item)
                });

                /**
                 * Valida se tem mais dados para serem buscados
                 */
                if(result && result.opcNextPage){

                    /**
                     * Trace
                     */
                    trace(`Realizando uma nova consulta para obter o restante dos dados para tenancy ${this.#provider.delegate.tenancy}`);

                    /**
                     * Define o nextPage para a próxima requisição
                     */
                    nextPage = result.opcNextPage;

                }else{

                    /**
                     * Trace
                     */
                    trace(`Finalizada a consulta, não é necessário paginar os dados para tenancy ${this.#provider.delegate.tenancy}`);

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