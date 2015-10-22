var assert = require("assert");
var _      = require("underscore");
describe("Infrastructure MongoDB DataLayer", function(){

  var MongoLayer = require("../index");

  var last_collection, id_counter;

  var test_env = {
    i: {do: function(){}},
    helpers: require("infrastructure/lib/helpers"),
    engines: {
      mongodb: {
        createCollection: function(name, options, cb){
          setTimeout(function(){
            cb(null, (last_collection = {
              insert:      function(q,c){ this.calls.insert       .push([q]); q._id = id_counter++; c(null, JSON.parse(JSON.stringify(q)));     },
              update:      function(q,o,c){ this.calls.update            .push([q,o]);   cb();   },
              count:       function(){ this.calls.count             .push(Array.prototype.slice.call(arguments));      },
              remove:      function(){ this.calls.remove            .push(Array.prototype.slice.call(arguments));      },
              find:        function(){ this.calls.find              .push(Array.prototype.slice.call(arguments));      },
              findOne:     function(){ this.calls.findOne           .push(Array.prototype.slice.call(arguments));      },
              ensureIndex: function(i,o,c){ this.calls.ensureIndex  .push([i, o]); c(); },
              calls: {
                insert:      [],
                update:      [],
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

  // Mockup objectify
  test_env.helpers.objectify = function(o){return Array.isArray(o)? o.map(function(t){ return "objectified:"+t; }) : "objectified:"+o; };

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
        [ {field_a: true },                { unique: true }     ],
        [ {field_b: true, field_a: true }, {}                   ],
      ])
      next();
    });

  });

  xit("layer.methods", function(){});

  xit("parseArguments", function(){});

  xit("publicFields",   function(){});

  it("Inserts data", function(next){

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
      layer.create({ field_a: 22, field_b: "some_value" }, {}, function(err, result){
        assert.equal(err, null);
        assert.deepEqual(result, { _id: 0, field_a: 22, field_b: "some_value" });
        next();
      });
    });

  });

  xit("objectify option",   function(){});

  xit("count",   function(){});

  xit("find",   function(){});

  xit("findOne data",   function(){});

  xit("update data",   function(){});

  xit("delete data",   function(){});



});