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
    listAnnouncements() {

        /**
         * Retorna a promise
         */
        return new Promise(async(resolve, reject) => {

            /**
             * Define um array para armazenar
             */
           
            var announcements = []

            /**
             * Habilita o console
             */
            this.#util.disableConsole();

            /**
             * Realiza a consulta
             */
            await new announcementsservice.AnnouncementClient({ authenticationDetailsProvider: this.#provider }).listAnnouncements({
                compartmentId: this.#provider.getTenantId(),
                lifecycleState: announcementsservice.requests.ListAnnouncementsRequest.LifecycleState.Active
            }).then(async result => {
                
                for(const announcement of result.announcementsCollection.items) {
                    const an = await this.getAnnouncement(announcement.id)
                    announcements.push(an)
                }
                /**
                 * Habilita novamente o console
                 */
                this.#util.enableConsole();

                /**
                 * Retorna o bootVolume
                 */
                resolve(announcements);

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

        })
    
    }

}

module.exports = Announcements
