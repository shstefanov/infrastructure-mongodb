var Model      = require("infrastructure/lib/Model");
var Collection = require("infrastructure/lib/Collection");
var helpers    = require("infrastructure/lib/helpers");
var _          = require("underscore");
var sl = Array.prototype.slice;
module.exports = function(method, model, options){
  var is_c = model instanceof Collection,hndl;
  switch (method) {
    case 'create': hndl = is_c?collection_create :model_create; break;
    case 'update': hndl = is_c?collection_update :model_update; break;
    case 'patch':  hndl = is_c?collection_patch  :model_patch;  break;
    case 'delete': hndl = is_c?collection_delete :model_delete; break;
    case 'read':   hndl = is_c?collection_read   :model_read;   break;
  }
  hndl.apply(this, sl.call(arguments,1).concat([function(err, result){
    err? options.error(err) : options.success(result);
  }]));
}


function model_read (model, options, cb){
  var is_new = model.isNew();
  this.i.do(model.dataPath+".findOne", 
    options.query   || (is_new? model.toJSON()  : model.pick(model.idAttribute)),
    options.options || (is_new? model.modifiers : model.pk_modifier),
  cb);
}

function model_create (model, options, cb){
  this.i.do(model.dataPath+".create", 
    _.extend(model.toJSON(), model.timestamps? {created_at: new Date(), updated_at: new Date()} : {}),
    _.extend({}, options.options, model.modifiers), cb);
}

function model_update (model, options, cb){
  this.i.do(model.dataPath+".update",
    _.extend(model.pick(model.idAttribute), model.pk_modifier),
    _.extend(model.omit(model.idAttribute), model.modifiers, model.timestamps? {updated_at:new Date()}:{}),
  cb);
}

function model_patch (model, options, cb){
  this.i.do(model.dataPath+".update",
    _.extend(model.pick(model.idAttribute), model.pk_modifier),
    _.extend({$set: 
      _.extend(
        model.changedAttributes() || {}, 
        model.timestamps? {updated_at:new Date()}:{}
      )}, model.$set_modifiers),
  cb);
}

function model_delete (model, options, cb){
  this.i.do(model.dataPath+".delete", model.pick(model.idAttribute), model.pk_modifier, cb);
}


function collection_read (collection, options, cb){
  this.i.do( ( collection.dataPath || collection.model.prototype.dataPath ) + ".find",
    options.query   || {},
    options.options || {},
  cb);
}

function collection_sync_save (){

}

function collection_delete (){

}

function collection_create (){

}

