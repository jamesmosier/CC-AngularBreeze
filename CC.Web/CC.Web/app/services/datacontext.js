(function () {
    'use strict';

    var serviceId = 'datacontext';
    angular.module('app').factory(serviceId,
        ['common', 'entityManagerFactory', datacontext]);

    function datacontext(common, emFactory) {
        var EntityQuery = breeze.EntityQuery;
        //JDM -used below to display log info
        var getLogFn = common.logger.getLogFn;
        var log = getLogFn(serviceId);
        var logError = getLogFn(serviceId, 'error');
        var logSuccess = getLogFn(serviceId, 'success');
        var manager = emFactory.newManager();
        var primePromise;
        var $q = common.$q;

        var storeMeta = {
            isLoaded: {
                sessions: false,
                attendees: false
            }
        };

        var entityNames = {
            attendee: 'Person',
            person: 'Person',
            speaker: 'Person',
            session: 'Session',
            room: 'Room',
            track: 'Track',
            timeslot: 'TimeSlot'
        };

        var service = {
            getAttendees: getAttendees,
            getPeople: getPeople,
            getMessageCount: getMessageCount,
            getSessionPartials: getSessionPartials,
            getSpeakerPartials: getSpeakerPartials,
            prime: prime
        };

        return service;

        function getMessageCount() { return $q.when(72); }

        function getPeople() {
            var people = [
                { firstName: 'John', lastName: 'Papa', age: 25, location: 'Florida' },
                { firstName: 'Ward', lastName: 'Bell', age: 31, location: 'California' },
                { firstName: 'Colleen', lastName: 'Jones', age: 21, location: 'New York' },
                { firstName: 'Madelyn', lastName: 'Green', age: 18, location: 'North Dakota' },
                { firstName: 'Ella', lastName: 'Jobs', age: 18, location: 'South Dakota' },
                { firstName: 'Landon', lastName: 'Gates', age: 11, location: 'South Carolina' },
                { firstName: 'Haley', lastName: 'Guthrie', age: 35, location: 'Wyoming' }
            ];
            return $q.when(people);
        }

        function getAttendees() {
            var orderBy = 'firstName, lastName';
            var attendees = [];

            return EntityQuery.from('Persons')
            .select('id, firstName, lastName, imageSource')
            .orderBy(orderBy)
            .toType('Person')
            .using(manager).execute()
            .to$q(querySucceeded, _queryFailed);

            function querySucceeded(data) {
                attendees = data.results;
                log('Retrieved [Attendees Partials] from remote data source', attendees.length, true);
                return attendees;
            }
        }

        function getSpeakerPartials() {
            var speakerOrderBy = 'firstName, lastName';
            var speakers = [];

            return EntityQuery.from('Speakers')
            .select('id, firstName, lastName, imageSource')
            .orderBy(speakerOrderBy)
            .toType('Person')
            .using(manager).execute()
            .to$q(querySucceeded, _queryFailed);

            function querySucceeded(data) {
                speakers = data.results;
                log('Retrieved [Speaker Partials] from remote data source', speakers.length, true);
                return speakers;
            }
        }

        function getSessionPartials(forceRemote) {
            var orderBy = 'timeSlotId, level, speaker.firstName';
            var sessions;

            //if sessions are loaded then get them locally (force remote is a refresh button)
            if (_areSessionsLoaded() && !forceRemote) {
                //get local data
                sessions = _getAllLocal(entityNames.session, orderBy);
                return $q.when(sessions);
            }

            return EntityQuery.from('Sessions')
            .select('id, title, code, speakerId, trackId, timeSlotId, roomId, level, tags')
            .orderBy(orderBy)
            .toType('Session')
            .using(manager).execute()
            .to$q(querySucceeded, _queryFailed);

            function querySucceeded(data) {
                sessions = data.results;
                _areSessionsLoaded(true);   
                //JDM - this logs info about the call (it is set above in this file)
                log('Retrieved [Session Partials] from remote data source', sessions.length, true);
                return sessions;
            }
        }

        function prime() {
            if (primePromise) return primePromise;

            primePromise = $q.all([getLookups(), getSpeakerPartials()])
                .then(extendMetadata)
                .then(success);
            return primePromise;

            function success() {
                setLookups();
                log('Primed the data');
            }

            function extendMetadata() {
                var metadataStore = manager.metadataStore;
                var types = metadataStore.getEntityTypes();
                types.forEach(function (type) {
                    if (type instanceof breeze.EntityType) {
                        set(type.shortName, type);
                    }
                });

                var personEntityName = entityNames.person;
                ['Speakers', 'Speaker', 'Attendees', 'Attendee'].forEach(function (r) {
                    set(r, personEntityName);
                });

                //should this be entityNames?? see Mapping Breeze Entity Types to Resources tutorial
                function set(resourceName, entityName) {
                    metadataStore.setEntityTypeForResourceName(resourceName, entityName);
                }
            }
        }

        function setLookups() {
            service.lookupCachedData = {
                //caches the following data and orders them by the string at the end
                rooms: _getAllLocal(entityNames.room, 'name'),
                tracks: _getAllLocal(entityNames.track, 'name'),
                timeslots: _getAllLocal(entityNames.timeslot, 'start'),
            };
        }

        function _getAllLocal(resource, ordering) {
            return EntityQuery.from(resource)
            .orderBy(ordering)
            .using(manager)
            .executeLocally();
        }

        function getLookups() {
            return EntityQuery.from('Lookups')
            .using(manager).execute()
            .to$q(querySucceeded, _queryFailed);

            function querySucceeded(data) {
                log('Retrieved [Lookups]', data, true);
                return true;
            }
        }

        function _queryFailed(error) {
            var msg = config.appErrorPrefix + 'Error retreiving data.' + error.message;
            logError(msg, error);
            throw error;
        }

        function _areSessionsLoaded(value) {
            return _areItemsLoaded('sessions', value);
        }

        function _areAttendeesLoaded(value) {
            return _areItemsLoaded('attendees', value);
        }

        function _areItemsLoaded(key, value) {
            if (value === undefined) {
                return storeMeta.isLoaded[key];//get
            }
            return storeMeta.isLoaded[key] = value;//set
        }
    }
})();