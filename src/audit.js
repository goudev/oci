const identity = require("oci-identity");

const audit = require("oci-audit");
const common = require("oci-common");

class AuditEvent {
    constructor(provider) {
        this.provider = provider
        this.identityClient = new identity.IdentityClient({
            authenticationDetailsProvider: provider
        });
        this.auditClient = new audit.AuditClient({
            authenticationDetailsProvider: provider
        });
    }

    async getSubscriptionRegions(tenancyId) {
        const listRegionSubscriptionsRequest = { tenancyId };

        const regions = await this.identityClient.listRegionSubscriptions(listRegionSubscriptionsRequest);

        return regions.items.map(region => {
            return region.regionName;
        });
    }

    async getCompartments(tenancyId) {
        const compartmentOcids = [tenancyId];
        const listCompartmentsRequest = { compartmentId: tenancyId };
        const compartments = await this.identityClient.listCompartments(listCompartmentsRequest);
        for (let i = 0; i < compartments.items.length; i++) {
            compartmentOcids.push(compartments.items[i].id);
        }

        return compartmentOcids;
    }

    async getAuditEvents(compartmentOcids, startTime, endTime) {
        const listOfAuditEvents = [];
        for (let i = 0; i < compartmentOcids.length; i++) {
            const listEventsRequest = {
                compartmentId: compartmentOcids[i],
                startTime: startTime,
                endTime: endTime
            };
            try {
                const response = await this.auditClient.listEvents(listEventsRequest);
                listOfAuditEvents.push(response.items);
            } catch (err) {
                // console.log("what is err: ", err);
            }
        }
        return listOfAuditEvents;
    }

    async retrieveAuditEvents(startTimes, endTimes) {
        const tenancyId = this.provider.getTenantId() || "";
        const regions = await this.getSubscriptionRegions(tenancyId);
        const compartments = await this.getCompartments(tenancyId);
        const EVENT_TYPES = ['com.oraclecloud.audit.create']
        const endTime = new Date();
        const offset = new Date().setDate(new Date().getDate() - 90);
        const startTime = new Date(offset);
        const events = []
        for (let region of regions) {
            const x = common.Region.fromRegionId(region);
            this.auditClient.region = x;
            const auditEvents = await this.getAuditEvents(compartments, startTime, endTime);

            auditEvents.forEach(item => {
                item.forEach(subItem => {
                    if (EVENT_TYPES.includes(subItem.eventType)) {
                        events.push(subItem)
                    }
                })
            })
            console.log("auditEvent: ", auditEvents);
        }

        console.log(events)
    }
}

module.exports = AuditEvent