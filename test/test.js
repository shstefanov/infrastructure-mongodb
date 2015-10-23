var assert = require("assert");
var _      = require("underscore");
describe("Infrastructure MongoDB DataLayer", function(){

  var MongoLayer = require("../index");

  var last_collection, id_counter;

  function type(v){ return typeof v; }

  var find_fixture = {
    toArray: function(cb){
      cb (null, [
        {_id: 0, field_a: 12, field_b: 113, field_c: 713  },
        {_id: 1, field_a: 22, field_b: 213, field_c: 813  },
        {_id: 2, field_a: 32, field_b: 313, field_c: 913  },
        {_id: 3, field_a: 42, field_b: 413, field_c: 1013 },
        {_id: 4, field_a: 52, field_b: 513, field_c: 1113 },
        {_id: 5, field_a: 62, field_b: 613, field_c: 1213 },
      ]);      
    }
  };

  var test_env = {
    i: {do: function(){}},
    helpers: require("infrastructure/lib/helpers"),
    engines: {
      mongodb: {
        createCollection: function(name, options, cb){
          setTimeout(function(){
            cb(null, (last_collection = {
              insert:      function(q,c)  { this.calls.insert       .push([q, type(c)]); q._id = id_counter++; c(null, JSON.parse(JSON.stringify(q)));     },
              update:      function(q,o,c){ this.calls.update       .push([q,o,type(c)]);       },
              save:        function(q,c)  { this.calls.save         .push([q,type(c)]);         },
              count:       function(q,o,c){ this.calls.count        .push([q,o,type(c)]);       },
              remove:      function(q,o,c){ this.calls.remove       .push([q,o,type(c)]);       },
              find:        function(q,o,c){ this.calls.find         .push([q,o,type(c)]);  c(null, find_fixture);     },
              findOne:     function(q,o,c){ this.calls.findOne      .push([q,o,type(c)]);  c(null, q);     },
              ensureIndex: function(i,o,c){ this.calls.ensureIndex  .push([i,o,type(c)]); c();  },
              calls: {
                insert:      [],
                update:      [],
                save:        [],
                count:       [],
                remove:      [],
                find:        [],
                findOne:     [],
                ensureIndex: [],
              }
            }));
          }, 10);
        }
      }
    }
  };

  // Mockup objectify, which is normally added by mongodb engine
  test_env.helpers.objectify = function(o){return Array.isArray(o)? o.map(function(t){ return "objectified:"+t; }) : "objectified:"+o; };

  describe("MongoLayer initialization", function(){

    it("Instantiates DataLayer", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        },

      });

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");

      layer.setupNode(function(err){
        assert.equal(err, null);
        assert.equal(layer.collection === last_collection, true);
        next();
      });
    });

    it("Using init method", function(next){
      var initialized = false;
      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        },

        init: function(cb){
          setTimeout(function(){
            initialized = true;
            cb();
          }, 10 );
        }

      });

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");

      layer.setupNode(function(err){
        assert.equal(initialized, true);
        next();
      });
    });

    it("Sets up indexes", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        },

        index: [
          { index: {field_a: true}, options: {unique: true } },
          { index: {field_b: true, field_a: true }           },
        ]

      });

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");

      layer.setupNode(function(err){
        assert.deepEqual(layer.collection.calls.ensureIndex, [
          [ {field_a: true },                { unique: true }     , "function"],
          [ {field_b: true, field_a: true }, {}                   , "function"],
        ])
        next();
      });
    });

    it("layer.methods", function(next){
      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        },

        custom_method_1: function(){},
        custom_method_2: function(){},
        custom_method_3: function(){},


      });

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");

      layer.setupNode(function(err){
        assert.deepEqual(layer.methods, [ 
          'count',
          'create',
          'delete',
          'find',
          'findOne',
          'save',
          'update',
          'custom_method_1',
          'custom_method_2',
          'custom_method_3' 
        ])
        next();
      });
    });
  
  });

  describe("MongoLayer runtime", function(){
    
    it("parseArguments", function(next){
      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        },

      });

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");

      var cb_mock = function(){};

      layer.setupNode(function(err){
        assert.equal(layer.parseArguments([]), false);
        assert.deepEqual(layer.parseArguments([null]), false);
        assert.deepEqual(layer.parseArguments([{}]), false);
        assert.deepEqual(layer.parseArguments([undefined]), false);
        assert.deepEqual(layer.parseArguments([null]), false);
        assert.deepEqual(layer.parseArguments( [cb_mock] ), [ {}, {}, cb_mock ]);
        assert.deepEqual(layer.parseArguments( [{a:1}, cb_mock] ), [ {a:1}, {}, cb_mock ]);
        assert.deepEqual(layer.parseArguments( [{a:1}, {b:2}, cb_mock] ), [ {a:1}, {b:2}, cb_mock ]);
        assert.deepEqual(layer.parseArguments( [2, {a:1}, {b:2}, cb_mock] ), false);
        next();
      });
    });

  });

  describe("MongoLayer CRUD", function(){
    
    it("collection.insert", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          _id:      _.isObject,
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){
        id_counter = 0;
        layer.create({ field_a: 22, field_b: "some_value" }, {}, function(err, result){
          assert.equal(err, null);
          assert.deepEqual(result, { _id: 0, field_a: 22, field_b: "some_value" });
          next();
        });
      });
    });

    it("collection.find", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });

      var cb_mock = function(){};

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){
        id_counter = 0;
        layer.find({ field_a: 38, field_b: "some_value" }, {}, cb_mock );
        assert.deepEqual(last_collection.calls.find, [
          [{ field_a: 38, field_b: "some_value" }, {fields: ["field_a", "field_b"]}, "function"]
        ]);
        next();
      });
    });

    it("collection.findOne", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });

      var cb_mock = function(){};

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){
        id_counter = 0;
        layer.findOne({ field_a: 14, field_b: "_some_value" }, {skip: 10}, cb_mock );
        assert.deepEqual(last_collection.calls.findOne, [
          [{ field_a: 14, field_b: "_some_value" }, {skip: 10, fields: ["field_a", "field_b"]}, "function"]
        ]);
        next();
      });
    });

    it("collection.save", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });

      var cb_mock = function(){};

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){
        id_counter = 0;
        layer.save({ _id: 4343, field_a: 99, field_b: "field_b" }, {limit: 10}, cb_mock );
        assert.deepEqual(last_collection.calls.save, [
          [{ _id: "objectified:4343", field_a: 99, field_b: "field_b" }, "function"]
        ]);
        next();
      });
    });

    it("collection.save (error without id)", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){
        id_counter = 0;
        layer.save({ field_a: 99, field_b: "field_b" }, {limit: 30}, function(err){
          assert.equal(err, "Can't update model - _id not found");
          next();
        });
        
      });
    });

    it("collection.update", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });

      var cb_mock = function(){};

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){
        id_counter = 0;
        layer.update({ _id: 4343, field_a: 99, field_b: "field_b" }, {limit: 10}, cb_mock );
        assert.deepEqual(last_collection.calls.update, [
          [{ _id: 4343, field_a: 99, field_b: "field_b" }, {limit: 10}, "function"]
        ]);
        next();
      });
    });

    it("collection.count", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });

      var cb_mock = function(){};

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){
        id_counter = 0;
        layer.count({ _id: 4343, field_a: 99, field_b: "field_b" }, {limit: 10}, cb_mock );
        assert.deepEqual(last_collection.calls.count, [
          [{ _id: 4343, field_a: 99, field_b: "field_b" }, {limit: 10}, "function"]
        ]);
        next();
      });
    });

    it("collection.delete", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });

      var cb_mock = function(){};

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){
        id_counter = 0;
        layer.delete({ _id: 4343, field_a: 99, field_b: "field_b" }, {limit: 10}, cb_mock );
        assert.deepEqual(last_collection.calls.remove, [
          [{ _id: 4343, field_a: 99, field_b: "field_b" }, {limit: 10}, "function"]
        ]);
        next();
      });
    });

  });


  describe("publicFields option",   function(){

    it("Public fields defaults to list of fields", function(next){
      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          _id:      _.isObject,
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      assert.deepEqual(layer.publicFields, [
        "_id", "field_a", "field_b"
      ]);
      next();
    });

    it("layer.create creates object with all fields, but returns only publicFields", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          _id:      _.isObject,
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){
        id_counter = 0;
        layer.create({ field_a: 22, field_b: "some_value", field_c: 234, field_d: "aaa" }, {}, function(err, result){
          assert.equal(err, null);
          assert.deepEqual(result, { _id: 0, field_a: 22, field_b: "some_value" });
          assert.deepEqual(last_collection.calls.insert, [
            [{ _id: 0, field_a: 22, field_b: "some_value", field_c: 234, field_d: "aaa" }, "function"]
          ]);
          next();
        });
      });
    });

    it("layer.findOne returns only publicFields", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          _id:      _.isObject,
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){
        id_counter = 0;
        layer.findOne({ field_a: 22, field_b: "some_value", field_c: 234, field_d: "aaa" }, {}, function(err, result){
          assert.equal(err, null);
          assert.deepEqual(last_collection.calls.findOne, [
            [{ field_a: 22, field_b: "some_value", field_c: 234, field_d: "aaa" }, {fields: layer.publicFields}, "function"]
          ]);
          next();
        });
      });
    });

    it("layer.find returns only publicFields", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          _id:      _.isObject,
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){
        id_counter = 0;
        layer.find({ field_a: 22, field_b: "some_value", field_c: 234, field_d: "aaa" }, {}, function(err, result){
          assert.equal(err, null);
          assert.deepEqual(last_collection.calls.find, [
            [{ field_a: 22, field_b: "some_value", field_c: 234, field_d: "aaa" }, {fields: layer.publicFields}, "function"]
          ]);
          next();
        });
      });
    });

  });



  xdescribe("objectify option",   function(){});


});