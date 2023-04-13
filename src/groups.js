const identity = require("oci-identity");

class Groups {
  #provider = "";

  constructor(provider) {
    this.#provider = provider;
    return this;
  }

  async* listGroups() {
    try {

      const details = {
        compartmentId: this.#provider.getTenantId(),
        limit: 1,
        sortBy: identity.requests.ListGroupsRequest.SortBy.Name,
        sortOrder: identity.requests.ListGroupsRequest.SortOrder.Asc,
        lifecycleState: identity.models.Group.LifecycleState.Active,
      }

      let hasPages = true;
      while (hasPages) {
        const client = new identity.IdentityClient({
          authenticationDetailsProvider: this.#provider
        });

        const result = await client.listGroups(details);

        /**
         * Tem paǵinas?
         */
        if (result.opcNextPage) details.page = result.opcNextPage;
        else hasPages = false;

        yield result.items[0];
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Groups;