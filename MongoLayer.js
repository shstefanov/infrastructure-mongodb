var _              = require("underscore");
var DataLayer      = require("infrastructure/lib/DataLayer.js");
module.exports     = DataLayer.extend("MongoDBLayer", {

  parseArguments: function(args){

    switch(args.length){
      case 0: return false;
      case 1:
        if(typeof args[0] !== "function") return false;
        else return [{},{},args[0]];
      case 2:
        if(typeof args[1] !== "function") return false;
        else return [
          args[0],
          {}, 
          args[1]
        ];
      case 3:
        if(typeof args[2] !== "function") return false;
        else return [ args[0], args[1], args[2] ];
      case 4:
        if(typeof args[3] !== "function") return false;
        else return [ args[0], args[1], args[2], args[3] ];
      default: return false;
    }
  },

  applyObjectify: function(obj, patterns){
    if(!patterns) return obj;
    if(typeof patterns === "string") patterns = [patterns];
    if(Array.isArray(obj)) {var self = this; return obj.map(function(model){ return self.applyObjectify(model, patterns); });}
    var helpers = this.env.helpers;
    for(var i = 0; i<patterns.length; i++){
      var value = helpers.resolve(obj, patterns[i]);
      if(!value) continue;
      helpers.patch(obj, patterns[i], helpers.objectify(value) );
    }

    return obj;

  },

  create:  function(docs, options, cb){
    var self = this;
    docs = this.applyObjectify(docs, options.$objectify);
    this.collection[Array.isArray(docs)? "insertMany" : "insertOne" ](docs, function(err, result){
      cb(err? err : null, err? null : docs);
    });
  },

  find:    function(pattern, options, cb){
    options = options || {};
    pattern = this.applyObjectify(pattern || {}, options.$objectify);
    var publicFields = this.publicFields;
    this.collection.find(pattern, options, function(err, cursor){
      if(err) return cb(err);
      cursor.toArray(function(err, docs){
        if(err) return cb(err);
        cb(null, docs);
      });
    });
  },

  count:    function(pattern, options, cb){
    options = options || {};
    pattern = this.applyObjectify(pattern || {}, options.$objectify);
    this.collection.count(pattern, options, cb);
  },

  findOne: function(pattern, options, cb){
    options = options || {};
    pattern = this.applyObjectify(pattern || {}, options.$objectify);
    this.collection.findOne(pattern, options, cb);
  },

  delete:  function(pattern, options, cb){ 
    options = options || {};
    pattern = this.applyObjectify(pattern || {}, options.$objectify);
    this.collection.remove(pattern, options, function(err, response){
      cb(err? err : null, err? null : response.result);
    });
  },

  save:  function(doc, options, cb){
    options = options || {};
    doc = this.applyObjectify(doc || {}, options.$objectify);
    this.collection.save(doc, options, function(err, response){
      if(err) return cb(err);
      cb(null, doc);
    });
  },

  update:  function(pattern, update, options, cb){
    if(!cb){ cb = options, options = {}; }
    pattern = this.applyObjectify(_.omit(pattern, ["$objectify"]), pattern.$objectify );
    update  = this.applyObjectify(_.omit(update,  ["$objectify"]), update.$objectify  );
    this.collection.update(pattern, update, options, function(err, response){
      if(err) return cb(err);
      cb(null, pattern);
    });      
  }
  
}, {

  baseMethods: DataLayer.baseMethods.concat(["parseArguments", "applyObjectify", "init"]),


  setupDatabase: function(self, env, name){
    var Prototype   = this;
    self.driver     = env.engines.mongodb;
    self.setupNode  = function(cb){ 
      Prototype.createCollection(self, env, function(err){
        if(err) return cb(err);
        if(self.init) self.init(finish);
        else finish();
        function finish(err){
          if(err) return cb(err);
          env.i.do("log.sys", "DataLayer:mongodb", name);
          cb();
        }
      }); 
    }
  },


  createCollection: function(instance, env, cb){
    instance.driver.createCollection(instance.collectionName||instance.name, instance.options || {}, function(err, collection){
      if(err) return cb(err);
      instance.collection = collection;
      if(instance.index){
        var ch = [];
        instance.index.forEach(function(i){
          ch.push(function(cb){
            //TODO - get collection indexes and drop removed if any
            instance.collection.ensureIndex(i.index,i.options||{}, cb); 
          });
        });
        env.helpers.chain(ch)(cb);
      }
      else cb();
    });
  },

  extend: function(name, props, statics){
    this.setMethods(this.prototype, props);
    return DataLayer.extend.apply(this, arguments);
  }
});

  
