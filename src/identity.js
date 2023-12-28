const identity = require("oci-identity");


class IdentityEvent {
    constructor(provider) {
        this.provider = provider
        this.identityClient = new identity.IdentityClient({
            authenticationDetailsProvider: provider
        });
    }

    /**
     * Retorna informações sobre a tenancy
     * @returns 
     */
    async getInfoAboutTenancy() {
        const response = await this.identityClient.getTenancy({
            tenancyId: this.provider.getTenantId()
        });
        return response?.tenancy ? response.tenancy : {};
    }
}

module.exports = IdentityEvent