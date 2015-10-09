
    npm install https://github.com/shstefanov/infrastructure-server-datalayer-mongodb.git

Make infrastructure structure using this package

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

- "path" is folder where your structure components are located
- "engines" - add path to module that will load mongodb to engines array
- "loaders" - add built-in "data" loader to array with loaders
- "libs" - adding base mongolayer, base mongolayer class will be accessible via env.lib.MongoLayer
- "config" - the engine will search for config.mongodb object when trying to connect to database. congig.mongodb.options will be passed directly to mongodb.MongoClient.connect. Read more about options here http://mongodb.github.io/node-mongodb-native/api-generated/mongoclient.html
