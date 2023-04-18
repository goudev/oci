let Util = require("./util");
const identity = require("oci-identity");
class Compartments {

    #provider = "";
    #util = ""

    constructor(provider){
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    listCompartments(compartment){

        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Cria um array para armazenar as informações
             */
            var resources = [];

            /**
             * Define as configurações de pesquisa
             */
             var lConfig = {
                compartmentId: compartment ? compartment : this.#provider.getTenantId(),
                compartmentIdInSubtree: true,
                lifecycleState: "ACTIVE",
                limit: 100
            }

            /**
             * Aqui criamos um looping infinito, pois não sabemos quantos requests será necessário realizar para obter as informações completas
             */
            while(true){

                /**
                 * Realiza a consulta
                 */
                try {

                    /**
                     * Desativa o console
                     */
                    this.#util.disableConsole();

                    /**
                     * Realiza a consulta
                     */
                    var result = await new identity.IdentityClient({
                        authenticationDetailsProvider: this.#provider
                    }).listCompartments(lConfig);

                    /**
                     * Ativa o console
                     */
                    this.#util.enableConsole();
                    
                } catch (error) {

                    /**
                     * Habilita o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Rejeita a promise
                     */
                    return reject("Erro a consultar a lista de compartimentos. \n\n" + error.message)
                }
                
                /**
                 * Varre a lista de resultados
                 */
                result.items.forEach(item => {
                    resources.push(item);
                });

                /**
                 * Valida se tem mais dados para serem buscados
                 */
                if(result.opcNextPage){

                    /**
                     * Define o nextPage para a próxima requisição
                     */
                    lConfig.page = result.opcNextPage;
                    
                }else{

                    /**
                     * Retorna a promise com a lista dos compartimentos
                     */
                    return resolve(resources)
                }
            }
        })
    }

    async compartmentPath(compartmentId) {
        return new Promise(async (resolve, reject) => {
            try {
                const identityClient = new identity.IdentityClient({ authenticationDetailsProvider: this.#provider });

                const { compartment } = await identityClient.getCompartment({ compartmentId });

                const parentCompartments = [];     
                let parentId = compartment.compartmentId;
                
                while (parentId && parentId !== compartment.id) {
        
                    const parentCompartment = await identityClient.getCompartment({ compartmentId: parentId });
                    
                    parentCompartments.push(parentCompartment.compartment.name);
                    
                    parentId = parentCompartment.compartment.compartmentId;
                
                }

                const compartmentPath = [...parentCompartments.reverse(), compartment.name].join('/');
                resolve(compartmentPath);

            } catch (error) {
                reject(error)
            }

        })

    }


}

module.exports = Compartments