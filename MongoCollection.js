var _          = require("underscore");
var Collection = require("infrastructure/lib/ExtendedCollection");
var helpers    = require("infrastructure/lib/helpers");
var sync       = require("./mongo-backbone-sync.js");

module.exports = Collection.extend("MongoCollection", {
  __sync: sync,
  save: function(options){
    var self      = this;
    options       = options || {};
    var callbacks = _.pick(options, ["error", "success"]);
    options       = _.omit(options, ["error", "success"]);

    helpers.amap(this.models, function(model, cb){
      model.save(null, _.extend(options, {
        error:   function(model, err)  { cb(err); },
        success: function(model, data) { cb();    },
      }));
    }, function(err){
      if(err) {
        self.trigger("error", self, err);
        callbacks.error && callbacks.error(err);
      }
      else {
        self.trigger("sync", self);
        callbacks.success && callbacks.success(self);
      }
    });
  }
});
