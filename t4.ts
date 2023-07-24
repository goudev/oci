// This is an automatically generated code sample.
// To make this code sample work in your Oracle Cloud tenancy,
// please replace the values for any parameters whose current values do not fit
// your use case (such as resource IDs, strings containing ‘EXAMPLE’ or ‘unique_id’, and
// boolean, number, and enum parameters with values not fitting your use case).

import * as announcementsservice from "oci-announcementsservice";
import common = require("oci-common");

// Create a default authentication provider that uses the DEFAULT
// profile in the configuration file.
// Refer to <see href="https://docs.cloud.oracle.com/en-us/iaas/Content/API/Concepts/sdkconfig.htm#SDK_and_CLI_Configuration_File>the public documentation</see> on how to prepare a configuration file.

const provider: common.ConfigFileAuthenticationDetailsProvider = new common.ConfigFileAuthenticationDetailsProvider();

(async () => {
  try {
    // Create a service client
    const client = new announcementsservice.AnnouncementClient({
      authenticationDetailsProvider: provider
    });

    // Create a request and dependent object(s).
    const getAnnouncementRequest: announcementsservice.requests.GetAnnouncementRequest = {
      announcementId: "ocid1.announcement.oc1..aaaaaaaa355y4pmpcdd5r7cfk3do6ri3tqolnhy44otr6rl6cdfzmfyul6ia"
    };

    // Send request to the Client.
    const getAnnouncementResponse = await client.getAnnouncement(getAnnouncementRequest);
    console.log(getAnnouncementResponse.announcement)
  } catch (error) {
    console.log("getAnnouncement Failed with error  " + error);
  }
})();
