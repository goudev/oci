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
    async listClusters(compartmentId) {
        try {
            // Creates a client
            const client = new containerengine.ContainerEngineClient({
                authenticationDetailsProvider: this.#provider,
            });

            // Request details
            const listClustersRequest = {
                compartmentId,
                lifecycleState: [containerengine.models.ClusterLifecycleState.Active],
            };

            // Send request to the Client.
            const listClustersResponse = await client.listClusters(listClustersRequest);

            return listClustersResponse.items;
        } catch (error) {
            return error;
        }
    }
}

module.exports = Cluster;