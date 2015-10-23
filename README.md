Installation
============

    npm install https://github.com/shstefanov/infrastructure-server-datalayer-mongodb.git


Configuration
=============

In project_root/config/structures create data.json file (or give other structure name) with the following content:

    {
      "path":    "data", 
      "engines": ["infrastructure-server-datalayer-mongodb/engine"],
      "loaders": ["data"],

      "libs":{
        "MongoLayer":    "infrastructure-server-datalayer-mongodb"
      },

      "config": {

        "mongodb": {
          "host":            "localhost",
          "port":            27017,
          "db":              "orbits",
          "auto_reconnect":  true,
          "options":         { "nativeParser": true }
        }
      }
    }

- "path" is folder where your structure modules are located (based on rootDir)
- "engines" - add path to module that will load mongodb to engines array
- "loaders" - add built-in "data" loader to array with loaders
- "libs" - adding base mongolayer, base mongolayer class will be accessible via env.lib.MongoLayer
- "config" - the engine will search for config.mongodb object when trying to connect to database. congig.mongodb.options will be passed directly to mongodb.MongoClient.connect. Read more about options here http://mongodb.github.io/node-mongodb-native/api-generated/mongoclient.html


Usage
=====

In structure folder path create file of type (named for example MyMongoResource.js):

    module.exports = function(){
      var env     = this;
      var mongodb = env.engines.mongodb;       // attached by engine
      var isObjectId = env.helpers.isObjectId  // attached by engine, function that checks if object is instance of mongodb.ObjectId
      var objectify  = env.helpers.objectify   // attached by engine, function that converts hash string to mongodb.ObjectId instance


      return env.lib.MongoLayer.extend("MyMongoResource", {

        init: function(cb){ /* async initialization (optional) - run cb([err]) when done*/ },
        
        collectionName: "MongodbCollectionName", // mongodb collection name for this resource
        primaryKey:     "_id",                   // default is "_id"

        // The "fields" property is not used now, but in future will have some role in case data needs validation
        fields: {
          "_id" :        mongodb.ObjectId,
          "context" :    _.isObject,
          "subject" :    isObjectId,
        },

        someSpecificQuery: function(param_1, options, cb){
          
          // this is mongodb collection instance that represents current resource
          var collection = this.collection;
          // read more about it here - http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html

          // The DataLayer instance provides:
          // this.create(doc, cb);
          // this.find(query, [options], cb);
          // this.findOne(query, [options], cb);
          // this.count(query, [options], cb);
          // this.update(query, [options], cb);
          // this.delete(query, [options], cb);

          var _id = objectify(param_1);
          this.find({subject: _id}, options, cb );
        },

      });

    };

Once structure is initialized, datalayer can be called from any other local or remote structure using dot notation

    env.i.do("data.MyMongoResource.find", some_query, some_options, cb);
    // or
    env.i.do("data.MyMongoResource.someSpecificQuery", some_query, some_options, cb);

