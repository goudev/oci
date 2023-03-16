let Util = require("./util");
const containerengine = require("oci-containerengine");

class Cluster {

    #provider = "";
    #util = ""

    constructor(provider){
        this.#provider = provider;
        this.#util = new Util();
        return this;
    }

    /**
     * Lists all clusters
     */
    async listClusters({ compartmentId }) {
        try {
            // An array to save the informations further
            const results = [];

            // Creates a client
            const client = new containerengine.ContainerEngineClient({
                authenticationDetailsProvider: this.#provider,
            });

            // Request details
            const listClustersRequest = {
                compartmentId: compartmentId ? compartmentId : this.#provider.getTenantId(),
                lifecycleState: [containerengine.models.ClusterLifecycleState.Active],
                limit: 1000,
            };

            // Send request to the Client.
            const listClustersResponse = await client.listClusters(listClustersRequest);
            
            for (const item of listClustersResponse.items) {
                results.push(item);
            }

            return results;
        } catch (error) {
            return error;
        }
    }
}

module.exports = Cluster;