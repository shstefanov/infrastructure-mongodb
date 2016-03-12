var assert = require("assert");
var _      = require("underscore");

describe("MongoModel and MongoCollection", function(){


  var do_calls = [];
  var getDoCalls = function(){
    var calls = do_calls;
    do_calls = [];
    return calls;
  }

  var env = {
    i: {
      "do": function(){ do_calls.push([].slice.call(arguments)); },
    }
  };

  var sync = require("../mongo-backbone-sync.js").bind(env);

  var TestMongoModel = require("../MongoModel").extend("TestMongoModel", {

    dataPath: "testmodels.Test",
    
    modifiers: {
      $objectify: ["prop_object_id_a", "prop_object_id_b" ],
      $dateify:   ["prop_date_a",      "prop_date_b"      ],
    },
 
    fetch:   function(options)      { sync("read", this, options);   },
    save:    function(data, options){ sync(this.isNew()? "create": (options.patch ? "patch" : "update"), this, options); },
    destroy: function(options)      { sync("delete", this, options || {}); },


  });

  describe("MongoModel without timestamps", function(){
  
    it("Has pk_modifier (primary key modifier)", function(next){
      var model = new TestMongoModel();
      assert.deepEqual(model.pk_modifier, { '$objectify': '_id' });
      next();
    });

    it("Has $set_modifiers", function(next){
      var model = new TestMongoModel();
      assert.deepEqual(model.$set_modifiers, { 
        '$objectify': [ '$set.prop_object_id_a', '$set.prop_object_id_b' ],
        '$dateify':   [ '$set.prop_date_a',      '$set.prop_date_b'      ] 
      });
      next();
    });

    it("Fetches model", function(next){
      var model = new TestMongoModel({some_property: 55, other_property: 99});
      model.fetch({});
      var do_call = getDoCalls().shift();
      do_call.pop();
      assert.deepEqual(do_call, [
        "testmodels.Test.findOne",
        {"some_property":55, "other_property":99},
        {"$objectify":["prop_object_id_a","prop_object_id_b"],"$dateify":["prop_date_a","prop_date_b"]}
      ])
      next();
    });

    it("Fetches model with query option", function(next){
      var model = new TestMongoModel({some_property: 22, other_property: 33});
      model.fetch({query: {some_query: 11}});
      var do_call = getDoCalls().shift();
      do_call.pop();
      assert.deepEqual(do_call, [
        "testmodels.Test.findOne",
        {some_query: 11},
        {"$objectify":["prop_object_id_a","prop_object_id_b"],"$dateify":["prop_date_a","prop_date_b"]}
      ])
      next();
    });

    it("Fetches model with query and options", function(next){
      var model = new TestMongoModel({some_property: 22, other_property: 33});
      model.fetch({
        query:   { some_query: 11             }, 
        options: { some_option: "test_option" },
      });
      var do_call = getDoCalls().shift();
      do_call.pop();
      assert.deepEqual(do_call, [
        "testmodels.Test.findOne",
        {some_query: 11},
        {some_option: "test_option"}
      ])
      next();
    });

    it("Saves new model", function(next){
      var model = new TestMongoModel({some_property: 22, other_property: 33});
      model.save(null, {});
      var do_call = getDoCalls().shift();
      var callback = do_call.pop();
      assert.deepEqual(do_call, [ 
        'testmodels.Test.create',
        { some_property: 22, other_property: 33 },
        { 
          '$objectify': [ 'prop_object_id_a', 'prop_object_id_b' ],
          '$dateify':   [ 'prop_date_a',      'prop_date_b'      ],
        } 
      ]);
      next();
    });

    it("Update existing model", function(next){
      var model = new TestMongoModel({_id: 55, some_property: 22, other_property: 33});
      model.save(null, {});
      var do_call = getDoCalls().shift();
      var callback = do_call.pop();
      assert.deepEqual(do_call, [ 'testmodels.Test.update',
        { _id: 55, '$objectify': '_id' },
        { 
          some_property:  22,
          other_property: 33,
          '$objectify': [ 'prop_object_id_a', 'prop_object_id_b' ],
          '$dateify':   [ 'prop_date_a', 'prop_date_b'           ],
        } 
      ]);
      next();
    });

    it("Patch existing model", function(next){
      var model = new TestMongoModel({_id: 55});
      model.set({some_property: 22, other_property: 33})
      model.save(null, {patch: true});
      var do_call = getDoCalls().shift();
      var callback = do_call.pop();
      assert.deepEqual(do_call, [ 
        'testmodels.Test.update',
        { _id: 55, '$objectify': '_id' },
        { 
          '$set': { some_property: 22, other_property: 33 },
          '$objectify': [ '$set.prop_object_id_a', '$set.prop_object_id_b'  ],
          '$dateify':   [ '$set.prop_date_a',      '$set.prop_date_b'       ],
        } 
      ]);
      next();
    });

    it("Delete existing model", function(next){
      var model = new TestMongoModel({_id: 55});
      model.destroy();
      var do_call = getDoCalls().shift();
      var callback = do_call.pop();
      assert.deepEqual(do_call, [ 
        'testmodels.Test.delete',
        { _id: 55 },
        { '$objectify': '_id' } 
      ]);
      next();
    });

  });


  describe("MongoModel with timestamps", function(){

    var TimestampsModel = TestMongoModel.extend("TimestampsModel", {timestamps: true});
  
    it("Model's modifiers are extended with additional fields", function(next){
      var model = new TimestampsModel();
      assert.deepEqual(model.modifiers, { 
        '$objectify': [ 'prop_object_id_a', 'prop_object_id_b' ],
        '$dateify':   [ 'prop_date_a', 'prop_date_b', 'created_at', 'updated_at' ] 
      });
      next();
    });

    it("Model's $set_modifiers are extended with additiona updated_at", function(next){
      var model = new TimestampsModel();
      assert.deepEqual(model.$set_modifiers, { 
        '$objectify': [ '$set.prop_object_id_a', '$set.prop_object_id_b' ],
        '$dateify':   [ '$set.prop_date_a',      '$set.prop_date_b', '$set.updated_at' ]
      });
      next();
    });

    it("Fetches model", function(next){
      var model = new TimestampsModel({some_property: 55, other_property: 99});
      model.fetch({});
      var do_call = getDoCalls().shift();
      do_call.pop();
      assert.deepEqual(do_call, [
        "testmodels.Test.findOne",
        {"some_property":55, "other_property":99},
        {"$objectify":["prop_object_id_a","prop_object_id_b"],"$dateify":["prop_date_a","prop_date_b", "created_at", "updated_at"]}
      ])
      next();
    });

    it("Fetches model with query option", function(next){
      var model = new TimestampsModel({some_property: 22, other_property: 33});
      model.fetch({query: {some_query: 11}});
      var do_call = getDoCalls().shift();
      do_call.pop();
      assert.deepEqual(do_call, [
        "testmodels.Test.findOne",
        {some_query: 11},
        {"$objectify":["prop_object_id_a","prop_object_id_b"],"$dateify":["prop_date_a","prop_date_b", 'created_at', 'updated_at']}
      ])
      next();
    });

    it("Fetches model with query and options", function(next){
      var model = new TimestampsModel({some_property: 22, other_property: 33});
      model.fetch({
        query:   { some_query: 11             }, 
        options: { some_option: "test_option" },
      });
      var do_call = getDoCalls().shift();
      do_call.pop();
      assert.deepEqual(do_call, [
        "testmodels.Test.findOne",
        {some_query: 11},
        {some_option: "test_option"}
      ])
      next();
    });

    it("Saves new model", function(next){
      var model = new TimestampsModel({some_property: 22, other_property: 33});
      model.save(null, {});
      var do_call = getDoCalls().shift();
      var callback = do_call.pop();
      assert.deepEqual(do_call, [ 
        'testmodels.Test.create',
        { some_property: 22, other_property: 33, created_at: do_call[1].created_at, updated_at: do_call[1].updated_at  },
        { 
          '$objectify': [ 'prop_object_id_a', 'prop_object_id_b' ],
          '$dateify':   [ 'prop_date_a',      'prop_date_b', 'created_at', 'updated_at' ],
        } 
      ]);
      next();
    });

    it("Update existing model", function(next){
      var old_date = new Date();
      var model = new TimestampsModel({_id: 55, some_property: 22, other_property: 33, created_at: new Date(), updated_at: old_date});
      model.save(null, {});
      var do_call = getDoCalls().shift();
      var callback = do_call.pop();
      assert.equal(old_date === do_call[2].updated_at, false);
      assert.deepEqual(do_call, [ 'testmodels.Test.update',
        { _id: 55, '$objectify': '_id' },
        { 
          created_at: do_call[2].created_at,
          updated_at: do_call[2].updated_at,
          some_property:  22,
          other_property: 33,
          '$objectify': [ 'prop_object_id_a', 'prop_object_id_b' ],
          '$dateify':   [ 'prop_date_a', 'prop_date_b', 'created_at', 'updated_at' ],
        } 
      ]);
      next();
    });

    it("Patch existing model", function(next){
      var old_date = new Date();
      var model = new TimestampsModel({_id: 55, updated_at: old_date});
      model.set({some_property: 22, other_property: 33})
      model.save(null, {patch: true});
      var do_call = getDoCalls().shift();
      var callback = do_call.pop();
      assert.equal(old_date === do_call[2].$set.updated_at, false);
      assert.deepEqual(do_call, [ 
        'testmodels.Test.update',
        { _id: 55, '$objectify': '_id' },
        { 
          '$set': { some_property: 22, other_property: 33, updated_at: do_call[2].$set.updated_at },
          '$objectify': [ '$set.prop_object_id_a', '$set.prop_object_id_b' ],
          '$dateify':   [ '$set.prop_date_a',      '$set.prop_date_b', '$set.updated_at' ],
        } 
      ]);
      next();
    });

    it("Delete existing model", function(next){
      var model = new TimestampsModel({_id: 55});
      model.destroy();
      var do_call = getDoCalls().shift();
      var callback = do_call.pop();
      assert.deepEqual(do_call, [ 
        'testmodels.Test.delete',
        { _id: 55 },
        { '$objectify': '_id' } 
      ]);
      next();
    });

  });



});