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
      };

      env.helpers.chain([
        Self.handleIndexes,
        Self.handleDropOptions,  // --drop cli option
        Self.handleSeedOptions,  // --seed cli option
      ]).call(Self, ctx, function(err){ cb(err); } );

    });
  },

  handleIndexes: function(ctx, cb){
    if(ctx.instance.index){
      var ch = [];
      ctx.instance.index.forEach(function(i){
        ch.push(function(cb){
          //TODO - get collection indexes and drop removed if any
          ctx.collection.ensureIndex(i.index,i.options||{}, cb); 
        });
      });
      ctx.env.helpers.chain(ch)(function(err){ cb(err, ctx); });
    }
    else cb(null, ctx);
  },

  handleDropOptions: function(ctx, cb){
    if(!ctx.config.options) return cb(null, ctx);
    var drop = ctx.config.options.drop;
    if(drop === true || drop && (drop[ctx.name] === true)){
      ctx.collection.remove({}, function(err, result){
        if(err) return cb(err);
        ctx.env.i.do("log.sys", "DataLayer:mongodb", "Drop all models in \""+ctx.collection.namespace+"\" ("+result.result.n+")");
        cb(null, ctx);
      })
    }
    else cb(null, ctx);
  },

  handleSeedOptions: function(ctx, cb, source){
    if(!ctx.config.options) return cb(null, ctx);
    var seed = ctx.config.options.seed;
    if(seed === true || (seed && seed[ctx.name])){
      var seed_source;
      function createRecords(data){
        if(!Array.isArray(data)) data = [data];
        ctx.env.helpers.amap(data, function(obj, cb){
          ctx.instance.create(obj, {}, cb);
        }, function(err, objects){
          if(err) return cb(err);
          console.log(objects);
          cb(null, ctx);
        });

      }
      if(source) seed_source = source;
      else if(seed === true || seed[ctx.name] === true){
        // Try to find seed from Layer properties
        seed_source = ctx.instance.seed;
      }
      else seed_source = seed[ctx.name];
      if(!seed_source) return cb(null, ctx);
      if(typeof seed_source === "string"){
        if(seed_source.match(/^https?:\/\//)){  // match url
          var request = require("request");
          return request.get(seed_source, function(err, res, body){
            if(res.statusCode !== 200) return cb("Error "+res.statusCode +" ("+seed_source+")");
            try{ createRecords(JSON.parse(body)); }
            catch(err){ return cb(err); }
          })
        }
        else if(seed_source.indexOf("/")!==-1){    // match fs path
          var path = require("path"), fs = require("fs");
          seed_source = path.join(process.cwd(), seed_source);
          if(fs.existsSync(seed_source)){
            try{ 
              var seed_data = require(seed_source);
              if(typeof seed_data === "function") return this.handleSeedOptions(ctx, cb, seed_data);
              return createRecords(seed_data); 
            }
            catch(err){ return cb(err); }
          }
          else return cb("Error - can't find file ("+seed_source+")");
        }
        else{    // match config path
          var seed_data = ctx.env.helpers.resolve(ctx.config, seed_source);
          if(typeof seed_data === "string") return this.handleSeedOptions(ctx, cb, seed_data);
          else return createRecords(seed_data);
        }
        
      }
      else if(typeof seed_source === "function"){
        return seed_source.call(ctx.instance, function(err, models){
          if(err) return cb(err);
          createRecords(models);
        });
      }
      else if(Array.isArray(seed_source)) return createRecords(seed_source);
      else if(!seed_source) return cb(null, ctx);
      else return createRecords([seed_source]);
    }
    else cb(null, ctx);
  },

  extend: function(name, props, statics){
    this.setMethods(this.prototype, props);
    return DataLayer.extend.apply(this, arguments);
  }
});

  
