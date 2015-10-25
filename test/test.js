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
              insertOne:   function(q,c)  { this.calls.insertOne       .push([q, type(c)]); q._id = id_counter++; c(null, JSON.parse(JSON.stringify(q)));     },
              insertMany:  function(q,c)  { this.calls.insertMany      .push([q, type(c)]); q.forEach(function(q){q._id = id_counter++}); c(null, JSON.parse(JSON.stringify(q)));     },
              update:      function(q,o,c){ this.calls.update       .push([q,o,type(c)]);       },
              save:        function(q,o,c){ this.calls.save         .push([q,o,type(c)]);   if(!q._id){q._id = id_counter++;} c(null, JSON.parse(JSON.stringify(q)));      },
              count:       function(q,o,c){ this.calls.count        .push([q,o,type(c)]);       },
              remove:      function(q,o,c){ this.calls.remove       .push([q,o,type(c)]);       },
              find:        function(q,o,c){ this.calls.find         .push([q,o,type(c)]);  c(null, find_fixture);     },
              findOne:     function(q,o,c){ this.calls.findOne      .push([q,o,type(c)]);  c(null, q);     },
              ensureIndex: function(i,o,c){ this.calls.ensureIndex  .push([i,o,type(c)]); c();  },
              calls: {
                insertOne: [], insertMany: [],

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
        assert.deepEqual(layer.parseArguments( [{g:12}, {a:1}, {b:2}, cb_mock] ), [{g:12}, {a:1}, {b:2}, cb_mock]);
        next();
      });
    });

  });

  describe("MongoLayer CRUD", function(){
    
    it("datalayer.create (single)", function(next){

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
          assert.deepEqual(last_collection.calls.insertOne, [[{ _id: 0, field_a: 22, field_b: "some_value" }, "function"]]);
          next();
        });
      });
    });

    it("datalayer.create (multiple)", function(next){

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
          assert.deepEqual(last_collection.calls.insertOne, [[{ _id: 0, field_a: 22, field_b: "some_value" }, "function"]]);
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
        layer.find({ field_a: 38, field_b: "some_value" }, {fields: ["field_a", "field_b"]}, cb_mock );
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
          [{ field_a: 14, field_b: "_some_value" }, {skip: 10}, "function"]
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
        layer.save({ _id: 4343, field_a: 99, field_b: "field_b" }, {limit: 10, $objectify: "_id"}, cb_mock );
        assert.deepEqual(last_collection.calls.save, [
          [{ _id: "objectified:4343", field_a: 99, field_b: "field_b" }, {limit: 10, $objectify: "_id"}, "function"]
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
        layer.save({ _id: 0, field_a: 99, field_b: "field_b" }, {limit: 30}, function(err){
          assert.equal(err, null);
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
          [{ _id: 4343, field_a: 99, field_b: "field_b" }, {limit: 10}, "object"]
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

  describe("$objectify option",   function(){
    
    it("$objectifies option in layer.create method with single document", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });
      id_counter = 0;
      var results = [];
      var cb_mock = function(err, result){ results.push([err, result]); };

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){

        layer.create({field_a: 1, field_b:2}, {$objectify:  "field_a"               }, cb_mock );
        layer.create({field_a: 1, field_b:2}, {$objectify:[ "field_a"]              }, cb_mock );
        layer.create({field_a: 1, field_b:2}, {$objectify:[ "field_a", "field_b" ]  }, cb_mock );
        layer.create({field_a: 1, field_b:2}, {$objectify:  "field_c"               }, cb_mock );
        layer.create({field_a: 1, field_b:2}, {$objectify:[ "field_a", "field_c" ]  }, cb_mock );

        layer.create({field_a: [1,3,5], field_b:2}, {$objectify:  "field_a"               }, cb_mock );
        layer.create({field_a: {sub_a1: [1,3,5], sub_a2: 7}, field_b:2}, {$objectify:  ["field_a.sub_a1", "field_a.sub_a2"]               }, cb_mock );

        assert.deepEqual(results, [ 
          [ null, { field_a: 'objectified:1', field_b: 2,               _id: 0 } ],
          [ null, { field_a: 'objectified:1', field_b: 2,               _id: 1 } ],
          [ null, { field_a: 'objectified:1', field_b: 'objectified:2', _id: 2 } ],
          [ null, { field_a: 1,               field_b: 2,               _id: 3 } ],
          [ null, { field_a: 'objectified:1', field_b: 2,               _id: 4 } ],
          
          [ null, { field_a: ["objectified:1","objectified:3","objectified:5"], field_b: 2, _id: 5 } ],
          [ null, { field_a: { sub_a1: ["objectified:1","objectified:3","objectified:5"], sub_a2:"objectified:7"}, field_b: 2, _id:6 } ]
        ]);

        next();

      });
    });

    it("$objectifies option in layer.create method with multiple documents", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });
      id_counter = 0;
      var results = [];
      var cb_mock = function(err, result){ results.push([err, result]); };

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){

        layer.create([{field_a: 1, field_b:2}, {field_a: 5, field_b:6} ], {$objectify:  "field_a"               }, cb_mock );
        layer.create([{field_a: 1, field_b:2}, {field_a: 5, field_b:6} ], {$objectify:[ "field_a"]              }, cb_mock );
        layer.create([{field_a: 1, field_b:2}, {field_a: 5, field_b:6} ], {$objectify:[ "field_a", "field_b" ]  }, cb_mock );
        layer.create([{field_a: 1, field_b:2}, {field_a: 5, field_b:6} ], {$objectify:  "field_c"               }, cb_mock );
        layer.create([{field_a: 1, field_b:2}, {field_a: 5, field_b:6} ], {$objectify:[ "field_a", "field_c" ]  }, cb_mock );

        layer.create([{field_a: [1,3,5], field_b:2}, {field_a: [2,4,6], field_b:2}], {$objectify:  "field_a" }, cb_mock );
        layer.create([{field_a: {sub_a1: [1,3,5], sub_a2: 7}, field_b:2}, {field_a: {sub_a1: [22,44,66], sub_a2: 99}, field_b:2}], {$objectify:  ["field_a.sub_a1", "field_a.sub_a2"]               }, cb_mock );

        assert.deepEqual(results, [ 
          [ null, [{ field_a: 'objectified:1', field_b: 2,               _id: 0 }, { field_a: 'objectified:5', field_b: 6,               _id: 1 }] ],
          [ null, [{ field_a: 'objectified:1', field_b: 2,               _id: 2 }, { field_a: 'objectified:5', field_b: 6,               _id: 3 }] ],
          [ null, [{ field_a: 'objectified:1', field_b: 'objectified:2', _id: 4 }, { field_a: 'objectified:5', field_b: 'objectified:6', _id: 5 }] ],
          [ null, [{ field_a: 1,               field_b: 2,               _id: 6 }, { field_a: 5,               field_b: 6,               _id: 7 }] ],
          [ null, [{ field_a: 'objectified:1', field_b: 2,               _id: 8 }, { field_a: 'objectified:5', field_b: 6,               _id: 9 }] ],
          
          [ null, [{ field_a: ["objectified:1","objectified:3","objectified:5"], field_b: 2, _id: 10 }, { field_a: ["objectified:2","objectified:4","objectified:6"], field_b: 2, _id: 11 }] ],
          [ null, [{ field_a: { sub_a1: ["objectified:1","objectified:3","objectified:5"], sub_a2:"objectified:7"}, field_b: 2, _id:12 }, { field_a: { sub_a1: ["objectified:22","objectified:44","objectified:66"], sub_a2:"objectified:99"}, field_b: 2, _id:13 }] ]
        ]);

        next();

      });
    });
    
    it("$objectifies option in layer.find method", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });
      id_counter = 0;
      var results = [];
      var cb_mock = function(err, result){ results.push([err, result]); };

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){

        layer.find({field_a: 1, field_b:2}, {$objectify:  "field_a"               }, cb_mock );
        layer.find({field_a: 1, field_b:2}, {$objectify:[ "field_a"]              }, cb_mock );
        layer.find({field_a: 1, field_b:2}, {$objectify:[ "field_a", "field_b" ]  }, cb_mock );
        layer.find({field_a: 1, field_b:2}, {$objectify:  "field_c"               }, cb_mock );
        layer.find({field_a: 1, field_b:2}, {$objectify:[ "field_a", "field_c" ]  }, cb_mock );

        layer.find({field_a: [1,3,5], field_b:2}, {$objectify:  "field_a"               }, cb_mock );
        layer.find({field_a: {sub_a1: [1,3,5], sub_a2: 7}, field_b:2}, {$objectify:  ["field_a.sub_a1", "field_a.sub_a2"]               }, cb_mock );

        assert.deepEqual(last_collection.calls.find.map(function(call){ return call[0]; }), [ 
          { field_a: 'objectified:1', field_b: 2,               },
          { field_a: 'objectified:1', field_b: 2,               },
          { field_a: 'objectified:1', field_b: 'objectified:2', },
          { field_a: 1,               field_b: 2,               },
          { field_a: 'objectified:1', field_b: 2,               },
          
          { field_a: ["objectified:1","objectified:3","objectified:5"], field_b: 2, },
          { field_a: { sub_a1: ["objectified:1","objectified:3","objectified:5"], sub_a2:"objectified:7"}, field_b: 2, },
        ]);

        next();

      });
    });

    it("$objectifies option in layer.findOne method", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });
      id_counter = 0;
      var results = [];
      var cb_mock = function(err, result){ results.push([err, result]); };

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){

        layer.findOne({field_a: 1, field_b:2}, {$objectify:  "field_a"               }, cb_mock );
        layer.findOne({field_a: 1, field_b:2}, {$objectify:[ "field_a"]              }, cb_mock );
        layer.findOne({field_a: 1, field_b:2}, {$objectify:[ "field_a", "field_b" ]  }, cb_mock );
        layer.findOne({field_a: 1, field_b:2}, {$objectify:  "field_c"               }, cb_mock );
        layer.findOne({field_a: 1, field_b:2}, {$objectify:[ "field_a", "field_c" ]  }, cb_mock );

        layer.findOne({field_a: [1,3,5], field_b:2}, {$objectify:  "field_a"               }, cb_mock );
        layer.findOne({field_a: {sub_a1: [1,3,5], sub_a2: 7}, field_b:2}, {$objectify:  ["field_a.sub_a1", "field_a.sub_a2"]               }, cb_mock );

        assert.deepEqual(last_collection.calls.findOne.map(function(call){ return call[0]; }), [ 
          { field_a: 'objectified:1', field_b: 2,               },
          { field_a: 'objectified:1', field_b: 2,               },
          { field_a: 'objectified:1', field_b: 'objectified:2', },
          { field_a: 1,               field_b: 2,               },
          { field_a: 'objectified:1', field_b: 2,               },
          
          { field_a: ["objectified:1","objectified:3","objectified:5"], field_b: 2, },
          { field_a: { sub_a1: ["objectified:1","objectified:3","objectified:5"], sub_a2:"objectified:7"}, field_b: 2, },
        ]);

        next();

      });
    });

    it("$objectifies option in layer.count method", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });
      id_counter = 0;
      var results = [];
      var cb_mock = function(err, result){ results.push([err, result]); };

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){

        layer.count({field_a: 1, field_b:2}, {$objectify:  "field_a"               }, cb_mock );
        layer.count({field_a: 1, field_b:2}, {$objectify:[ "field_a"]              }, cb_mock );
        layer.count({field_a: 1, field_b:2}, {$objectify:[ "field_a", "field_b" ]  }, cb_mock );
        layer.count({field_a: 1, field_b:2}, {$objectify:  "field_c"               }, cb_mock );
        layer.count({field_a: 1, field_b:2}, {$objectify:[ "field_a", "field_c" ]  }, cb_mock );

        layer.count({field_a: [1,3,5], field_b:2}, {$objectify:  "field_a"               }, cb_mock );
        layer.count({field_a: {sub_a1: [1,3,5], sub_a2: 7}, field_b:2}, {$objectify:  ["field_a.sub_a1", "field_a.sub_a2"]               }, cb_mock );

        assert.deepEqual(last_collection.calls.count.map(function(call){ return call[0]; }), [ 
          { field_a: 'objectified:1', field_b: 2,               },
          { field_a: 'objectified:1', field_b: 2,               },
          { field_a: 'objectified:1', field_b: 'objectified:2', },
          { field_a: 1,               field_b: 2,               },
          { field_a: 'objectified:1', field_b: 2,               },
          
          { field_a: ["objectified:1","objectified:3","objectified:5"], field_b: 2, },
          { field_a: { sub_a1: ["objectified:1","objectified:3","objectified:5"], sub_a2:"objectified:7"}, field_b: 2, },
        ]);

        next();

      });
    });

    it("$objectifies option in layer.delete method", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });
      id_counter = 0;
      var results = [];
      var cb_mock = function(err, result){ results.push([err, result]); };

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){

        layer.delete({field_a: 1, field_b:2}, {$objectify:  "field_a"               }, cb_mock );
        layer.delete({field_a: 1, field_b:2}, {$objectify:[ "field_a"]              }, cb_mock );
        layer.delete({field_a: 1, field_b:2}, {$objectify:[ "field_a", "field_b" ]  }, cb_mock );
        layer.delete({field_a: 1, field_b:2}, {$objectify:  "field_c"               }, cb_mock );
        layer.delete({field_a: 1, field_b:2}, {$objectify:[ "field_a", "field_c" ]  }, cb_mock );

        layer.delete({field_a: [1,3,5], field_b:2}, {$objectify:  "field_a"               }, cb_mock );
        layer.delete({field_a: {sub_a1: [1,3,5], sub_a2: 7}, field_b:2}, {$objectify:  ["field_a.sub_a1", "field_a.sub_a2"]               }, cb_mock );

        assert.deepEqual(last_collection.calls.remove.map(function(call){ return call[0]; }), [ 
          { field_a: 'objectified:1', field_b: 2,               },
          { field_a: 'objectified:1', field_b: 2,               },
          { field_a: 'objectified:1', field_b: 'objectified:2', },
          { field_a: 1,               field_b: 2,               },
          { field_a: 'objectified:1', field_b: 2,               },
          
          { field_a: ["objectified:1","objectified:3","objectified:5"], field_b: 2, },
          { field_a: { sub_a1: ["objectified:1","objectified:3","objectified:5"], sub_a2:"objectified:7"}, field_b: 2, },
        ]);

        next();

      });
    });

    it("$objectifies option in layer.save method", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });
      id_counter = 0;
      var results = [];
      var cb_mock = function(err, result){ results.push([err, result]); };

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){

        layer.save({field_a: 1, field_b:2}, {$objectify:  "field_a"               }, cb_mock );
        layer.save({field_a: 1, field_b:2}, {$objectify:[ "field_a"]              }, cb_mock );
        layer.save({field_a: 1, field_b:2}, {$objectify:[ "field_a", "field_b" ]  }, cb_mock );
        layer.save({field_a: 1, field_b:2}, {$objectify:  "field_c"               }, cb_mock );
        layer.save({field_a: 1, field_b:2}, {$objectify:[ "field_a", "field_c" ]  }, cb_mock );

        layer.save({field_a: [1,3,5], field_b:2}, {$objectify:  "field_a"               }, cb_mock );
        layer.save({field_a: {sub_a1: [1,3,5], sub_a2: 7}, field_b:2}, {$objectify:  ["field_a.sub_a1", "field_a.sub_a2"]               }, cb_mock );

        assert.deepEqual(last_collection.calls.save.map(function(call){ return call[0]; }), [ 
          { field_a: 'objectified:1', field_b: 2,               _id: 0 },
          { field_a: 'objectified:1', field_b: 2,               _id: 1 },
          { field_a: 'objectified:1', field_b: 'objectified:2', _id: 2 },
          { field_a: 1,               field_b: 2,               _id: 3 },
          { field_a: 'objectified:1', field_b: 2,               _id: 4 },
          
          { field_a: ["objectified:1","objectified:3","objectified:5"], field_b: 2, _id: 5 },
          { field_a: { sub_a1: ["objectified:1","objectified:3","objectified:5"], sub_a2:"objectified:7"}, field_b: 2, _id: 6 },
        ]);

        next();

      });
    });

    it("$objectifies option in layer.update method", function(next){

      var TestMongoLayer = MongoLayer.extend("TestMongoLayer", {
        collectionName: "TestCollection",

        fields: {
          field_a:  _.isNumber,
          field_b:  _.isString,
        }

      });
      id_counter = 0;
      var results = [];
      var cb_mock = function(err, result){ results.push([err, result]); };

      var layer = new TestMongoLayer(test_env, TestMongoLayer, "TestMongoLayer");
      layer.setupNode(function(err){

        layer.update({field_a: 1, field_b:2, $objectify:  "field_a" }, {}, cb_mock );
        layer.update({field_a: 1, field_b:2, $objectify:[ "field_a"]}, {$set: {field_b: 33 }, $objectify:  "$set.field_b"}, cb_mock );
        layer.update({field_a: 1, field_b: {sub_b: [11,12,13]}, $objectify:[ "field_a", "field_b.sub_b"]}, {$set: {field_b: [33, 44, 55] }, $objectify:  "$set.field_b"}, cb_mock );

        assert.deepEqual(last_collection.calls.update.map(function(call){ return call.slice(0,2); }), [ 
          [{ field_a: 'objectified:1', field_b: 2, }, {}],
          [{ field_a: 'objectified:1', field_b: 2, }, {$set: {field_b: "objectified:33" } }],
          [{ field_a: 'objectified:1', field_b: {sub_b: ["objectified:11","objectified:12","objectified:13"]}, }, {$set: {field_b: ["objectified:33", "objectified:44", "objectified:55"] } }],
        ]);

        next();

      });
    });

  });


});