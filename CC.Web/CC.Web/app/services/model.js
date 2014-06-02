(function () {
    'use strict';

    var serviceId = 'model';

    // TODO: replace app with your module name
    angular.module('app').factory(serviceId, model);

    function model() {
        // Define the functions and properties to reveal.
        var service = {
            configureMetadataStore: configureMetadataStore
        };

        return service;

        function configureMetadataStore(metadataStore) {
            //TODO: register session (model) - tags
            //TODO: register person - fullname
            //TODO: register timeslot - name
        }

        //#region Internal Methods        

        //#endregion
    }
})();