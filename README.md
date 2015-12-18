Installation
============

    npm install infrastructure-mongodb


Configuration
=============

In project_root/config/structures create data.json file (or give other structure name) with the following content:

    {
      "path":    "data", 
      "engines": ["infrastructure-mongodb/engine"],

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
- "libs" - adding base mongolayer, base mongolayer class will be accessible via env.lib.MongoLayer
- "config" - the engine will search for config.mongodb object when trying to connect to database. congig.mongodb.options will be passed directly to mongodb.MongoClient.connect. Read more about options here http://mongodb.github.io/node-mongodb-native/api-generated/mongoclient.html


Usage
=====

In structure folder path create file of type (named for example MyMongoResource.js):
    var MongoLayer = require("infrastructure-mongodb/MongoLayer");
    module.exports = MongoLayer.extend("MyMongoResource", {

      init: function(cb){ /* async initialization (optional) - run cb([err]) when done*/ },
      
      collectionName: "MongodbCollectionName", // mongodb collection name for this resource

      someSpecificQuery: function(param_1, options, cb){
        
        // this is mongodb collection instance that represents current resource
        var collection = this.collection;
        // read more about it here - http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html

        // The DataLayer instance provides:
        // this.create(doc, cb);
        // this.create([doc1, doc2], cb);
        // this.find(query, options, cb);
        // this.findOne(query, options, cb);
        // this.count(query, options, cb);
        // this.update(query, update, options, cb);
        // this.delete(query, options, cb);

      }

    });

Once structure is initialized, datalayer can be called from any other local or remote structure using dot notation

    env.i.do("data.MyMongoResource.find", some_query, some_options, cb);
    // or
    env.i.do("data.MyMongoResource.someSpecificQuery", some_query, some_options, cb);

"objectify" option
==================

  In most cases, mongodb ObjectId-s in queries and documents will come as strings.
  In options object in CRUD methods we can put {$objectify: "path_to_patch"} or {$objectify: ["path_to_patch_1", "path_to_patch_2"]}

    env.i.do("data.MyMongoResource.find", { _id: '562ab133c7b795974496fd16' }, {$objectify: "_id" }, function(err, result){
      // ...
    });

    env.i.do("data.BlogComments.find", 
      { author: {$in: ['562ab133c7b795974496fd16', '562ab133c7b795974496fd17', '562ab133c7b795974496fd18']} },
      { $objectify: "author.$in" }, 
      function(err, result){
      // ...
    });

  Only when calling "update" we have 2 possible arguments to patch, so "$objectify" option should be mounted on the query or on the update object, not in options. 

    env.i.do("data.BlogComments.update", 
      { post_id: {$in: ['562ab133c7b795974496fd26', '562ab133c7b795974496fd27', '562ab133c7b795974496fd28']},  $objectify: "post_id.$in" }, 
      { $set: {approved_by: '562ab133c7b795974496fd06' }, $objectify: "$set.approved_by" },
      {},   // Other options
      function(err, result){
      // ...
    });


TODO
====

 - $dateify for creating date objects
 - patterns to objectify object properties in nested array


Added (0.2.2)
========

    --drop or --drop.ModelName command line options

This will cause layer instance to use it's "seed" property. It can be string (url, fs path, related to project root or dot notated config resolve path). It can be array or single object, and will be seeded directly. It can be function that returns array or object.

    --seed or --seed.ModelName

This will set seed option to string (url, fs path, related to project root or dot notated config resolve path);

    --seed.ModelName=http:eample.com/resource
    --seed.ModelName=./seeds/ModelsData.json
    --seed.ModelName=seeds.ModelsData

The last will be resolved from config tree. It can point to object, array or string that will be proceeded too.

It also can point to function (DataLayer instance seed property to be function). 

    function seed(cb){
      // do something async
      cb(err, [ /* models here */ ]);
    }