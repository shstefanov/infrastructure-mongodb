var Model = require("infrastructure/lib/ExtendedModel");
var sync = require("./mongo-backbone-sync.js");
var _ = require("underscore");

module.exports = Model.extend("MongoModel", {
  idAttribute: "_id",
  __sync: sync
}, {
  extend: function(name, props, statics){
    props.pk_modifier = {$objectify: props.idAttribute || this.prototype.idAttribute};
    var has_timestamps = !!(props.timestamps || this.prototype.timestamps);
    if(has_timestamps) props.modifiers = (this.prototype.modifiers? _.clone(this.prototype.modifiers) : props.modifiers || {});
    if(props.modifiers){
      if(has_timestamps){
        props.modifiers.$dateify = ((props.modifiers.$dateify) || []).concat(["created_at", "updated_at"]);
      }
      props.$set_modifiers = _.mapObject(props.modifiers, function(val, key){
        if(has_timestamps && key === "$dateify") val = _.without(val, "created_at");
        return typeof val === "string" ? "$set."+val : val.map(function(val){ return "$set."+val });
      });
    }
    return Model.extend.apply(this, arguments);
  }
})