
var CaptureModule = (function() {
  var _scriptDir = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : undefined;
  if (typeof __filename !== 'undefined') _scriptDir = _scriptDir || __filename;
  return (
function(CaptureModule) {
  CaptureModule = CaptureModule || {};

// Copyright 2010 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof CaptureModule !== 'undefined' ? CaptureModule : {};

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)


// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
var key;
for (key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

var arguments_ = [];
var thisProgram = './this.program';
var quit_ = function(status, toThrow) {
  throw toThrow;
};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_HAS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === 'object';
ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
// A web environment like Electron.js can have Node enabled, so we must
// distinguish between Node-enabled environments and Node environments per se.
// This will allow the former to do things like mount NODEFS.
// Extended check using process.versions fixes issue #8816.
// (Also makes redundant the original check that 'require' is a function.)
ENVIRONMENT_HAS_NODE = typeof process === 'object' && typeof process.versions === 'object' && typeof process.versions.node === 'string';
ENVIRONMENT_IS_NODE = ENVIRONMENT_HAS_NODE && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;




// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var read_,
    readAsync,
    readBinary,
    setWindowTitle;

var nodeFS;
var nodePath;

if (ENVIRONMENT_IS_NODE) {
  scriptDirectory = __dirname + '/';


  read_ = function shell_read(filename, binary) {
    var ret = tryParseAsDataURI(filename);
    if (ret) {
      return binary ? ret : ret.toString();
    }
    if (!nodeFS) nodeFS = require('fs');
    if (!nodePath) nodePath = require('path');
    filename = nodePath['normalize'](filename);
    return nodeFS['readFileSync'](filename, binary ? null : 'utf8');
  };

  readBinary = function readBinary(filename) {
    var ret = read_(filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };




  if (process['argv'].length > 1) {
    thisProgram = process['argv'][1].replace(/\\/g, '/');
  }

  arguments_ = process['argv'].slice(2);

  // MODULARIZE will export the module in the proper place outside, we don't need to export here

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  process['on']('unhandledRejection', abort);

  quit_ = function(status) {
    process['exit'](status);
  };

  Module['inspect'] = function () { return '[Emscripten Module object]'; };


} else
if (ENVIRONMENT_IS_SHELL) {


  if (typeof read != 'undefined') {
    read_ = function shell_read(f) {
      var data = tryParseAsDataURI(f);
      if (data) {
        return intArrayToString(data);
      }
      return read(f);
    };
  }

  readBinary = function readBinary(f) {
    var data;
    data = tryParseAsDataURI(f);
    if (data) {
      return data;
    }
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    arguments_ = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    arguments_ = arguments;
  }

  if (typeof quit === 'function') {
    quit_ = function(status) {
      quit(status);
    };
  }

  if (typeof print !== 'undefined') {
    // Prefer to use print/printErr where they exist, as they usually work better.
    if (typeof console === 'undefined') console = {};
    console.log = print;
    console.warn = console.error = typeof printErr !== 'undefined' ? printErr : print;
  }
} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_HAS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  if (ENVIRONMENT_IS_WORKER) { // Check worker, not web, since window could be polyfilled
    scriptDirectory = self.location.href;
  } else if (document.currentScript) { // web
    scriptDirectory = document.currentScript.src;
  }
  // When MODULARIZE (and not _INSTANCE), this JS may be executed later, after document.currentScript
  // is gone, so we saved it, and we use it here instead of any other info.
  if (_scriptDir) {
    scriptDirectory = _scriptDir;
  }
  // blob urls look like blob:http://site.com/etc/etc and we cannot infer anything from them.
  // otherwise, slice off the final part of the url to find the script directory.
  // if scriptDirectory does not contain a slash, lastIndexOf will return -1,
  // and scriptDirectory will correctly be replaced with an empty string.
  if (scriptDirectory.indexOf('blob:') !== 0) {
    scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf('/')+1);
  } else {
    scriptDirectory = '';
  }


  // Differentiate the Web Worker from the Node Worker case, as reading must
  // be done differently.
  {


  read_ = function shell_read(url) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.send(null);
      return xhr.responseText;
    } catch (err) {
      var data = tryParseAsDataURI(url);
      if (data) {
        return intArrayToString(data);
      }
      throw err;
    }
  };

  if (ENVIRONMENT_IS_WORKER) {
    readBinary = function readBinary(url) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.responseType = 'arraybuffer';
        xhr.send(null);
        return new Uint8Array(xhr.response);
      } catch (err) {
        var data = tryParseAsDataURI(url);
        if (data) {
          return data;
        }
        throw err;
      }
    };
  }

  readAsync = function readAsync(url, onload, onerror) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function xhr_onload() {
      if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
        onload(xhr.response);
        return;
      }
      var data = tryParseAsDataURI(url);
      if (data) {
        onload(data.buffer);
        return;
      }
      onerror();
    };
    xhr.onerror = onerror;
    xhr.send(null);
  };




  }

  setWindowTitle = function(title) { document.title = title };
} else
{
}


// Set up the out() and err() hooks, which are how we can print to stdout or
// stderr, respectively.
var out = Module['print'] || console.log.bind(console);
var err = Module['printErr'] || console.warn.bind(console);

// Merge back in the overrides
for (key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// Free the object hierarchy contained in the overrides, this lets the GC
// reclaim data used e.g. in memoryInitializerRequest, which is a large typed array.
moduleOverrides = null;

// Emit code to handle expected values on the Module object. This applies Module.x
// to the proper local x. This has two benefits: first, we only emit it if it is
// expected to arrive, and second, by using a local everywhere else that can be
// minified.
if (Module['arguments']) arguments_ = Module['arguments'];
if (Module['thisProgram']) thisProgram = Module['thisProgram'];
if (Module['quit']) quit_ = Module['quit'];

// perform assertions in shell.js after we set up out() and err(), as otherwise if an assertion fails it cannot print the message

// TODO remove when SDL2 is fixed (also see above)



// Copyright 2017 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

// {{PREAMBLE_ADDITIONS}}

var STACK_ALIGN = 16;


function dynamicAlloc(size) {
  var ret = HEAP32[DYNAMICTOP_PTR>>2];
  var end = (ret + size + 15) & -16;
  if (end > _emscripten_get_heap_size()) {
    abort();
  }
  HEAP32[DYNAMICTOP_PTR>>2] = end;
  return ret;
}

function alignMemory(size, factor) {
  if (!factor) factor = STACK_ALIGN; // stack alignment (16-byte) by default
  return Math.ceil(size / factor) * factor;
}

function getNativeTypeSize(type) {
  switch (type) {
    case 'i1': case 'i8': return 1;
    case 'i16': return 2;
    case 'i32': return 4;
    case 'i64': return 8;
    case 'float': return 4;
    case 'double': return 8;
    default: {
      if (type[type.length-1] === '*') {
        return 4; // A pointer
      } else if (type[0] === 'i') {
        var bits = parseInt(type.substr(1));
        assert(bits % 8 === 0, 'getNativeTypeSize invalid bits ' + bits + ', type ' + type);
        return bits / 8;
      } else {
        return 0;
      }
    }
  }
}

function warnOnce(text) {
  if (!warnOnce.shown) warnOnce.shown = {};
  if (!warnOnce.shown[text]) {
    warnOnce.shown[text] = 1;
    err(text);
  }
}

var asm2wasmImports = { // special asm2wasm imports
    "f64-rem": function(x, y) {
        return x % y;
    },
    "debugger": function() {
    }
};




// Wraps a JS function as a wasm function with a given signature.
function convertJsFunctionToWasm(func, sig) {

  // If the type reflection proposal is available, use the new
  // "WebAssembly.Function" constructor.
  // Otherwise, construct a minimal wasm module importing the JS function and
  // re-exporting it.
  if (typeof WebAssembly.Function === "function") {
    var typeNames = {
      'i': 'i32',
      'j': 'i64',
      'f': 'f32',
      'd': 'f64'
    };
    var type = {
      parameters: [],
      results: sig[0] == 'v' ? [] : [typeNames[sig[0]]]
    };
    for (var i = 1; i < sig.length; ++i) {
      type.parameters.push(typeNames[sig[i]]);
    }
    return new WebAssembly.Function(type, func);
  }

  // The module is static, with the exception of the type section, which is
  // generated based on the signature passed in.
  var typeSection = [
    0x01, // id: section,
    0x00, // length: 0 (placeholder)
    0x01, // count: 1
    0x60, // form: func
  ];
  var sigRet = sig.slice(0, 1);
  var sigParam = sig.slice(1);
  var typeCodes = {
    'i': 0x7f, // i32
    'j': 0x7e, // i64
    'f': 0x7d, // f32
    'd': 0x7c, // f64
  };

  // Parameters, length + signatures
  typeSection.push(sigParam.length);
  for (var i = 0; i < sigParam.length; ++i) {
    typeSection.push(typeCodes[sigParam[i]]);
  }

  // Return values, length + signatures
  // With no multi-return in MVP, either 0 (void) or 1 (anything else)
  if (sigRet == 'v') {
    typeSection.push(0x00);
  } else {
    typeSection = typeSection.concat([0x01, typeCodes[sigRet]]);
  }

  // Write the overall length of the type section back into the section header
  // (excepting the 2 bytes for the section id and length)
  typeSection[1] = typeSection.length - 2;

  // Rest of the module is static
  var bytes = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, // magic ("\0asm")
    0x01, 0x00, 0x00, 0x00, // version: 1
  ].concat(typeSection, [
    0x02, 0x07, // import section
      // (import "e" "f" (func 0 (type 0)))
      0x01, 0x01, 0x65, 0x01, 0x66, 0x00, 0x00,
    0x07, 0x05, // export section
      // (export "f" (func 0 (type 0)))
      0x01, 0x01, 0x66, 0x00, 0x00,
  ]));

   // We can compile this wasm module synchronously because it is very small.
  // This accepts an import (at "e.f"), that it reroutes to an export (at "f")
  var module = new WebAssembly.Module(bytes);
  var instance = new WebAssembly.Instance(module, {
    'e': {
      'f': func
    }
  });
  var wrappedFunc = instance.exports['f'];
  return wrappedFunc;
}

// Add a wasm function to the table.
function addFunctionWasm(func, sig) {
  var table = wasmTable;
  var ret = table.length;

  // Grow the table
  try {
    table.grow(1);
  } catch (err) {
    if (!err instanceof RangeError) {
      throw err;
    }
    throw 'Unable to grow wasm table. Use a higher value for RESERVED_FUNCTION_POINTERS or set ALLOW_TABLE_GROWTH.';
  }

  // Insert new element
  try {
    // Attempting to call this with JS function will cause of table.set() to fail
    table.set(ret, func);
  } catch (err) {
    if (!err instanceof TypeError) {
      throw err;
    }
    assert(typeof sig !== 'undefined', 'Missing signature argument to addFunction');
    var wrapped = convertJsFunctionToWasm(func, sig);
    table.set(ret, wrapped);
  }

  return ret;
}

function removeFunctionWasm(index) {
  // TODO(sbc): Look into implementing this to allow re-using of table slots
}

// 'sig' parameter is required for the llvm backend but only when func is not
// already a WebAssembly function.
function addFunction(func, sig) {

  return addFunctionWasm(func, sig);
}

function removeFunction(index) {
  removeFunctionWasm(index);
}

var funcWrappers = {};

function getFuncWrapper(func, sig) {
  if (!func) return; // on null pointer, return undefined
  assert(sig);
  if (!funcWrappers[sig]) {
    funcWrappers[sig] = {};
  }
  var sigCache = funcWrappers[sig];
  if (!sigCache[func]) {
    // optimize away arguments usage in common cases
    if (sig.length === 1) {
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func);
      };
    } else if (sig.length === 2) {
      sigCache[func] = function dynCall_wrapper(arg) {
        return dynCall(sig, func, [arg]);
      };
    } else {
      // general case
      sigCache[func] = function dynCall_wrapper() {
        return dynCall(sig, func, Array.prototype.slice.call(arguments));
      };
    }
  }
  return sigCache[func];
}


function makeBigInt(low, high, unsigned) {
  return unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0));
}

function dynCall(sig, ptr, args) {
  if (args && args.length) {
    return Module['dynCall_' + sig].apply(null, [ptr].concat(args));
  } else {
    return Module['dynCall_' + sig].call(null, ptr);
  }
}

var tempRet0 = 0;

var setTempRet0 = function(value) {
  tempRet0 = value;
};

var getTempRet0 = function() {
  return tempRet0;
};


var Runtime = {
};

// The address globals begin at. Very low in memory, for code size and optimization opportunities.
// Above 0 is static memory, starting with globals.
// Then the stack.
// Then 'dynamic' memory for sbrk.
var GLOBAL_BASE = 1024;




// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html


var wasmBinary;if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];
var noExitRuntime;if (Module['noExitRuntime']) noExitRuntime = Module['noExitRuntime'];


if (typeof WebAssembly !== 'object') {
  err('no native wasm support detected');
}


// In MINIMAL_RUNTIME, setValue() and getValue() are only available when building with safe heap enabled, for heap safety checking.
// In traditional runtime, setValue() and getValue() are always available (although their use is highly discouraged due to perf penalties)

/** @type {function(number, number, string, boolean=)} */
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}

/** @type {function(number, string, boolean=)} */
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for getValue: ' + type);
    }
  return null;
}





// Wasm globals

var wasmMemory;

// In fastcomp asm.js, we don't need a wasm Table at all.
// In the wasm backend, we polyfill the WebAssembly object,
// so this creates a (non-native-wasm) table for us.
var wasmTable = new WebAssembly.Table({
  'initial': 41,
  'maximum': 41 + 0,
  'element': 'anyfunc'
});


//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS = 0;

/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  assert(func, 'Cannot call unknown function ' + ident + ', make sure it is exported');
  return func;
}

// C calling interface.
function ccall(ident, returnType, argTypes, args, opts) {
  // For fast lookup of conversion functions
  var toC = {
    'string': function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        var len = (str.length << 2) + 1;
        ret = stackAlloc(len);
        stringToUTF8(str, ret, len);
      }
      return ret;
    },
    'array': function(arr) {
      var ret = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    }
  };

  function convertReturnValue(ret) {
    if (returnType === 'string') return UTF8ToString(ret);
    if (returnType === 'boolean') return Boolean(ret);
    return ret;
  }

  var func = getCFunc(ident);
  var cArgs = [];
  var stack = 0;
  if (args) {
    for (var i = 0; i < args.length; i++) {
      var converter = toC[argTypes[i]];
      if (converter) {
        if (stack === 0) stack = stackSave();
        cArgs[i] = converter(args[i]);
      } else {
        cArgs[i] = args[i];
      }
    }
  }
  var ret = func.apply(null, cArgs);

  ret = convertReturnValue(ret);
  if (stack !== 0) stackRestore(stack);
  return ret;
}

function cwrap(ident, returnType, argTypes, opts) {
  argTypes = argTypes || [];
  // When the function takes numbers and returns a number, we can just return
  // the original function
  var numericArgs = argTypes.every(function(type){ return type === 'number'});
  var numericRet = returnType !== 'string';
  if (numericRet && numericArgs && !opts) {
    return getCFunc(ident);
  }
  return function() {
    return ccall(ident, returnType, argTypes, arguments, opts);
  }
}

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_DYNAMIC = 2; // Cannot be freed except through sbrk
var ALLOC_NONE = 3; // Do not allocate

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
/** @type {function((TypedArray|Array<number>|number), string, number, number=)} */
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc,
    stackAlloc,
    dynamicAlloc][allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var stop;
    ptr = ret;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(/** @type {!Uint8Array} */ (slab), ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!runtimeInitialized) return dynamicAlloc(size);
  return _malloc(size);
}




/** @type {function(number, number=)} */
function Pointer_stringify(ptr, length) {
  abort("this function has been removed - you should use UTF8ToString(ptr, maxBytesToRead) instead!");
}

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAPU8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}


// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;

/**
 * @param {number} idx
 * @param {number=} maxBytesToRead
 * @return {string}
 */
function UTF8ArrayToString(u8Array, idx, maxBytesToRead) {
  var endIdx = idx + maxBytesToRead;
  var endPtr = idx;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  // (As a tiny code save trick, compare endPtr against endIdx using a negation, so that undefined means Infinity)
  while (u8Array[endPtr] && !(endPtr >= endIdx)) ++endPtr;

  if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
    return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
  } else {
    var str = '';
    // If building with TextDecoder, we have already computed the string length above, so test loop end condition against that
    while (idx < endPtr) {
      // For UTF8 byte structure, see:
      // http://en.wikipedia.org/wiki/UTF-8#Description
      // https://www.ietf.org/rfc/rfc2279.txt
      // https://tools.ietf.org/html/rfc3629
      var u0 = u8Array[idx++];
      if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
      var u1 = u8Array[idx++] & 63;
      if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
      var u2 = u8Array[idx++] & 63;
      if ((u0 & 0xF0) == 0xE0) {
        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
      } else {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (u8Array[idx++] & 63);
      }

      if (u0 < 0x10000) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 0x10000;
        str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
      }
    }
  }
  return str;
}

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns a
// copy of that string as a Javascript String object.
// maxBytesToRead: an optional length that specifies the maximum number of bytes to read. You can omit
//                 this parameter to scan the string until the first \0 byte. If maxBytesToRead is
//                 passed, and the string at [ptr, ptr+maxBytesToReadr[ contains a null byte in the
//                 middle, then the string will cut short at that byte index (i.e. maxBytesToRead will
//                 not produce a string of exact length [ptr, ptr+maxBytesToRead[)
//                 N.B. mixing frequent uses of UTF8ToString() with and without maxBytesToRead may
//                 throw JS JIT optimizations off, so it is worth to consider consistently using one
//                 style or the other.
/**
 * @param {number} ptr
 * @param {number=} maxBytesToRead
 * @return {string}
 */
function UTF8ToString(ptr, maxBytesToRead) {
  return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
}

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array.
//                    This count should include the null terminator,
//                    i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) {
      var u1 = str.charCodeAt(++i);
      u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
    }
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8 to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.
function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) ++len;
    else if (u <= 0x7FF) len += 2;
    else if (u <= 0xFFFF) len += 3;
    else len += 4;
  }
  return len;
}


// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
function UTF16ToString(ptr) {
  var endPtr = ptr;
  // TextDecoder needs to know the byte length in advance, it doesn't stop on null terminator by itself.
  // Also, use the length info to avoid running tiny strings through TextDecoder, since .subarray() allocates garbage.
  var idx = endPtr >> 1;
  while (HEAP16[idx]) ++idx;
  endPtr = idx << 1;

  if (endPtr - ptr > 32 && UTF16Decoder) {
    return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
  } else {
    var i = 0;

    var str = '';
    while (1) {
      var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
      if (codeUnit == 0) return str;
      ++i;
      // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
      str += String.fromCharCode(codeUnit);
    }
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}

function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}

// Allocate heap space for a JS string, and write it there.
// It is the responsibility of the caller to free() that memory.
function allocateUTF8(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = _malloc(size);
  if (ret) stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

// Allocate stack space for a JS string, and write it there.
function allocateUTF8OnStack(str) {
  var size = lengthBytesUTF8(str) + 1;
  var ret = stackAlloc(size);
  stringToUTF8Array(str, HEAP8, ret, size);
  return ret;
}

// Deprecated: This function should not be called because it is unsafe and does not provide
// a maximum length limit of how many bytes it is allowed to write. Prefer calling the
// function stringToUTF8Array() instead, which takes in a maximum length that can be used
// to be secure from out of bounds writes.
/** @deprecated */
function writeStringToMemory(string, buffer, dontAddNull) {
  warnOnce('writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!');

  var /** @type {number} */ lastChar, /** @type {number} */ end;
  if (dontAddNull) {
    // stringToUTF8Array always appends null. If we don't want to do that, remember the
    // character that existed at the location where the null will be placed, and restore
    // that after the write (below).
    end = buffer + lengthBytesUTF8(string);
    lastChar = HEAP8[end];
  }
  stringToUTF8(string, buffer, Infinity);
  if (dontAddNull) HEAP8[end] = lastChar; // Restore the value under the null character.
}

function writeArrayToMemory(array, buffer) {
  HEAP8.set(array, buffer);
}

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}




// Memory management

var PAGE_SIZE = 16384;
var WASM_PAGE_SIZE = 65536;
var ASMJS_PAGE_SIZE = 16777216;

function alignUp(x, multiple) {
  if (x % multiple > 0) {
    x += multiple - (x % multiple);
  }
  return x;
}

var HEAP,
/** @type {ArrayBuffer} */
  buffer,
/** @type {Int8Array} */
  HEAP8,
/** @type {Uint8Array} */
  HEAPU8,
/** @type {Int16Array} */
  HEAP16,
/** @type {Uint16Array} */
  HEAPU16,
/** @type {Int32Array} */
  HEAP32,
/** @type {Uint32Array} */
  HEAPU32,
/** @type {Float32Array} */
  HEAPF32,
/** @type {Float64Array} */
  HEAPF64;

function updateGlobalBufferAndViews(buf) {
  buffer = buf;
  Module['HEAP8'] = HEAP8 = new Int8Array(buf);
  Module['HEAP16'] = HEAP16 = new Int16Array(buf);
  Module['HEAP32'] = HEAP32 = new Int32Array(buf);
  Module['HEAPU8'] = HEAPU8 = new Uint8Array(buf);
  Module['HEAPU16'] = HEAPU16 = new Uint16Array(buf);
  Module['HEAPU32'] = HEAPU32 = new Uint32Array(buf);
  Module['HEAPF32'] = HEAPF32 = new Float32Array(buf);
  Module['HEAPF64'] = HEAPF64 = new Float64Array(buf);
}

var STATIC_BASE = 1024,
    STACK_BASE = 5250032,
    STACKTOP = STACK_BASE,
    STACK_MAX = 7152,
    DYNAMIC_BASE = 5250032,
    DYNAMICTOP_PTR = 6992;




var TOTAL_STACK = 5242880;

var INITIAL_TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;







// In standalone mode, the wasm creates the memory, and the user can't provide it.
// In non-standalone/normal mode, we create the memory here.

// Create the main memory. (Note: this isn't used in STANDALONE_WASM mode since the wasm
// memory is created in the wasm, not in JS.)

  if (Module['wasmMemory']) {
    wasmMemory = Module['wasmMemory'];
  } else
  {
    wasmMemory = new WebAssembly.Memory({
      'initial': INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE
      ,
      'maximum': INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE
    });
  }


if (wasmMemory) {
  buffer = wasmMemory.buffer;
}

// If the user provides an incorrect length, just use that length instead rather than providing the user to
// specifically provide the memory length with Module['TOTAL_MEMORY'].
INITIAL_TOTAL_MEMORY = buffer.byteLength;
updateGlobalBufferAndViews(buffer);

HEAP32[DYNAMICTOP_PTR>>2] = DYNAMIC_BASE;










function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Module['dynCall_v'](func);
      } else {
        Module['dynCall_vi'](func, callback.arg);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the main() is called

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {

  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
  runtimeInitialized = true;
  
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  runtimeExited = true;
}

function postRun() {

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }

  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}

function addOnExit(cb) {
}

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}



var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_round = Math.round;
var Math_min = Math.min;
var Math_max = Math.max;
var Math_clz32 = Math.clz32;
var Math_trunc = Math.trunc;



// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// Module.preRun (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function getUniqueRunDependency(id) {
  return id;
}

function addRunDependency(id) {
  runDependencies++;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

}

function removeRunDependency(id) {
  runDependencies--;

  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }

  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data


function abort(what) {
  if (Module['onAbort']) {
    Module['onAbort'](what);
  }

  what += '';
  out(what);
  err(what);

  ABORT = true;
  EXITSTATUS = 1;

  what = 'abort(' + what + '). Build with -s ASSERTIONS=1 for more info.';

  // Throw a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  throw new WebAssembly.RuntimeError(what);
}


var memoryInitializer = null;







// Copyright 2017 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

// Prefix of data URIs emitted by SINGLE_FILE and related options.
var dataURIPrefix = 'data:application/octet-stream;base64,';

// Indicates whether filename is a base64 data URI.
function isDataURI(filename) {
  return String.prototype.startsWith ?
      filename.startsWith(dataURIPrefix) :
      filename.indexOf(dataURIPrefix) === 0;
}




var wasmBinaryFile = 'data:application/octet-stream;base64,AGFzbQEAAAABhgETYAF/AGABfwF/YAJ/fwBgAn9/AX9gA39/fwBgBH9/f38AYAN/f38Bf2AFf39/f38AYAZ/f39/f38AYAAAYAJ/fwF9YAABf2AEf39/fwF/YAd/f39/f39/AGAIf39/f39/f38AYA1/f39/f39/f39/f39/AGABfwF9YAN/f38BfWACf38BfALVBBYDZW52DV9fYXNzZXJ0X2ZhaWwABQNlbnYTX2VtdmFsX3NldF9wcm9wZXJ0eQAEA2VudhhfX2N4YV9hbGxvY2F0ZV9leGNlcHRpb24AAQNlbnYLX19jeGFfdGhyb3cABANlbnYRX2VtdmFsX3Rha2VfdmFsdWUAAwNlbnYNX2VtdmFsX2RlY3JlZgAAA2VudhZfZW1iaW5kX3JlZ2lzdGVyX2NsYXNzAA8DZW52Il9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY29uc3RydWN0b3IACANlbnYfX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19mdW5jdGlvbgAOA2VudgVhYm9ydAAJA2VudhVfZW1iaW5kX3JlZ2lzdGVyX3ZvaWQAAgNlbnYVX2VtYmluZF9yZWdpc3Rlcl9ib29sAAcDZW52G19lbWJpbmRfcmVnaXN0ZXJfc3RkX3N0cmluZwACA2VudhxfZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nAAQDZW52Fl9lbWJpbmRfcmVnaXN0ZXJfZW12YWwAAgNlbnYYX2VtYmluZF9yZWdpc3Rlcl9pbnRlZ2VyAAcDZW52Fl9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQABANlbnYcX2VtYmluZF9yZWdpc3Rlcl9tZW1vcnlfdmlldwAEA2VudhZlbXNjcmlwdGVuX3Jlc2l6ZV9oZWFwAAEDZW52FWVtc2NyaXB0ZW5fbWVtY3B5X2JpZwAGA2VudgZtZW1vcnkCAYACgAIDZW52BXRhYmxlAXAAKQPUAdIBCQMFBgECBgEDBAABAgMEAwMAAwAAAQEBAgAAAAQJBQEBAQMMBQACAgICBAQEAgMAAgECAQIAAxIKChAECgoRAgEEBAYGBgMDAgQABAIBAwIEBAABBAICBQUCBAMMBAICAgEFAgIDAwMAAgIBBgMABQkBAAEJAAAAAwcBAwQBAQACCwsBAQEAAAADBgYGAwQFBQUFAwYDAwUEBwgHBwcICAgBAQkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEAAwMCAQYABAILAQABAwIHBAYIBQwNBg8CfwFB0LbAAgt/AEHMNgsH/wIWEV9fd2FzbV9jYWxsX2N0b3JzABQEZnJlZQDQAQZtYWxsb2MAzwEQX19lcnJub19sb2NhdGlvbgCVAQhzZXRUaHJldwDYARlfWlN0MTh1bmNhdWdodF9leGNlcHRpb252AJYBDV9fZ2V0VHlwZU5hbWUAtgEqX19lbWJpbmRfcmVnaXN0ZXJfbmF0aXZlX2FuZF9idWlsdGluX3R5cGVzALcBCl9fZGF0YV9lbmQDAQlzdGFja1NhdmUA2QEKc3RhY2tBbGxvYwDaAQxzdGFja1Jlc3RvcmUA2wEQX19ncm93V2FzbU1lbW9yeQDcAQpkeW5DYWxsX2lpAN0BCmR5bkNhbGxfdmkA3gENZHluQ2FsbF92aWlpaQDfAQtkeW5DYWxsX3ZpaQDgAQtkeW5DYWxsX2lpaQDhAQ5keW5DYWxsX3ZpaWlpaQDiAQxkeW5DYWxsX3ZpaWkA4wEMZHluQ2FsbF9paWlpAOQBD2R5bkNhbGxfdmlpaWlpaQDlAQlHAQBBAQsoG5kBhQGGAYcBFh8gjAGNAY8BkAEtmAEtlwGbAVScARstSUmeAS2gAbQBsQGjAS2zAbABpAEtsgGtAaYBLagBzgEK8rwB0gEgAQF/IwBBEGsiACQAIABBEGokABCEAUHQMkEoEQEAGgtNAQF8IAACfyABt0QAAAAAAIBBQKJEAAAAAABAj0CjIgKZRAAAAAAAAOBBYwRAIAKqDAELQYCAgIB4CxBcIABBMGoQLyAAIAE2AjggAAujAgEEfyMAQfAAayIEJAAgBCADNgJoIAQgAjYCbAJ/IARB2ABqIgUiAkEANgIIIAJCADcCACACCyAEKAJoIAQoAmwQMCAEKAJoIgcEQCAEKAJsIQMDQEEAIQIgAwR/A0AgASADIAZsIAJqQQJ0aigCACEDIAUgBiACEBcgAzYCACACQQFqIgIgBCgCbCIDSQ0ACyAEKAJoIQcgAwVBAAshAyAGQQFqIgYgB0kNAAsLIAQgBRAYNgIAIARBCGogBBAZIwBBEGsiASQAIARBLGogBEEIahA7IAFBEGokACAAAn8gBEEoaiEAIARB0ABqIgEiAhAvIAIgABA8IAIgABA9IAELEGAgARAeIAUoAgggBSgCBGwaIAUoAgAQLiAEQfAAaiQAC0AAAkACQCABQQBIDQAgAkEASCAAKAIEIAFMcg0AIAAoAgggAkoNAQtB+g1Brw5B7wJBmA8QAAALIAAgASACEBoLJAEBfyMAQRBrIgEkACABQQhqIAAQHCgCACEAIAFBEGokACAAC0oBAn8jAEEQayICJAAjAEEQayIDJAAgAiABKAIANgIIIANBEGokACACIAEoAgAoAgiyOAIEIAAgAkEIaiACQQRqEB0gAkEQaiQAC0QBAn8jAEEQayIDJAAgACgCACEEIAMgACgCBDYCDCADIAQ2AgggAygCCCACIAMoAgxsIAFqQQJ0aiEAIANBEGokACAACwQAIAALCwAgACABNgIAIAALMgEBfyMAQSBrIgMkACAAIAEgA0EQaiABEDVBASADQQhqIAIQNhA3IAMQOCADQSBqJAALDwAgACgCBBogACgCABAuCwcAIAAoAjgL4wECBX8BfCMAQRBrIgIkACAAQTBqIgMiBCgCAAJ/IAAoAji3RAAAAAAAgEFAokQAAAAAAECPQKMiB5lEAAAAAAAA4EFjBEAgB6oMAQtBgICAgHgLIgUgBCgCBBBXIQYgBCAFNgIEIAQgBjYCACAAIAMQaiACQQA2AgwCQCADKAIEQQFIDQAgASACQQxqIANBABAhECIgAiACKAIMQQFqIgA2AgwgACADKAIETg0AA0AgASACQQxqIAMgAigCDBAhECIgAiACKAIMQQFqIgA2AgwgACADKAIESA0ACwsgAkEQaiQACywAAkAgAUEATgRAIAAoAgQgAUoNAQtBzxtBrw5BqwNBmA8QAAALIAAgARAmCzwBAX8jAEEQayIDJAAgACgCACADQQhqIAEQIyIAKAIAIAMgAhAkIgEoAgAQASABECUgABAlIANBEGokAAspAQF/IwBBEGsiAiQAIABBmCQgAkEIaiABEFoQBDYCACACQRBqJAAgAAspAQF/IwBBEGsiAiQAIABB1CQgAkEIaiABEFsQBDYCACACQRBqJAAgAAsJACAAKAIAEAULJQEBfyMAQRBrIgIkACACQQhqIAAQQiABEEohACACQRBqJAAgAAsyACAAKAIAGiAAKAIAIAAQK0EDdGoaIAAoAgAgABApQQN0ahogACgCACAAECtBA3RqGgsrAQF/IAAoAgAEQCAAIAAoAgAQLCAAECoaIAAoAgAhASAAECsaIAEQ0AELCxAAIAAoAgQgACgCAGtBA3ULBwAgAEEIagsSACAAECooAgAgACgCAGtBA3ULKwEBfyAAKAIEIQIDQCABIAJHBEAgABAqGiACQXhqIQIMAQsLIAAgATYCBAsHACAAENABCxIAIAAEQCAAQXxqKAIAENABCwsJACAAQgA3AgALRgAgASACckF/SgRAAkAgAUUgAkVyDQBB/////wcgAm0gAU4NABAxCyAAIAEgAmwgASACEDIPC0GACEGPC0GdAkH4CxAAAAshAQJ/QQQQAiIAIgEQkwEgAUHUHjYCACAAQawfQQEQAwALVQAgASAAKAIIIAAoAgRsRwRAIAAoAgAQLiAAIAFBAUgEf0EABSABBH8gAUGAgICABE8EQBAxCyABQQJ0EDMFQQALCzYCAAsgACADNgIIIAAgAjYCBAsWAQF/IAAQNCIBIABFckUEQBAxCyABCykBAX8gAEEQahDPASIARQRAQQAPCyAAQXBxQRBqIgFBfGogADYCACABCwoAIAAoAgAoAgQLDgAgACABKAIANgIAIAALPAAgACABEBwaIAIQOSAAQQhqIAMQNhogAkEBRkEAIAEgAnJBf0obRQRAQaMPQbgQQcoAQaAREAAACyAACzEAIABBBGogARA2GiAAQQxqIAIQOiABEDUgAigCAEcEQEG5EkHyEkH0AEHZExAAAAsLGQAgAEEBRwRAQa8RQb0RQYIBQaUSEAAACwsZACAAIAEoAgA2AgAgAEEIaiABQQhqEDYaCxsAIABBBGogAUEEahA2GiAAQQxqIAFBDGoQOgtJAQF/IAEoAhAiAkVB/////wcgAk5yRQRAEDELIAEoAhAhAiABKAIQQQFGQQFyRQRAQecTQY8LQfYCQY4UEAAACyAAIAJBARA+Cx8BAX8jAEEQayICJAAgACABIAJBCGoQQCACQRBqJAALKgAgAUEATkEAIAJBAUYbRQRAQYAIQY8LQZ0CQfgLEAAACyAAIAEgARA/C0gAIAEgACgCBEcEQCAAKAIAEC4gACABQQFIBH9BAAUgAQR/IAFBgICAgAJPBEAQMQsgAUEDdBAzBUEACws2AgALIAAgAjYCBAtxAQR/IwBBMGsiAyQAIANBIGoiBSIEIAEQRSIGEEUQRiAEQQhqIAYQR0EIahA2GiAAIAEQQQJ/IANBCGohASADQRhqIAAQQiEEIAEgADYCDCABIAI2AgggASAFNgIEIAEgBDYCACABCxBDIANBMGokAAs0ACABKAIQIgEgACgCBEcEQCAAIAFBARA+CyABIAAoAgRHBEBBmRRByBRB6wVBsRUQAAALCw0AIAAgASgCABBIIAALKQECfyAAKAIMKAIEIgJBAEoEQANAIAAgARBEIAFBAWoiASACRw0ACwsLPQECfyMAQRBrIgIkACAAKAIIGiAAKAIAIAEQSiEDIAIgACgCBCABEEs5AwggAyACKQMINwMAIAJBEGokAAsHACAAQQRqCywBAX8jAEEQayICJAAgACACQQhqIAEQNiIAKAIANgIAIAAQRRogAkEQaiQACwcAIABBDGoLIgEBfyMAQRBrIgIkACACQQA2AgwgACABNgIAIAJBEGokAAsDAAELDQAgACgCACABQQN0agsrAgF/AXwjAEEQayICJAAgAiAAIAEQTDgCDCACKgIMuyEDIAJBEGokACADCzoCAX8BfSMAQRBrIgIkACACIAAgARBNOAIMIAIgACoCCDgCCCACKgIMIAIqAgiVIQMgAkEQaiQAIAMLKQIBfwF9IwBBIGsiAiQAIAIgACgCACABEE8gAhBOIQMgAkEgaiQAIAMLNAIBfwF9IwBBEGsiASQAAn1DAAAAACAAKAIIRQ0AGiAAIAFBCGoQUAshAiABQRBqJAAgAgsuACAAIAEgAhBVAkAgAkEATgRAIAEoAgQgAkoNAQtBsBdB1xhB+gBBthkQAAALC0cBAX0jAEEQayIBJAAgACgCCEEATARAQcMVQYcWQZsDQeYWEAAACwJ/IAEgABBTIAAoAgAaIAELIAAQUSECIAFBEGokACACC4UBAgJ/AX0jAEEQayICJAAgASgCCEEASgRAIAIgAEEAQQAQUjgCDCABKAIIQQJOBEBBASEDA0AgAiAAQQAgAxBSOAIIIAIgAioCDCACKgIIkjgCDCADQQFqIgMgASgCCEgNAAsLIAIqAgwhBCACQRBqJAAgBA8LQewWQYcWQcgBQawXEAAACxkAIAAoAgAgASAAKAIEIAJsakECdGoqAgALIwAgACABKAIANgIAIABBBGogASgCDCgCBBAcGiABKAIYEDkLBwAgACgCBAs+ACAAIAEoAgAgAkECdGogASgCCBBWIAAgATYCDCAAQRBqIAIQHBogAEEUakEAEBwaIAAoAgwaIABBATYCGAs4ACAAIAE2AgBBARA5IABBCGogAhAcGiABRUEBQQAgAkF/ShtyRQRAQbwZQeYaQbABQccbEAAACwssACABQYCAgIACTwRAEDELIAJBgICAgAJPBEAQMQsgACABQQN0IAJBA3QQWAs0AQF/IwBBEGsiAyQAIAMgAjYCDCAAIAEgAygCDBBZIgAgAUVyRQRAEDELIANBEGokACAAC1cBAX8gAEUEQCABEDQPCyAAQXxqKAIAIgMgAUEQahDRASICRQRAQQAPCyACIAAgA2tqIgMgAkEQakFwcSIARwRAIAAgAyABENcBCyAAQXxqIAI2AgAgAAs3AQF/IwBBEGsiAiQAIAIgADYCDCACKAIMIAEoAgA2AgAgAiACKAIMQQhqNgIMIAJBEGokACAACzcBAX8jAEEQayICJAAgAiAANgIMIAIoAgwgASsDADkDACACIAIoAgxBCGo2AgwgAkEQaiQAIAALWQECfyMAQRBrIgIkACAAQQA2AgQgACABNgIAIABBCGoiAxBeIABCADcCFCAAQQA2AiwgAEIANwIkIABCADcCHCACQgA3AwggAyABIAJBCGoQXSACQRBqJAALQwEBfyAAECkiAyABSQRAIAAgASADayACEF8PCyADIAFLBEAgACgCACABQQN0aiEBIAAQKSECIAAgARAsIAAgAhBzCwsuAQF/IwBBEGsiASQAIABCADcCACABQQA2AgwgAEEIaiABQQxqEG0gAUEQaiQAC5QBAQJ/IwBBIGsiBCQAAkAgABAqKAIAIAAoAgRrQQN1IAFPBEAgACABIAIQbgwBCyAAECohAyAEQQhqIAAgABApIAFqEG8gABApIAMQcCIDIAEgAhBxIAAgAxByIAMgAygCBBB9IAMoAgAEQCADKAIQGiADKAIAIQAgAxBHKAIAIAMoAgBrGiAAENABCwsgBEEgaiQAC88BAQd/IwBBMGsiAiQAIAJBKGogAEEUahAcIQYgASgCBCEEIAAoAgQhAyAAKAIAIQcgAiAAQQhqIggQYTYCGCACQRhqIAAoAgQQYiEFAkAgBCAHIANrIgNMBEAgAkEgaiABEGMgAkEgaiAEIAUQZAwBCyACQRBqIAEQYyACQRhqIAJBEGogAxBlIAJBCGogARBjIAJBCGogAyAFEGQgAiACQRhqEDYgBCADayAIEGEQZAsgACAAKAIEIARqIAAoAgBvNgIEIAYQZiACQTBqJAALCQAgACgCABBnCzcBAX8jAEEQayICJAAgAiAAKAIANgIIIAIgAigCCCABQQN0ajYCCCACKAIIIQAgAkEQaiQAIAALCAAgACABEGkLLwECfyMAQRBrIgMkACADQQhqIAAQNiEEIAMgACABEGUgBCADIAIQaCADQRBqJAALGAAgACABEDYiACAAKAIAIAJBA3RqNgIACwgAIAAoAgAaCyQBAX8jAEEQayIBJAAgAUEIaiAAEBwoAgAhACABQRBqJAAgAAtQAQF/IwBBMGsiAyQAIANBIGogA0EYaiAAEDYQfiADQRBqIANBCGogARA2EH4gA0EoaiADQSBqIANBEGogAhB/EIABEBwoAgAaIANBMGokAAsQAEEBEDkgACABKAIANgIAC9wBAQZ/IwBBMGsiAiQAIAJBKGogAEEUahAcIQYgASgCBCEDIAAoAgAhBCAAKAIEIQUgAiAAQQhqIgcQYTYCGCACQRhqIAUgA2sgBCADIARtQQFqbGogBG8iABBiIQUCQCADIAQgAGsiAEwEQCACQSBqIAEQaSACQRhqIAUgAyACQSBqEGsMAQsgAkEQaiABEGkgAkEYaiACQRBqIAAQZSACQQhqIAEQaSACQRBqIAUgACACQQhqEGsgAkEQaiAHEGEgAyAAayACIAJBGGoQNhBrCyAGEGYgAkEwaiQACzABAX8jAEEQayIEJAAgBCABNgIIIAAgASAEQQhqIAIQYiAEIAMQNhBsIARBEGokAAs7AQF/IwBBEGsiBCQAIAEQfyEBIAIQfyECIARBCGogBCADEDYQfiAAIAEgAiAEQQhqEIMBIARBEGokAAsJACAAQQA2AgALOwEBfyMAQRBrIgMkACAAECoaA0AgACgCBCACEHQgACAAKAIEQQhqNgIEIAFBf2oiAQ0ACyADQRBqJAALWgECfyMAQRBrIgIkACACIAE2AgwgABB1IgMgAU8EQCAAECsiACADQQF2SQRAIAIgAEEBdDYCCCACQQhqIAJBDGoQeSgCACEDCyACQRBqJAAgAw8LQbMeEHwAC4UBAQJ/IwBBEGsiBCQAIARBADYCDCAAQQxqIARBDGoQbSAAIAM2AhAgAQRAIAAoAhAaQf////8BIAEiA0kEQEHsGxB8AAsgA0EDdBCRASEFCyAAIAU2AgAgACAFIAJBA3RqIgI2AgggACACNgIEIAAQRyAFIAFBA3RqNgIAIARBEGokACAACzIBAX8gACgCEBogACgCCCEDA0AgAyACEHQgACAAKAIIQQhqIgM2AgggAUF/aiIBDQALC08BAn8gABAnIAAQKiAAKAIAIABBBGoiAigCACABQQRqIgMQdiAAIAMQdyACIAFBCGoQdyAAECogARBHEHcgASABKAIENgIAIAAgABApEHgLKgAgACgCABogACgCACAAECtBA3RqGiAAKAIAGiAAKAIAIAAQKUEDdGoaCwwAIAAgASkDADcDAAtCAQF/IwBBEGsiASQAIAAQKhogAUH/////ATYCDCABQf////8HNgIIIAFBDGogAUEIahB6KAIAIQAgAUEQaiQAIAALKAAgAyADKAIAIAIgAWsiAGsiAjYCACAAQQFOBEAgAiABIAAQ1QEaCws1AQF/IwBBEGsiAiQAIAIgACgCADYCDCAAIAEoAgA2AgAgASACQQxqKAIANgIAIAJBEGokAAsqACAAKAIAGiAAKAIAIAAQK0EDdGoaIAAoAgAgABArQQN0ahogACgCABoLIwECfyMAQRBrIgIkACAAIAEQeyEDIAJBEGokACABIAAgAxsLIwECfyMAQRBrIgIkACABIAAQeyEDIAJBEGokACABIAAgAxsLDQAgACgCACABKAIASQs1AQN/QQgQAiICIgMiARCTASABQcAfNgIAIAFBBGogABCUASADQfAfNgIAIAJBkCBBAhADAAslAANAIAEgACgCCEcEQCAAKAIQGiAAIAAoAghBeGo2AggMAQsLCwkAIAAgARA2GgskAQF/IwBBEGsiASQAIAEgADYCCCABKAIIIQAgAUEQaiQAIAALMwAgACABEIEBBEADQCACIAAoAgApAwA3AwAgABCCASACQQhqIQIgACABEIEBDQALCyACCw0AIAAoAgAgASgCAEcLDwAgACAAKAIAQQhqNgIACzIAIAEgAkcEQANAIAMoAgAgASkDADcDACADEIIBIAFBCGoiASACRw0ACwsgACADEDYaC5gBAQF/IwBBIGsiACQAQfAcQYgdQawdQQBBvB1BA0G/HUEAQb8dQQBBsRxBwR1BBBAGEIgBIABBADYCHCAAQQY2AhggACAAKQMYNwMQIABBEGoQiQEgAEEANgIcIABBBzYCGCAAIAApAxg3AwggAEEIahCKASAAQQA2AhwgAEEINgIYIAAgACkDGDcDACAAEIsBIABBIGokAAsFAEHwHAslAQF/IAAEQAJ/IABBMGoQHiAAQQhqIgEQJyABECggAAsQ0AELCw4AQTwQkQEgACgCABAVCyUBAX8jAEEQayIAJABB8BxBAkHEHUHMHUEJQQUQByAAQRBqJAALOgEBfyMAQRBrIgEkACABIAApAgA3AwhB8BxBvhxBBUHQHUHkHUEKIAFBCGoQjgFBABAIIAFBEGokAAs6AQF/IwBBEGsiASQAIAEgACkCADcDCEHwHEHGHEECQewdQcwdQQsgAUEIahCOAUEAEAggAUEQaiQACzoBAX8jAEEQayIBJAAgASAAKQIANwMIQfAcQdQcQQNB9B1BnB5BDCABQQhqEI4BQQAQCCABQRBqJAALKQEBfyMAQRBrIgIkACACIAE2AgwgAkEMaiAAEQEAIQAgAkEQaiQAIAALOwEBfyAAKAIEIgVBAXUgAWohASAAKAIAIQAgASACIAMgBCAFQQFxBH8gASgCACAAaigCAAUgAAsRBQALFQEBf0EIEJEBIgEgACkCADcDACABC1EBAn8jAEEQayICJAAgACgCACEDIAIgACgCBCIAQQF1IAFqIgEgAEEBcQR/IAEoAgAgA2ooAgAFIAMLEQEANgIMIAIoAgwhACACQRBqJAAgAAtcAQJ/IwBBEGsiAyQAIAAoAgQiBEEBdSABaiEBIAAoAgAhACAEQQFxBEAgASgCACAAaigCACEACyADQQhqIAIQHBogASADQQhqIAARAgAgA0EIahAlIANBEGokAAswAQJ/IABBASAAGyEAA0ACQCAAEM8BIgENAEHMMigCACICRQ0AIAIRCQAMAQsLIAELjwEBA38gACEBAkACQCAAQQNxRQ0AIAAtAABFBEAMAgsDQCABQQFqIgFBA3FFDQEgAS0AAA0ACwwBCwNAIAEiAkEEaiEBIAIoAgAiA0F/cyADQf/9+3dqcUGAgYKEeHFFDQALIANB/wFxRQRAIAIhAQwBCwNAIAItAAEhAyACQQFqIgEhAiADDQALCyABIABrCwoAIABB+B42AgALOQECfyABEJIBIgJBDWoQkQEiA0EANgIIIAMgAjYCBCADIAI2AgAgACADEEcgASACQQFqENUBNgIACwUAQcgyCwQAQQALBQBBuh4LBQBB4B4LFAAgAEHAHzYCACAAQQRqEJoBIAALLAEBfwJAIAAoAgBBdGoiACIBIAEoAghBf2oiATYCCCABQX9KDQAgABDQAQsLCgAgABCZARDQAQsNACAAEJkBGiAAENABC0oBAn8CQCAALQAAIgJFIAIgAS0AACIDR3INAANAIAEtAAEhAyAALQABIgJFDQEgAUEBaiEBIABBAWohACACIANGDQALCyACIANrCwsAIAAgAUEAEJ8BCxwAIAJFBEAgACABRg8LIAAoAgQgASgCBBCdAUULmgEBAn8jAEFAaiIDJABBASEEAkAgACABQQAQnwENAEEAIQQgAUUNACABQYghEKEBIgFFDQAgA0F/NgIUIAMgADYCECADQQA2AgwgAyABNgIIIANBGGoQ1gEgA0EBNgI4IAEgA0EIaiACKAIAQQEgASgCACgCHBEFACADKAIgQQFHDQAgAiADKAIYNgIAQQEhBAsgA0FAayQAIAQLnwIBBH8jAEFAaiICJAAgACgCACIDQXhqKAIAIQUgA0F8aigCACEDIAJBADYCFCACQdggNgIQIAIgADYCDCACIAE2AgggAkEYahDWASAAIAVqIQACQCADIAFBABCfAQRAIAJBATYCOCADIAJBCGogACAAQQFBACADKAIAKAIUEQgAIABBACACKAIgQQFGGyEEDAELIAMgAkEIaiAAQQFBACADKAIAKAIYEQcAIAIoAiwiAEEBSw0AIABBAWsEQCACKAIcQQAgAigCKEEBRhtBACACKAIkQQFGG0EAIAIoAjBBAUYbIQQMAQsgAigCIEEBRwRAIAIoAjANASACKAIkQQFHDQEgAigCKEEBRw0BCyACKAIYIQQLIAJBQGskACAEC10BAX8gACgCECIDRQRAIABBATYCJCAAIAI2AhggACABNgIQDwsCQCABIANGBEAgACgCGEECRw0BIAAgAjYCGA8LIABBAToANiAAQQI2AhggACAAKAIkQQFqNgIkCwsaACAAIAEoAghBABCfAQRAIAEgAiADEKIBCwszACAAIAEoAghBABCfAQRAIAEgAiADEKIBDwsgACgCCCIAIAEgAiADIAAoAgAoAhwRBQALUgEBfyAAKAIEIQQgACgCACIAIAECf0EA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RWlnZW4vc3JjL0NvcmUvUGxhaW5PYmplY3RCYXNlLmgAcmVzaXplAGFsaWdubWVudCA+PSBzaXplb2Yodm9pZCopICYmIChhbGlnbm1lbnQgJiAoYWxpZ25tZW50LTEpKSA9PSAwICYmICJBbGlnbm1lbnQgbXVzdCBiZSBhdCBsZWFzdCBzaXplb2Yodm9pZCopIGFuZCBhIHBvd2VyIG9mIDIiAC9ob21lL2Nsby9Db2Rlcy9zcGVlY2gtYW5hbHlzaXMvY21ha2UtYnVpbGQtcmVsZWFzZS9kZXBzL2luY2x1ZGUvZWlnZW4zL0VpZ2VuL3NyYy9Db3JlL3V0aWwvTWVtb3J5LmgAaGFuZG1hZGVfYWxpZ25lZF9tYWxsb2MAcm93ID49IDAgJiYgcm93IDwgcm93cygpICYmIGNvbCA+PSAwICYmIGNvbCA8IGNvbHMoKQAvaG9tZS9jbG8vQ29kZXMvc3BlZWNoLWFuYWx5c2lzL2NtYWtlLWJ1aWxkLXJlbGVhc2UvZGVwcy9pbmNsdWRlL2VpZ2VuMy9FaWdlbi9zcmMvQ29yZS9EZW5zZUNvZWZmc0Jhc2UuaABvcGVyYXRvcigpAHJvd3MgPj0gMCAmJiAoUm93c0F0Q29tcGlsZVRpbWUgPT0gRHluYW1pYyB8fCBSb3dzQXRDb21waWxlVGltZSA9PSByb3dzKSAmJiBjb2xzID49IDAgJiYgKENvbHNBdENvbXBpbGVUaW1lID09IER5bmFtaWMgfHwgQ29sc0F0Q29tcGlsZVRpbWUgPT0gY29scykAL2hvbWUvY2xvL0NvZGVzL3NwZWVjaC1hbmFseXNpcy9jbWFrZS1idWlsZC1yZWxlYXNlL2RlcHMvaW5jbHVkZS9laWdlbjMvRWlnZW4vc3JjL0NvcmUvQ3dpc2VOdWxsYXJ5T3AuaABDd2lzZU51bGxhcnlPcAB2ID09IFQoVmFsdWUpAC9ob21lL2Nsby9Db2Rlcy9zcGVlY2gtYW5hbHlzaXMvY21ha2UtYnVpbGQtcmVsZWFzZS9kZXBzL2luY2x1ZGUvZWlnZW4zL0VpZ2VuL3NyYy9Db3JlL3V0aWwvWHBySGVscGVyLmgAdmFyaWFibGVfaWZfZHluYW1pYwBhTGhzLnJvd3MoKSA9PSBhUmhzLnJvd3MoKSAmJiBhTGhzLmNvbHMoKSA9PSBhUmhzLmNvbHMoKQAvaG9tZS9jbG8vQ29kZXMvc3BlZWNoLWFuYWx5c2lzL2NtYWtlLWJ1aWxkLXJlbGVhc2UvZGVwcy9pbmNsdWRlL2VpZ2VuMy9FaWdlbi9zcmMvQ29yZS9Dd2lzZUJpbmFyeU9wLmgAQ3dpc2VCaW5hcnlPcABvdGhlci5yb3dzKCkgPT0gMSB8fCBvdGhlci5jb2xzKCkgPT0gMQByZXNpemVMaWtlAGRzdC5yb3dzKCkgPT0gZHN0Um93cyAmJiBkc3QuY29scygpID09IGRzdENvbHMAL2hvbWUvY2xvL0NvZGVzL3NwZWVjaC1hbmFseXNpcy9jbWFrZS1idWlsZC1yZWxlYXNlL2RlcHMvaW5jbHVkZS9laWdlbjMvRWlnZW4vc3JjL0NvcmUvQXNzaWduRXZhbHVhdG9yLmgAcmVzaXplX2lmX2FsbG93ZWQAdGhpcy0+cm93cygpPjAgJiYgdGhpcy0+Y29scygpPjAgJiYgInlvdSBhcmUgdXNpbmcgYW4gZW1wdHkgbWF0cml4IgAvaG9tZS9jbG8vQ29kZXMvc3BlZWNoLWFuYWx5c2lzL2NtYWtlLWJ1aWxkLXJlbGVhc2UvZGVwcy9pbmNsdWRlL2VpZ2VuMy9FaWdlbi9zcmMvQ29yZS9SZWR1eC5oAHJlZHV4AHhwci5yb3dzKCk+MCAmJiB4cHIuY29scygpPjAgJiYgInlvdSBhcmUgdXNpbmcgYW4gZW1wdHkgbWF0cml4IgBydW4AKGk+PTApICYmICggKChCbG9ja1Jvd3M9PTEpICYmIChCbG9ja0NvbHM9PVhwclR5cGU6OkNvbHNBdENvbXBpbGVUaW1lKSAmJiBpPHhwci5yb3dzKCkpIHx8KChCbG9ja1Jvd3M9PVhwclR5cGU6OlJvd3NBdENvbXBpbGVUaW1lKSAmJiAoQmxvY2tDb2xzPT0xKSAmJiBpPHhwci5jb2xzKCkpKQAvaG9tZS9jbG8vQ29kZXMvc3BlZWNoLWFuYWx5c2lzL2NtYWtlLWJ1aWxkLXJlbGVhc2UvZGVwcy9pbmNsdWRlL2VpZ2VuMy9FaWdlbi9zcmMvQ29yZS9CbG9jay5oAEJsb2NrAChkYXRhUHRyID09IDApIHx8ICggcm93cyA+PSAwICYmIChSb3dzQXRDb21waWxlVGltZSA9PSBEeW5hbWljIHx8IFJvd3NBdENvbXBpbGVUaW1lID09IHJvd3MpICYmIGNvbHMgPj0gMCAmJiAoQ29sc0F0Q29tcGlsZVRpbWUgPT0gRHluYW1pYyB8fCBDb2xzQXRDb21waWxlVGltZSA9PSBjb2xzKSkAL2hvbWUvY2xvL0NvZGVzL3NwZWVjaC1hbmFseXNpcy9jbWFrZS1idWlsZC1yZWxlYXNlL2RlcHMvaW5jbHVkZS9laWdlbjMvRWlnZW4vc3JjL0NvcmUvTWFwQmFzZS5oAE1hcEJhc2UAaW5kZXggPj0gMCAmJiBpbmRleCA8IHNpemUoKQBhbGxvY2F0b3I8VD46OmFsbG9jYXRlKHNpemVfdCBuKSAnbicgZXhjZWVkcyBtYXhpbXVtIHN1cHBvcnRlZCBzaXplAABBdWRpb0NhcHR1cmUAcHJvY2VzcwBnZXRTYW1wbGVSYXRlAHJlYWRCbG9jawAxMkF1ZGlvQ2FwdHVyZQAAAABkEgAAXg4AAFAxMkF1ZGlvQ2FwdHVyZQBEEwAAeA4AAAAAAABwDgAAUEsxMkF1ZGlvQ2FwdHVyZQAAAABEEwAAmA4AAAEAAABwDgAAaWkAdgB2aQCIDgAAGBIAAGlpaQC4EQAAiA4AADwSAAAYEgAAGBIAAHZpaWlpaQAAGBIAAIgOAAC4EQAAiA4AABQPAABOMTBlbXNjcmlwdGVuM3ZhbEUAAGQSAAAADwAAdmlpaQBtdXRleCBsb2NrIGZhaWxlZAB2ZWN0b3IAc3RkOjpleGNlcHRpb24AQdAeC+4TrA8AAAEAAAANAAAADgAAAHN0ZDo6YmFkX2FsbG9jAAAAAAAAlA8AAAEAAAAPAAAAEAAAAFN0OWV4Y2VwdGlvbgAAAABkEgAAhA8AAFN0OWJhZF9hbGxvYwAAAACMEgAAnA8AAJQPAAAAAAAA3A8AAAIAAAARAAAAEgAAAFN0MTFsb2dpY19lcnJvcgCMEgAAzA8AAJQPAAAAAAAAEBAAAAIAAAATAAAAEgAAAFN0MTJsZW5ndGhfZXJyb3IAAAAAjBIAAPwPAADcDwAAU3Q5dHlwZV9pbmZvAAAAAGQSAAAcEAAATjEwX19jeHhhYml2MTE2X19zaGltX3R5cGVfaW5mb0UAAAAAjBIAADQQAAAsEAAATjEwX19jeHhhYml2MTE3X19jbGFzc190eXBlX2luZm9FAAAAjBIAAGQQAABYEAAATjEwX19jeHhhYml2MTE3X19wYmFzZV90eXBlX2luZm9FAAAAjBIAAJQQAABYEAAATjEwX19jeHhhYml2MTE5X19wb2ludGVyX3R5cGVfaW5mb0UAjBIAAMQQAAC4EAAATjEwX19jeHhhYml2MTIwX19mdW5jdGlvbl90eXBlX2luZm9FAAAAAIwSAAD0EAAAWBAAAE4xMF9fY3h4YWJpdjEyOV9fcG9pbnRlcl90b19tZW1iZXJfdHlwZV9pbmZvRQAAAIwSAAAoEQAAuBAAAAAAAACoEQAAFAAAABUAAAAWAAAAFwAAABgAAABOMTBfX2N4eGFiaXYxMjNfX2Z1bmRhbWVudGFsX3R5cGVfaW5mb0UAjBIAAIARAABYEAAAdgAAAGwRAAC0EQAARG4AAGwRAADAEQAAYgAAAGwRAADMEQAAYwAAAGwRAADYEQAAaAAAAGwRAADkEQAAYQAAAGwRAADwEQAAcwAAAGwRAAD8EQAAdAAAAGwRAAAIEgAAaQAAAGwRAAAUEgAAagAAAGwRAAAgEgAAbAAAAGwRAAAsEgAAbQAAAGwRAAA4EgAAZgAAAGwRAABEEgAAZAAAAGwRAABQEgAAAAAAAIgQAAAUAAAAGQAAABYAAAAXAAAAGgAAABsAAAAcAAAAHQAAAAAAAADUEgAAFAAAAB4AAAAWAAAAFwAAABoAAAAfAAAAIAAAACEAAABOMTBfX2N4eGFiaXYxMjBfX3NpX2NsYXNzX3R5cGVfaW5mb0UAAAAAjBIAAKwSAACIEAAAAAAAADATAAAUAAAAIgAAABYAAAAXAAAAGgAAACMAAAAkAAAAJQAAAE4xMF9fY3h4YWJpdjEyMV9fdm1pX2NsYXNzX3R5cGVfaW5mb0UAAACMEgAACBMAAIgQAAAAAAAA6BAAABQAAAAmAAAAFgAAABcAAAAnAAAAdm9pZABib29sAGNoYXIAc2lnbmVkIGNoYXIAdW5zaWduZWQgY2hhcgBzaG9ydAB1bnNpZ25lZCBzaG9ydABpbnQAdW5zaWduZWQgaW50AGxvbmcAdW5zaWduZWQgbG9uZwBmbG9hdABkb3VibGUAc3RkOjpzdHJpbmcAc3RkOjpiYXNpY19zdHJpbmc8dW5zaWduZWQgY2hhcj4Ac3RkOjp3c3RyaW5nAGVtc2NyaXB0ZW46OnZhbABlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxjaGFyPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxzaWduZWQgY2hhcj4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgY2hhcj4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8c2hvcnQ+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVuc2lnbmVkIHNob3J0PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxpbnQ+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVuc2lnbmVkIGludD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8bG9uZz4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgbG9uZz4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50OF90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50OF90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxpbnQxNl90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50MTZfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50MzJfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDMyX3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGZsb2F0PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxkb3VibGU+AE5TdDNfXzIxMmJhc2ljX3N0cmluZ0ljTlNfMTFjaGFyX3RyYWl0c0ljRUVOU185YWxsb2NhdG9ySWNFRUVFAE5TdDNfXzIyMV9fYmFzaWNfc3RyaW5nX2NvbW1vbklMYjFFRUUAAAAAZBIAAI8WAADoEgAAUBYAAAAAAAABAAAAuBYAAAAAAABOU3QzX18yMTJiYXNpY19zdHJpbmdJaE5TXzExY2hhcl90cmFpdHNJaEVFTlNfOWFsbG9jYXRvckloRUVFRQAA6BIAANgWAAAAAAAAAQAAALgWAAAAAAAATlN0M19fMjEyYmFzaWNfc3RyaW5nSXdOU18xMWNoYXJfdHJhaXRzSXdFRU5TXzlhbGxvY2F0b3JJd0VFRUUAAOgSAAAwFwAAAAAAAAEAAAC4FgAAAAAAAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWNFRQAAZBIAAIgXAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lhRUUAAGQSAACwFwAATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJaEVFAABkEgAA2BcAAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SXNFRQAAZBIAAAAYAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0l0RUUAAGQSAAAoGAAATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJaUVFAABkEgAAUBgAAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWpFRQAAZBIAAHgYAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lsRUUAAGQSAACgGAAATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJbUVFAABkEgAAyBgAAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWZFRQAAZBIAAPAYAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lkRUUAAGQSAAAYGQDB4gEEbmFtZQG44gHmAQANX19hc3NlcnRfZmFpbAETX2VtdmFsX3NldF9wcm9wZXJ0eQIYX19jeGFfYWxsb2NhdGVfZXhjZXB0aW9uAwtfX2N4YV90aHJvdwQRX2VtdmFsX3Rha2VfdmFsdWUFDV9lbXZhbF9kZWNyZWYGFl9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MHIl9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY29uc3RydWN0b3IIH19lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfZnVuY3Rpb24JBWFib3J0ChVfZW1iaW5kX3JlZ2lzdGVyX3ZvaWQLFV9lbWJpbmRfcmVnaXN0ZXJfYm9vbAwbX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nDRxfZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nDhZfZW1iaW5kX3JlZ2lzdGVyX2VtdmFsDxhfZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIQFl9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQRHF9lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcSFmVtc2NyaXB0ZW5fcmVzaXplX2hlYXATFWVtc2NyaXB0ZW5fbWVtY3B5X2JpZxQRX193YXNtX2NhbGxfY3RvcnMVH0F1ZGlvQ2FwdHVyZTo6QXVkaW9DYXB0dXJlKGludCkWLkF1ZGlvQ2FwdHVyZTo6cHJvY2Vzcyh1bnNpZ25lZCBsb25nLCBpbnQsIGludCkXWUVpZ2VuOjpEZW5zZUNvZWZmc0Jhc2U8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgLTEsIDAsIC0xLCAtMT4sIDE+OjpvcGVyYXRvcigpKGxvbmcsIGxvbmcpGERFaWdlbjo6RGVuc2VCYXNlPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIC0xLCAwLCAtMSwgLTE+ID46OnJvd3dpc2UoKRlMRWlnZW46OlZlY3Rvcndpc2VPcDxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiwgMT46Om1lYW4oKSBjb25zdBpXRWlnZW46OkRlbnNlQ29lZmZzQmFzZTxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiwgMT46OmNvZWZmUmVmKGxvbmcsIGxvbmcpG0RFaWdlbjo6RWlnZW5CYXNlPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIC0xLCAwLCAtMSwgLTE+ID46OmRlcml2ZWQoKRx1RWlnZW46OlZlY3Rvcndpc2VPcDxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiwgMT46OlZlY3Rvcndpc2VPcChFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiYpHYUHRWlnZW46OkN3aXNlQmluYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfcXVvdGllbnRfb3A8ZmxvYXQsIEVpZ2VuOjppbnRlcm5hbDo6cHJvbW90ZV9zY2FsYXJfYXJnPGZsb2F0LCBmbG9hdCwgRWlnZW46OmludGVybmFsOjpoYXNfUmV0dXJuVHlwZTxFaWdlbjo6U2NhbGFyQmluYXJ5T3BUcmFpdHM8ZmxvYXQsIGZsb2F0LCBFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9xdW90aWVudF9vcDxmbG9hdCwgZmxvYXQ+ID4gPjo6dmFsdWU+Ojp0eXBlPiwgRWlnZW46OlBhcnRpYWxSZWR1eEV4cHI8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgLTEsIDAsIC0xLCAtMT4sIEVpZ2VuOjppbnRlcm5hbDo6bWVtYmVyX3N1bTxmbG9hdCwgZmxvYXQ+LCAxPiBjb25zdCwgRWlnZW46OmludGVybmFsOjpwbGFpbl9jb25zdGFudF90eXBlPEVpZ2VuOjpQYXJ0aWFsUmVkdXhFeHByPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIC0xLCAwLCAtMSwgLTE+LCBFaWdlbjo6aW50ZXJuYWw6Om1lbWJlcl9zdW08ZmxvYXQsIGZsb2F0PiwgMT4sIEVpZ2VuOjppbnRlcm5hbDo6cHJvbW90ZV9zY2FsYXJfYXJnPGZsb2F0LCBmbG9hdCwgRWlnZW46OmludGVybmFsOjpoYXNfUmV0dXJuVHlwZTxFaWdlbjo6U2NhbGFyQmluYXJ5T3BUcmFpdHM8ZmxvYXQsIGZsb2F0LCBFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9xdW90aWVudF9vcDxmbG9hdCwgZmxvYXQ+ID4gPjo6dmFsdWU+Ojp0eXBlPjo6dHlwZSBjb25zdD4gY29uc3QgRWlnZW46OkFycmF5QmFzZTxFaWdlbjo6UGFydGlhbFJlZHV4RXhwcjxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiwgRWlnZW46OmludGVybmFsOjptZW1iZXJfc3VtPGZsb2F0LCBmbG9hdD4sIDE+ID46Om9wZXJhdG9yLzxmbG9hdD4oZmxvYXQgY29uc3QmKSBjb25zdB46RWlnZW46OkRlbnNlU3RvcmFnZTxkb3VibGUsIC0xLCAtMSwgMSwgMD46On5EZW5zZVN0b3JhZ2UoKR8dQXVkaW9DYXB0dXJlOjpnZXRTYW1wbGVSYXRlKCkgKEF1ZGlvQ2FwdHVyZTo6cmVhZEJsb2NrKGVtc2NyaXB0ZW46OnZhbCkhUkVpZ2VuOjpEZW5zZUNvZWZmc0Jhc2U8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiwgMT46Om9wZXJhdG9yKCkobG9uZykiQXZvaWQgZW1zY3JpcHRlbjo6dmFsOjpzZXQ8aW50LCBkb3VibGU+KGludCBjb25zdCYsIGRvdWJsZSBjb25zdCYpIyxlbXNjcmlwdGVuOjp2YWw6OnZhbDxpbnQgY29uc3QmPihpbnQgY29uc3QmKSQyZW1zY3JpcHRlbjo6dmFsOjp2YWw8ZG91YmxlIGNvbnN0Jj4oZG91YmxlIGNvbnN0JiklF2Vtc2NyaXB0ZW46OnZhbDo6fnZhbCgpJlBFaWdlbjo6RGVuc2VDb2VmZnNCYXNlPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4sIDE+Ojpjb2VmZlJlZihsb25nKSdRc3RkOjpfXzI6OnZlY3Rvcjxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiA+OjpfX2Fubm90YXRlX2RlbGV0ZSgpIGNvbnN0KE9zdGQ6Ol9fMjo6X192ZWN0b3JfYmFzZTxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiA+Ojp+X192ZWN0b3JfYmFzZSgpKURzdGQ6Ol9fMjo6dmVjdG9yPGRvdWJsZSwgc3RkOjpfXzI6OmFsbG9jYXRvcjxkb3VibGU+ID46OnNpemUoKSBjb25zdCpIc3RkOjpfXzI6Ol9fdmVjdG9yX2Jhc2U8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4gPjo6X19hbGxvYygpK09zdGQ6Ol9fMjo6X192ZWN0b3JfYmFzZTxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiA+OjpjYXBhY2l0eSgpIGNvbnN0LFlzdGQ6Ol9fMjo6X192ZWN0b3JfYmFzZTxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiA+OjpfX2Rlc3RydWN0X2F0X2VuZChkb3VibGUqKS0tc3RkOjpfXzI6Ol9EZWFsbG9jYXRlQ2FsbGVyOjpfX2RvX2NhbGwodm9pZCopLi1FaWdlbjo6aW50ZXJuYWw6OmhhbmRtYWRlX2FsaWduZWRfZnJlZSh2b2lkKikvOUVpZ2VuOjpEZW5zZVN0b3JhZ2U8ZG91YmxlLCAtMSwgLTEsIDEsIDA+OjpEZW5zZVN0b3JhZ2UoKTBTRWlnZW46OlBsYWluT2JqZWN0QmFzZTxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiA+OjpyZXNpemUobG9uZywgbG9uZykxJkVpZ2VuOjppbnRlcm5hbDo6dGhyb3dfc3RkX2JhZF9hbGxvYygpMkNFaWdlbjo6RGVuc2VTdG9yYWdlPGZsb2F0LCAtMSwgLTEsIC0xLCAwPjo6cmVzaXplKGxvbmcsIGxvbmcsIGxvbmcpM0Z2b2lkKiBFaWdlbjo6aW50ZXJuYWw6OmNvbmRpdGlvbmFsX2FsaWduZWRfbWFsbG9jPHRydWU+KHVuc2lnbmVkIGxvbmcpNEZFaWdlbjo6aW50ZXJuYWw6OmhhbmRtYWRlX2FsaWduZWRfbWFsbG9jKHVuc2lnbmVkIGxvbmcsIHVuc2lnbmVkIGxvbmcpNXtFaWdlbjo6UGFydGlhbFJlZHV4RXhwcjxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiwgRWlnZW46OmludGVybmFsOjptZW1iZXJfc3VtPGZsb2F0LCBmbG9hdD4sIDE+Ojpyb3dzKCkgY29uc3Q2TEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX2NvbnN0YW50X29wPGZsb2F0Pjo6c2NhbGFyX2NvbnN0YW50X29wKGZsb2F0IGNvbnN0Jik3vAFFaWdlbjo6Q3dpc2VOdWxsYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY29uc3RhbnRfb3A8ZmxvYXQ+LCBFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+OjpDd2lzZU51bGxhcnlPcChsb25nLCBsb25nLCBFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jb25zdGFudF9vcDxmbG9hdD4gY29uc3QmKTjmBEVpZ2VuOjpDd2lzZUJpbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX3F1b3RpZW50X29wPGZsb2F0LCBmbG9hdD4sIEVpZ2VuOjpQYXJ0aWFsUmVkdXhFeHByPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIC0xLCAwLCAtMSwgLTE+LCBFaWdlbjo6aW50ZXJuYWw6Om1lbWJlcl9zdW08ZmxvYXQsIGZsb2F0PiwgMT4gY29uc3QsIEVpZ2VuOjpDd2lzZU51bGxhcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jb25zdGFudF9vcDxmbG9hdD4sIEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4gY29uc3Q+OjpDd2lzZUJpbmFyeU9wKEVpZ2VuOjpQYXJ0aWFsUmVkdXhFeHByPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIC0xLCAwLCAtMSwgLTE+LCBFaWdlbjo6aW50ZXJuYWw6Om1lbWJlcl9zdW08ZmxvYXQsIGZsb2F0PiwgMT4gY29uc3QmLCBFaWdlbjo6Q3dpc2VOdWxsYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY29uc3RhbnRfb3A8ZmxvYXQ+LCBFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+IGNvbnN0JiwgRWlnZW46OmludGVybmFsOjpzY2FsYXJfcXVvdGllbnRfb3A8ZmxvYXQsIGZsb2F0PiBjb25zdCYpOUhFaWdlbjo6aW50ZXJuYWw6OnZhcmlhYmxlX2lmX2R5bmFtaWM8bG9uZywgMT46OnZhcmlhYmxlX2lmX2R5bmFtaWMobG9uZyk68wFFaWdlbjo6Q3dpc2VOdWxsYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY29uc3RhbnRfb3A8ZmxvYXQ+LCBFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+OjpDd2lzZU51bGxhcnlPcChFaWdlbjo6Q3dpc2VOdWxsYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY29uc3RhbnRfb3A8ZmxvYXQ+LCBFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+IGNvbnN0Jik7+gRFaWdlbjo6Q3dpc2VCaW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9xdW90aWVudF9vcDxmbG9hdCwgZmxvYXQ+LCBFaWdlbjo6UGFydGlhbFJlZHV4RXhwcjxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiwgRWlnZW46OmludGVybmFsOjptZW1iZXJfc3VtPGZsb2F0LCBmbG9hdD4sIDE+IGNvbnN0LCBFaWdlbjo6Q3dpc2VOdWxsYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY29uc3RhbnRfb3A8ZmxvYXQ+LCBFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+IGNvbnN0Pjo6Q3dpc2VCaW5hcnlPcChFaWdlbjo6Q3dpc2VCaW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9xdW90aWVudF9vcDxmbG9hdCwgZmxvYXQ+LCBFaWdlbjo6UGFydGlhbFJlZHV4RXhwcjxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiwgRWlnZW46OmludGVybmFsOjptZW1iZXJfc3VtPGZsb2F0LCBmbG9hdD4sIDE+IGNvbnN0LCBFaWdlbjo6Q3dpc2VOdWxsYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY29uc3RhbnRfb3A8ZmxvYXQ+LCBFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+IGNvbnN0PiBjb25zdCYpPOYGdm9pZCBFaWdlbjo6UGxhaW5PYmplY3RCYXNlPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gPjo6cmVzaXplTGlrZTxFaWdlbjo6Q3dpc2VVbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX2Nhc3Rfb3A8ZmxvYXQsIGRvdWJsZT4sIEVpZ2VuOjpDd2lzZUJpbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX3F1b3RpZW50X29wPGZsb2F0LCBmbG9hdD4sIEVpZ2VuOjpQYXJ0aWFsUmVkdXhFeHByPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIC0xLCAwLCAtMSwgLTE+LCBFaWdlbjo6aW50ZXJuYWw6Om1lbWJlcl9zdW08ZmxvYXQsIGZsb2F0PiwgMT4gY29uc3QsIEVpZ2VuOjpDd2lzZU51bGxhcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jb25zdGFudF9vcDxmbG9hdD4sIEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4gY29uc3Q+IGNvbnN0PiA+KEVpZ2VuOjpFaWdlbkJhc2U8RWlnZW46OkN3aXNlVW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jYXN0X29wPGZsb2F0LCBkb3VibGU+LCBFaWdlbjo6Q3dpc2VCaW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9xdW90aWVudF9vcDxmbG9hdCwgZmxvYXQ+LCBFaWdlbjo6UGFydGlhbFJlZHV4RXhwcjxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiwgRWlnZW46OmludGVybmFsOjptZW1iZXJfc3VtPGZsb2F0LCBmbG9hdD4sIDE+IGNvbnN0LCBFaWdlbjo6Q3dpc2VOdWxsYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY29uc3RhbnRfb3A8ZmxvYXQ+LCBFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+IGNvbnN0PiBjb25zdD4gPiBjb25zdCYpPYoHRWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiYgRWlnZW46OlBsYWluT2JqZWN0QmFzZTxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+ID46Ol9zZXRfbm9hbGlhczxFaWdlbjo6Q3dpc2VVbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX2Nhc3Rfb3A8ZmxvYXQsIGRvdWJsZT4sIEVpZ2VuOjpDd2lzZUJpbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX3F1b3RpZW50X29wPGZsb2F0LCBmbG9hdD4sIEVpZ2VuOjpQYXJ0aWFsUmVkdXhFeHByPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIC0xLCAwLCAtMSwgLTE+LCBFaWdlbjo6aW50ZXJuYWw6Om1lbWJlcl9zdW08ZmxvYXQsIGZsb2F0PiwgMT4gY29uc3QsIEVpZ2VuOjpDd2lzZU51bGxhcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jb25zdGFudF9vcDxmbG9hdD4sIEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4gY29uc3Q+IGNvbnN0PiA+KEVpZ2VuOjpEZW5zZUJhc2U8RWlnZW46OkN3aXNlVW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jYXN0X29wPGZsb2F0LCBkb3VibGU+LCBFaWdlbjo6Q3dpc2VCaW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9xdW90aWVudF9vcDxmbG9hdCwgZmxvYXQ+LCBFaWdlbjo6UGFydGlhbFJlZHV4RXhwcjxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiwgRWlnZW46OmludGVybmFsOjptZW1iZXJfc3VtPGZsb2F0LCBmbG9hdD4sIDE+IGNvbnN0LCBFaWdlbjo6Q3dpc2VOdWxsYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY29uc3RhbnRfb3A8ZmxvYXQ+LCBFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+IGNvbnN0PiBjb25zdD4gPiBjb25zdCYpPlJFaWdlbjo6UGxhaW5PYmplY3RCYXNlPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gPjo6cmVzaXplKGxvbmcsIGxvbmcpP0NFaWdlbjo6RGVuc2VTdG9yYWdlPGRvdWJsZSwgLTEsIC0xLCAxLCAwPjo6cmVzaXplKGxvbmcsIGxvbmcsIGxvbmcpQOIHdm9pZCBFaWdlbjo6aW50ZXJuYWw6OmNhbGxfZGVuc2VfYXNzaWdubWVudF9sb29wPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4sIEVpZ2VuOjpDd2lzZVVuYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY2FzdF9vcDxmbG9hdCwgZG91YmxlPiwgRWlnZW46OkN3aXNlQmluYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfcXVvdGllbnRfb3A8ZmxvYXQsIGZsb2F0PiwgRWlnZW46OlBhcnRpYWxSZWR1eEV4cHI8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgLTEsIDAsIC0xLCAtMT4sIEVpZ2VuOjppbnRlcm5hbDo6bWVtYmVyX3N1bTxmbG9hdCwgZmxvYXQ+LCAxPiBjb25zdCwgRWlnZW46OkN3aXNlTnVsbGFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX2NvbnN0YW50X29wPGZsb2F0PiwgRWlnZW46OkFycmF5PGZsb2F0LCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0PiBjb25zdD4gY29uc3Q+LCBFaWdlbjo6aW50ZXJuYWw6OmFzc2lnbl9vcDxkb3VibGUsIGRvdWJsZT4gPihFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+JiwgRWlnZW46OkN3aXNlVW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jYXN0X29wPGZsb2F0LCBkb3VibGU+LCBFaWdlbjo6Q3dpc2VCaW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9xdW90aWVudF9vcDxmbG9hdCwgZmxvYXQ+LCBFaWdlbjo6UGFydGlhbFJlZHV4RXhwcjxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiwgRWlnZW46OmludGVybmFsOjptZW1iZXJfc3VtPGZsb2F0LCBmbG9hdD4sIDE+IGNvbnN0LCBFaWdlbjo6Q3dpc2VOdWxsYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY29uc3RhbnRfb3A8ZmxvYXQ+LCBFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+IGNvbnN0PiBjb25zdD4gY29uc3QmLCBFaWdlbjo6aW50ZXJuYWw6OmFzc2lnbl9vcDxkb3VibGUsIGRvdWJsZT4gY29uc3QmKUG8B3ZvaWQgRWlnZW46OmludGVybmFsOjpyZXNpemVfaWZfYWxsb3dlZDxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+LCBFaWdlbjo6Q3dpc2VVbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX2Nhc3Rfb3A8ZmxvYXQsIGRvdWJsZT4sIEVpZ2VuOjpDd2lzZUJpbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX3F1b3RpZW50X29wPGZsb2F0LCBmbG9hdD4sIEVpZ2VuOjpQYXJ0aWFsUmVkdXhFeHByPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIC0xLCAwLCAtMSwgLTE+LCBFaWdlbjo6aW50ZXJuYWw6Om1lbWJlcl9zdW08ZmxvYXQsIGZsb2F0PiwgMT4gY29uc3QsIEVpZ2VuOjpDd2lzZU51bGxhcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jb25zdGFudF9vcDxmbG9hdD4sIEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4gY29uc3Q+IGNvbnN0PiwgZG91YmxlLCBkb3VibGU+KEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4mLCBFaWdlbjo6Q3dpc2VVbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX2Nhc3Rfb3A8ZmxvYXQsIGRvdWJsZT4sIEVpZ2VuOjpDd2lzZUJpbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX3F1b3RpZW50X29wPGZsb2F0LCBmbG9hdD4sIEVpZ2VuOjpQYXJ0aWFsUmVkdXhFeHByPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIC0xLCAwLCAtMSwgLTE+LCBFaWdlbjo6aW50ZXJuYWw6Om1lbWJlcl9zdW08ZmxvYXQsIGZsb2F0PiwgMT4gY29uc3QsIEVpZ2VuOjpDd2lzZU51bGxhcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jb25zdGFudF9vcDxmbG9hdD4sIEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4gY29uc3Q+IGNvbnN0PiBjb25zdCYsIEVpZ2VuOjppbnRlcm5hbDo6YXNzaWduX29wPGRvdWJsZSwgZG91YmxlPiBjb25zdCYpQntFaWdlbjo6aW50ZXJuYWw6OmV2YWx1YXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+ID46OmV2YWx1YXRvcihFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0JilDsglFaWdlbjo6aW50ZXJuYWw6OmRlbnNlX2Fzc2lnbm1lbnRfbG9vcDxFaWdlbjo6aW50ZXJuYWw6OmdlbmVyaWNfZGVuc2VfYXNzaWdubWVudF9rZXJuZWw8RWlnZW46OmludGVybmFsOjpldmFsdWF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiA+LCBFaWdlbjo6aW50ZXJuYWw6OmV2YWx1YXRvcjxFaWdlbjo6Q3dpc2VVbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX2Nhc3Rfb3A8ZmxvYXQsIGRvdWJsZT4sIEVpZ2VuOjpDd2lzZUJpbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX3F1b3RpZW50X29wPGZsb2F0LCBmbG9hdD4sIEVpZ2VuOjpQYXJ0aWFsUmVkdXhFeHByPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIC0xLCAwLCAtMSwgLTE+LCBFaWdlbjo6aW50ZXJuYWw6Om1lbWJlcl9zdW08ZmxvYXQsIGZsb2F0PiwgMT4gY29uc3QsIEVpZ2VuOjpDd2lzZU51bGxhcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jb25zdGFudF9vcDxmbG9hdD4sIEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4gY29uc3Q+IGNvbnN0PiA+LCBFaWdlbjo6aW50ZXJuYWw6OmFzc2lnbl9vcDxkb3VibGUsIGRvdWJsZT4sIDA+LCAxLCAwPjo6cnVuKEVpZ2VuOjppbnRlcm5hbDo6Z2VuZXJpY19kZW5zZV9hc3NpZ25tZW50X2tlcm5lbDxFaWdlbjo6aW50ZXJuYWw6OmV2YWx1YXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+ID4sIEVpZ2VuOjppbnRlcm5hbDo6ZXZhbHVhdG9yPEVpZ2VuOjpDd2lzZVVuYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY2FzdF9vcDxmbG9hdCwgZG91YmxlPiwgRWlnZW46OkN3aXNlQmluYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfcXVvdGllbnRfb3A8ZmxvYXQsIGZsb2F0PiwgRWlnZW46OlBhcnRpYWxSZWR1eEV4cHI8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgLTEsIDAsIC0xLCAtMT4sIEVpZ2VuOjppbnRlcm5hbDo6bWVtYmVyX3N1bTxmbG9hdCwgZmxvYXQ+LCAxPiBjb25zdCwgRWlnZW46OkN3aXNlTnVsbGFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX2NvbnN0YW50X29wPGZsb2F0PiwgRWlnZW46OkFycmF5PGZsb2F0LCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0PiBjb25zdD4gY29uc3Q+ID4sIEVpZ2VuOjppbnRlcm5hbDo6YXNzaWduX29wPGRvdWJsZSwgZG91YmxlPiwgMD4mKUTRBEVpZ2VuOjppbnRlcm5hbDo6Z2VuZXJpY19kZW5zZV9hc3NpZ25tZW50X2tlcm5lbDxFaWdlbjo6aW50ZXJuYWw6OmV2YWx1YXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+ID4sIEVpZ2VuOjppbnRlcm5hbDo6ZXZhbHVhdG9yPEVpZ2VuOjpDd2lzZVVuYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY2FzdF9vcDxmbG9hdCwgZG91YmxlPiwgRWlnZW46OkN3aXNlQmluYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfcXVvdGllbnRfb3A8ZmxvYXQsIGZsb2F0PiwgRWlnZW46OlBhcnRpYWxSZWR1eEV4cHI8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgLTEsIDAsIC0xLCAtMT4sIEVpZ2VuOjppbnRlcm5hbDo6bWVtYmVyX3N1bTxmbG9hdCwgZmxvYXQ+LCAxPiBjb25zdCwgRWlnZW46OkN3aXNlTnVsbGFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX2NvbnN0YW50X29wPGZsb2F0PiwgRWlnZW46OkFycmF5PGZsb2F0LCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0PiBjb25zdD4gY29uc3Q+ID4sIEVpZ2VuOjppbnRlcm5hbDo6YXNzaWduX29wPGRvdWJsZSwgZG91YmxlPiwgMD46OmFzc2lnbkNvZWZmKGxvbmcpRZYDRWlnZW46OkN3aXNlVW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jYXN0X29wPGZsb2F0LCBkb3VibGU+LCBFaWdlbjo6Q3dpc2VCaW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9xdW90aWVudF9vcDxmbG9hdCwgZmxvYXQ+LCBFaWdlbjo6UGFydGlhbFJlZHV4RXhwcjxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiwgRWlnZW46OmludGVybmFsOjptZW1iZXJfc3VtPGZsb2F0LCBmbG9hdD4sIDE+IGNvbnN0LCBFaWdlbjo6Q3dpc2VOdWxsYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY29uc3RhbnRfb3A8ZmxvYXQ+LCBFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+IGNvbnN0PiBjb25zdD46Om5lc3RlZEV4cHJlc3Npb24oKSBjb25zdEaQAkVpZ2VuOjppbnRlcm5hbDo6ZXZhbHVhdG9yPEVpZ2VuOjpQYXJ0aWFsUmVkdXhFeHByPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIC0xLCAwLCAtMSwgLTE+LCBFaWdlbjo6aW50ZXJuYWw6Om1lbWJlcl9zdW08ZmxvYXQsIGZsb2F0PiwgMT4gY29uc3Q+OjpldmFsdWF0b3IoRWlnZW46OlBhcnRpYWxSZWR1eEV4cHI8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgLTEsIDAsIC0xLCAtMT4sIEVpZ2VuOjppbnRlcm5hbDo6bWVtYmVyX3N1bTxmbG9hdCwgZmxvYXQ+LCAxPiBjb25zdCYpR74CRWlnZW46OkN3aXNlQmluYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfcXVvdGllbnRfb3A8ZmxvYXQsIGZsb2F0PiwgRWlnZW46OlBhcnRpYWxSZWR1eEV4cHI8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgLTEsIDAsIC0xLCAtMT4sIEVpZ2VuOjppbnRlcm5hbDo6bWVtYmVyX3N1bTxmbG9hdCwgZmxvYXQ+LCAxPiBjb25zdCwgRWlnZW46OkN3aXNlTnVsbGFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX2NvbnN0YW50X29wPGZsb2F0PiwgRWlnZW46OkFycmF5PGZsb2F0LCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0PiBjb25zdD46OnJocygpIGNvbnN0SG9FaWdlbjo6aW50ZXJuYWw6OnBsYWlub2JqZWN0YmFzZV9ldmFsdWF0b3JfZGF0YTxkb3VibGUsIDA+OjpwbGFpbm9iamVjdGJhc2VfZXZhbHVhdG9yX2RhdGEoZG91YmxlIGNvbnN0KiwgbG9uZylJP3ZvaWQgRWlnZW46OmludGVybmFsOjppZ25vcmVfdW51c2VkX3ZhcmlhYmxlPGxvbmc+KGxvbmcgY29uc3QmKUprRWlnZW46OmludGVybmFsOjpldmFsdWF0b3I8RWlnZW46OlBsYWluT2JqZWN0QmFzZTxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+ID4gPjo6Y29lZmZSZWYobG9uZylL1gNFaWdlbjo6aW50ZXJuYWw6OnVuYXJ5X2V2YWx1YXRvcjxFaWdlbjo6Q3dpc2VVbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX2Nhc3Rfb3A8ZmxvYXQsIGRvdWJsZT4sIEVpZ2VuOjpDd2lzZUJpbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX3F1b3RpZW50X29wPGZsb2F0LCBmbG9hdD4sIEVpZ2VuOjpQYXJ0aWFsUmVkdXhFeHByPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIC0xLCAwLCAtMSwgLTE+LCBFaWdlbjo6aW50ZXJuYWw6Om1lbWJlcl9zdW08ZmxvYXQsIGZsb2F0PiwgMT4gY29uc3QsIEVpZ2VuOjpDd2lzZU51bGxhcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jb25zdGFudF9vcDxmbG9hdD4sIEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4gY29uc3Q+IGNvbnN0PiwgRWlnZW46OmludGVybmFsOjpJbmRleEJhc2VkLCBkb3VibGU+Ojpjb2VmZihsb25nKSBjb25zdEyvA0VpZ2VuOjppbnRlcm5hbDo6YmluYXJ5X2V2YWx1YXRvcjxFaWdlbjo6Q3dpc2VCaW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9xdW90aWVudF9vcDxmbG9hdCwgZmxvYXQ+LCBFaWdlbjo6UGFydGlhbFJlZHV4RXhwcjxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiwgRWlnZW46OmludGVybmFsOjptZW1iZXJfc3VtPGZsb2F0LCBmbG9hdD4sIDE+IGNvbnN0LCBFaWdlbjo6Q3dpc2VOdWxsYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY29uc3RhbnRfb3A8ZmxvYXQ+LCBFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+IGNvbnN0PiwgRWlnZW46OmludGVybmFsOjpJbmRleEJhc2VkLCBFaWdlbjo6aW50ZXJuYWw6OkluZGV4QmFzZWQsIGZsb2F0LCBmbG9hdD46OmNvZWZmKGxvbmcpIGNvbnN0TZ0BRWlnZW46OmludGVybmFsOjpldmFsdWF0b3I8RWlnZW46OlBhcnRpYWxSZWR1eEV4cHI8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgLTEsIDAsIC0xLCAtMT4sIEVpZ2VuOjppbnRlcm5hbDo6bWVtYmVyX3N1bTxmbG9hdCwgZmxvYXQ+LCAxPiA+Ojpjb2VmZihsb25nKSBjb25zdE5oRWlnZW46OkRlbnNlQmFzZTxFaWdlbjo6QmxvY2s8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgLTEsIDAsIC0xLCAtMT4gY29uc3QsIDEsIC0xLCBmYWxzZT4gPjo6c3VtKCkgY29uc3RPhAFFaWdlbjo6QmxvY2s8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgLTEsIDAsIC0xLCAtMT4gY29uc3QsIDEsIC0xLCBmYWxzZT46OkJsb2NrKEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIC0xLCAwLCAtMSwgLTE+IGNvbnN0JiwgbG9uZylQ0gFmbG9hdCBFaWdlbjo6RGVuc2VCYXNlPEVpZ2VuOjpCbG9jazxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiBjb25zdCwgMSwgLTEsIGZhbHNlPiA+OjpyZWR1eDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9zdW1fb3A8ZmxvYXQsIGZsb2F0PiA+KEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX3N1bV9vcDxmbG9hdCwgZmxvYXQ+IGNvbnN0JikgY29uc3RRjARmbG9hdCBFaWdlbjo6aW50ZXJuYWw6OnJlZHV4X2ltcGw8RWlnZW46OmludGVybmFsOjpzY2FsYXJfc3VtX29wPGZsb2F0LCBmbG9hdD4sIEVpZ2VuOjppbnRlcm5hbDo6cmVkdXhfZXZhbHVhdG9yPEVpZ2VuOjpCbG9jazxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiBjb25zdCwgMSwgLTEsIGZhbHNlPiA+LCAwLCAwPjo6cnVuPEVpZ2VuOjpCbG9jazxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiBjb25zdCwgMSwgLTEsIGZhbHNlPiA+KEVpZ2VuOjppbnRlcm5hbDo6cmVkdXhfZXZhbHVhdG9yPEVpZ2VuOjpCbG9jazxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiBjb25zdCwgMSwgLTEsIGZhbHNlPiA+IGNvbnN0JiwgRWlnZW46OmludGVybmFsOjpzY2FsYXJfc3VtX29wPGZsb2F0LCBmbG9hdD4gY29uc3QmLCBFaWdlbjo6QmxvY2s8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgLTEsIDAsIC0xLCAtMT4gY29uc3QsIDEsIC0xLCBmYWxzZT4gY29uc3QmKVKQAUVpZ2VuOjppbnRlcm5hbDo6cmVkdXhfZXZhbHVhdG9yPEVpZ2VuOjpCbG9jazxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiBjb25zdCwgMSwgLTEsIGZhbHNlPiA+Ojpjb2VmZkJ5T3V0ZXJJbm5lcihsb25nLCBsb25nKSBjb25zdFP3AUVpZ2VuOjppbnRlcm5hbDo6bWFwYmFzZV9ldmFsdWF0b3I8RWlnZW46OkJsb2NrPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIC0xLCAwLCAtMSwgLTE+IGNvbnN0LCAxLCAtMSwgZmFsc2U+LCBFaWdlbjo6QXJyYXk8ZmxvYXQsIDEsIC0xLCAxLCAxLCAtMT4gPjo6bWFwYmFzZV9ldmFsdWF0b3IoRWlnZW46OkJsb2NrPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIC0xLCAwLCAtMSwgLTE+IGNvbnN0LCAxLCAtMSwgZmFsc2U+IGNvbnN0JilUpgFFaWdlbjo6aW50ZXJuYWw6Om1hcGJhc2VfZXZhbHVhdG9yPEVpZ2VuOjpCbG9jazxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiBjb25zdCwgMSwgLTEsIGZhbHNlPiwgRWlnZW46OkFycmF5PGZsb2F0LCAxLCAtMSwgMSwgMSwgLTE+ID46OmNvbFN0cmlkZSgpIGNvbnN0VagBRWlnZW46OmludGVybmFsOjpCbG9ja0ltcGxfZGVuc2U8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgLTEsIDAsIC0xLCAtMT4gY29uc3QsIDEsIC0xLCBmYWxzZSwgdHJ1ZT46OkJsb2NrSW1wbF9kZW5zZShFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAtMSwgMCwgLTEsIC0xPiBjb25zdCYsIGxvbmcpVn5FaWdlbjo6TWFwQmFzZTxFaWdlbjo6QmxvY2s8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgLTEsIDAsIC0xLCAtMT4gY29uc3QsIDEsIC0xLCBmYWxzZT4sIDA+OjpNYXBCYXNlKGZsb2F0IGNvbnN0KiwgbG9uZywgbG9uZylXcmRvdWJsZSogRWlnZW46OmludGVybmFsOjpjb25kaXRpb25hbF9hbGlnbmVkX3JlYWxsb2NfbmV3X2F1dG88ZG91YmxlLCB0cnVlPihkb3VibGUqLCB1bnNpZ25lZCBsb25nLCB1bnNpZ25lZCBsb25nKVhFRWlnZW46OmludGVybmFsOjphbGlnbmVkX3JlYWxsb2Modm9pZCosIHVuc2lnbmVkIGxvbmcsIHVuc2lnbmVkIGxvbmcpWU5FaWdlbjo6aW50ZXJuYWw6OmhhbmRtYWRlX2FsaWduZWRfcmVhbGxvYyh2b2lkKiwgdW5zaWduZWQgbG9uZywgdW5zaWduZWQgbG9uZylaSGVtc2NyaXB0ZW46OmludGVybmFsOjpXaXJlVHlwZVBhY2s8aW50IGNvbnN0Jj46OldpcmVUeXBlUGFjayhpbnQgY29uc3QmKVtOZW1zY3JpcHRlbjo6aW50ZXJuYWw6OldpcmVUeXBlUGFjazxkb3VibGUgY29uc3QmPjo6V2lyZVR5cGVQYWNrKGRvdWJsZSBjb25zdCYpXBtSaW5nQnVmZmVyOjpSaW5nQnVmZmVyKGludCldXHN0ZDo6X18yOjp2ZWN0b3I8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4gPjo6cmVzaXplKHVuc2lnbmVkIGxvbmcsIGRvdWJsZSBjb25zdCYpXk5zdGQ6Ol9fMjo6X192ZWN0b3JfYmFzZTxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiA+OjpfX3ZlY3Rvcl9iYXNlKClfXnN0ZDo6X18yOjp2ZWN0b3I8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4gPjo6X19hcHBlbmQodW5zaWduZWQgbG9uZywgZG91YmxlIGNvbnN0JilgQ1JpbmdCdWZmZXI6OndyaXRlSW50byhFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0JilhP3N0ZDo6X18yOjp2ZWN0b3I8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4gPjo6YmVnaW4oKWI1c3RkOjpfXzI6Ol9fd3JhcF9pdGVyPGRvdWJsZSo+OjpvcGVyYXRvcisobG9uZykgY29uc3RjR0VpZ2VuOjpEZW5zZUJhc2U8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiA+OjpiZWdpbigpIGNvbnN0ZMkDc3RkOjpfXzI6OmVuYWJsZV9pZjxfX2lzX3JhbmRvbV9hY2Nlc3NfaXRlcmF0b3I8RWlnZW46OmludGVybmFsOjpwb2ludGVyX2Jhc2VkX3N0bF9pdGVyYXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0PiA+Ojp2YWx1ZSwgc3RkOjpfXzI6Ol9fd3JhcF9pdGVyPGRvdWJsZSo+ID46OnR5cGUgc3RkOjpfXzI6OmNvcHlfbjxFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+LCBpbnQsIHN0ZDo6X18yOjpfX3dyYXBfaXRlcjxkb3VibGUqPiA+KEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4sIGludCwgc3RkOjpfXzI6Ol9fd3JhcF9pdGVyPGRvdWJsZSo+KWWBAUVpZ2VuOjppbnRlcm5hbDo6b3BlcmF0b3IrKEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4gY29uc3QmLCBsb25nKWY0c3RkOjpfXzI6OmxvY2tfZ3VhcmQ8c3RkOjpfXzI6Om11dGV4Pjo6fmxvY2tfZ3VhcmQoKWdMc3RkOjpfXzI6OnZlY3Rvcjxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiA+OjpfX21ha2VfaXRlcihkb3VibGUqKWj8AnN0ZDo6X18yOjpfX3dyYXBfaXRlcjxkb3VibGUqPiBzdGQ6Ol9fMjo6Y29weTxFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+LCBzdGQ6Ol9fMjo6X193cmFwX2l0ZXI8ZG91YmxlKj4gPihFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+LCBFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+LCBzdGQ6Ol9fMjo6X193cmFwX2l0ZXI8ZG91YmxlKj4paUhFaWdlbjo6RGVuc2VCYXNlPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gPjo6Y2JlZ2luKCkgY29uc3RqPFJpbmdCdWZmZXI6OnJlYWRGcm9tKEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4mKWu6A3N0ZDo6X18yOjplbmFibGVfaWY8X19pc19yYW5kb21fYWNjZXNzX2l0ZXJhdG9yPHN0ZDo6X18yOjpfX3dyYXBfaXRlcjxkb3VibGUqPiA+Ojp2YWx1ZSwgRWlnZW46OmludGVybmFsOjpwb2ludGVyX2Jhc2VkX3N0bF9pdGVyYXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+ID4gPjo6dHlwZSBzdGQ6Ol9fMjo6Y29weV9uPHN0ZDo6X18yOjpfX3dyYXBfaXRlcjxkb3VibGUqPiwgaW50LCBFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gPiA+KHN0ZDo6X18yOjpfX3dyYXBfaXRlcjxkb3VibGUqPiwgaW50LCBFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gPils7QJFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gPiBzdGQ6Ol9fMjo6Y29weTxzdGQ6Ol9fMjo6X193cmFwX2l0ZXI8ZG91YmxlKj4sIEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiA+ID4oc3RkOjpfXzI6Ol9fd3JhcF9pdGVyPGRvdWJsZSo+LCBzdGQ6Ol9fMjo6X193cmFwX2l0ZXI8ZG91YmxlKj4sIEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiA+KW1zc3RkOjpfXzI6Ol9fY29tcHJlc3NlZF9wYWlyX2VsZW08ZG91YmxlKiwgMCwgZmFsc2U+OjpfX2NvbXByZXNzZWRfcGFpcl9lbGVtPHN0ZDo6bnVsbHB0cl90LCB2b2lkPihzdGQ6Om51bGxwdHJfdCYmKW5oc3RkOjpfXzI6OnZlY3Rvcjxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiA+OjpfX2NvbnN0cnVjdF9hdF9lbmQodW5zaWduZWQgbG9uZywgZG91YmxlIGNvbnN0JilvWHN0ZDo6X18yOjp2ZWN0b3I8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4gPjo6X19yZWNvbW1lbmQodW5zaWduZWQgbG9uZykgY29uc3RwigFzdGQ6Ol9fMjo6X19zcGxpdF9idWZmZXI8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4mPjo6X19zcGxpdF9idWZmZXIodW5zaWduZWQgbG9uZywgdW5zaWduZWQgbG9uZywgc3RkOjpfXzI6OmFsbG9jYXRvcjxkb3VibGU+JilxcHN0ZDo6X18yOjpfX3NwbGl0X2J1ZmZlcjxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiY+OjpfX2NvbnN0cnVjdF9hdF9lbmQodW5zaWduZWQgbG9uZywgZG91YmxlIGNvbnN0JilykwFzdGQ6Ol9fMjo6dmVjdG9yPGRvdWJsZSwgc3RkOjpfXzI6OmFsbG9jYXRvcjxkb3VibGU+ID46Ol9fc3dhcF9vdXRfY2lyY3VsYXJfYnVmZmVyKHN0ZDo6X18yOjpfX3NwbGl0X2J1ZmZlcjxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiY+JilzXnN0ZDo6X18yOjp2ZWN0b3I8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4gPjo6X19hbm5vdGF0ZV9zaHJpbmsodW5zaWduZWQgbG9uZykgY29uc3R0lQF2b2lkIHN0ZDo6X18yOjphbGxvY2F0b3JfdHJhaXRzPHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiA+Ojpjb25zdHJ1Y3Q8ZG91YmxlLCBkb3VibGUgY29uc3QmPihzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4mLCBkb3VibGUqLCBkb3VibGUgY29uc3QmKXVIc3RkOjpfXzI6OnZlY3Rvcjxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiA+OjptYXhfc2l6ZSgpIGNvbnN0dtkCc3RkOjpfXzI6OmVuYWJsZV9pZjwoKHN0ZDo6X18yOjppbnRlZ3JhbF9jb25zdGFudDxib29sLCB0cnVlPjo6dmFsdWUpIHx8ICghKF9faGFzX2NvbnN0cnVjdDxzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4sIGJvb2wqLCBib29sPjo6dmFsdWUpKSkgJiYgKGlzX3RyaXZpYWxseV9tb3ZlX2NvbnN0cnVjdGlibGU8Ym9vbD46OnZhbHVlKSwgdm9pZD46OnR5cGUgc3RkOjpfXzI6OmFsbG9jYXRvcl90cmFpdHM8c3RkOjpfXzI6OmFsbG9jYXRvcjxkb3VibGU+ID46Ol9fY29uc3RydWN0X2JhY2t3YXJkPGRvdWJsZT4oc3RkOjpfXzI6OmFsbG9jYXRvcjxkb3VibGU+JiwgYm9vbCosIGJvb2wqLCBib29sKiYpd5wBc3RkOjpfXzI6OmVuYWJsZV9pZjwoaXNfbW92ZV9jb25zdHJ1Y3RpYmxlPGRvdWJsZSo+Ojp2YWx1ZSkgJiYgKGlzX21vdmVfYXNzaWduYWJsZTxkb3VibGUqPjo6dmFsdWUpLCB2b2lkPjo6dHlwZSBzdGQ6Ol9fMjo6c3dhcDxkb3VibGUqPihkb3VibGUqJiwgZG91YmxlKiYpeFtzdGQ6Ol9fMjo6dmVjdG9yPGRvdWJsZSwgc3RkOjpfXzI6OmFsbG9jYXRvcjxkb3VibGU+ID46Ol9fYW5ub3RhdGVfbmV3KHVuc2lnbmVkIGxvbmcpIGNvbnN0eb4BdW5zaWduZWQgbG9uZyBjb25zdCYgc3RkOjpfXzI6Om1heDx1bnNpZ25lZCBsb25nLCBzdGQ6Ol9fMjo6X19sZXNzPHVuc2lnbmVkIGxvbmcsIHVuc2lnbmVkIGxvbmc+ID4odW5zaWduZWQgbG9uZyBjb25zdCYsIHVuc2lnbmVkIGxvbmcgY29uc3QmLCBzdGQ6Ol9fMjo6X19sZXNzPHVuc2lnbmVkIGxvbmcsIHVuc2lnbmVkIGxvbmc+KXq+AXVuc2lnbmVkIGxvbmcgY29uc3QmIHN0ZDo6X18yOjptaW48dW5zaWduZWQgbG9uZywgc3RkOjpfXzI6Ol9fbGVzczx1bnNpZ25lZCBsb25nLCB1bnNpZ25lZCBsb25nPiA+KHVuc2lnbmVkIGxvbmcgY29uc3QmLCB1bnNpZ25lZCBsb25nIGNvbnN0Jiwgc3RkOjpfXzI6Ol9fbGVzczx1bnNpZ25lZCBsb25nLCB1bnNpZ25lZCBsb25nPil7bHN0ZDo6X18yOjpfX2xlc3M8dW5zaWduZWQgbG9uZywgdW5zaWduZWQgbG9uZz46Om9wZXJhdG9yKCkodW5zaWduZWQgbG9uZyBjb25zdCYsIHVuc2lnbmVkIGxvbmcgY29uc3QmKSBjb25zdHwrc3RkOjpfXzI6Ol9fdGhyb3dfbGVuZ3RoX2Vycm9yKGNoYXIgY29uc3QqKX2EAXN0ZDo6X18yOjpfX3NwbGl0X2J1ZmZlcjxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiY+OjpfX2Rlc3RydWN0X2F0X2VuZChkb3VibGUqLCBzdGQ6Ol9fMjo6aW50ZWdyYWxfY29uc3RhbnQ8Ym9vbCwgZmFsc2U+KX6lAkVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4gc3RkOjpfXzI6Ol9fdW53cmFwX2l0ZXI8RWlnZW46OmludGVybmFsOjpwb2ludGVyX2Jhc2VkX3N0bF9pdGVyYXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0PiA+KEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4pf48Bc3RkOjpfXzI6OmVuYWJsZV9pZjxpc190cml2aWFsbHlfY29weV9hc3NpZ25hYmxlPGRvdWJsZT46OnZhbHVlLCBkb3VibGUqPjo6dHlwZSBzdGQ6Ol9fMjo6X191bndyYXBfaXRlcjxkb3VibGU+KHN0ZDo6X18yOjpfX3dyYXBfaXRlcjxkb3VibGUqPimAAbgCZG91YmxlKiBzdGQ6Ol9fMjo6X19jb3B5PEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4sIGRvdWJsZSo+KEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4sIEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4sIGRvdWJsZSopgQHLAUVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD46Om9wZXJhdG9yIT0oRWlnZW46OmludGVybmFsOjpwb2ludGVyX2Jhc2VkX3N0bF9pdGVyYXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0PiBjb25zdCYpIGNvbnN0ggFmRWlnZW46OmludGVybmFsOjpwb2ludGVyX2Jhc2VkX3N0bF9pdGVyYXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0Pjo6b3BlcmF0b3IrKygpgwGqAkVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiA+IHN0ZDo6X18yOjpfX2NvcHk8ZG91YmxlKiwgRWlnZW46OmludGVybmFsOjpwb2ludGVyX2Jhc2VkX3N0bF9pdGVyYXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+ID4gPihkb3VibGUqLCBkb3VibGUqLCBFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gPimEAVhFbXNjcmlwdGVuQmluZGluZ0luaXRpYWxpemVyX2F1ZGlvX2NhcHR1cmU6OkVtc2NyaXB0ZW5CaW5kaW5nSW5pdGlhbGl6ZXJfYXVkaW9fY2FwdHVyZSgphQFMdm9pZCBjb25zdCogZW1zY3JpcHRlbjo6aW50ZXJuYWw6OmdldEFjdHVhbFR5cGU8QXVkaW9DYXB0dXJlPihBdWRpb0NhcHR1cmUqKYYBRnZvaWQgZW1zY3JpcHRlbjo6aW50ZXJuYWw6OnJhd19kZXN0cnVjdG9yPEF1ZGlvQ2FwdHVyZT4oQXVkaW9DYXB0dXJlKimHAUpBdWRpb0NhcHR1cmUqIGVtc2NyaXB0ZW46OmludGVybmFsOjpvcGVyYXRvcl9uZXc8QXVkaW9DYXB0dXJlLCBpbnQ+KGludCYmKYgBfXZvaWQgZW1zY3JpcHRlbjo6aW50ZXJuYWw6OlJlZ2lzdGVyQ2xhc3NDb25zdHJ1Y3RvcjxBdWRpb0NhcHR1cmUqICgqKShpbnQmJik+OjppbnZva2U8QXVkaW9DYXB0dXJlPihBdWRpb0NhcHR1cmUqICgqKShpbnQmJikpiQHTAXZvaWQgZW1zY3JpcHRlbjo6aW50ZXJuYWw6OlJlZ2lzdGVyQ2xhc3NNZXRob2Q8dm9pZCAoQXVkaW9DYXB0dXJlOjoqKSh1bnNpZ25lZCBsb25nLCBpbnQsIGludCk+OjppbnZva2U8QXVkaW9DYXB0dXJlLCBlbXNjcmlwdGVuOjphbGxvd19yYXdfcG9pbnRlcnM+KGNoYXIgY29uc3QqLCB2b2lkIChBdWRpb0NhcHR1cmU6OiopKHVuc2lnbmVkIGxvbmcsIGludCwgaW50KSmKAYMBdm9pZCBlbXNjcmlwdGVuOjppbnRlcm5hbDo6UmVnaXN0ZXJDbGFzc01ldGhvZDxpbnQgKEF1ZGlvQ2FwdHVyZTo6KikoKT46Omludm9rZTxBdWRpb0NhcHR1cmU+KGNoYXIgY29uc3QqLCBpbnQgKEF1ZGlvQ2FwdHVyZTo6KikoKSmLAaMBdm9pZCBlbXNjcmlwdGVuOjppbnRlcm5hbDo6UmVnaXN0ZXJDbGFzc01ldGhvZDx2b2lkIChBdWRpb0NhcHR1cmU6OiopKGVtc2NyaXB0ZW46OnZhbCk+OjppbnZva2U8QXVkaW9DYXB0dXJlPihjaGFyIGNvbnN0Kiwgdm9pZCAoQXVkaW9DYXB0dXJlOjoqKShlbXNjcmlwdGVuOjp2YWwpKYwBWmVtc2NyaXB0ZW46OmludGVybmFsOjpJbnZva2VyPEF1ZGlvQ2FwdHVyZSosIGludCYmPjo6aW52b2tlKEF1ZGlvQ2FwdHVyZSogKCopKGludCYmKSwgaW50KY0B6gFlbXNjcmlwdGVuOjppbnRlcm5hbDo6TWV0aG9kSW52b2tlcjx2b2lkIChBdWRpb0NhcHR1cmU6OiopKHVuc2lnbmVkIGxvbmcsIGludCwgaW50KSwgdm9pZCwgQXVkaW9DYXB0dXJlKiwgdW5zaWduZWQgbG9uZywgaW50LCBpbnQ+OjppbnZva2Uodm9pZCAoQXVkaW9DYXB0dXJlOjoqIGNvbnN0JikodW5zaWduZWQgbG9uZywgaW50LCBpbnQpLCBBdWRpb0NhcHR1cmUqLCB1bnNpZ25lZCBsb25nLCBpbnQsIGludCmOAbkBdm9pZCAoQXVkaW9DYXB0dXJlOjoqKmVtc2NyaXB0ZW46OmludGVybmFsOjpnZXRDb250ZXh0PHZvaWQgKEF1ZGlvQ2FwdHVyZTo6KikodW5zaWduZWQgbG9uZywgaW50LCBpbnQpPih2b2lkIChBdWRpb0NhcHR1cmU6OiogY29uc3QmKSh1bnNpZ25lZCBsb25nLCBpbnQsIGludCkpKSh1bnNpZ25lZCBsb25nLCBpbnQsIGludCmPAYcBZW1zY3JpcHRlbjo6aW50ZXJuYWw6Ok1ldGhvZEludm9rZXI8aW50IChBdWRpb0NhcHR1cmU6OiopKCksIGludCwgQXVkaW9DYXB0dXJlKj46Omludm9rZShpbnQgKEF1ZGlvQ2FwdHVyZTo6KiBjb25zdCYpKCksIEF1ZGlvQ2FwdHVyZSopkAHZAWVtc2NyaXB0ZW46OmludGVybmFsOjpNZXRob2RJbnZva2VyPHZvaWQgKEF1ZGlvQ2FwdHVyZTo6KikoZW1zY3JpcHRlbjo6dmFsKSwgdm9pZCwgQXVkaW9DYXB0dXJlKiwgZW1zY3JpcHRlbjo6dmFsPjo6aW52b2tlKHZvaWQgKEF1ZGlvQ2FwdHVyZTo6KiBjb25zdCYpKGVtc2NyaXB0ZW46OnZhbCksIEF1ZGlvQ2FwdHVyZSosIGVtc2NyaXB0ZW46OmludGVybmFsOjpfRU1fVkFMKimRARtvcGVyYXRvciBuZXcodW5zaWduZWQgbG9uZymSAQZzdHJsZW6TARtzdGQ6OmV4Y2VwdGlvbjo6ZXhjZXB0aW9uKCmUAT1zdGQ6Ol9fMjo6X19saWJjcHBfcmVmc3RyaW5nOjpfX2xpYmNwcF9yZWZzdHJpbmcoY2hhciBjb25zdCoplQEQX19lcnJub19sb2NhdGlvbpYBGXN0ZDo6dW5jYXVnaHRfZXhjZXB0aW9uKCmXARxzdGQ6OmV4Y2VwdGlvbjo6d2hhdCgpIGNvbnN0mAEcc3RkOjpiYWRfYWxsb2M6OndoYXQoKSBjb25zdJkBIHN0ZDo6bG9naWNfZXJyb3I6On5sb2dpY19lcnJvcigpmgEzc3RkOjpfXzI6Ol9fbGliY3BwX3JlZnN0cmluZzo6fl9fbGliY3BwX3JlZnN0cmluZygpmwEic3RkOjpsb2dpY19lcnJvcjo6fmxvZ2ljX2Vycm9yKCkuMZwBInN0ZDo6bGVuZ3RoX2Vycm9yOjp+bGVuZ3RoX2Vycm9yKCmdAQZzdHJjbXCeAWFfX2N4eGFiaXYxOjpfX2Z1bmRhbWVudGFsX3R5cGVfaW5mbzo6Y2FuX2NhdGNoKF9fY3h4YWJpdjE6Ol9fc2hpbV90eXBlX2luZm8gY29uc3QqLCB2b2lkKiYpIGNvbnN0nwE8aXNfZXF1YWwoc3RkOjp0eXBlX2luZm8gY29uc3QqLCBzdGQ6OnR5cGVfaW5mbyBjb25zdCosIGJvb2wpoAFbX19jeHhhYml2MTo6X19jbGFzc190eXBlX2luZm86OmNhbl9jYXRjaChfX2N4eGFiaXYxOjpfX3NoaW1fdHlwZV9pbmZvIGNvbnN0Kiwgdm9pZComKSBjb25zdKEBDl9fZHluYW1pY19jYXN0ogFrX19jeHhhYml2MTo6X19jbGFzc190eXBlX2luZm86OnByb2Nlc3NfZm91bmRfYmFzZV9jbGFzcyhfX2N4eGFiaXYxOjpfX2R5bmFtaWNfY2FzdF9pbmZvKiwgdm9pZCosIGludCkgY29uc3SjAW5fX2N4eGFiaXYxOjpfX2NsYXNzX3R5cGVfaW5mbzo6aGFzX3VuYW1iaWd1b3VzX3B1YmxpY19iYXNlKF9fY3h4YWJpdjE6Ol9fZHluYW1pY19jYXN0X2luZm8qLCB2b2lkKiwgaW50KSBjb25zdKQBcV9fY3h4YWJpdjE6Ol9fc2lfY2xhc3NfdHlwZV9pbmZvOjpoYXNfdW5hbWJpZ3VvdXNfcHVibGljX2Jhc2UoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQqLCBpbnQpIGNvbnN0pQFzX19jeHhhYml2MTo6X19iYXNlX2NsYXNzX3R5cGVfaW5mbzo6aGFzX3VuYW1iaWd1b3VzX3B1YmxpY19iYXNlKF9fY3h4YWJpdjE6Ol9fZHluYW1pY19jYXN0X2luZm8qLCB2b2lkKiwgaW50KSBjb25zdKYBcl9fY3h4YWJpdjE6Ol9fdm1pX2NsYXNzX3R5cGVfaW5mbzo6aGFzX3VuYW1iaWd1b3VzX3B1YmxpY19iYXNlKF9fY3h4YWJpdjE6Ol9fZHluYW1pY19jYXN0X2luZm8qLCB2b2lkKiwgaW50KSBjb25zdKcBW19fY3h4YWJpdjE6Ol9fcGJhc2VfdHlwZV9pbmZvOjpjYW5fY2F0Y2goX19jeHhhYml2MTo6X19zaGltX3R5cGVfaW5mbyBjb25zdCosIHZvaWQqJikgY29uc3SoAV1fX2N4eGFiaXYxOjpfX3BvaW50ZXJfdHlwZV9pbmZvOjpjYW5fY2F0Y2goX19jeHhhYml2MTo6X19zaGltX3R5cGVfaW5mbyBjb25zdCosIHZvaWQqJikgY29uc3SpAVxfX2N4eGFiaXYxOjpfX3BvaW50ZXJfdHlwZV9pbmZvOjpjYW5fY2F0Y2hfbmVzdGVkKF9fY3h4YWJpdjE6Ol9fc2hpbV90eXBlX2luZm8gY29uc3QqKSBjb25zdKoBZl9fY3h4YWJpdjE6Ol9fcG9pbnRlcl90b19tZW1iZXJfdHlwZV9pbmZvOjpjYW5fY2F0Y2hfbmVzdGVkKF9fY3h4YWJpdjE6Ol9fc2hpbV90eXBlX2luZm8gY29uc3QqKSBjb25zdKsBgwFfX2N4eGFiaXYxOjpfX2NsYXNzX3R5cGVfaW5mbzo6cHJvY2Vzc19zdGF0aWNfdHlwZV9hYm92ZV9kc3QoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQgY29uc3QqLCB2b2lkIGNvbnN0KiwgaW50KSBjb25zdKwBdl9fY3h4YWJpdjE6Ol9fY2xhc3NfdHlwZV9pbmZvOjpwcm9jZXNzX3N0YXRpY190eXBlX2JlbG93X2RzdChfX2N4eGFiaXYxOjpfX2R5bmFtaWNfY2FzdF9pbmZvKiwgdm9pZCBjb25zdCosIGludCkgY29uc3StAXNfX2N4eGFiaXYxOjpfX3ZtaV9jbGFzc190eXBlX2luZm86OnNlYXJjaF9iZWxvd19kc3QoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQgY29uc3QqLCBpbnQsIGJvb2wpIGNvbnN0rgGBAV9fY3h4YWJpdjE6Ol9fYmFzZV9jbGFzc190eXBlX2luZm86OnNlYXJjaF9hYm92ZV9kc3QoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQgY29uc3QqLCB2b2lkIGNvbnN0KiwgaW50LCBib29sKSBjb25zdK8BdF9fY3h4YWJpdjE6Ol9fYmFzZV9jbGFzc190eXBlX2luZm86OnNlYXJjaF9iZWxvd19kc3QoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQgY29uc3QqLCBpbnQsIGJvb2wpIGNvbnN0sAFyX19jeHhhYml2MTo6X19zaV9jbGFzc190eXBlX2luZm86OnNlYXJjaF9iZWxvd19kc3QoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQgY29uc3QqLCBpbnQsIGJvb2wpIGNvbnN0sQFvX19jeHhhYml2MTo6X19jbGFzc190eXBlX2luZm86OnNlYXJjaF9iZWxvd19kc3QoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQgY29uc3QqLCBpbnQsIGJvb2wpIGNvbnN0sgGAAV9fY3h4YWJpdjE6Ol9fdm1pX2NsYXNzX3R5cGVfaW5mbzo6c2VhcmNoX2Fib3ZlX2RzdChfX2N4eGFiaXYxOjpfX2R5bmFtaWNfY2FzdF9pbmZvKiwgdm9pZCBjb25zdCosIHZvaWQgY29uc3QqLCBpbnQsIGJvb2wpIGNvbnN0swF/X19jeHhhYml2MTo6X19zaV9jbGFzc190eXBlX2luZm86OnNlYXJjaF9hYm92ZV9kc3QoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQgY29uc3QqLCB2b2lkIGNvbnN0KiwgaW50LCBib29sKSBjb25zdLQBfF9fY3h4YWJpdjE6Ol9fY2xhc3NfdHlwZV9pbmZvOjpzZWFyY2hfYWJvdmVfZHN0KF9fY3h4YWJpdjE6Ol9fZHluYW1pY19jYXN0X2luZm8qLCB2b2lkIGNvbnN0Kiwgdm9pZCBjb25zdCosIGludCwgYm9vbCkgY29uc3S1AQhfX3N0cmR1cLYBDV9fZ2V0VHlwZU5hbWW3ASpfX2VtYmluZF9yZWdpc3Rlcl9uYXRpdmVfYW5kX2J1aWx0aW5fdHlwZXO4AT92b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfaW50ZWdlcjxjaGFyPihjaGFyIGNvbnN0Kim5AUZ2b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfaW50ZWdlcjxzaWduZWQgY2hhcj4oY2hhciBjb25zdCopugFIdm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX2ludGVnZXI8dW5zaWduZWQgY2hhcj4oY2hhciBjb25zdCopuwFAdm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX2ludGVnZXI8c2hvcnQ+KGNoYXIgY29uc3QqKbwBSXZvaWQgKGFub255bW91cyBuYW1lc3BhY2UpOjpyZWdpc3Rlcl9pbnRlZ2VyPHVuc2lnbmVkIHNob3J0PihjaGFyIGNvbnN0Kim9AT52b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfaW50ZWdlcjxpbnQ+KGNoYXIgY29uc3QqKb4BR3ZvaWQgKGFub255bW91cyBuYW1lc3BhY2UpOjpyZWdpc3Rlcl9pbnRlZ2VyPHVuc2lnbmVkIGludD4oY2hhciBjb25zdCopvwE/dm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX2ludGVnZXI8bG9uZz4oY2hhciBjb25zdCopwAFIdm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX2ludGVnZXI8dW5zaWduZWQgbG9uZz4oY2hhciBjb25zdCopwQE+dm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX2Zsb2F0PGZsb2F0PihjaGFyIGNvbnN0KinCAT92b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfZmxvYXQ8ZG91YmxlPihjaGFyIGNvbnN0KinDAUN2b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfbWVtb3J5X3ZpZXc8Y2hhcj4oY2hhciBjb25zdCopxAFKdm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX21lbW9yeV92aWV3PHNpZ25lZCBjaGFyPihjaGFyIGNvbnN0KinFAUx2b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfbWVtb3J5X3ZpZXc8dW5zaWduZWQgY2hhcj4oY2hhciBjb25zdCopxgFEdm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX21lbW9yeV92aWV3PHNob3J0PihjaGFyIGNvbnN0KinHAU12b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfbWVtb3J5X3ZpZXc8dW5zaWduZWQgc2hvcnQ+KGNoYXIgY29uc3QqKcgBQnZvaWQgKGFub255bW91cyBuYW1lc3BhY2UpOjpyZWdpc3Rlcl9tZW1vcnlfdmlldzxpbnQ+KGNoYXIgY29uc3QqKckBS3ZvaWQgKGFub255bW91cyBuYW1lc3BhY2UpOjpyZWdpc3Rlcl9tZW1vcnlfdmlldzx1bnNpZ25lZCBpbnQ+KGNoYXIgY29uc3QqKcoBQ3ZvaWQgKGFub255bW91cyBuYW1lc3BhY2UpOjpyZWdpc3Rlcl9tZW1vcnlfdmlldzxsb25nPihjaGFyIGNvbnN0KinLAUx2b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfbWVtb3J5X3ZpZXc8dW5zaWduZWQgbG9uZz4oY2hhciBjb25zdCopzAFEdm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX21lbW9yeV92aWV3PGZsb2F0PihjaGFyIGNvbnN0KinNAUV2b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfbWVtb3J5X3ZpZXc8ZG91YmxlPihjaGFyIGNvbnN0KinOAW5FbXNjcmlwdGVuQmluZGluZ0luaXRpYWxpemVyX25hdGl2ZV9hbmRfYnVpbHRpbl90eXBlczo6RW1zY3JpcHRlbkJpbmRpbmdJbml0aWFsaXplcl9uYXRpdmVfYW5kX2J1aWx0aW5fdHlwZXMoKc8BCGRsbWFsbG9j0AEGZGxmcmVl0QEJZGxyZWFsbG9j0gERdHJ5X3JlYWxsb2NfY2h1bmvTAQ1kaXNwb3NlX2NodW5r1AEEc2Jya9UBBm1lbWNwedYBBm1lbXNldNcBB21lbW1vdmXYAQhzZXRUaHJld9kBCXN0YWNrU2F2ZdoBCnN0YWNrQWxsb2PbAQxzdGFja1Jlc3RvcmXcARBfX2dyb3dXYXNtTWVtb3J53QEKZHluQ2FsbF9pad4BCmR5bkNhbGxfdmnfAQ1keW5DYWxsX3ZpaWlp4AELZHluQ2FsbF92aWnhAQtkeW5DYWxsX2lpaeIBDmR5bkNhbGxfdmlpaWlp4wEMZHluQ2FsbF92aWlp5AEMZHluQ2FsbF9paWlp5QEPZHluQ2FsbF92aWlpaWlp';
if (!isDataURI(wasmBinaryFile)) {
  wasmBinaryFile = locateFile(wasmBinaryFile);
}

function getBinary() {
  try {
    if (wasmBinary) {
      return new Uint8Array(wasmBinary);
    }

    var binary = tryParseAsDataURI(wasmBinaryFile);
    if (binary) {
      return binary;
    }
    if (readBinary) {
      return readBinary(wasmBinaryFile);
    } else {
      throw "sync fetching of the wasm failed: you can preload it to Module['wasmBinary'] manually, or emcc.py will do that for you when generating HTML (but not JS)";
    }
  }
  catch (err) {
    abort(err);
  }
}

function getBinaryPromise() {
  // if we don't have the binary yet, and have the Fetch api, use that
  // in some environments, like Electron's render process, Fetch api may be present, but have a different context than expected, let's only use it on the Web
  if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === 'function') {
    return fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function(response) {
      if (!response['ok']) {
        throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
      }
      return response['arrayBuffer']();
    }).catch(function () {
      return getBinary();
    });
  }
  // Otherwise, getBinary should be able to get it synchronously
  return new Promise(function(resolve, reject) {
    resolve(getBinary());
  });
}



// Create the wasm instance.
// Receives the wasm imports, returns the exports.
function createWasm() {
  // prepare imports
  var info = {
    'env': asmLibraryArg,
    'wasi_unstable': asmLibraryArg
  };
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  function receiveInstance(instance, module) {
    var exports = instance.exports;
    Module['asm'] = exports;
    removeRunDependency('wasm-instantiate');
  }
   // we can't run yet (except in a pthread, where we have a custom sync instantiator)
  addRunDependency('wasm-instantiate');


  function receiveInstantiatedSource(output) {
    // 'output' is a WebAssemblyInstantiatedSource object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
      // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
      // When the regression is fixed, can restore the above USE_PTHREADS-enabled path.
    receiveInstance(output['instance']);
  }


  function instantiateArrayBuffer(receiver) {
    return getBinaryPromise().then(function(binary) {
      return WebAssembly.instantiate(binary, info);
    }).then(receiver, function(reason) {
      err('failed to asynchronously prepare wasm: ' + reason);
      abort(reason);
    });
  }

  // Prefer streaming instantiation if available.
  function instantiateSync() {
    var instance;
    var module;
    var binary;
    try {
      binary = getBinary();
      module = new WebAssembly.Module(binary);
      instance = new WebAssembly.Instance(module, info);
    } catch (e) {
      var str = e.toString();
      err('failed to compile wasm module: ' + str);
      if (str.indexOf('imported Memory') >= 0 ||
          str.indexOf('memory import') >= 0) {
        err('Memory size incompatibility issues may be due to changing TOTAL_MEMORY at runtime to something too large. Use ALLOW_MEMORY_GROWTH to allow any size memory (and also make sure not to set TOTAL_MEMORY at runtime to something smaller than it was at compile time).');
      }
      throw e;
    }
    receiveInstance(instance, module);
  }
  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to run the instantiation parallel
  // to any other async startup actions they are performing.
  if (Module['instantiateWasm']) {
    try {
      var exports = Module['instantiateWasm'](info, receiveInstance);
      return exports;
    } catch(e) {
      err('Module.instantiateWasm callback failed with error: ' + e);
      return false;
    }
  }

  instantiateSync();
  return Module['asm']; // exports were assigned here
}


// Globals used by JS i64 conversions
var tempDouble;
var tempI64;

// === Body ===

var ASM_CONSTS = {
  
};




// STATICTOP = STATIC_BASE + 6128;
/* global initializers */  __ATINIT__.push({ func: function() { ___wasm_call_ctors() } });



/* no memory initializer */
// {{PRE_LIBRARY}}


  function demangle(func) {
      return func;
    }

  function demangleAll(text) {
      var regex =
        /\b_Z[\w\d_]+/g;
      return text.replace(regex,
        function(x) {
          var y = demangle(x);
          return x === y ? x : (y + ' [' + x + ']');
        });
    }

  function jsStackTrace() {
      var err = new Error();
      if (!err.stack) {
        // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
        // so try that as a special-case.
        try {
          throw new Error(0);
        } catch(e) {
          err = e;
        }
        if (!err.stack) {
          return '(no stack trace available)';
        }
      }
      return err.stack.toString();
    }

  function stackTrace() {
      var js = jsStackTrace();
      if (Module['extraStackTrace']) js += '\n' + Module['extraStackTrace']();
      return demangleAll(js);
    }

  function ___assert_fail(condition, filename, line, func) {
      abort('Assertion failed: ' + UTF8ToString(condition) + ', at: ' + [filename ? UTF8ToString(filename) : 'unknown filename', line, func ? UTF8ToString(func) : 'unknown function']);
    }

  function ___cxa_allocate_exception(size) {
      return _malloc(size);
    }

  
  var ___exception_infos={};
  
  var ___exception_last=0;function ___cxa_throw(ptr, type, destructor) {
      ___exception_infos[ptr] = {
        ptr: ptr,
        adjusted: [ptr],
        type: type,
        destructor: destructor,
        refcount: 0,
        caught: false,
        rethrown: false
      };
      ___exception_last = ptr;
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exceptions = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exceptions++;
      }
      throw ptr;
    }

  
  function getShiftFromSize(size) {
      switch (size) {
          case 1: return 0;
          case 2: return 1;
          case 4: return 2;
          case 8: return 3;
          default:
              throw new TypeError('Unknown type size: ' + size);
      }
    }
  
  
  
  function embind_init_charCodes() {
      var codes = new Array(256);
      for (var i = 0; i < 256; ++i) {
          codes[i] = String.fromCharCode(i);
      }
      embind_charCodes = codes;
    }var embind_charCodes=undefined;function readLatin1String(ptr) {
      var ret = "";
      var c = ptr;
      while (HEAPU8[c]) {
          ret += embind_charCodes[HEAPU8[c++]];
      }
      return ret;
    }
  
  
  var awaitingDependencies={};
  
  var registeredTypes={};
  
  var typeDependencies={};
  
  
  
  
  
  
  var char_0=48;
  
  var char_9=57;function makeLegalFunctionName(name) {
      if (undefined === name) {
          return '_unknown';
      }
      name = name.replace(/[^a-zA-Z0-9_]/g, '$');
      var f = name.charCodeAt(0);
      if (f >= char_0 && f <= char_9) {
          return '_' + name;
      } else {
          return name;
      }
    }function createNamedFunction(name, body) {
      name = makeLegalFunctionName(name);
      /*jshint evil:true*/
      return new Function(
          "body",
          "return function " + name + "() {\n" +
          "    \"use strict\";" +
          "    return body.apply(this, arguments);\n" +
          "};\n"
      )(body);
    }function extendError(baseErrorType, errorName) {
      var errorClass = createNamedFunction(errorName, function(message) {
          this.name = errorName;
          this.message = message;
  
          var stack = (new Error(message)).stack;
          if (stack !== undefined) {
              this.stack = this.toString() + '\n' +
                  stack.replace(/^Error(:[^\n]*)?\n/, '');
          }
      });
      errorClass.prototype = Object.create(baseErrorType.prototype);
      errorClass.prototype.constructor = errorClass;
      errorClass.prototype.toString = function() {
          if (this.message === undefined) {
              return this.name;
          } else {
              return this.name + ': ' + this.message;
          }
      };
  
      return errorClass;
    }var BindingError=undefined;function throwBindingError(message) {
      throw new BindingError(message);
    }
  
  
  
  var InternalError=undefined;function throwInternalError(message) {
      throw new InternalError(message);
    }function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
      myTypes.forEach(function(type) {
          typeDependencies[type] = dependentTypes;
      });
  
      function onComplete(typeConverters) {
          var myTypeConverters = getTypeConverters(typeConverters);
          if (myTypeConverters.length !== myTypes.length) {
              throwInternalError('Mismatched type converter count');
          }
          for (var i = 0; i < myTypes.length; ++i) {
              registerType(myTypes[i], myTypeConverters[i]);
          }
      }
  
      var typeConverters = new Array(dependentTypes.length);
      var unregisteredTypes = [];
      var registered = 0;
      dependentTypes.forEach(function(dt, i) {
          if (registeredTypes.hasOwnProperty(dt)) {
              typeConverters[i] = registeredTypes[dt];
          } else {
              unregisteredTypes.push(dt);
              if (!awaitingDependencies.hasOwnProperty(dt)) {
                  awaitingDependencies[dt] = [];
              }
              awaitingDependencies[dt].push(function() {
                  typeConverters[i] = registeredTypes[dt];
                  ++registered;
                  if (registered === unregisteredTypes.length) {
                      onComplete(typeConverters);
                  }
              });
          }
      });
      if (0 === unregisteredTypes.length) {
          onComplete(typeConverters);
      }
    }function registerType(rawType, registeredInstance, options) {
      options = options || {};
  
      if (!('argPackAdvance' in registeredInstance)) {
          throw new TypeError('registerType registeredInstance requires argPackAdvance');
      }
  
      var name = registeredInstance.name;
      if (!rawType) {
          throwBindingError('type "' + name + '" must have a positive integer typeid pointer');
      }
      if (registeredTypes.hasOwnProperty(rawType)) {
          if (options.ignoreDuplicateRegistrations) {
              return;
          } else {
              throwBindingError("Cannot register type '" + name + "' twice");
          }
      }
  
      registeredTypes[rawType] = registeredInstance;
      delete typeDependencies[rawType];
  
      if (awaitingDependencies.hasOwnProperty(rawType)) {
          var callbacks = awaitingDependencies[rawType];
          delete awaitingDependencies[rawType];
          callbacks.forEach(function(cb) {
              cb();
          });
      }
    }function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
      var shift = getShiftFromSize(size);
  
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(wt) {
              // ambiguous emscripten ABI: sometimes return values are
              // true or false, and sometimes integers (0 or 1)
              return !!wt;
          },
          'toWireType': function(destructors, o) {
              return o ? trueValue : falseValue;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': function(pointer) {
              // TODO: if heap is fixed (like in asm.js) this could be executed outside
              var heap;
              if (size === 1) {
                  heap = HEAP8;
              } else if (size === 2) {
                  heap = HEAP16;
              } else if (size === 4) {
                  heap = HEAP32;
              } else {
                  throw new TypeError("Unknown boolean type size: " + name);
              }
              return this['fromWireType'](heap[pointer >> shift]);
          },
          destructorFunction: null, // This type does not need a destructor
      });
    }

  
  
  
  function ClassHandle_isAliasOf(other) {
      if (!(this instanceof ClassHandle)) {
          return false;
      }
      if (!(other instanceof ClassHandle)) {
          return false;
      }
  
      var leftClass = this.$$.ptrType.registeredClass;
      var left = this.$$.ptr;
      var rightClass = other.$$.ptrType.registeredClass;
      var right = other.$$.ptr;
  
      while (leftClass.baseClass) {
          left = leftClass.upcast(left);
          leftClass = leftClass.baseClass;
      }
  
      while (rightClass.baseClass) {
          right = rightClass.upcast(right);
          rightClass = rightClass.baseClass;
      }
  
      return leftClass === rightClass && left === right;
    }
  
  
  function shallowCopyInternalPointer(o) {
      return {
          count: o.count,
          deleteScheduled: o.deleteScheduled,
          preservePointerOnDelete: o.preservePointerOnDelete,
          ptr: o.ptr,
          ptrType: o.ptrType,
          smartPtr: o.smartPtr,
          smartPtrType: o.smartPtrType,
      };
    }
  
  function throwInstanceAlreadyDeleted(obj) {
      function getInstanceTypeName(handle) {
        return handle.$$.ptrType.registeredClass.name;
      }
      throwBindingError(getInstanceTypeName(obj) + ' instance already deleted');
    }
  
  
  var finalizationGroup=false;
  
  function detachFinalizer(handle) {}
  
  
  function runDestructor($$) {
      if ($$.smartPtr) {
          $$.smartPtrType.rawDestructor($$.smartPtr);
      } else {
          $$.ptrType.registeredClass.rawDestructor($$.ptr);
      }
    }function releaseClassHandle($$) {
      $$.count.value -= 1;
      var toDelete = 0 === $$.count.value;
      if (toDelete) {
          runDestructor($$);
      }
    }function attachFinalizer(handle) {
      if ('undefined' === typeof FinalizationGroup) {
          attachFinalizer = function (handle) { return handle; };
          return handle;
      }
      // If the running environment has a FinalizationGroup (see
      // https://github.com/tc39/proposal-weakrefs), then attach finalizers
      // for class handles.  We check for the presence of FinalizationGroup
      // at run-time, not build-time.
      finalizationGroup = new FinalizationGroup(function (iter) {
          for (var result = iter.next(); !result.done; result = iter.next()) {
              var $$ = result.value;
              if (!$$.ptr) {
                  console.warn('object already deleted: ' + $$.ptr);
              } else {
                  releaseClassHandle($$);
              }
          }
      });
      attachFinalizer = function(handle) {
          finalizationGroup.register(handle, handle.$$, handle.$$);
          return handle;
      };
      detachFinalizer = function(handle) {
          finalizationGroup.unregister(handle.$$);
      };
      return attachFinalizer(handle);
    }function ClassHandle_clone() {
      if (!this.$$.ptr) {
          throwInstanceAlreadyDeleted(this);
      }
  
      if (this.$$.preservePointerOnDelete) {
          this.$$.count.value += 1;
          return this;
      } else {
          var clone = attachFinalizer(Object.create(Object.getPrototypeOf(this), {
              $$: {
                  value: shallowCopyInternalPointer(this.$$),
              }
          }));
  
          clone.$$.count.value += 1;
          clone.$$.deleteScheduled = false;
          return clone;
      }
    }
  
  function ClassHandle_delete() {
      if (!this.$$.ptr) {
          throwInstanceAlreadyDeleted(this);
      }
  
      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
          throwBindingError('Object already scheduled for deletion');
      }
  
      detachFinalizer(this);
      releaseClassHandle(this.$$);
  
      if (!this.$$.preservePointerOnDelete) {
          this.$$.smartPtr = undefined;
          this.$$.ptr = undefined;
      }
    }
  
  function ClassHandle_isDeleted() {
      return !this.$$.ptr;
    }
  
  
  var delayFunction=undefined;
  
  var deletionQueue=[];
  
  function flushPendingDeletes() {
      while (deletionQueue.length) {
          var obj = deletionQueue.pop();
          obj.$$.deleteScheduled = false;
          obj['delete']();
      }
    }function ClassHandle_deleteLater() {
      if (!this.$$.ptr) {
          throwInstanceAlreadyDeleted(this);
      }
      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
          throwBindingError('Object already scheduled for deletion');
      }
      deletionQueue.push(this);
      if (deletionQueue.length === 1 && delayFunction) {
          delayFunction(flushPendingDeletes);
      }
      this.$$.deleteScheduled = true;
      return this;
    }function init_ClassHandle() {
      ClassHandle.prototype['isAliasOf'] = ClassHandle_isAliasOf;
      ClassHandle.prototype['clone'] = ClassHandle_clone;
      ClassHandle.prototype['delete'] = ClassHandle_delete;
      ClassHandle.prototype['isDeleted'] = ClassHandle_isDeleted;
      ClassHandle.prototype['deleteLater'] = ClassHandle_deleteLater;
    }function ClassHandle() {
    }
  
  var registeredPointers={};
  
  
  function ensureOverloadTable(proto, methodName, humanName) {
      if (undefined === proto[methodName].overloadTable) {
          var prevFunc = proto[methodName];
          // Inject an overload resolver function that routes to the appropriate overload based on the number of arguments.
          proto[methodName] = function() {
              // TODO This check can be removed in -O3 level "unsafe" optimizations.
              if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
                  throwBindingError("Function '" + humanName + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + proto[methodName].overloadTable + ")!");
              }
              return proto[methodName].overloadTable[arguments.length].apply(this, arguments);
          };
          // Move the previous function into the overload table.
          proto[methodName].overloadTable = [];
          proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
      }
    }function exposePublicSymbol(name, value, numArguments) {
      if (Module.hasOwnProperty(name)) {
          if (undefined === numArguments || (undefined !== Module[name].overloadTable && undefined !== Module[name].overloadTable[numArguments])) {
              throwBindingError("Cannot register public name '" + name + "' twice");
          }
  
          // We are exposing a function with the same name as an existing function. Create an overload table and a function selector
          // that routes between the two.
          ensureOverloadTable(Module, name, name);
          if (Module.hasOwnProperty(numArguments)) {
              throwBindingError("Cannot register multiple overloads of a function with the same number of arguments (" + numArguments + ")!");
          }
          // Add the new function into the overload table.
          Module[name].overloadTable[numArguments] = value;
      }
      else {
          Module[name] = value;
          if (undefined !== numArguments) {
              Module[name].numArguments = numArguments;
          }
      }
    }
  
  function RegisteredClass(
      name,
      constructor,
      instancePrototype,
      rawDestructor,
      baseClass,
      getActualType,
      upcast,
      downcast
    ) {
      this.name = name;
      this.constructor = constructor;
      this.instancePrototype = instancePrototype;
      this.rawDestructor = rawDestructor;
      this.baseClass = baseClass;
      this.getActualType = getActualType;
      this.upcast = upcast;
      this.downcast = downcast;
      this.pureVirtualFunctions = [];
    }
  
  
  
  function upcastPointer(ptr, ptrClass, desiredClass) {
      while (ptrClass !== desiredClass) {
          if (!ptrClass.upcast) {
              throwBindingError("Expected null or instance of " + desiredClass.name + ", got an instance of " + ptrClass.name);
          }
          ptr = ptrClass.upcast(ptr);
          ptrClass = ptrClass.baseClass;
      }
      return ptr;
    }function constNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
          if (this.isReference) {
              throwBindingError('null is not a valid ' + this.name);
          }
          return 0;
      }
  
      if (!handle.$$) {
          throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
          throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }
  
  function genericPointerToWireType(destructors, handle) {
      var ptr;
      if (handle === null) {
          if (this.isReference) {
              throwBindingError('null is not a valid ' + this.name);
          }
  
          if (this.isSmartPointer) {
              ptr = this.rawConstructor();
              if (destructors !== null) {
                  destructors.push(this.rawDestructor, ptr);
              }
              return ptr;
          } else {
              return 0;
          }
      }
  
      if (!handle.$$) {
          throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
          throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
      }
      if (!this.isConst && handle.$$.ptrType.isConst) {
          throwBindingError('Cannot convert argument of type ' + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + ' to parameter type ' + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
  
      if (this.isSmartPointer) {
          // TODO: this is not strictly true
          // We could support BY_EMVAL conversions from raw pointers to smart pointers
          // because the smart pointer can hold a reference to the handle
          if (undefined === handle.$$.smartPtr) {
              throwBindingError('Passing raw pointer to smart pointer is illegal');
          }
  
          switch (this.sharingPolicy) {
              case 0: // NONE
                  // no upcasting
                  if (handle.$$.smartPtrType === this) {
                      ptr = handle.$$.smartPtr;
                  } else {
                      throwBindingError('Cannot convert argument of type ' + (handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name) + ' to parameter type ' + this.name);
                  }
                  break;
  
              case 1: // INTRUSIVE
                  ptr = handle.$$.smartPtr;
                  break;
  
              case 2: // BY_EMVAL
                  if (handle.$$.smartPtrType === this) {
                      ptr = handle.$$.smartPtr;
                  } else {
                      var clonedHandle = handle['clone']();
                      ptr = this.rawShare(
                          ptr,
                          __emval_register(function() {
                              clonedHandle['delete']();
                          })
                      );
                      if (destructors !== null) {
                          destructors.push(this.rawDestructor, ptr);
                      }
                  }
                  break;
  
              default:
                  throwBindingError('Unsupporting sharing policy');
          }
      }
      return ptr;
    }
  
  function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
      if (handle === null) {
          if (this.isReference) {
              throwBindingError('null is not a valid ' + this.name);
          }
          return 0;
      }
  
      if (!handle.$$) {
          throwBindingError('Cannot pass "' + _embind_repr(handle) + '" as a ' + this.name);
      }
      if (!handle.$$.ptr) {
          throwBindingError('Cannot pass deleted object as a pointer of type ' + this.name);
      }
      if (handle.$$.ptrType.isConst) {
          throwBindingError('Cannot convert argument of type ' + handle.$$.ptrType.name + ' to parameter type ' + this.name);
      }
      var handleClass = handle.$$.ptrType.registeredClass;
      var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
      return ptr;
    }
  
  
  function simpleReadValueFromPointer(pointer) {
      return this['fromWireType'](HEAPU32[pointer >> 2]);
    }
  
  function RegisteredPointer_getPointee(ptr) {
      if (this.rawGetPointee) {
          ptr = this.rawGetPointee(ptr);
      }
      return ptr;
    }
  
  function RegisteredPointer_destructor(ptr) {
      if (this.rawDestructor) {
          this.rawDestructor(ptr);
      }
    }
  
  function RegisteredPointer_deleteObject(handle) {
      if (handle !== null) {
          handle['delete']();
      }
    }
  
  
  function downcastPointer(ptr, ptrClass, desiredClass) {
      if (ptrClass === desiredClass) {
          return ptr;
      }
      if (undefined === desiredClass.baseClass) {
          return null; // no conversion
      }
  
      var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
      if (rv === null) {
          return null;
      }
      return desiredClass.downcast(rv);
    }
  
  
  
  
  function getInheritedInstanceCount() {
      return Object.keys(registeredInstances).length;
    }
  
  function getLiveInheritedInstances() {
      var rv = [];
      for (var k in registeredInstances) {
          if (registeredInstances.hasOwnProperty(k)) {
              rv.push(registeredInstances[k]);
          }
      }
      return rv;
    }
  
  function setDelayFunction(fn) {
      delayFunction = fn;
      if (deletionQueue.length && delayFunction) {
          delayFunction(flushPendingDeletes);
      }
    }function init_embind() {
      Module['getInheritedInstanceCount'] = getInheritedInstanceCount;
      Module['getLiveInheritedInstances'] = getLiveInheritedInstances;
      Module['flushPendingDeletes'] = flushPendingDeletes;
      Module['setDelayFunction'] = setDelayFunction;
    }var registeredInstances={};
  
  function getBasestPointer(class_, ptr) {
      if (ptr === undefined) {
          throwBindingError('ptr should not be undefined');
      }
      while (class_.baseClass) {
          ptr = class_.upcast(ptr);
          class_ = class_.baseClass;
      }
      return ptr;
    }function getInheritedInstance(class_, ptr) {
      ptr = getBasestPointer(class_, ptr);
      return registeredInstances[ptr];
    }
  
  function makeClassHandle(prototype, record) {
      if (!record.ptrType || !record.ptr) {
          throwInternalError('makeClassHandle requires ptr and ptrType');
      }
      var hasSmartPtrType = !!record.smartPtrType;
      var hasSmartPtr = !!record.smartPtr;
      if (hasSmartPtrType !== hasSmartPtr) {
          throwInternalError('Both smartPtrType and smartPtr must be specified');
      }
      record.count = { value: 1 };
      return attachFinalizer(Object.create(prototype, {
          $$: {
              value: record,
          },
      }));
    }function RegisteredPointer_fromWireType(ptr) {
      // ptr is a raw pointer (or a raw smartpointer)
  
      // rawPointer is a maybe-null raw pointer
      var rawPointer = this.getPointee(ptr);
      if (!rawPointer) {
          this.destructor(ptr);
          return null;
      }
  
      var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
      if (undefined !== registeredInstance) {
          // JS object has been neutered, time to repopulate it
          if (0 === registeredInstance.$$.count.value) {
              registeredInstance.$$.ptr = rawPointer;
              registeredInstance.$$.smartPtr = ptr;
              return registeredInstance['clone']();
          } else {
              // else, just increment reference count on existing object
              // it already has a reference to the smart pointer
              var rv = registeredInstance['clone']();
              this.destructor(ptr);
              return rv;
          }
      }
  
      function makeDefaultHandle() {
          if (this.isSmartPointer) {
              return makeClassHandle(this.registeredClass.instancePrototype, {
                  ptrType: this.pointeeType,
                  ptr: rawPointer,
                  smartPtrType: this,
                  smartPtr: ptr,
              });
          } else {
              return makeClassHandle(this.registeredClass.instancePrototype, {
                  ptrType: this,
                  ptr: ptr,
              });
          }
      }
  
      var actualType = this.registeredClass.getActualType(rawPointer);
      var registeredPointerRecord = registeredPointers[actualType];
      if (!registeredPointerRecord) {
          return makeDefaultHandle.call(this);
      }
  
      var toType;
      if (this.isConst) {
          toType = registeredPointerRecord.constPointerType;
      } else {
          toType = registeredPointerRecord.pointerType;
      }
      var dp = downcastPointer(
          rawPointer,
          this.registeredClass,
          toType.registeredClass);
      if (dp === null) {
          return makeDefaultHandle.call(this);
      }
      if (this.isSmartPointer) {
          return makeClassHandle(toType.registeredClass.instancePrototype, {
              ptrType: toType,
              ptr: dp,
              smartPtrType: this,
              smartPtr: ptr,
          });
      } else {
          return makeClassHandle(toType.registeredClass.instancePrototype, {
              ptrType: toType,
              ptr: dp,
          });
      }
    }function init_RegisteredPointer() {
      RegisteredPointer.prototype.getPointee = RegisteredPointer_getPointee;
      RegisteredPointer.prototype.destructor = RegisteredPointer_destructor;
      RegisteredPointer.prototype['argPackAdvance'] = 8;
      RegisteredPointer.prototype['readValueFromPointer'] = simpleReadValueFromPointer;
      RegisteredPointer.prototype['deleteObject'] = RegisteredPointer_deleteObject;
      RegisteredPointer.prototype['fromWireType'] = RegisteredPointer_fromWireType;
    }function RegisteredPointer(
      name,
      registeredClass,
      isReference,
      isConst,
  
      // smart pointer properties
      isSmartPointer,
      pointeeType,
      sharingPolicy,
      rawGetPointee,
      rawConstructor,
      rawShare,
      rawDestructor
    ) {
      this.name = name;
      this.registeredClass = registeredClass;
      this.isReference = isReference;
      this.isConst = isConst;
  
      // smart pointer properties
      this.isSmartPointer = isSmartPointer;
      this.pointeeType = pointeeType;
      this.sharingPolicy = sharingPolicy;
      this.rawGetPointee = rawGetPointee;
      this.rawConstructor = rawConstructor;
      this.rawShare = rawShare;
      this.rawDestructor = rawDestructor;
  
      if (!isSmartPointer && registeredClass.baseClass === undefined) {
          if (isConst) {
              this['toWireType'] = constNoSmartPtrRawPointerToWireType;
              this.destructorFunction = null;
          } else {
              this['toWireType'] = nonConstNoSmartPtrRawPointerToWireType;
              this.destructorFunction = null;
          }
      } else {
          this['toWireType'] = genericPointerToWireType;
          // Here we must leave this.destructorFunction undefined, since whether genericPointerToWireType returns
          // a pointer that needs to be freed up is runtime-dependent, and cannot be evaluated at registration time.
          // TODO: Create an alternative mechanism that allows removing the use of var destructors = []; array in
          //       craftInvokerFunction altogether.
      }
    }
  
  function replacePublicSymbol(name, value, numArguments) {
      if (!Module.hasOwnProperty(name)) {
          throwInternalError('Replacing nonexistant public symbol');
      }
      // If there's an overload table for this symbol, replace the symbol in the overload table instead.
      if (undefined !== Module[name].overloadTable && undefined !== numArguments) {
          Module[name].overloadTable[numArguments] = value;
      }
      else {
          Module[name] = value;
          Module[name].argCount = numArguments;
      }
    }
  
  function embind__requireFunction(signature, rawFunction) {
      signature = readLatin1String(signature);
  
      function makeDynCaller(dynCall) {
          var args = [];
          for (var i = 1; i < signature.length; ++i) {
              args.push('a' + i);
          }
  
          var name = 'dynCall_' + signature + '_' + rawFunction;
          var body = 'return function ' + name + '(' + args.join(', ') + ') {\n';
          body    += '    return dynCall(rawFunction' + (args.length ? ', ' : '') + args.join(', ') + ');\n';
          body    += '};\n';
  
          return (new Function('dynCall', 'rawFunction', body))(dynCall, rawFunction);
      }
  
      var fp;
      if (Module['FUNCTION_TABLE_' + signature] !== undefined) {
          fp = Module['FUNCTION_TABLE_' + signature][rawFunction];
      } else if (typeof FUNCTION_TABLE !== "undefined") {
          fp = FUNCTION_TABLE[rawFunction];
      } else {
          // asm.js does not give direct access to the function tables,
          // and thus we must go through the dynCall interface which allows
          // calling into a signature's function table by pointer value.
          //
          // https://github.com/dherman/asm.js/issues/83
          //
          // This has three main penalties:
          // - dynCall is another function call in the path from JavaScript to C++.
          // - JITs may not predict through the function table indirection at runtime.
          var dc = Module['dynCall_' + signature];
          if (dc === undefined) {
              // We will always enter this branch if the signature
              // contains 'f' and PRECISE_F32 is not enabled.
              //
              // Try again, replacing 'f' with 'd'.
              dc = Module['dynCall_' + signature.replace(/f/g, 'd')];
              if (dc === undefined) {
                  throwBindingError("No dynCall invoker for signature: " + signature);
              }
          }
          fp = makeDynCaller(dc);
      }
  
      if (typeof fp !== "function") {
          throwBindingError("unknown function pointer with signature " + signature + ": " + rawFunction);
      }
      return fp;
    }
  
  
  var UnboundTypeError=undefined;
  
  function getTypeName(type) {
      var ptr = ___getTypeName(type);
      var rv = readLatin1String(ptr);
      _free(ptr);
      return rv;
    }function throwUnboundTypeError(message, types) {
      var unboundTypes = [];
      var seen = {};
      function visit(type) {
          if (seen[type]) {
              return;
          }
          if (registeredTypes[type]) {
              return;
          }
          if (typeDependencies[type]) {
              typeDependencies[type].forEach(visit);
              return;
          }
          unboundTypes.push(type);
          seen[type] = true;
      }
      types.forEach(visit);
  
      throw new UnboundTypeError(message + ': ' + unboundTypes.map(getTypeName).join([', ']));
    }function __embind_register_class(
      rawType,
      rawPointerType,
      rawConstPointerType,
      baseClassRawType,
      getActualTypeSignature,
      getActualType,
      upcastSignature,
      upcast,
      downcastSignature,
      downcast,
      name,
      destructorSignature,
      rawDestructor
    ) {
      name = readLatin1String(name);
      getActualType = embind__requireFunction(getActualTypeSignature, getActualType);
      if (upcast) {
          upcast = embind__requireFunction(upcastSignature, upcast);
      }
      if (downcast) {
          downcast = embind__requireFunction(downcastSignature, downcast);
      }
      rawDestructor = embind__requireFunction(destructorSignature, rawDestructor);
      var legalFunctionName = makeLegalFunctionName(name);
  
      exposePublicSymbol(legalFunctionName, function() {
          // this code cannot run if baseClassRawType is zero
          throwUnboundTypeError('Cannot construct ' + name + ' due to unbound types', [baseClassRawType]);
      });
  
      whenDependentTypesAreResolved(
          [rawType, rawPointerType, rawConstPointerType],
          baseClassRawType ? [baseClassRawType] : [],
          function(base) {
              base = base[0];
  
              var baseClass;
              var basePrototype;
              if (baseClassRawType) {
                  baseClass = base.registeredClass;
                  basePrototype = baseClass.instancePrototype;
              } else {
                  basePrototype = ClassHandle.prototype;
              }
  
              var constructor = createNamedFunction(legalFunctionName, function() {
                  if (Object.getPrototypeOf(this) !== instancePrototype) {
                      throw new BindingError("Use 'new' to construct " + name);
                  }
                  if (undefined === registeredClass.constructor_body) {
                      throw new BindingError(name + " has no accessible constructor");
                  }
                  var body = registeredClass.constructor_body[arguments.length];
                  if (undefined === body) {
                      throw new BindingError("Tried to invoke ctor of " + name + " with invalid number of parameters (" + arguments.length + ") - expected (" + Object.keys(registeredClass.constructor_body).toString() + ") parameters instead!");
                  }
                  return body.apply(this, arguments);
              });
  
              var instancePrototype = Object.create(basePrototype, {
                  constructor: { value: constructor },
              });
  
              constructor.prototype = instancePrototype;
  
              var registeredClass = new RegisteredClass(
                  name,
                  constructor,
                  instancePrototype,
                  rawDestructor,
                  baseClass,
                  getActualType,
                  upcast,
                  downcast);
  
              var referenceConverter = new RegisteredPointer(
                  name,
                  registeredClass,
                  true,
                  false,
                  false);
  
              var pointerConverter = new RegisteredPointer(
                  name + '*',
                  registeredClass,
                  false,
                  false,
                  false);
  
              var constPointerConverter = new RegisteredPointer(
                  name + ' const*',
                  registeredClass,
                  false,
                  true,
                  false);
  
              registeredPointers[rawType] = {
                  pointerType: pointerConverter,
                  constPointerType: constPointerConverter
              };
  
              replacePublicSymbol(legalFunctionName, constructor);
  
              return [referenceConverter, pointerConverter, constPointerConverter];
          }
      );
    }

  
  function heap32VectorToArray(count, firstElement) {
      var array = [];
      for (var i = 0; i < count; i++) {
          array.push(HEAP32[(firstElement >> 2) + i]);
      }
      return array;
    }
  
  function runDestructors(destructors) {
      while (destructors.length) {
          var ptr = destructors.pop();
          var del = destructors.pop();
          del(ptr);
      }
    }function __embind_register_class_constructor(
      rawClassType,
      argCount,
      rawArgTypesAddr,
      invokerSignature,
      invoker,
      rawConstructor
    ) {
      assert(argCount > 0);
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      invoker = embind__requireFunction(invokerSignature, invoker);
      var args = [rawConstructor];
      var destructors = [];
  
      whenDependentTypesAreResolved([], [rawClassType], function(classType) {
          classType = classType[0];
          var humanName = 'constructor ' + classType.name;
  
          if (undefined === classType.registeredClass.constructor_body) {
              classType.registeredClass.constructor_body = [];
          }
          if (undefined !== classType.registeredClass.constructor_body[argCount - 1]) {
              throw new BindingError("Cannot register multiple constructors with identical number of parameters (" + (argCount-1) + ") for class '" + classType.name + "'! Overload resolution is currently only performed using the parameter count, not actual type info!");
          }
          classType.registeredClass.constructor_body[argCount - 1] = function unboundTypeHandler() {
              throwUnboundTypeError('Cannot construct ' + classType.name + ' due to unbound types', rawArgTypes);
          };
  
          whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
              classType.registeredClass.constructor_body[argCount - 1] = function constructor_body() {
                  if (arguments.length !== argCount - 1) {
                      throwBindingError(humanName + ' called with ' + arguments.length + ' arguments, expected ' + (argCount-1));
                  }
                  destructors.length = 0;
                  args.length = argCount;
                  for (var i = 1; i < argCount; ++i) {
                      args[i] = argTypes[i]['toWireType'](destructors, arguments[i - 1]);
                  }
  
                  var ptr = invoker.apply(null, args);
                  runDestructors(destructors);
  
                  return argTypes[0]['fromWireType'](ptr);
              };
              return [];
          });
          return [];
      });
    }

  
  
  function new_(constructor, argumentList) {
      if (!(constructor instanceof Function)) {
          throw new TypeError('new_ called with constructor type ' + typeof(constructor) + " which is not a function");
      }
  
      /*
       * Previously, the following line was just:
  
       function dummy() {};
  
       * Unfortunately, Chrome was preserving 'dummy' as the object's name, even though at creation, the 'dummy' has the
       * correct constructor name.  Thus, objects created with IMVU.new would show up in the debugger as 'dummy', which
       * isn't very helpful.  Using IMVU.createNamedFunction addresses the issue.  Doublely-unfortunately, there's no way
       * to write a test for this behavior.  -NRD 2013.02.22
       */
      var dummy = createNamedFunction(constructor.name || 'unknownFunctionName', function(){});
      dummy.prototype = constructor.prototype;
      var obj = new dummy;
  
      var r = constructor.apply(obj, argumentList);
      return (r instanceof Object) ? r : obj;
    }function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc) {
      // humanName: a human-readable string name for the function to be generated.
      // argTypes: An array that contains the embind type objects for all types in the function signature.
      //    argTypes[0] is the type object for the function return value.
      //    argTypes[1] is the type object for function this object/class type, or null if not crafting an invoker for a class method.
      //    argTypes[2...] are the actual function parameters.
      // classType: The embind type object for the class to be bound, or null if this is not a method of a class.
      // cppInvokerFunc: JS Function object to the C++-side function that interops into C++ code.
      // cppTargetFunc: Function pointer (an integer to FUNCTION_TABLE) to the target C++ function the cppInvokerFunc will end up calling.
      var argCount = argTypes.length;
  
      if (argCount < 2) {
          throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
      }
  
      var isClassMethodFunc = (argTypes[1] !== null && classType !== null);
  
      // Free functions with signature "void function()" do not need an invoker that marshalls between wire types.
  // TODO: This omits argument count check - enable only at -O3 or similar.
  //    if (ENABLE_UNSAFE_OPTS && argCount == 2 && argTypes[0].name == "void" && !isClassMethodFunc) {
  //       return FUNCTION_TABLE[fn];
  //    }
  
  
      // Determine if we need to use a dynamic stack to store the destructors for the function parameters.
      // TODO: Remove this completely once all function invokers are being dynamically generated.
      var needsDestructorStack = false;
  
      for(var i = 1; i < argTypes.length; ++i) { // Skip return value at index 0 - it's not deleted here.
          if (argTypes[i] !== null && argTypes[i].destructorFunction === undefined) { // The type does not define a destructor function - must use dynamic stack
              needsDestructorStack = true;
              break;
          }
      }
  
      var returns = (argTypes[0].name !== "void");
  
      var argsList = "";
      var argsListWired = "";
      for(var i = 0; i < argCount - 2; ++i) {
          argsList += (i!==0?", ":"")+"arg"+i;
          argsListWired += (i!==0?", ":"")+"arg"+i+"Wired";
      }
  
      var invokerFnBody =
          "return function "+makeLegalFunctionName(humanName)+"("+argsList+") {\n" +
          "if (arguments.length !== "+(argCount - 2)+") {\n" +
              "throwBindingError('function "+humanName+" called with ' + arguments.length + ' arguments, expected "+(argCount - 2)+" args!');\n" +
          "}\n";
  
  
      if (needsDestructorStack) {
          invokerFnBody +=
              "var destructors = [];\n";
      }
  
      var dtorStack = needsDestructorStack ? "destructors" : "null";
      var args1 = ["throwBindingError", "invoker", "fn", "runDestructors", "retType", "classParam"];
      var args2 = [throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, argTypes[0], argTypes[1]];
  
  
      if (isClassMethodFunc) {
          invokerFnBody += "var thisWired = classParam.toWireType("+dtorStack+", this);\n";
      }
  
      for(var i = 0; i < argCount - 2; ++i) {
          invokerFnBody += "var arg"+i+"Wired = argType"+i+".toWireType("+dtorStack+", arg"+i+"); // "+argTypes[i+2].name+"\n";
          args1.push("argType"+i);
          args2.push(argTypes[i+2]);
      }
  
      if (isClassMethodFunc) {
          argsListWired = "thisWired" + (argsListWired.length > 0 ? ", " : "") + argsListWired;
      }
  
      invokerFnBody +=
          (returns?"var rv = ":"") + "invoker(fn"+(argsListWired.length>0?", ":"")+argsListWired+");\n";
  
      if (needsDestructorStack) {
          invokerFnBody += "runDestructors(destructors);\n";
      } else {
          for(var i = isClassMethodFunc?1:2; i < argTypes.length; ++i) { // Skip return value at index 0 - it's not deleted here. Also skip class type if not a method.
              var paramName = (i === 1 ? "thisWired" : ("arg"+(i - 2)+"Wired"));
              if (argTypes[i].destructorFunction !== null) {
                  invokerFnBody += paramName+"_dtor("+paramName+"); // "+argTypes[i].name+"\n";
                  args1.push(paramName+"_dtor");
                  args2.push(argTypes[i].destructorFunction);
              }
          }
      }
  
      if (returns) {
          invokerFnBody += "var ret = retType.fromWireType(rv);\n" +
                           "return ret;\n";
      } else {
      }
      invokerFnBody += "}\n";
  
      args1.push(invokerFnBody);
  
      var invokerFunction = new_(Function, args1).apply(null, args2);
      return invokerFunction;
    }function __embind_register_class_function(
      rawClassType,
      methodName,
      argCount,
      rawArgTypesAddr, // [ReturnType, ThisType, Args...]
      invokerSignature,
      rawInvoker,
      context,
      isPureVirtual
    ) {
      var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      methodName = readLatin1String(methodName);
      rawInvoker = embind__requireFunction(invokerSignature, rawInvoker);
  
      whenDependentTypesAreResolved([], [rawClassType], function(classType) {
          classType = classType[0];
          var humanName = classType.name + '.' + methodName;
  
          if (isPureVirtual) {
              classType.registeredClass.pureVirtualFunctions.push(methodName);
          }
  
          function unboundTypesHandler() {
              throwUnboundTypeError('Cannot call ' + humanName + ' due to unbound types', rawArgTypes);
          }
  
          var proto = classType.registeredClass.instancePrototype;
          var method = proto[methodName];
          if (undefined === method || (undefined === method.overloadTable && method.className !== classType.name && method.argCount === argCount - 2)) {
              // This is the first overload to be registered, OR we are replacing a function in the base class with a function in the derived class.
              unboundTypesHandler.argCount = argCount - 2;
              unboundTypesHandler.className = classType.name;
              proto[methodName] = unboundTypesHandler;
          } else {
              // There was an existing function with the same name registered. Set up a function overload routing table.
              ensureOverloadTable(proto, methodName, humanName);
              proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler;
          }
  
          whenDependentTypesAreResolved([], rawArgTypes, function(argTypes) {
  
              var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context);
  
              // Replace the initial unbound-handler-stub function with the appropriate member function, now that all types
              // are resolved. If multiple overloads are registered for this function, the function goes into an overload table.
              if (undefined === proto[methodName].overloadTable) {
                  // Set argCount in case an overload is registered later
                  memberFunction.argCount = argCount - 2;
                  proto[methodName] = memberFunction;
              } else {
                  proto[methodName].overloadTable[argCount - 2] = memberFunction;
              }
  
              return [];
          });
          return [];
      });
    }

  
  
  var emval_free_list=[];
  
  var emval_handle_array=[{},{value:undefined},{value:null},{value:true},{value:false}];function __emval_decref(handle) {
      if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
          emval_handle_array[handle] = undefined;
          emval_free_list.push(handle);
      }
    }
  
  
  
  function count_emval_handles() {
      var count = 0;
      for (var i = 5; i < emval_handle_array.length; ++i) {
          if (emval_handle_array[i] !== undefined) {
              ++count;
          }
      }
      return count;
    }
  
  function get_first_emval() {
      for (var i = 5; i < emval_handle_array.length; ++i) {
          if (emval_handle_array[i] !== undefined) {
              return emval_handle_array[i];
          }
      }
      return null;
    }function init_emval() {
      Module['count_emval_handles'] = count_emval_handles;
      Module['get_first_emval'] = get_first_emval;
    }function __emval_register(value) {
  
      switch(value){
        case undefined :{ return 1; }
        case null :{ return 2; }
        case true :{ return 3; }
        case false :{ return 4; }
        default:{
          var handle = emval_free_list.length ?
              emval_free_list.pop() :
              emval_handle_array.length;
  
          emval_handle_array[handle] = {refcount: 1, value: value};
          return handle;
          }
        }
    }function __embind_register_emval(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(handle) {
              var rv = emval_handle_array[handle].value;
              __emval_decref(handle);
              return rv;
          },
          'toWireType': function(destructors, value) {
              return __emval_register(value);
          },
          'argPackAdvance': 8,
          'readValueFromPointer': simpleReadValueFromPointer,
          destructorFunction: null, // This type does not need a destructor
  
          // TODO: do we need a deleteObject here?  write a test where
          // emval is passed into JS via an interface
      });
    }

  
  function _embind_repr(v) {
      if (v === null) {
          return 'null';
      }
      var t = typeof v;
      if (t === 'object' || t === 'array' || t === 'function') {
          return v.toString();
      } else {
          return '' + v;
      }
    }
  
  function floatReadValueFromPointer(name, shift) {
      switch (shift) {
          case 2: return function(pointer) {
              return this['fromWireType'](HEAPF32[pointer >> 2]);
          };
          case 3: return function(pointer) {
              return this['fromWireType'](HEAPF64[pointer >> 3]);
          };
          default:
              throw new TypeError("Unknown float type: " + name);
      }
    }function __embind_register_float(rawType, name, size) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': function(value) {
              return value;
          },
          'toWireType': function(destructors, value) {
              // todo: Here we have an opportunity for -O3 level "unsafe" optimizations: we could
              // avoid the following if() and assume value is of proper type.
              if (typeof value !== "number" && typeof value !== "boolean") {
                  throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
              }
              return value;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': floatReadValueFromPointer(name, shift),
          destructorFunction: null, // This type does not need a destructor
      });
    }

  
  function integerReadValueFromPointer(name, shift, signed) {
      // integers are quite common, so generate very specialized functions
      switch (shift) {
          case 0: return signed ?
              function readS8FromPointer(pointer) { return HEAP8[pointer]; } :
              function readU8FromPointer(pointer) { return HEAPU8[pointer]; };
          case 1: return signed ?
              function readS16FromPointer(pointer) { return HEAP16[pointer >> 1]; } :
              function readU16FromPointer(pointer) { return HEAPU16[pointer >> 1]; };
          case 2: return signed ?
              function readS32FromPointer(pointer) { return HEAP32[pointer >> 2]; } :
              function readU32FromPointer(pointer) { return HEAPU32[pointer >> 2]; };
          default:
              throw new TypeError("Unknown integer type: " + name);
      }
    }function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
      name = readLatin1String(name);
      if (maxRange === -1) { // LLVM doesn't have signed and unsigned 32-bit types, so u32 literals come out as 'i32 -1'. Always treat those as max u32.
          maxRange = 4294967295;
      }
  
      var shift = getShiftFromSize(size);
  
      var fromWireType = function(value) {
          return value;
      };
  
      if (minRange === 0) {
          var bitshift = 32 - 8*size;
          fromWireType = function(value) {
              return (value << bitshift) >>> bitshift;
          };
      }
  
      var isUnsignedType = (name.indexOf('unsigned') != -1);
  
      registerType(primitiveType, {
          name: name,
          'fromWireType': fromWireType,
          'toWireType': function(destructors, value) {
              // todo: Here we have an opportunity for -O3 level "unsafe" optimizations: we could
              // avoid the following two if()s and assume value is of proper type.
              if (typeof value !== "number" && typeof value !== "boolean") {
                  throw new TypeError('Cannot convert "' + _embind_repr(value) + '" to ' + this.name);
              }
              if (value < minRange || value > maxRange) {
                  throw new TypeError('Passing a number "' + _embind_repr(value) + '" from JS side to C/C++ side to an argument of type "' + name + '", which is outside the valid range [' + minRange + ', ' + maxRange + ']!');
              }
              return isUnsignedType ? (value >>> 0) : (value | 0);
          },
          'argPackAdvance': 8,
          'readValueFromPointer': integerReadValueFromPointer(name, shift, minRange !== 0),
          destructorFunction: null, // This type does not need a destructor
      });
    }

  function __embind_register_memory_view(rawType, dataTypeIndex, name) {
      var typeMapping = [
          Int8Array,
          Uint8Array,
          Int16Array,
          Uint16Array,
          Int32Array,
          Uint32Array,
          Float32Array,
          Float64Array,
      ];
  
      var TA = typeMapping[dataTypeIndex];
  
      function decodeMemoryView(handle) {
          handle = handle >> 2;
          var heap = HEAPU32;
          var size = heap[handle]; // in elements
          var data = heap[handle + 1]; // byte offset into emscripten heap
          return new TA(heap['buffer'], data, size);
      }
  
      name = readLatin1String(name);
      registerType(rawType, {
          name: name,
          'fromWireType': decodeMemoryView,
          'argPackAdvance': 8,
          'readValueFromPointer': decodeMemoryView,
      }, {
          ignoreDuplicateRegistrations: true,
      });
    }

  function __embind_register_std_string(rawType, name) {
      name = readLatin1String(name);
      var stdStringIsUTF8
      //process only std::string bindings with UTF8 support, in contrast to e.g. std::basic_string<unsigned char>
      = (name === "std::string");
  
      registerType(rawType, {
          name: name,
          'fromWireType': function(value) {
              var length = HEAPU32[value >> 2];
  
              var str;
              if(stdStringIsUTF8) {
                  //ensure null termination at one-past-end byte if not present yet
                  var endChar = HEAPU8[value + 4 + length];
                  var endCharSwap = 0;
                  if(endChar != 0)
                  {
                    endCharSwap = endChar;
                    HEAPU8[value + 4 + length] = 0;
                  }
  
                  var decodeStartPtr = value + 4;
                  //looping here to support possible embedded '0' bytes
                  for (var i = 0; i <= length; ++i) {
                    var currentBytePtr = value + 4 + i;
                    if(HEAPU8[currentBytePtr] == 0)
                    {
                      var stringSegment = UTF8ToString(decodeStartPtr);
                      if(str === undefined)
                        str = stringSegment;
                      else
                      {
                        str += String.fromCharCode(0);
                        str += stringSegment;
                      }
                      decodeStartPtr = currentBytePtr + 1;
                    }
                  }
  
                  if(endCharSwap != 0)
                    HEAPU8[value + 4 + length] = endCharSwap;
              } else {
                  var a = new Array(length);
                  for (var i = 0; i < length; ++i) {
                      a[i] = String.fromCharCode(HEAPU8[value + 4 + i]);
                  }
                  str = a.join('');
              }
  
              _free(value);
  
              return str;
          },
          'toWireType': function(destructors, value) {
              if (value instanceof ArrayBuffer) {
                  value = new Uint8Array(value);
              }
  
              var getLength;
              var valueIsOfTypeString = (typeof value === 'string');
  
              if (!(valueIsOfTypeString || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Int8Array)) {
                  throwBindingError('Cannot pass non-string to std::string');
              }
              if (stdStringIsUTF8 && valueIsOfTypeString) {
                  getLength = function() {return lengthBytesUTF8(value);};
              } else {
                  getLength = function() {return value.length;};
              }
  
              // assumes 4-byte alignment
              var length = getLength();
              var ptr = _malloc(4 + length + 1);
              HEAPU32[ptr >> 2] = length;
  
              if (stdStringIsUTF8 && valueIsOfTypeString) {
                  stringToUTF8(value, ptr + 4, length + 1);
              } else {
                  if(valueIsOfTypeString) {
                      for (var i = 0; i < length; ++i) {
                          var charCode = value.charCodeAt(i);
                          if (charCode > 255) {
                              _free(ptr);
                              throwBindingError('String has UTF-16 code units that do not fit in 8 bits');
                          }
                          HEAPU8[ptr + 4 + i] = charCode;
                      }
                  } else {
                      for (var i = 0; i < length; ++i) {
                          HEAPU8[ptr + 4 + i] = value[i];
                      }
                  }
              }
  
              if (destructors !== null) {
                  destructors.push(_free, ptr);
              }
              return ptr;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': simpleReadValueFromPointer,
          destructorFunction: function(ptr) { _free(ptr); },
      });
    }

  function __embind_register_std_wstring(rawType, charSize, name) {
      // nb. do not cache HEAPU16 and HEAPU32, they may be destroyed by emscripten_resize_heap().
      name = readLatin1String(name);
      var getHeap, shift;
      if (charSize === 2) {
          getHeap = function() { return HEAPU16; };
          shift = 1;
      } else if (charSize === 4) {
          getHeap = function() { return HEAPU32; };
          shift = 2;
      }
      registerType(rawType, {
          name: name,
          'fromWireType': function(value) {
              var HEAP = getHeap();
              var length = HEAPU32[value >> 2];
              var a = new Array(length);
              var start = (value + 4) >> shift;
              for (var i = 0; i < length; ++i) {
                  a[i] = String.fromCharCode(HEAP[start + i]);
              }
              _free(value);
              return a.join('');
          },
          'toWireType': function(destructors, value) {
              // assumes 4-byte alignment
              var length = value.length;
              var ptr = _malloc(4 + length * charSize);
              var HEAP = getHeap();
              HEAPU32[ptr >> 2] = length;
              var start = (ptr + 4) >> shift;
              for (var i = 0; i < length; ++i) {
                  HEAP[start + i] = value.charCodeAt(i);
              }
              if (destructors !== null) {
                  destructors.push(_free, ptr);
              }
              return ptr;
          },
          'argPackAdvance': 8,
          'readValueFromPointer': simpleReadValueFromPointer,
          destructorFunction: function(ptr) { _free(ptr); },
      });
    }

  function __embind_register_void(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, {
          isVoid: true, // void return values can be optimized out sometimes
          name: name,
          'argPackAdvance': 0,
          'fromWireType': function() {
              return undefined;
          },
          'toWireType': function(destructors, o) {
              // TODO: assert if anything else is given?
              return undefined;
          },
      });
    }


  
  function requireHandle(handle) {
      if (!handle) {
          throwBindingError('Cannot use deleted val. handle = ' + handle);
      }
      return emval_handle_array[handle].value;
    }function __emval_set_property(handle, key, value) {
      handle = requireHandle(handle);
      key = requireHandle(key);
      value = requireHandle(value);
      handle[key] = value;
    }

  
  function requireRegisteredType(rawType, humanName) {
      var impl = registeredTypes[rawType];
      if (undefined === impl) {
          throwBindingError(humanName + " has unknown type " + getTypeName(rawType));
      }
      return impl;
    }function __emval_take_value(type, argv) {
      type = requireRegisteredType(type, '_emval_take_value');
      var v = type['readValueFromPointer'](argv);
      return __emval_register(v);
    }

  function _abort() {
      abort();
    }

  function _emscripten_get_heap_size() {
      return HEAP8.length;
    }

  function _emscripten_get_sbrk_ptr() {
      return 6992;
    }

  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
    }

  
  function abortOnCannotGrowMemory(requestedSize) {
      abort('OOM');
    }function _emscripten_resize_heap(requestedSize) {
      abortOnCannotGrowMemory(requestedSize);
    }

  
  function _memcpy(dest, src, num) {
      dest = dest|0; src = src|0; num = num|0;
      var ret = 0;
      var aligned_dest_end = 0;
      var block_aligned_dest_end = 0;
      var dest_end = 0;
      // Test against a benchmarked cutoff limit for when HEAPU8.set() becomes faster to use.
      if ((num|0) >= 8192) {
        _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
        return dest|0;
      }
  
      ret = dest|0;
      dest_end = (dest + num)|0;
      if ((dest&3) == (src&3)) {
        // The initial unaligned < 4-byte front.
        while (dest & 3) {
          if ((num|0) == 0) return ret|0;
          HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
          dest = (dest+1)|0;
          src = (src+1)|0;
          num = (num-1)|0;
        }
        aligned_dest_end = (dest_end & -4)|0;
        block_aligned_dest_end = (aligned_dest_end - 64)|0;
        while ((dest|0) <= (block_aligned_dest_end|0) ) {
          HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
          HEAP32[(((dest)+(4))>>2)]=((HEAP32[(((src)+(4))>>2)])|0);
          HEAP32[(((dest)+(8))>>2)]=((HEAP32[(((src)+(8))>>2)])|0);
          HEAP32[(((dest)+(12))>>2)]=((HEAP32[(((src)+(12))>>2)])|0);
          HEAP32[(((dest)+(16))>>2)]=((HEAP32[(((src)+(16))>>2)])|0);
          HEAP32[(((dest)+(20))>>2)]=((HEAP32[(((src)+(20))>>2)])|0);
          HEAP32[(((dest)+(24))>>2)]=((HEAP32[(((src)+(24))>>2)])|0);
          HEAP32[(((dest)+(28))>>2)]=((HEAP32[(((src)+(28))>>2)])|0);
          HEAP32[(((dest)+(32))>>2)]=((HEAP32[(((src)+(32))>>2)])|0);
          HEAP32[(((dest)+(36))>>2)]=((HEAP32[(((src)+(36))>>2)])|0);
          HEAP32[(((dest)+(40))>>2)]=((HEAP32[(((src)+(40))>>2)])|0);
          HEAP32[(((dest)+(44))>>2)]=((HEAP32[(((src)+(44))>>2)])|0);
          HEAP32[(((dest)+(48))>>2)]=((HEAP32[(((src)+(48))>>2)])|0);
          HEAP32[(((dest)+(52))>>2)]=((HEAP32[(((src)+(52))>>2)])|0);
          HEAP32[(((dest)+(56))>>2)]=((HEAP32[(((src)+(56))>>2)])|0);
          HEAP32[(((dest)+(60))>>2)]=((HEAP32[(((src)+(60))>>2)])|0);
          dest = (dest+64)|0;
          src = (src+64)|0;
        }
        while ((dest|0) < (aligned_dest_end|0) ) {
          HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
          dest = (dest+4)|0;
          src = (src+4)|0;
        }
      } else {
        // In the unaligned copy case, unroll a bit as well.
        aligned_dest_end = (dest_end - 4)|0;
        while ((dest|0) < (aligned_dest_end|0) ) {
          HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
          HEAP8[(((dest)+(1))>>0)]=((HEAP8[(((src)+(1))>>0)])|0);
          HEAP8[(((dest)+(2))>>0)]=((HEAP8[(((src)+(2))>>0)])|0);
          HEAP8[(((dest)+(3))>>0)]=((HEAP8[(((src)+(3))>>0)])|0);
          dest = (dest+4)|0;
          src = (src+4)|0;
        }
      }
      // The remaining unaligned < 4 byte tail.
      while ((dest|0) < (dest_end|0)) {
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
      }
      return ret|0;
    }

  function _memset(ptr, value, num) {
      ptr = ptr|0; value = value|0; num = num|0;
      var end = 0, aligned_end = 0, block_aligned_end = 0, value4 = 0;
      end = (ptr + num)|0;
  
      value = value & 0xff;
      if ((num|0) >= 67 /* 64 bytes for an unrolled loop + 3 bytes for unaligned head*/) {
        while ((ptr&3) != 0) {
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
  
        aligned_end = (end & -4)|0;
        value4 = value | (value << 8) | (value << 16) | (value << 24);
  
        block_aligned_end = (aligned_end - 64)|0;
  
        while((ptr|0) <= (block_aligned_end|0)) {
          HEAP32[((ptr)>>2)]=value4;
          HEAP32[(((ptr)+(4))>>2)]=value4;
          HEAP32[(((ptr)+(8))>>2)]=value4;
          HEAP32[(((ptr)+(12))>>2)]=value4;
          HEAP32[(((ptr)+(16))>>2)]=value4;
          HEAP32[(((ptr)+(20))>>2)]=value4;
          HEAP32[(((ptr)+(24))>>2)]=value4;
          HEAP32[(((ptr)+(28))>>2)]=value4;
          HEAP32[(((ptr)+(32))>>2)]=value4;
          HEAP32[(((ptr)+(36))>>2)]=value4;
          HEAP32[(((ptr)+(40))>>2)]=value4;
          HEAP32[(((ptr)+(44))>>2)]=value4;
          HEAP32[(((ptr)+(48))>>2)]=value4;
          HEAP32[(((ptr)+(52))>>2)]=value4;
          HEAP32[(((ptr)+(56))>>2)]=value4;
          HEAP32[(((ptr)+(60))>>2)]=value4;
          ptr = (ptr + 64)|0;
        }
  
        while ((ptr|0) < (aligned_end|0) ) {
          HEAP32[((ptr)>>2)]=value4;
          ptr = (ptr+4)|0;
        }
      }
      // The remaining bytes.
      while ((ptr|0) < (end|0)) {
        HEAP8[((ptr)>>0)]=value;
        ptr = (ptr+1)|0;
      }
      return (end-num)|0;
    }
embind_init_charCodes();
BindingError = Module['BindingError'] = extendError(Error, 'BindingError');;
InternalError = Module['InternalError'] = extendError(Error, 'InternalError');;
init_ClassHandle();
init_RegisteredPointer();
init_embind();;
UnboundTypeError = Module['UnboundTypeError'] = extendError(Error, 'UnboundTypeError');;
init_emval();;
var ASSERTIONS = false;

// Copyright 2017 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

/** @type {function(string, boolean=, number=)} */
function intArrayFromString(stringy, dontAddNull, length) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      if (ASSERTIONS) {
        assert(false, 'Character code ' + chr + ' (' + String.fromCharCode(chr) + ')  at offset ' + i + ' not in 0x00-0xFF.');
      }
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}


// Copied from https://github.com/strophe/strophejs/blob/e06d027/src/polyfills.js#L149

// This code was written by Tyler Akins and has been placed in the
// public domain.  It would be nice if you left this header intact.
// Base64 code from Tyler Akins -- http://rumkin.com

/**
 * Decodes a base64 string.
 * @param {String} input The string to decode.
 */
var decodeBase64 = typeof atob === 'function' ? atob : function (input) {
  var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  var output = '';
  var chr1, chr2, chr3;
  var enc1, enc2, enc3, enc4;
  var i = 0;
  // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');
  do {
    enc1 = keyStr.indexOf(input.charAt(i++));
    enc2 = keyStr.indexOf(input.charAt(i++));
    enc3 = keyStr.indexOf(input.charAt(i++));
    enc4 = keyStr.indexOf(input.charAt(i++));

    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;

    output = output + String.fromCharCode(chr1);

    if (enc3 !== 64) {
      output = output + String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      output = output + String.fromCharCode(chr3);
    }
  } while (i < input.length);
  return output;
};

// Converts a string of base64 into a byte array.
// Throws error on invalid input.
function intArrayFromBase64(s) {
  if (typeof ENVIRONMENT_IS_NODE === 'boolean' && ENVIRONMENT_IS_NODE) {
    var buf;
    try {
      buf = Buffer.from(s, 'base64');
    } catch (_) {
      buf = new Buffer(s, 'base64');
    }
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  try {
    var decoded = decodeBase64(s);
    var bytes = new Uint8Array(decoded.length);
    for (var i = 0 ; i < decoded.length ; ++i) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes;
  } catch (_) {
    throw new Error('Converting base64 string to bytes failed.');
  }
}

// If filename is a base64 data URI, parses and returns data (Buffer on node,
// Uint8Array otherwise). If filename is not a base64 data URI, returns undefined.
function tryParseAsDataURI(filename) {
  if (!isDataURI(filename)) {
    return;
  }

  return intArrayFromBase64(filename.slice(dataURIPrefix.length));
}


// ASM_LIBRARY EXTERN PRIMITIVES: Int8Array,Int32Array

var asmGlobalArg = {};
var asmLibraryArg = { "__assert_fail": ___assert_fail, "__cxa_allocate_exception": ___cxa_allocate_exception, "__cxa_throw": ___cxa_throw, "_embind_register_bool": __embind_register_bool, "_embind_register_class": __embind_register_class, "_embind_register_class_constructor": __embind_register_class_constructor, "_embind_register_class_function": __embind_register_class_function, "_embind_register_emval": __embind_register_emval, "_embind_register_float": __embind_register_float, "_embind_register_integer": __embind_register_integer, "_embind_register_memory_view": __embind_register_memory_view, "_embind_register_std_string": __embind_register_std_string, "_embind_register_std_wstring": __embind_register_std_wstring, "_embind_register_void": __embind_register_void, "_emval_decref": __emval_decref, "_emval_set_property": __emval_set_property, "_emval_take_value": __emval_take_value, "abort": _abort, "emscripten_get_sbrk_ptr": _emscripten_get_sbrk_ptr, "emscripten_memcpy_big": _emscripten_memcpy_big, "emscripten_resize_heap": _emscripten_resize_heap, "memory": wasmMemory, "table": wasmTable };
var asm = createWasm();
var ___wasm_call_ctors = Module["___wasm_call_ctors"] = asm["__wasm_call_ctors"];
var _free = Module["_free"] = asm["free"];
var _malloc = Module["_malloc"] = asm["malloc"];
var ___errno_location = Module["___errno_location"] = asm["__errno_location"];
var _setThrew = Module["_setThrew"] = asm["setThrew"];
var __ZSt18uncaught_exceptionv = Module["__ZSt18uncaught_exceptionv"] = asm["_ZSt18uncaught_exceptionv"];
var ___getTypeName = Module["___getTypeName"] = asm["__getTypeName"];
var ___embind_register_native_and_builtin_types = Module["___embind_register_native_and_builtin_types"] = asm["__embind_register_native_and_builtin_types"];
var stackSave = Module["stackSave"] = asm["stackSave"];
var stackAlloc = Module["stackAlloc"] = asm["stackAlloc"];
var stackRestore = Module["stackRestore"] = asm["stackRestore"];
var __growWasmMemory = Module["__growWasmMemory"] = asm["__growWasmMemory"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];
var dynCall_vii = Module["dynCall_vii"] = asm["dynCall_vii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];



// === Auto-generated postamble setup entry stuff ===

Module['asm'] = asm;
















































































var calledRun;

// Modularize mode returns a function, which can be called to
// create instances. The instances provide a then() method,
// must like a Promise, that receives a callback. The callback
// is called when the module is ready to run, with the module
// as a parameter. (Like a Promise, it also returns the module
// so you can use the output of .then(..)).
Module['then'] = function(func) {
  // We may already be ready to run code at this time. if
  // so, just queue a call to the callback.
  if (calledRun) {
    func(Module);
  } else {
    // we are not ready to call then() yet. we must call it
    // at the same time we would call onRuntimeInitialized.
    var old = Module['onRuntimeInitialized'];
    Module['onRuntimeInitialized'] = function() {
      if (old) old();
      func(Module);
    };
  }
  return Module;
};

/**
 * @constructor
 * @this {ExitStatus}
 */
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
}

var calledMain = false;


dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!calledRun) run();
  if (!calledRun) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
};





/** @type {function(Array=)} */
function run(args) {
  args = args || arguments_;

  if (runDependencies > 0) {
    return;
  }


  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    if (calledRun) return;
    calledRun = true;

    if (ABORT) return;

    initRuntime();

    preMain();

    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();


    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
}
Module['run'] = run;


function exit(status, implicit) {

  // if this is just main exit-ing implicitly, and the status is 0, then we
  // don't need to do anything here and can just leave. if the status is
  // non-zero, though, then we need to report it.
  // (we may have warned about this earlier, if a situation justifies doing so)
  if (implicit && noExitRuntime && status === 0) {
    return;
  }

  if (noExitRuntime) {
  } else {

    ABORT = true;
    EXITSTATUS = status;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  quit_(status, new ExitStatus(status));
}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}


  noExitRuntime = true;

run();





// {{MODULE_ADDITIONS}}



/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

// Basic byte unit of WASM heap. (16 bit = 2 bytes)
const BYTES_PER_UNIT = Uint16Array.BYTES_PER_ELEMENT;

// Byte per audio sample. (32 bit float)
const BYTES_PER_SAMPLE = Float32Array.BYTES_PER_ELEMENT;

// The max audio channel on Chrome is 32.
const MAX_CHANNEL_COUNT = 32;

// WebAudio's render quantum size.
const RENDER_QUANTUM_FRAMES = 128;


/**
 * A WASM HEAP wrapper for AudioBuffer class. This breaks down the AudioBuffer
 * into an Array of Float32Array for the convinient WASM opearion.
 *
 * @class
 * @dependency Module A WASM module generated by the emscripten glue code.
 */
class HeapAudioBuffer {
  /**
   * @constructor
   * @param  {object} wasmModule WASM module generated by Emscripten.
   * @param  {number} length Buffer frame length.
   * @param  {number} channelCount Number of channels.
   * @param  {number=} maxChannelCount Maximum number of channels.
   */
  constructor(wasmModule, length, channelCount, maxChannelCount) {
    // The |channelCount| must be greater than 0, and less than or equal to
    // the maximum channel count.
    this._isInitialized = false;
    this._module = wasmModule;
    this._length = length;
    this._maxChannelCount = maxChannelCount
        ? Math.min(maxChannelCount, MAX_CHANNEL_COUNT)
        : channelCount;
    this._channelCount = channelCount;
    this._allocateHeap();
    this._isInitialized = true;
  }

  /**
   * Allocates memory in the WASM heap and set up Float32Array views for the
   * channel data.
   *
   * @private
   */
  _allocateHeap() {
    const channelByteSize = this._length * BYTES_PER_SAMPLE;
    const dataByteSize = this._channelCount * channelByteSize;
    this._dataPtr = this._module._malloc(dataByteSize);
    this._channelData = [];
    for (let i = 0; i < this._channelCount; ++i) {
      let startByteOffset = this._dataPtr + i * channelByteSize;
      let endByteOffset = startByteOffset + channelByteSize;
      // Get the actual array index by dividing the byte offset by 2 bytes.
      this._channelData[i] =
          this._module.HEAPF32.subarray(startByteOffset >> BYTES_PER_UNIT,
              endByteOffset >> BYTES_PER_UNIT);
    }
  }

  /**
   * Adapt the current channel count to the new input buffer.
   *
   * @param  {number} newChannelCount The new channel count.
   */
  adaptChannel(newChannelCount) {
    if (newChannelCount < this._maxChannelCount) {
      this._channelCount = newChannelCount;
    }
  }

  /**
   * Getter for the buffer length in frames.
   *
   * @return {?number} Buffer length in frames.
   */
  get length() {
    return this._isInitialized ? this._length : null;
  }

  /**
   * Getter for the number of channels.
   *
   * @return {?number} Buffer length in frames.
   */
  get numberOfChannels() {
    return this._isInitialized ? this._channelCount : null;
  }

  /**
   * Getter for the maxixmum number of channels allowed for the instance.
   *
   * @return {?number} Buffer length in frames.
   */
  get maxChannelCount() {
    return this._isInitialized ? this._maxChannelCount : null;
  }

  /**
   * Returns a Float32Array object for a given channel index. If the channel
   * index is undefined, it returns the reference to the entire array of channel
   * data.
   *
   * @param  {number|undefined} channelIndex Channel index.
   * @return {?Array} a channel data array or an
   * array of channel data.
   */
  getChannelData(channelIndex) {
    if (channelIndex >= this._channelCount) {
      return null;
    }

    return typeof channelIndex === 'undefined'
        ? this._channelData : this._channelData[channelIndex];
  }

  /**
   * Returns the base address of the allocated memory space in the WASM heap.
   *
   * @return {number} WASM Heap address.
   */
  getHeapAddress() {
    return this._dataPtr;
  }

  /**
   * Frees the allocated memory space in the WASM heap.
   */
  free() {
    this._isInitialized = false;
    this._module._free(this._dataPtr);
    this._module._free(this._pointerArrayPtr);
    this._channelData = null;
  }
} // class HeapAudioBuffer


/**
 * A JS FIFO implementation for the AudioWorklet. 3 assumptions for the
 * simpler operation:
 *  1. the push and the pull operation are done by 128 frames. (Web Audio
 *    API's render quantum size in the speficiation)
 *  2. the channel count of input/output cannot be changed dynamically.
 *    The AudioWorkletNode should be configured with the `.channelCount = k`
 *    (where k is the channel count you want) and
 *    `.channelCountMode = explicit`.
 *  3. This is for the single-thread operation. (obviously)
 *
 * @class
 */
class RingBuffer {
  GlottalSources

  /**
   * @constructor
   * @param  {number} length Buffer length in frames.
   * @param  {number} channelCount Buffer channel count.
   */
  constructor(length, channelCount) {
    this._readIndex = 0;
    this._writeIndex = 0;
    this._framesAvailable = 0;

    this._channelCount = channelCount;
    this._length = length;
    this._channelData = [];
    for (let i = 0; i < this._channelCount; ++i) {
      this._channelData[i] = new Float32Array(length);
    }
  }

  /**
   * Getter for Available frames in buffer.
   *
   * @return {number} Available frames in buffer.
   */
  get framesAvailable() {
    return this._framesAvailable;
  }

  /**
   * Push a sequence of Float32Arrays to buffer.
   *
   * @param  {array} arraySequence A sequence of Float32Arrays.
   */
  push(arraySequence) {
    // The channel count of arraySequence and the length of each channel must
    // match with this buffer obejct.

    // Transfer data from the |arraySequence| storage to the internal buffer.
    let sourceLength = arraySequence[0].length;
    for (let i = 0; i < sourceLength; ++i) {
      let writeIndex = (this._writeIndex + i) % this._length;
      for (let channel = 0; channel < this._channelCount; ++channel) {
        this._channelData[channel][writeIndex] = arraySequence[channel][i];
      }
    }

    this._writeIndex += sourceLength;
    if (this._writeIndex >= this._length) {
      this._writeIndex = 0;
    }

    // For excessive frames, the buffer will be overwritten.
    this._framesAvailable += sourceLength;
    if (this._framesAvailable > this._length) {
      this._framesAvailable = this._length;
    }
  }

  /**
   * Pull data out of buffer and fill a given sequence of Float32Arrays.
   *
   * @param  {array} arraySequence An array of Float32Arrays.
   */
  pull(arraySequence) {
    // The channel count of arraySequence and the length of each channel must
    // match with this buffer obejct.

    // If the FIFO is completely empty, do nothing.
    if (this._framesAvailable === 0) {
      return;
    }

    let destinationLength = arraySequence[0].length;

    // Transfer data from the internal buffer to the |arraySequence| storage.
    for (let i = 0; i < destinationLength; ++i) {
      let readIndex = (this._readIndex + i) % this._length;
      for (let channel = 0; channel < this._channelCount; ++channel) {
        arraySequence[channel][i] = this._channelData[channel][readIndex];
      }
    }

    this._readIndex += destinationLength;
    if (this._readIndex >= this._length) {
      this._readIndex = 0;
    }

    this._framesAvailable -= destinationLength;
    if (this._framesAvailable < 0) {
      this._framesAvailable = 0;
    }
  }
} // class RingBuffer
class AudioCapture extends AudioWorkletProcessor {

  constructor() {
    super();

    this.heapInputBuffer = new HeapInputBuffer(
      CaptureModule, RENDER_QUANTUM_FRAMES,
      1, MAX_CHANNEL_COUNT
    );

    this.kernel = new CaptureModule.AudioCapture();

    this.port.onmessage = this.onMessage.bind(this);
  }

  onMessage({data}) {
    if (data.type === 'getData') {
      let array = [];
      this.kernel.readBlock(array);
      this.port.postMessage(array);
    } else {
      console.warn(`MessagePort event type ${data.type} does not exist.`, data);
    }
  }

  process(inputs, outputs) {
    const channelCount = inputs.length;
    const length = inputs[0].length;

    this.heapInputBuffer.adaptChannel(channelCount);
    for (let ch = 0; ch < channelCount; ++ch) {
      this.heapInputBuffer.getChannelData(ch).set(input[ch]);
    }

    this.kernel.process(this.heapInputBuffer.getHeapAddress(), length, channelCount);
  }

}

registerProcessor('audio-capture', AudioCapture);



  return CaptureModule
}
);
})();
if (typeof exports === 'object' && typeof module === 'object')
      module.exports = CaptureModule;
    else if (typeof define === 'function' && define['amd'])
      define([], function() { return CaptureModule; });
    else if (typeof exports === 'object')
      exports["CaptureModule"] = CaptureModule;
    