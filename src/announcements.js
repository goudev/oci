let Util = require("./util");
const announcementsservice = require('oci-announcementsservice');
const Compartments = require("./compartments");

class Announcements {

    #provider = "";
    #util = ""

    constructor(provider) {
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    /**
     * Obtem um announcement
     */
    getAnnouncement(announcementId) {
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
                await new announcementsservice.AnnouncementClient({ authenticationDetailsProvider: this.#provider }).getAnnouncement({
                    announcementId: announcementId
                }).then(result => {

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o announcement
                     */
                    resolve(result.announcement)
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
     * Obtem a lista de todos os announcements
     */
    listAnnouncements(compartmentId) {

        /**
         * Retorna a promise
         */
        return new Promise(async (resolve, reject) => {

            /**
             * Define um array para armazenar
             */
            var announcements = [];

            /**
             * Se foi passado um compartimento
             */
            if (compartmentId) {

                /**
                 * Habilita o console
                 */
                this.#util.disableConsole();

                /**
                 * Realiza a consulta
                 */
                new announcementsservice.AnnouncementClient({ authenticationDetailsProvider: this.#provider }).listAnnouncements({
                    compartmentId: compartmentId
                }).then(result => {

                    /**
                     * Habilita novamente o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Retorna o bootVolume
                     */
                    resolve(result.announcementsCollection.items);

                }).catch(error => {
                     /**
                     * Habilita o console
                     */
                    this.#util.enableConsole();

                    /**
                     * Rejeita a promise
                     */
                    reject("Erro ao obter a lista de Announcements. \n\n" + error.message || error);
                });

            }else{

                /**
                 * Obtem a lista de compartimentos
                 */
                new Compartments(this.#provider).listCompartments().then(async compartments => {
                    for(const compartment of compartments) {

                        /**
                         * Obtem a lista de compartimentos
                         */
                        await this.listAnnouncements(compartment.id).then(result => {
                            result.forEach(announcement => {
                                this.getAnnouncement(announcement.id).then(an => {
                                    announcements.push(an)
                                })
                            })

                        }).catch(error => {
                            reject(error.message || error)
                        })
                    }

                    resolve(announcements)
                }).catch(error => {


                    /**
                     * Rejeita a promise
                     */
                reject(error);
            })
        }})
    
    }

}

module.exports = Announcements
