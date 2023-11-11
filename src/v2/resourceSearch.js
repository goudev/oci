const resourceSearch = require("oci-resourcesearch");

class ResourceSearchV2 {
    
  constructor(provider) {
    this.provider = provider        
    this.searchClient = new resourceSearch.ResourceSearchClient({
        authenticationDetailsProvider: provider
        });
  }
        
    
  async allResources(startDate, endDate) {      
    let items = [];
    let nextPage = null;

  do {
    const structuredSearch = {
      query: `query all resources where timeCreated >='${startDate}' && timeCreated <='${endDate}' sorted by timeCreated asc`,
      type: "Structured",
      matchingContextType: resourceSearch.models.SearchDetails.MatchingContextType.None,      
    };

    const structuredSearchRequest = {
      searchDetails: structuredSearch,
      limit:5000,
      page: nextPage
    };

    const resources = await this.searchClient.searchResources(structuredSearchRequest);
    
    const currentItems = resources.resourceSummaryCollection.items.map(resource => {
      const { compartmentId, displayName, identifier, resourceType, timeCreated } = resource;
      return {
        compartmentId,
        identifier,
        resourceType,
        displayName,
        timeCreated,
      };
    });

    items = items.concat(currentItems);
    nextPage = resources.opcNextPage;

  } while (nextPage);

  return items;

  }   
}

module.exports = ResourceSearchV2