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

  applyDateify: function(obj, patterns){
    if(!patterns) return obj;
    if(typeof patterns === "string") patterns = [patterns];
    if(Array.isArray(obj)) {var self = this; return obj.map(function(model){ return self.applyDateify(model, patterns); });}
    var helpers = this.env.helpers;
    for(var i = 0; i<patterns.length; i++){
      var value = helpers.resolve(obj, patterns[i]);
      if(!value) continue;
      helpers.patch(obj, patterns[i], new Date(value) );
    }

    return obj;

  },

  create:  function(docs, options, cb){
    var self = this;
    options.$objectify && this.applyObjectify (docs, options.$objectify );
    options.$dateify   && this.applyDateify   (docs, options.$dateify   );
    delete options.$objectify;
    delete options.$dateify;
    this.collection[Array.isArray(docs)? "insertMany" : "insertOne" ](docs, cb);
  },

  find:    function(pattern, options, cb){
    options = options || {}, pattern = pattern || {};
    options.$objectify && this.applyObjectify (pattern, options.$objectify );
    options.$dateify   && this.applyDateify   (pattern, options.$dateify   );
    delete options.$objectify;
    delete options.$dateify;
    this.collection.find(pattern, options, function(err, cursor){
      if(err) return cb(err);
      cursor.toArray(function(err, docs){
        if(err) return cb(err);
        cb(null, docs);
      });
    });
  },

  count:    function(pattern, options, cb){
    options = options || {}, pattern = pattern || {};
    options.$objectify && this.applyObjectify (pattern, options.$objectify );
    options.$dateify   && this.applyDateify   (pattern, options.$dateify   );
    delete options.$objectify;
    delete options.$dateify;
    this.collection.count(pattern, options, cb);
  },

  findOne: function(pattern, options, cb){
    options = options || {}, pattern = pattern || {};
    options.$objectify && this.applyObjectify (pattern, options.$objectify );
    options.$dateify   && this.applyDateify   (pattern, options.$dateify   );
    delete options.$objectify;
    delete options.$dateify;
    this.collection.findOne(pattern, options, cb);
  },

  delete:  function(pattern, options, cb){ 
    options = options || {}, pattern = pattern || {};
    options.$objectify && this.applyObjectify (pattern, options.$objectify );
    options.$dateify   && this.applyDateify   (pattern, options.$dateify   );
    delete options.$objectify;
    delete options.$dateify;
    this.collection.remove(pattern, options, function(err, response){
      cb(err? err : null, err? null : response.result);
    });
  },

  save:  function(doc, options, cb){
    options = options || {};
    options.$objectify && this.applyObjectify (doc, options.$objectify );
    options.$dateify   && this.applyDateify   (doc, options.$dateify   );
    delete options.$objectify;
    delete options.$dateify;
    this.collection.save(doc, options, function(err, response){
      if(err) return cb(err);
      cb(null, doc);
    });
  },

  update:  function(pattern, update, options, cb){
    if(!cb){ cb = options, options = {}; }
    pattern.$objectify && this.applyObjectify (pattern, pattern.$objectify );
    pattern.$dateify   && this.applyDateify   (pattern, pattern.$dateify   );
    update.$objectify  && this.applyObjectify (update,  update.$objectify  );
    update.$dateify    && this.applyDateify   (update,  update.$dateify    );
    delete pattern.$objectify;
    delete pattern.$dateify;
    delete update.$objectify;
    delete update.$dateify;
    this.collection.update(pattern, update, options, function(err, response){
      if(err) return cb(err);
      cb(null, pattern);
    });      
  }
  
}, {

  baseMethods: DataLayer.baseMethods.concat(["parseArguments", "applyObjectify", "init", "applyDateify"]),


  setupDatabase: function(self, env, name){
    var Prototype   = this;
    self.driver     = env.engines.mongodb;
    self.setupNode  = function(cb){ 
      Prototype.createCollection(self, env, name, function(err){
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


  createCollection: function(instance, env, name, cb){
    var Self = this;
    instance.driver.createCollection(instance.collectionName||instance.name, instance.options || {}, function(err, collection){
      if(err) return cb(err);
      instance.collection = collection;

      var ctx = {
        name: name,
        env: env,
        config: env.config,
        instance: instance,
        collection: collection,
        Prototype: Self,
      };

      env.helpers.chain([
        Self.handleIndexes,
        Self.handleDropOptions,  // --drop cli option. This method is from infrastructure's Datalayer class
        Self.handleSeedOptions,  // --seed cli option
      ]).call(Self, ctx, function(err){ cb(err); } );

    });
  },

  handleIndexes: function(ctx, cb){
    // TODO - make --seed option and execute this only if it is provided
    if(ctx.instance.index){
      // TODO - compare indexes from instance settings and real database and create/drop any if needed
      var ch = [];
      ctx.instance.index.forEach(function(i){
        ch.push(function(cb){ ctx.collection.ensureIndex(i.index,i.options||{}, function(err){ cb(err); }); });
      });
      ctx.env.helpers.chain(ch)(function(err){ cb(err, ctx); });
    }
    else cb(null, ctx);
  },

  handleDropOptions: function(ctx, cb){
    // TODO - make this to work only if --seed or --migrate options are provided
    if(!ctx.config.options) return cb(null, ctx);
    var drop = ctx.config.options.drop;
    if(drop === true || drop && (drop[ctx.name] === true)){
      ctx.collection.remove({}, function(err, result){
        if(err) return cb(err);
        ctx.env.i.do("log.sys", "DataLayer:mongodb", "Drop all models in \""+ctx.collection.namespace+"\" ("+result.result.n+")");
        cb(null, ctx);
      });
    }
    else cb(null, ctx);
  },

  extend: function(name, props, statics){
    this.setMethods(this.prototype, props);
    return DataLayer.extend.apply(this, arguments);
  }
});

  
