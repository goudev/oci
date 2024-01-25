let Util = require("./util");
const database = require('oci-database');
const resourceSearch = require('./resourceSearch');

class Database {

    #provider = "";
    #util = ""

    constructor(provider) {
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    /**
     * Obtem um DbSystem
     */
    getDbSystem(dbSystemId) {
        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

            try {

                /**
                 * 
                 */
                await new database.DatabaseClient({ authenticationDetailsProvider: this.#provider }).getDbSystem({
                    dbSystemId: dbSystemId
                }).then(result => {

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o DbSystem
                     */
                    resolve(result.dbSystem)
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
     * Obtem a lista de todos os DbSystems
     */
    listDbSystems() {

        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /**
             * Define um array para armazenar
             */
            var dbSystems = [];

            /**
             * Consulta a lista de DbSystems
             */
            new resourceSearch(this.#provider, "allRegions").find("dbsystem resources").then(async dbs => {

                /**
                 * Varre a lista de DbSystems
                 */
                for (const db of dbs) {
                    await this.getDbSystem(db.identifier).then(d => {
                        dbSystems.push(d);
                    }).catch(error => {
                        reject("Erro ao consultar o banco " + db.identifier + "\n\n" + error)
                    })
                }

                /**
                 * Retorna
                 */
                resolve(dbSystems)
            }).catch(error => {
                reject(error);
            })
        })
    }

    /**
     * Obtem a lista de todos os Autonomous Databases
     */
    listAutonomousDatabases() {
        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {
            /**
             * Define um array para armazenar os Autonomous Databases
             */
            var autonomousDatabases = [];

            /**
             * Consulta a lista de Autonomous Databases usando resourceSearch
             */
            new resourceSearch(this.#provider, "allRegions").find("autonomousDatabase resources").then(async adbs => {
                /**
                 * Varre a lista de Autonomous Databases
                 */
                for (const adb of adbs) {
                    await this.getAutonomousDatabase(adb.identifier).then(autonomousDatabase => {
                        autonomousDatabases.push(autonomousDatabase);
                    }).catch(error => {
                        reject("Erro ao obter o Autonomous Database " + adb.identifier + "\n\n" + error);
                    });
                }

                /**
                 * Retorna
                 */
                resolve(autonomousDatabases);
            }).catch(error => {
                /**
                 * Rejeita a promise em caso de erro na busca
                 */
                reject("Erro ao buscar Autonomous Databases\n\n" + error);
            });
        });
    }

    /**
     * Obtem um Autonomous Database
     */
    getAutonomousDatabase(autonomousDatabaseId) {
        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {
            /**
             * Desabilita o console
             */
            this.#util.disableConsole();

            try {
                /**
                 * 
                 */
                await new database.DatabaseClient({ authenticationDetailsProvider: this.#provider }).getAutonomousDatabase({
                    autonomousDatabaseId: autonomousDatabaseId
                }).then(result => {
                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o Autonomous Database
                     */
                    resolve(result.autonomousDatabase);
                });

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
                reject(error.message || error);
            }
        });
    }


}

module.exports = Database