let Util = require("./util");
const core = require('oci-core');
var trace = require('debug')('oci:trace:network');
const resourceSearch = require('./resourceSearch');
const Compartments = require("./compartments");

class Network {

    #provider = "";
    #util = ""

    constructor(provider){
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    /**
     * Retorna a lista de todos os vnic attachments
     */
    listVnicAttachments(compartmentId){

        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Cria um array para armazenar as informações
             */
            var bva = [];

            /**
             * Se foi passado um compartimento
             */
            if(compartmentId){

                /**
                 * Habilita o console
                 */
                this.#util.disableConsole();

                /**
                 * Realiza a consulta
                 */
                new core.ComputeClient({ authenticationDetailsProvider: this.#provider}).listVnicAttachments({
                    compartmentId: compartmentId
                }).then(result=>{

                    /**
                     * Habilita o console
                     */
                    this.#util.enableConsole();

                    /**
                     * retorna a promise
                     */
                    resolve(result.items);

                }).catch(error=>{
                    /**
                     * Habilita o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Rejeita a promise
                     */
                    reject("Erro ao obter a lista de Block Volume Attachments. \n\n" + error.message || error);
                });

            }else{

                /**
                 * Trace
                 */
                trace("Obtendo a lista de compartmentos");

                /**
                 * Obtem a lista de compartimentos
                 */
                new Compartments(this.#provider).listCompartments().then(async compartments=>{

                    /**
                     * Trace
                     */
                    trace(`Encontrado ${compartments.length} compartimentos`);

                    for (const compartment of compartments) {

                        /**
                         * Trace
                         */
                        trace(`Consultando a lista de vnics no compartimento ${compartment.name}`);

                        /**
                         * Obtem a lista de vnics
                         */
                        await this.listVnicAttachments(compartment.id).then(result=>{

                            /**
                             * Trace
                             */
                            trace(`Encontrado ${result.length} vnics no compartimento ${compartment.name}`);

                            result.forEach(b => {
                                bva.push(b)
                            });
                        }).catch(error=>{
                            reject(error.message || error)
                        })
                    }
                    resolve(bva)
                }).catch(error=>{

                    /**
                     * Rejeita a promise
                     */
                    reject(error.message);
                })
            }
        })
    }

    /**
     * Obtem a lista de todos os vnics
     */
    listVnics(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var vnics = [];

            /**
             * Trace
             */
            trace(`Consultando a lista de vnics`)

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("vnic resources where (lifecycleState = 'AVAILABLE')").then(async vns=>{

                /**
                 * Trace
                 */
                trace(`ResourceSearch encontrou ${vns.length} vnics.`);

                /**
                 * Varre a lista de boot volumes
                 */
                for (const vn of vns) {

                    /**
                     * Trace
                     */
                    trace(`Obtendo informações da VNIC ${vn.displayName}`);

                    await this.getVnic(vn.identifier).then(v=>{

                        /**
                         * Trace
                         */
                        trace(`Dados da vnic obtidos com sucesso.`);
                        vnics.push(v);
                    }).catch(error=>{
                        reject("Erro ao consultar a vnic " + vn.identifier + "\n\n" + error.message || error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(vnics)
            }).catch(error=>{
                reject(error);
            })
        })
    }

    /**
     * Obtem os dados da vnic
     */
    getVnic(vnicId){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

             try {

                /**
                 * Obte a vnic
                 */
                await new core.VirtualNetworkClient({ authenticationDetailsProvider: this.#provider}).getVnic({
                    vnicId: vnicId
                }).then(result=>{
                    
                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();
                    
                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.vnic)
                })

                 /**
                  * Habilita o console
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
                 reject(error.message || error)
             }
        })
    }

    /**
     * Obtem um volume
     */
    getPublicIp(publicIpId){
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

             try {

                /**
                 * 
                 */
                await new core.VirtualNetworkClient({ authenticationDetailsProvider: this.#provider}).getPublicIp({
                    publicIpId: publicIpId
                }).then(result=>{

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.publicIp)
                })

                 /**
                  * Habilita o console
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
                 reject(error.message || error)
             }
        })
    }

    /**
     * Obtem a lista de todos os vnics
     */
    listPublicIps(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var lips = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("publicip resources where (lifecycleState = 'AVAILABLE')").then(async ips=>{

                /**
                 * Varre a lista de boot volumes
                 */
                for (const ip of ips) {
                    await this.getPublicIp(ip.identifier).then(i=>{
                        lips.push(i);
                    }).catch(error=>{
                        reject("Erro ao consultar a vnic " + ip.identifier + "\n\n" + error.message || error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(lips)
            }).catch(error=>{
                reject(error);
            })
        })
    }

    /**
     * Obtem um volume
     */
    getPrivateIp(privateIpId){
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

             try {

                /**
                 * 
                 */
                await new core.VirtualNetworkClient({ authenticationDetailsProvider: this.#provider}).getPrivateIp({
                    privateIpId: privateIpId
                }).then(result=>{

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.privateIp)
                })

                 /**
                  * Habilita o console
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
                 reject(error.message || error)
             }
        })
    }

    /**
     * Obtem a lista de todos os vnics
     */
    listPrivateIps(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var lips = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("privateip resources where (lifecycleState = 'AVAILABLE')").then(async ips=>{

                /**
                 * Varre a lista de boot volumes
                 */
                for (const ip of ips) {
                    await this.getPrivateIp(ip.identifier).then(i=>{
                        lips.push(i);
                    }).catch(error=>{
                        reject("Erro ao consultar a vnic " + ip.identifier + "\n\n" + error.message || error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(lips)
            }).catch(error=>{
                reject(error);
            })
        })
    }

    /**
     * Obtem um volume
     */
    getVcn(vcnId){
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

             try {

                /**
                 * 
                 */
                await new core.VirtualNetworkClient({ authenticationDetailsProvider: this.#provider}).getVcn({
                    vcnId: vcnId
                }).then(result=>{

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.vcn)
                })

                 /**
                  * Habilita o console
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
                 reject(error.message || error)
             }
        })
    }

    /**
     * Obtem a lista de todos os vnics
     */
    listVcns(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var vcnsList = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("vcn resources where (lifecycleState = 'AVAILABLE')").then(async vcns=>{
                
                /**
                 * Varre a lista de boot volumes
                 */
                for (const vcn of vcns) {
                    await this.getVcn(vcn.identifier).then(v=>{
                        vcnsList.push(v);
                    }).catch(error=>{
                        reject("Erro ao consultar a vnic " + vcn.identifier + "\n\n" + error.message || error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(vcnsList)
            }).catch(error=>{
                reject(error);
            })
        })
    }

    /**
     * Obtem um volume
     */
    getSubnet(subnetId){
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

             try {

                /**
                 * 
                 */
                await new core.VirtualNetworkClient({ authenticationDetailsProvider: this.#provider}).getSubnet({
                    subnetId: subnetId
                }).then(result=>{

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.subnet)
                })

                 /**
                  * Habilita o console
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
                 reject(error.message || error)
             }
        })
    }

    /**
     * Obtem a lista de todos os vnics
     */
    listSubnets(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var subnetsList = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("subnet resources where (lifecycleState = 'AVAILABLE')").then(async subnets=>{
                
                /**
                 * Varre a lista de boot volumes
                 */
                for (const subnet of subnets) {
                    await this.getSubnet(subnet.identifier).then(v=>{
                        subnetsList.push(v);
                    }).catch(error=>{
                        reject("Erro ao consultar a vnic " + subnet.identifier + "\n\n" + error.message || error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(subnetsList)
            }).catch(error=>{
                reject(error);
            })
        })
    }

    /**
     * Obtem um volume
     */
    getSecurityList(securityListId){
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

             try {

                /**
                 * 
                 */
                await new core.VirtualNetworkClient({ authenticationDetailsProvider: this.#provider}).getSecurityList({
                    securityListId: securityListId
                }).then(result=>{

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.securityList)
                })

                 /**
                  * Habilita o console
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
                 reject(error.message || error)
             }
        })
    }

    /**
     * Obtem a lista de todos os vnics
     */
    listSecurityLists(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var securityListsList = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("securityList resources where (lifecycleState = 'AVAILABLE')").then(async securityLists=>{
                
                /**
                 * Varre a lista de boot volumes
                 */
                for (const securityList of securityLists) {
                    await this.getSecurityList(securityList.identifier).then(v=>{
                        securityListsList.push(v);
                    }).catch(error=>{
                        reject("Erro ao consultar a vnic " + securityList.identifier + "\n\n" + error.message || error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(securityListsList)
            }).catch(error=>{
                reject(error);
            })
        })
    }

    /**
     * Obtem um volume
     */
    getNetworkSecurityGroup(networkSecurityGroupId){
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

             try {

                /**
                 * 
                 */
                await new core.VirtualNetworkClient({ authenticationDetailsProvider: this.#provider}).getNetworkSecurityGroup({
                    networkSecurityGroupId: networkSecurityGroupId
                }).then(result=>{

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.networkSecurityGroup)
                })

                 /**
                  * Habilita o console
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
                 reject(error.message || error)
             }
        })
    }

    /**
     * Obtem a lista de todos os vnics
     */
    listNetworkSecurityGroups(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var networkSecurityGroupsList = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("networksecuritygroup resources where (lifecycleState = 'AVAILABLE')").then(async networkSecurityGroups=>{
                
                /**
                 * Varre a lista de boot volumes
                 */
                for (const networkSecurityGroup of networkSecurityGroups) {
                    await this.getNetworkSecurityGroup(networkSecurityGroup.identifier).then(v=>{
                        networkSecurityGroupsList.push(v);
                    }).catch(error=>{
                        reject("Erro ao consultar a vnic " + networkSecurityGroup.identifier + "\n\n" + error.message || error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(networkSecurityGroupsList)
            }).catch(error=>{
                reject(error);
            })
        })
    }

    /**
     * Obtem um volume
     */
    getRouteTable(rtId){
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

             try {

                /**
                 * 
                 */
                await new core.VirtualNetworkClient({ authenticationDetailsProvider: this.#provider}).getRouteTable({
                    rtId: rtId
                }).then(result=>{

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.routeTable)
                })

                 /**
                  * Habilita o console
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
                 reject(error.message || error)
             }
        })
    }

    /**
     * Obtem a lista de todos os vnics
     */
    listRouteTables(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var routeTablesList = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("routetable resources where (lifecycleState = 'AVAILABLE')").then(async routeTables=>{
                
                /**
                 * Varre a lista de boot volumes
                 */
                for (const routeTable of routeTables) {
                    await this.getRouteTable(routeTable.identifier).then(v=>{
                        routeTablesList.push(v);
                    }).catch(error=>{
                        reject("Erro ao consultar a vnic " + routeTable.identifier + "\n\n" + error.message || error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(routeTablesList)
            }).catch(error=>{
                reject(error);
            })
        })
    }

        /**
     * Obtem um volume
     */
    getNatGateway(natGatewayId){
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

             try {

                /**
                 * 
                 */
                await new core.VirtualNetworkClient({ authenticationDetailsProvider: this.#provider}).getNatGateway({
                    natGatewayId: natGatewayId
                }).then(result=>{

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.natGateway)
                })

                 /**
                  * Habilita o console
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
                 reject(error.message || error)
             }
        })
    }

    /**
     * Obtem a lista de todos os vnics
     */
    listNatGateways(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var natGatewaysList = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("natgateway resources where (lifecycleState = 'AVAILABLE')").then(async natGateways=>{
                
                /**
                 * Varre a lista de boot volumes
                 */
                for (const natGateway of natGateways) {
                    await this.getNatGateway(natGateway.identifier).then(v=>{
                        natGatewaysList.push(v);
                    }).catch(error=>{
                        reject("Erro ao consultar a vnic " + natGateway.identifier + "\n\n" + error.message || error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(natGatewaysList)
            }).catch(error=>{
                reject(error);
            })
        })
    }

    /**
     * Obtem um volume
     */
    getServiceGateway(serviceGatewayId){
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

             try {

                /**
                 * 
                 */
                await new core.VirtualNetworkClient({ authenticationDetailsProvider: this.#provider}).getServiceGateway({
                    serviceGatewayId: serviceGatewayId
                }).then(result=>{

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.serviceGateway)
                })

                 /**
                  * Habilita o console
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
                 reject(error.message || error)
             }
        })
    }

    /**
     * Obtem a lista de todos os vnics
     */
    listServiceGateways(){
        
        /**
         * Retorna a promise
         */
        return new Promise(async(resolve,reject)=>{

            /**
             * Define um array para armazenar
             */
            var serviceGatewaysList = [];

            /**
             * Consulta a lista de bootVolumes
             */
            new resourceSearch(this.#provider).find("servicegateway resources where (lifecycleState = 'AVAILABLE')").then(async serviceGateways=>{
                
                /**
                 * Varre a lista de boot volumes
                 */
                for (const serviceGateway of serviceGateways) {
                    await this.getServiceGateway(serviceGateway.identifier).then(v=>{
                        serviceGatewaysList.push(v);
                    }).catch(error=>{
                        reject("Erro ao consultar a vnic " + serviceGateway.identifier + "\n\n" + error.message || error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(serviceGatewaysList)
            }).catch(error=>{
                reject(error);
            })
        })
    }
}

module.exports = Network