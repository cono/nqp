'use strict';
var SerializationContext = require('./serialization-context.js');
var reprs = require('./reprs.js');

var Hash = require('./hash.js');
var STable = require('./sixmodel.js').STable;

var repr = new reprs.KnowHOWREPR();

var CodeRef = require('./code-ref.js');

var constants = require('./constants.js');

var BOOT = require('./BOOT.js');

var Null = require('./null.js');

var core = new SerializationContext('__6MODEL_CORE__');
core.description = 'core SC';

function addToScWithSt(obj) {
  core.rootObjects.push(obj);
  core.rootSTables.push(obj._STable);
  obj._SC = core;
  obj._STable._SC = core;
}

function addToScWithStAndMo() {
  throw '...';
}


/* Creates and installs the KnowHOWAttribute type. */
function create_KnowHOWAttribute() {
  var metaObj = KnowHOW_HOW._STable.REPR.allocate(KnowHOW_HOW._STable);

  var r = new reprs.KnowHOWAttribute();
  var typeObj = r.typeObjectFor(metaObj);

  var methods = {};
  methods.name = function(ctx, _NAMED, self) {
    return self.__name;
  };
  methods['new'] = function(ctx, _NAMED, self) {
    var attr = r.allocate(self._STable);
    //TODO convert to string
    attr.__name = _NAMED.name;
    attr.__type = _NAMED.type;
    //TODO convert to int
    attr.__boxTarget = _NAMED.box_target ? _NAMED.box_target : 0;
    return attr;
  };

  typeObj._STable.methodCache = new Map();
  typeObj._STable.modeFlags = constants.METHOD_CACHE_AUTHORITATIVE;

  for (var method in methods) {
    typeObj._STable.objConstructor.prototype[method] = methods[method];
    typeObj._STable.methodCache.set(method, wrapMethod(method, methods[method]));
  }

  return typeObj;
}

/* Create our KnowHOW type object. Note we don't have a HOW just yet, so
 * pass in null. */
var KnowHOW = repr.typeObjectFor(null);

addToScWithSt(KnowHOW);

var st = new STable(repr, null);

var KnowHOW_HOW = repr.allocate(st);
KnowHOW_HOW.__name = 'KnowHOW';

addToScWithSt(KnowHOW_HOW);

KnowHOW_HOW.id = 'KnowHOW_HOW';
KnowHOW._STable.id = 'KnowHOW';
KnowHOW._STable.HOW = KnowHOW_HOW;

KnowHOW._STable.methodCache = new Map();
KnowHOW._STable.modeFlags = constants.METHOD_CACHE_AUTHORITATIVE;
KnowHOW_HOW._STable.methodCache = new Map();
KnowHOW_HOW._STable.modeFlags = constants.METHOD_CACHE_AUTHORITATIVE;

function wrapMethod(name, method) {
  var codeRef = new CodeRef(name, undefined);
  codeRef.$$call = method;
  return codeRef;
}
function addKnowhowHowMethod(name, method) {
  /* TODO - think if setting the object cache would be better */

  KnowHOW_HOW._STable.objConstructor.prototype[name] = method;
  KnowHOW._STable.objConstructor.prototype[name] = method;

  var wrapped = wrapMethod(name, method);
  KnowHOW._STable.methodCache.set(name, wrapped);
  KnowHOW_HOW._STable.methodCache.set(name, wrapped);
}

addKnowhowHowMethod('name', function(ctx, _NAMED, self) {
  return self.__name;
});

addKnowhowHowMethod('attributes', function(ctx, _NAMED, self) {
  return BOOT.createArray(self.__attributes);
});

addKnowhowHowMethod('methods', function(ctx, _NAMED, self) {
  return self.__methods;
});

addKnowhowHowMethod('new_type', function(ctx, _NAMED, self) {
  /* We first create a new HOW instance. */
  var HOW = self._STable.REPR.allocate(self._STable);

  /* See if we have a representation name; if not default to P6opaque. */
  var reprName = (_NAMED && _NAMED.repr) ? _NAMED.repr : 'P6opaque';

  /* Create a new type object of the desired REPR. (Note that we can't
     * default to KnowHOWREPR here, since it doesn't know how to actually
     * store attributes, it's just for bootstrapping knowhow's. */
  var typeObject = (new reprs[reprName]).typeObjectFor(HOW);

  /* See if we were given a name; put it into the meta-object if so. */
  if (_NAMED && _NAMED.name) {
    HOW.__name = _NAMED.name;
  } else {
    HOW.__name = null;
  }

  /* Set .WHO to an empty hash. */
  typeObject._STable.WHO = new Hash();

  return typeObject;
});

addKnowhowHowMethod('add_attribute', function(ctx, _NAMED, self, type, attr) {
  self.__attributes.push(attr);
});

addKnowhowHowMethod('add_method', function(ctx, _NAMED, self, type, name, code) {
  self.__methods.content.set(name, code);
});

addKnowhowHowMethod('compose', function(ctx, _NAMED, self, typeObject) {
  /* Set method cache */
  typeObject._STable.setMethodCache(self.__methods.content);
  typeObject._STable.modeFlags = constants.METHOD_CACHE_AUTHORITATIVE;

  /* Set type check cache. */

  typeObject._STable.typeCheckCache = [typeObject];

  /* Use any attribute information to produce attribute protocol
     * data. The protocol consists of an array... */
  var reprInfo = [];

  /* ...which contains an array per MRO entry... */
  var typeInfo = [];
  reprInfo.push(BOOT.createArray(typeInfo));

  /* ...which in turn contains this type... */
  typeInfo.push(typeObject);

  /* ...then an array of hashes per attribute... */
  var attrInfoList = [];
  typeInfo.push(BOOT.createArray(attrInfoList));

  /* ...then an array of hashes per attribute... */
  for (var i = 0; i < self.__attributes.length; i++) {
    var attrInfo = new Hash();
    var attr = self.__attributes[i];
    attrInfo.content.set('name', attr.__name);
    attrInfo.content.set('type', attr.__type);
    if (attr.__boxTarget) {
      attrInfo.content.set('box_target', attr.__boxTarget);
    }
    attrInfoList.push(attrInfo);
  }

  /* ...followed by a list of parents (none). */
  var parentInfo = [];
  typeInfo.push(BOOT.createArray(parentInfo));

  /* All of this goes in a hash. */
  var reprInfoHash = new Hash();
  reprInfoHash.content.set('attribute', BOOT.createArray(reprInfo));


  /* Compose the representation using it. */
  typeObject._STable.REPR.compose(typeObject._STable, reprInfoHash);

  return typeInfo;
});


module.exports.knowhow = KnowHOW;


/* KnowHOW.HOW */
//add_to_sc_with_st(STABLE(tc->instance->KnowHOW)->HOW);

var KnowHOWAttribute = create_KnowHOWAttribute();

module.exports.knowhowattr = KnowHOWAttribute;

/* KnowHOWAttribute */
addToScWithSt(KnowHOWAttribute);

/* BOOT* */
/*add_to_sc_with_st_and_mo(BOOTArray);
add_to_sc_with_st_and_mo(BOOTHash);
add_to_sc_with_st_and_mo(BOOTIter);
add_to_sc_with_st_and_mo(BOOTInt);
add_to_sc_with_st_and_mo(BOOTNum);
add_to_sc_with_st_and_mo(BOOTStr);
add_to_sc_with_st_and_mo(BOOTCode);*/

function bootType(typeName, reprName) {
  var metaObj = KnowHOW_HOW._STable.REPR.allocate(KnowHOW_HOW._STable);
  metaObj.__name = typeName;

  var typeObj = (new reprs[reprName]).typeObjectFor(metaObj);

  //TODO?
  //typeObj.st.MethodCache = meta_obj.methods;
  //type_obj.st.ModeFlags = STable.METHOD_CACHE_AUTHORITATIVE;

  core.rootObjects.push(metaObj);
  metaObj._SC = core;

  addToScWithSt(typeObj);

  return typeObj;
}

module.exports.bootType = bootType;

module.exports.core = core;

BOOT.Array = bootType('BOOTArray', 'VMArray');
BOOT.Array._STable.setboolspec(8, Null);
BOOT.Array._STable.hllRole = 4;

BOOT.Exception = bootType('BOOTException', 'VMException');
