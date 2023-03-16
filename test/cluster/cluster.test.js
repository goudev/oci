const Oracle = require('../../src/oci');
const sinon = require('sinon');

/** Mocks */
const cloudProvider = require('../cloudProviderMock');
const successfulResponse = require('./mocks/successfulResponseMock');

describe('Cluster Kubernetes', () => {
  describe('listClusters()', () => {
    it('must return the list of clusters of a given account', async () => {
      // Creating an instance of cloud account with credentials
      const oci = await new Oracle(cloudProvider);

      // Intercepting "listClusters" function
      const stub = sinon.stub(oci, oci.listClusters.name);
      stub
        .withArgs({
          compartmentId: cloudProvider.tenancy,
        })
        .resolves(successfulResponse);

      // Making the request
      const results = await await oci.listClusters({
        compartmentId: cloudProvider.tenancy,
      });

      sinon.assert.calledOnce(oci.listClusters);
      expect(results).toEqual(successfulResponse);
    })
  });
});