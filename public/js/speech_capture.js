
var CaptureModule = (
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
    STACK_BASE = 5248864,
    STACKTOP = STACK_BASE,
    STACK_MAX = 5984,
    DYNAMIC_BASE = 5248864,
    DYNAMICTOP_PTR = 5824;




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




var wasmBinaryFile = 'data:application/octet-stream;base64,AGFzbQEAAAABbg9gAX8AYAF/AX9gAn9/AGACf38Bf2ADf39/AGAEf39/fwBgBX9/f39/AGADf39/AX9gBn9/f39/fwBgAABgAAF/YAR/f39/AX9gB39/f39/f38AYAh/f39/f39/fwBgDX9/f39/f39/f39/f38AAtUEFgNlbnYNX19hc3NlcnRfZmFpbAAFA2VudhNfZW12YWxfc2V0X3Byb3BlcnR5AAQDZW52GF9fY3hhX2FsbG9jYXRlX2V4Y2VwdGlvbgABA2VudgtfX2N4YV90aHJvdwAEA2VudhFfZW12YWxfdGFrZV92YWx1ZQADA2Vudg1fZW12YWxfZGVjcmVmAAADZW52Fl9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MADgNlbnYiX2VtYmluZF9yZWdpc3Rlcl9jbGFzc19jb25zdHJ1Y3RvcgAIA2Vudh9fZW1iaW5kX3JlZ2lzdGVyX2NsYXNzX2Z1bmN0aW9uAA0DZW52BWFib3J0AAkDZW52FV9lbWJpbmRfcmVnaXN0ZXJfdm9pZAACA2VudhVfZW1iaW5kX3JlZ2lzdGVyX2Jvb2wABgNlbnYbX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nAAIDZW52HF9lbWJpbmRfcmVnaXN0ZXJfc3RkX3dzdHJpbmcABANlbnYWX2VtYmluZF9yZWdpc3Rlcl9lbXZhbAACA2VudhhfZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIABgNlbnYWX2VtYmluZF9yZWdpc3Rlcl9mbG9hdAAEA2VudhxfZW1iaW5kX3JlZ2lzdGVyX21lbW9yeV92aWV3AAQDZW52FmVtc2NyaXB0ZW5fcmVzaXplX2hlYXAAAQNlbnYVZW1zY3JpcHRlbl9tZW1jcHlfYmlnAAcDZW52Bm1lbW9yeQIBgAKAAgNlbnYFdGFibGUBcAApA70BuwEJAwUACQEAAQIDBAQDAwMAAAABAQECAAAABAMAAgIJBAEEAQQCAwACAQIAAwcHBwMDAgQABAIBAwIEBAMBBAICBQUCBAMLBAICAgEFAgIDAwMAAgIBBwMABQkBAAEJAAAAAwYBAwQBAQACCgEBAQAAAAMHBwcDBAUFBQUDBwMDBQQGCAYGBggICAEBCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAQADAwIBBwAEAgoKAQABAwIGBAcIBQsMBg8CfwFBwK3AAgt/AEG4LQsH/gIWEV9fd2FzbV9jYWxsX2N0b3JzABQEZnJlZQC4AQZtYWxsb2MAtwEQX19lcnJub19sb2NhdGlvbgB+CHNldFRocmV3AMABGV9aU3QxOHVuY2F1Z2h0X2V4Y2VwdGlvbnYAwQENX19nZXRUeXBlTmFtZQCeASpfX2VtYmluZF9yZWdpc3Rlcl9uYXRpdmVfYW5kX2J1aWx0aW5fdHlwZXMAnwEKX19kYXRhX2VuZAMBCXN0YWNrU2F2ZQDCAQpzdGFja0FsbG9jAMMBDHN0YWNrUmVzdG9yZQDEARBfX2dyb3dXYXNtTWVtb3J5AMUBCmR5bkNhbGxfaWkAxgEKZHluQ2FsbF92aQDHAQ1keW5DYWxsX3ZpaWlpAMgBC2R5bkNhbGxfdmlpAMkBC2R5bkNhbGxfaWlpAMoBDmR5bkNhbGxfdmlpaWlpAMsBDGR5bkNhbGxfdmlpaQDMAQxkeW5DYWxsX2lpaWkAzQEPZHluQ2FsbF92aWlpaWlpAM4BCT8BAEEBCygZgQFub3AWGxx1dnh5KoABKn+DATSEARkqPj6GASqIAZwBmQGLASqbAZgBjAEqmgGVAY4BKpABtgEKoLIBuwEfAQF/IwBBEGsiACQAIABBEGokABBtQbwpQSgRAQAaC00BAXwgAAJ/IAG3RAAAAAAAgEFAokQAAAAAAECPQKMiAplEAAAAAAAA4EFjBEAgAqoMAQtBgICAgHgLEEUgAEEUahAsIAAgATYCHCAAC3gBAX8jAEEwayIDJAAgA0EIaiEEQQAQF0EAEBcgBCABIAIQLRAYIAQhASMAQRBrIgIkACADIAEpAgA3AhgQGCACQRBqJAAgAAJ/IANBGGohACADQShqIgEiAhAsIAIgABAwIAIgABAxIAELEEkgARAaIANBMGokAAsWACAABEBBgAhBjghBggFB9ggQAAALCwoAQQAQF0EAEBcLBAAgAAsPACAAKAIEGiAAKAIAECsLBwAgACgCHAv+AQIGfwF8IwBBIGsiAiQAIABBFGoiBCIDKAIAAn8gACgCHLdEAAAAAACAQUCiRAAAAAAAQI9AoyIImUQAAAAAAADgQWMEQCAIqgwBC0GAgICAeAsiBSIGIAMoAgQQQCEHIAMgBjYCBCADIAc2AgAgACAEEFMgAkEANgIcIAVBAU4EQEEAIQADQCACIAQgABAdKwMAIgg5AxACQCAIvUKAgICAgICACHxCgICAgICAgPD/AINCAFIEQCABIAJBHGogAkEQahAeDAELIAJBADYCDCABIAJBHGogAkEMahAfCyACIAIoAhxBAWoiADYCHCAAIAVIDQALCyACQSBqJAALLAACQCABQQBOBEAgACgCBCABSg0BC0HWEUHzEUGrA0HcEhAAAAsgACABECALPAEBfyMAQRBrIgMkACAAKAIAIANBCGogARAhIgAoAgAgAyACECIiASgCABABIAEQIyAAECMgA0EQaiQACzwBAX8jAEEQayIDJAAgACgCACADQQhqIAEQISIAKAIAIAMgAhAhIgEoAgAQASABECMgABAjIANBEGokAAslAQF/IwBBEGsiAiQAIAJBCGogABA5IAEQPyEAIAJBEGokACAACykBAX8jAEEQayICJAAgAEGEGyACQQhqIAEQQxAENgIAIAJBEGokACAACykBAX8jAEEQayICJAAgAEHAGyACQQhqIAEQRBAENgIAIAJBEGokACAACwkAIAAoAgAQBQsyACAAKAIAGiAAKAIAIAAQKEEDdGoaIAAoAgAgABAmQQN0ahogACgCACAAEChBA3RqGgsrAQF/IAAoAgAEQCAAIAAoAgAQKSAAECcaIAAoAgAhASAAECgaIAEQuAELCxAAIAAoAgQgACgCAGtBA3ULBwAgAEEIagsSACAAECcoAgAgACgCAGtBA3ULKwEBfyAAKAIEIQIDQCABIAJHBEAgABAnGiACQXhqIQIMAQsLIAAgATYCBAsHACAAELgBCxIAIAAEQCAAQXxqKAIAELgBCwsJACAAQgA3AgALLgAgACABNgIAIABBBGogAhAuGkEBEC8gAkF/TARAQYoJQZcJQaQBQfgJEAAACwsLACAAIAE2AgAgAAsZACAAQQFHBEBBgAhBjghBggFB9ggQAAALC1cBAn8CQCABKAIEIgJFQQEiA0VyDQBB/////wcgA20gAk4NABAyCyABKAIEIQIgASgCBEEBRkEBckUEQEGACkGnCkH2AkGQCxAAAAsgACACIANsQQEQMwsfAQF/IwBBEGsiAiQAIAAgASACQQhqEDcgAkEQaiQACyABAn9BBBACIgAiARB8IAFBwBU2AgAgAEGYFkEBEAMACyoAIAFBAE5BACACQQFGG0UEQEGbC0GnCkGdAkGqDhAAAAsgACABIAEQNQsHACAAKAIEC1oBAX8gASAAKAIERwRAIAAoAgAQKyAAIAFBAUgEf0EABSABBH8gAUGAgICAAk8EQBAyCyABQQN0IgEQNiIDIAFFckUEQBAyCyADBUEACws2AgALIAAgAjYCBAspAQF/IABBEGoQtwEiAEUEQEEADwsgAEFwcUEQaiIBQXxqIAA2AgAgAQt4AQN/IwBBMGsiAyQAIANBIGoiBSEEIAEQPBogBCABKAIANgIAQQEQLyAEQQhqIAEoAgQQLhogACABEDgCfyADQQhqIQEgA0EYaiAAEDkhBCABIAA2AgwgASACNgIIIAEgBTYCBCABIAQ2AgAgAQsQOiADQTBqJAALSgEBfyABKAIEIgEgACgCBEZBAEEBIgJBAUYbRQRAIAAgASACEDMLIAEgACgCBEZBACACQQFGG0UEQEGsEEHbEEHrBUHEERAAAAsLDQAgACABKAIAED0gAAspAQJ/IAAoAgwoAgQiAkEASgRAA0AgACABEDsgAUEBaiIBIAJHDQALCwtGAQJ/IwBBEGsiAiQAIAAoAggaIAAoAgAgARA/IQMgAiAAKAIEKAIAIAFBAnRqKgIAuzkDCCADIAIpAwg3AwAgAkEQaiQACwcAIABBDGoLIgEBfyMAQRBrIgIkACACQQA2AgwgACABNgIAIAJBEGokAAsDAAELDQAgACgCACABQQN0agssACABQYCAgIACTwRAEDILIAJBgICAgAJPBEAQMgsgACABQQN0IAJBA3QQQQs0AQF/IwBBEGsiAyQAIAMgAjYCDCAAIAEgAygCDBBCIgAgAUVyRQRAEDILIANBEGokACAAC1cBAX8gAEUEQCABEDYPCyAAQXxqKAIAIgMgAUEQahC5ASICRQRAQQAPCyACIAAgA2tqIgMgAkEQakFwcSIARwRAIAAgAyABEL8BCyAAQXxqIAI2AgAgAAs3AQF/IwBBEGsiAiQAIAIgADYCDCACKAIMIAEoAgA2AgAgAiACKAIMQQhqNgIMIAJBEGokACAACzcBAX8jAEEQayICJAAgAiAANgIMIAIoAgwgASsDADkDACACIAIoAgxBCGo2AgwgAkEQaiQAIAALPQEBfyMAQRBrIgIkACAAQQA2AgQgACABNgIAIABBCGoiABBHIAJCADcDCCAAIAEgAkEIahBGIAJBEGokAAtDAQF/IAAQJiIDIAFJBEAgACABIANrIAIQSA8LIAMgAUsEQCAAKAIAIAFBA3RqIQEgABAmIQIgACABECkgACACEFwLCy4BAX8jAEEQayIBJAAgAEIANwIAIAFBADYCDCAAQQhqIAFBDGoQViABQRBqJAALlAEBAn8jAEEgayIEJAACQCAAECcoAgAgACgCBGtBA3UgAU8EQCAAIAEgAhBXDAELIAAQJyEDIARBCGogACAAECYgAWoQWCAAECYgAxBZIgMgASACEFogACADEFsgAyADKAIEEGYgAygCAARAIAMoAhAaIAMoAgAhACADEDwoAgAgAygCAGsaIAAQuAELCyAEQSBqJAALwAEBBn8jAEEwayICJAAgASgCBCEEIAAoAgQhAyAAKAIAIQYgAiAAQQhqIgcQSjYCICACQSBqIAAoAgQQSyEFAkAgBCAGIANrIgNMBEAgAkEoaiABEEwgAkEoaiAEIAUQTQwBCyACQRhqIAEQTCACQSBqIAJBGGogAxBOIAJBEGogARBMIAJBEGogAyAFEE0gAkEIaiACQSBqEE8gBCADayAHEEoQTQsgACAAKAIEIARqIAAoAgBvNgIEIAJBMGokAAsJACAAKAIAEFALNwEBfyMAQRBrIgIkACACIAAoAgA2AgggAiACKAIIIAFBA3RqNgIIIAIoAgghACACQRBqJAAgAAsIACAAIAEQUgsvAQJ/IwBBEGsiAyQAIANBCGogABBPIQQgAyAAIAEQTiAEIAMgAhBRIANBEGokAAsYACAAIAEQTyIAIAAoAgAgAkEDdGo2AgALDgAgACABKAIANgIAIAALJAEBfyMAQRBrIgEkACABQQhqIAAQLigCACEAIAFBEGokACAAC08BAX8jAEEwayIDJAAgA0EgaiADQRhqIAAQTxBnIANBEGogA0EIaiABEE8QZyADQShqIANBIGogA0EQaiACEGgQaRAuKAIAGiADQTBqJAALEABBARAvIAAgASgCADYCAAvNAQEFfyMAQTBrIgIkACABKAIEIQMgACgCACEEIAAoAgQhBSACIABBCGoiBhBKNgIgIAJBIGogBSADayAEIAMgBG1BAWpsaiAEbyIAEEshBQJAIAMgBCAAayIATARAIAJBKGogARBSIAJBIGogBSADIAJBKGoQVAwBCyACQRhqIAEQUiACQSBqIAJBGGogABBOIAJBEGogARBSIAJBGGogBSAAIAJBEGoQVCACQRhqIAYQSiADIABrIAJBCGogAkEgahBPEFQLIAJBMGokAAswAQF/IwBBEGsiBCQAIAQgATYCCCAAIAEgBEEIaiACEEsgBCADEE8QVSAEQRBqJAALOgEBfyMAQRBrIgQkACABEGghASACEGghAiAEQQhqIAQgAxBPEGcgACABIAIgBEEIahBsIARBEGokAAsJACAAQQA2AgALOwEBfyMAQRBrIgMkACAAECcaA0AgACgCBCACEF0gACAAKAIEQQhqNgIEIAFBf2oiAQ0ACyADQRBqJAALWgECfyMAQRBrIgIkACACIAE2AgwgABBeIgMgAU8EQCAAECgiACADQQF2SQRAIAIgAEEBdDYCCCACQQhqIAJBDGoQYigCACEDCyACQRBqJAAgAw8LQaEVEGUAC4QBAQJ/IwBBEGsiBCQAIARBADYCDCAAQQxqIARBDGoQViAAIAM2AhAgAQRAIAAoAhAaQf////8BIAEiA0kEQEHnEhBlAAsgA0EDdBB6IQULIAAgBTYCACAAIAUgAkEDdGoiAjYCCCAAIAI2AgQgABA8IAUgAUEDdGo2AgAgBEEQaiQAIAALMgEBfyAAKAIQGiAAKAIIIQMDQCADIAIQXSAAIAAoAghBCGoiAzYCCCABQX9qIgENAAsLTwECfyAAECQgABAnIAAoAgAgAEEEaiICKAIAIAFBBGoiAxBfIAAgAxBgIAIgAUEIahBgIAAQJyABEDwQYCABIAEoAgQ2AgAgACAAECYQYQsqACAAKAIAGiAAKAIAIAAQKEEDdGoaIAAoAgAaIAAoAgAgABAmQQN0ahoLDAAgACABKQMANwMAC0IBAX8jAEEQayIBJAAgABAnGiABQf////8BNgIMIAFB/////wc2AgggAUEMaiABQQhqEGMoAgAhACABQRBqJAAgAAsoACADIAMoAgAgAiABayIAayICNgIAIABBAU4EQCACIAEgABC9ARoLCzUBAX8jAEEQayICJAAgAiAAKAIANgIMIAAgASgCADYCACABIAJBDGooAgA2AgAgAkEQaiQACyoAIAAoAgAaIAAoAgAgABAoQQN0ahogACgCACAAEChBA3RqGiAAKAIAGgsjAQJ/IwBBEGsiAiQAIAAgARBkIQMg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JAAgASAANgIMQZAbIAEoAgxBBEEAQX8QDyABQRBqJAALMwEBfyMAQRBrIgEkACABIAA2AgxBnBsgASgCDEEEQYCAgIB4Qf////8HEA8gAUEQaiQACysBAX8jAEEQayIBJAAgASAANgIMQagbIAEoAgxBBEEAQX8QDyABQRBqJAALJwEBfyMAQRBrIgEkACABIAA2AgxBtBsgASgCDEEEEBAgAUEQaiQACycBAX8jAEEQayIBJAAgASAANgIMQcAbIAEoAgxBCBAQIAFBEGokAAsnAQF/IwBBEGsiASQAIAEgADYCDEGUJkEAIAEoAgwQESABQRBqJAALJwEBfyMAQRBrIgEkACABIAA2AgxBvCZBACABKAIMEBEgAUEQaiQACycBAX8jAEEQayIBJAAgASAANgIMQeQmQQEgASgCDBARIAFBEGokAAsnAQF/IwBBEGsiASQAIAEgADYCDEGMJ0ECIAEoAgwQESABQRBqJAALJwEBfyMAQRBrIgEkACABIAA2AgxBtCdBAyABKAIMEBEgAUEQaiQACycBAX8jAEEQayIBJAAgASAANgIMQdwnQQQgASgCDBARIAFBEGokAAsnAQF/IwBBEGsiASQAIAEgADYCDEGEKEEFIAEoAgwQESABQRBqJAALJwEBfyMAQRBrIgEkACABIAA2AgxBrChBBCABKAIMEBEgAUEQaiQACycBAX8jAEEQayIBJAAgASAANgIMQdQoQQUgASgCDBARIAFBEGokAAsnAQF/IwBBEGsiASQAIAEgADYCDEH8KEEGIAEoAgwQESABQRBqJAALJwEBfyMAQRBrIgEkACABIAA2AgxBpClBByABKAIMEBEgAUEQaiQACycBAX8jAEEQayIBJAAgASAANgIMIAEoAgwhABCfASABQRBqJAAgAAuCMQENfyMAQRBrIgwkAAJAAkACQAJAIABB9AFNBEBBwCkoAgAiBkEQIABBC2pBeHEgAEELSRsiB0EDdiIAdiIBQQNxBEACQCABQX9zQQFxIABqIgJBA3QiA0HwKWooAgAiASgCCCIAIANB6ClqIgNGBEBBwCkgBkF+IAJ3cTYCAAwBC0HQKSgCACAASw0EIAAoAgwgAUcNBCAAIAM2AgwgAyAANgIICyABQQhqIQAgASACQQN0IgJBA3I2AgQgASACaiIBIAEoAgRBAXI2AgQMBQsg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xCkoAgAiBEEBIAN0IgZxRQRAQcQpIAQgBnI2AgAgAiAANgIAIAAgAjYCGAwBCyABQQBBGSADQQF2ayADQR9GG3QhAyACKAIAIQIDQCACIgQoAgRBeHEgAUYNAiADQR12IQIgA0EBdCEDIAQgAkEEcWpBEGoiBigCACICDQALQdApKAIAIAZLDQMgBiAANgIAIAAgBDYCGAsgACAANgIMIAAgADYCCA8LQdApKAIAIgIgBCgCCCIBSyACIARLcg0BIAEgADYCDCAEIAA2AgggAEEANgIYIAAgBDYCDCAAIAE2AggLDwsQCQALSgEBf0HALSgCACIBIABqIgBBf0wEQEG0KUEwNgIAQX8PCwJAIAA/AEEQdE0NACAAEBINAEG0KUEwNgIAQX8PC0HALSAANgIAIAELgwQBA38gAkGAwABPBEAgACABIAIQExogAA8LIAAgAmohAwJAIAAgAXNBA3FFBEACQCACQQFIBEAgACECDAELIABBA3FFBEAgACECDAELIAAhAgNAIAIgAS0AADoAACABQQFqIQEgAkEBaiICIANPDQEgAkEDcQ0ACwsCQCADQXxxIgRBwABJDQAgAiAEQUBqIgVLDQADQCACIAEoAgA2AgAgAiABKAIENgIEIAIgASgCCDYCCCACIAEoAgw2AgwgAiABKAIQNgIQIAIgASgCFDYCFCACIAEoAhg2AhggAiABKAIcNgIcIAIgASgCIDYCICACIAEoAiQ2AiQgAiABKAIoNgIoIAIgASgCLDYCLCACIAEoAjA2AjAgAiABKAI0NgI0IAIgASgCODYCOCACIAEoAjw2AjwgAUFAayEBIAJBQGsiAiAFTQ0ACwsgAiAETw0BA0AgAiABKAIANgIAIAFBBGohASACQQRqIgIgBEkNAAsMAQsgA0EESQRAIAAhAgwBCyADQXxqIgQgAEkEQCAAIQIMAQsgACECA0AgAiABLQAAOgAAIAIgAS0AAToAASACIAEtAAI6AAIgAiABLQADOgADIAFBBGohASACQQRqIgIgBE0NAAsLIAIgA0kEQANAIAIgAS0AADoAACABQQFqIQEgAkEBaiICIANHDQALCyAAC7wCAQJ/IABBJ2oiAUF/akEAOgAAIABBADoAACABQX5qQQA6AAAgAEEAOgABIAFBfWpBADoAACAAQQA6AAIgAUF8akEAOgAAIABBADoAAyAAQQAgAGtBA3EiAWoiAEEANgIAIABBJyABa0F8cSICaiIBQXxqQQA2AgACQCACQQlJDQAgAEEANgIIIABBADYCBCABQXhqQQA2AgAgAUF0akEANgIAIAJBGUkNACAAQQA2AhggAEEANgIUIABBADYCECAAQQA2AgwgAUFwakEANgIAIAFBbGpBADYCACABQWhqQQA2AgAgAUFkakEANgIAIAIgAEEEcUEYciICayIBQSBJDQAgACACaiEAA0AgAEIANwMYIABCADcDECAAQgA3AwggAEIANwMAIABBIGohACABQWBqIgFBH0sNAAsLC+UCAQJ/AkAgACABRg0AAkAgASACaiAASwRAIAAgAmoiBCABSw0BCyAAIAEgAhC9ARoPCyAAIAFzQQNxIQMCQAJAIAAgAUkEQCADDQIgAEEDcUUNAQNAIAJFDQQgACABLQAAOgAAIAFBAWohASACQX9qIQIgAEEBaiIAQQNxDQALDAELAkAgAw0AIARBA3EEQANAIAJFDQUgACACQX9qIgJqIgMgASACai0AADoAACADQQNxDQALCyACQQNNDQADQCAAIAJBfGoiAmogASACaigCADYCACACQQNLDQALCyACRQ0CA0AgACACQX9qIgJqIAEgAmotAAA6AAAgAg0ACwwCCyACQQNNDQAgAiEDA0AgACABKAIANgIAIAFBBGohASAAQQRqIQAgA0F8aiIDQQNLDQALIAJBA3EhAgsgAkUNAANAIAAgAS0AADoAACAAQQFqIQAgAUEBaiEBIAJBf2oiAg0ACwsLHABBsC0oAgBFBEBBtC0gATYCAEGwLSAANgIACwsEAEEACwQAIwALEAAjACAAa0FwcSIAJAAgAAsGACAAJAALBgAgAEAACwkAIAEgABEBAAsJACABIAARAAALDwAgASACIAMgBCAAEQUACwsAIAEgAiAAEQIACwsAIAEgAiAAEQMACxEAIAEgAiADIAQgBSAAEQYACw0AIAEgAiADIAARBAALDQAgASACIAMgABEHAAsTACABIAIgAyAEIAUgBiAAEQgACwuwIQIAQYAIC8cMdiA9PSBUKFZhbHVlKQAvaG9tZS9jbG8vQ29kZXMvc3BlZWNoLWFuYWx5c2lzL2NtYWtlLWJ1aWxkLXJlbGVhc2UvZGVwcy9pbmNsdWRlL2VpZ2VuMy9FaWdlbi9zcmMvQ29yZS91dGlsL1hwckhlbHBlci5oAHZhcmlhYmxlX2lmX2R5bmFtaWMAdmVjU2l6ZSA+PSAwAC9ob21lL2Nsby9Db2Rlcy9zcGVlY2gtYW5hbHlzaXMvY21ha2UtYnVpbGQtcmVsZWFzZS9kZXBzL2luY2x1ZGUvZWlnZW4zL0VpZ2VuL3NyYy9Db3JlL01hcEJhc2UuaABNYXBCYXNlAG90aGVyLnJvd3MoKSA9PSAxIHx8IG90aGVyLmNvbHMoKSA9PSAxAC9ob21lL2Nsby9Db2Rlcy9zcGVlY2gtYW5hbHlzaXMvY21ha2UtYnVpbGQtcmVsZWFzZS9kZXBzL2luY2x1ZGUvZWlnZW4zL0VpZ2VuL3NyYy9Db3JlL1BsYWluT2JqZWN0QmFzZS5oAHJlc2l6ZUxpa2UAKCEoUm93c0F0Q29tcGlsZVRpbWUhPUR5bmFtaWMpIHx8IChyb3dzPT1Sb3dzQXRDb21waWxlVGltZSkpICYmICghKENvbHNBdENvbXBpbGVUaW1lIT1EeW5hbWljKSB8fCAoY29scz09Q29sc0F0Q29tcGlsZVRpbWUpKSAmJiAoIShSb3dzQXRDb21waWxlVGltZT09RHluYW1pYyAmJiBNYXhSb3dzQXRDb21waWxlVGltZSE9RHluYW1pYykgfHwgKHJvd3M8PU1heFJvd3NBdENvbXBpbGVUaW1lKSkgJiYgKCEoQ29sc0F0Q29tcGlsZVRpbWU9PUR5bmFtaWMgJiYgTWF4Q29sc0F0Q29tcGlsZVRpbWUhPUR5bmFtaWMpIHx8IChjb2xzPD1NYXhDb2xzQXRDb21waWxlVGltZSkpICYmIHJvd3M+PTAgJiYgY29scz49MCAmJiAiSW52YWxpZCBzaXplcyB3aGVuIHJlc2l6aW5nIGEgbWF0cml4IG9yIGFycmF5LiIAcmVzaXplAGFsaWdubWVudCA+PSBzaXplb2Yodm9pZCopICYmIChhbGlnbm1lbnQgJiAoYWxpZ25tZW50LTEpKSA9PSAwICYmICJBbGlnbm1lbnQgbXVzdCBiZSBhdCBsZWFzdCBzaXplb2Yodm9pZCopIGFuZCBhIHBvd2VyIG9mIDIiAC9ob21lL2Nsby9Db2Rlcy9zcGVlY2gtYW5hbHlzaXMvY21ha2UtYnVpbGQtcmVsZWFzZS9kZXBzL2luY2x1ZGUvZWlnZW4zL0VpZ2VuL3NyYy9Db3JlL3V0aWwvTWVtb3J5LmgAaGFuZG1hZGVfYWxpZ25lZF9tYWxsb2MAZHN0LnJvd3MoKSA9PSBkc3RSb3dzICYmIGRzdC5jb2xzKCkgPT0gZHN0Q29scwAvaG9tZS9jbG8vQ29kZXMvc3BlZWNoLWFuYWx5c2lzL2NtYWtlLWJ1aWxkLXJlbGVhc2UvZGVwcy9pbmNsdWRlL2VpZ2VuMy9FaWdlbi9zcmMvQ29yZS9Bc3NpZ25FdmFsdWF0b3IuaAByZXNpemVfaWZfYWxsb3dlZABpbmRleCA+PSAwICYmIGluZGV4IDwgc2l6ZSgpAC9ob21lL2Nsby9Db2Rlcy9zcGVlY2gtYW5hbHlzaXMvY21ha2UtYnVpbGQtcmVsZWFzZS9kZXBzL2luY2x1ZGUvZWlnZW4zL0VpZ2VuL3NyYy9Db3JlL0RlbnNlQ29lZmZzQmFzZS5oAG9wZXJhdG9yKCkAYWxsb2NhdG9yPFQ+OjphbGxvY2F0ZShzaXplX3QgbikgJ24nIGV4Y2VlZHMgbWF4aW11bSBzdXBwb3J0ZWQgc2l6ZQAAQXVkaW9DYXB0dXJlAHByb2Nlc3MAZ2V0U2FtcGxlUmF0ZQByZWFkQmxvY2sAMTJBdWRpb0NhcHR1cmUA0A0AANkJAABQMTJBdWRpb0NhcHR1cmUAsA4AAPAJAAAAAAAA6AkAAFBLMTJBdWRpb0NhcHR1cmUAAAAAsA4AABAKAAABAAAA6AkAAGlpAHYAdmkAAAoAAIQNAABpaWkAQdAUC9oUJA0AAAAKAACoDQAAhA0AAIQNAAB2aWlpaWkAAIQNAAAACgAAJA0AAAAKAACUCgAATjEwZW1zY3JpcHRlbjN2YWxFAADQDQAAgAoAAHZpaWkAdmVjdG9yAHN0ZDo6ZXhjZXB0aW9uAAAAAAAAGAsAAAEAAAANAAAADgAAAHN0ZDo6YmFkX2FsbG9jAAAAAAAAAAsAAAEAAAAPAAAAEAAAAFN0OWV4Y2VwdGlvbgAAAADQDQAA8AoAAFN0OWJhZF9hbGxvYwAAAAD4DQAACAsAAAALAAAAAAAASAsAAAIAAAARAAAAEgAAAFN0MTFsb2dpY19lcnJvcgD4DQAAOAsAAAALAAAAAAAAfAsAAAIAAAATAAAAEgAAAFN0MTJsZW5ndGhfZXJyb3IAAAAA+A0AAGgLAABICwAAU3Q5dHlwZV9pbmZvAAAAANANAACICwAATjEwX19jeHhhYml2MTE2X19zaGltX3R5cGVfaW5mb0UAAAAA+A0AAKALAACYCwAATjEwX19jeHhhYml2MTE3X19jbGFzc190eXBlX2luZm9FAAAA+A0AANALAADECwAATjEwX19jeHhhYml2MTE3X19wYmFzZV90eXBlX2luZm9FAAAA+A0AAAAMAADECwAATjEwX19jeHhhYml2MTE5X19wb2ludGVyX3R5cGVfaW5mb0UA+A0AADAMAAAkDAAATjEwX19jeHhhYml2MTIwX19mdW5jdGlvbl90eXBlX2luZm9FAAAAAPgNAABgDAAAxAsAAE4xMF9fY3h4YWJpdjEyOV9fcG9pbnRlcl90b19tZW1iZXJfdHlwZV9pbmZvRQAAAPgNAACUDAAAJAwAAAAAAAAUDQAAFAAAABUAAAAWAAAAFwAAABgAAABOMTBfX2N4eGFiaXYxMjNfX2Z1bmRhbWVudGFsX3R5cGVfaW5mb0UA+A0AAOwMAADECwAAdgAAANgMAAAgDQAARG4AANgMAAAsDQAAYgAAANgMAAA4DQAAYwAAANgMAABEDQAAaAAAANgMAABQDQAAYQAAANgMAABcDQAAcwAAANgMAABoDQAAdAAAANgMAAB0DQAAaQAAANgMAACADQAAagAAANgMAACMDQAAbAAAANgMAACYDQAAbQAAANgMAACkDQAAZgAAANgMAACwDQAAZAAAANgMAAC8DQAAAAAAAPQLAAAUAAAAGQAAABYAAAAXAAAAGgAAABsAAAAcAAAAHQAAAAAAAABADgAAFAAAAB4AAAAWAAAAFwAAABoAAAAfAAAAIAAAACEAAABOMTBfX2N4eGFiaXYxMjBfX3NpX2NsYXNzX3R5cGVfaW5mb0UAAAAA+A0AABgOAAD0CwAAAAAAAJwOAAAUAAAAIgAAABYAAAAXAAAAGgAAACMAAAAkAAAAJQAAAE4xMF9fY3h4YWJpdjEyMV9fdm1pX2NsYXNzX3R5cGVfaW5mb0UAAAD4DQAAdA4AAPQLAAAAAAAAVAwAABQAAAAmAAAAFgAAABcAAAAnAAAAdm9pZABib29sAGNoYXIAc2lnbmVkIGNoYXIAdW5zaWduZWQgY2hhcgBzaG9ydAB1bnNpZ25lZCBzaG9ydABpbnQAdW5zaWduZWQgaW50AGxvbmcAdW5zaWduZWQgbG9uZwBmbG9hdABkb3VibGUAc3RkOjpzdHJpbmcAc3RkOjpiYXNpY19zdHJpbmc8dW5zaWduZWQgY2hhcj4Ac3RkOjp3c3RyaW5nAGVtc2NyaXB0ZW46OnZhbABlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxjaGFyPgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxzaWduZWQgY2hhcj4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgY2hhcj4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8c2hvcnQ+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVuc2lnbmVkIHNob3J0PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxpbnQ+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVuc2lnbmVkIGludD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8bG9uZz4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgbG9uZz4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50OF90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50OF90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxpbnQxNl90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50MTZfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50MzJfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dWludDMyX3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGZsb2F0PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxkb3VibGU+AE5TdDNfXzIxMmJhc2ljX3N0cmluZ0ljTlNfMTFjaGFyX3RyYWl0c0ljRUVOU185YWxsb2NhdG9ySWNFRUVFAE5TdDNfXzIyMV9fYmFzaWNfc3RyaW5nX2NvbW1vbklMYjFFRUUAAAAA0A0AAPsRAABUDgAAvBEAAAAAAAABAAAAJBIAAAAAAABOU3QzX18yMTJiYXNpY19zdHJpbmdJaE5TXzExY2hhcl90cmFpdHNJaEVFTlNfOWFsbG9jYXRvckloRUVFRQAAVA4AAEQSAAAAAAAAAQAAACQSAAAAAAAATlN0M19fMjEyYmFzaWNfc3RyaW5nSXdOU18xMWNoYXJfdHJhaXRzSXdFRU5TXzlhbGxvY2F0b3JJd0VFRUUAAFQOAACcEgAAAAAAAAEAAAAkEgAAAAAAAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWNFRQAA0A0AAPQSAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lhRUUAANANAAAcEwAATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJaEVFAADQDQAARBMAAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SXNFRQAA0A0AAGwTAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0l0RUUAANANAACUEwAATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJaUVFAADQDQAAvBMAAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWpFRQAA0A0AAOQTAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lsRUUAANANAAAMFAAATjEwZW1zY3JpcHRlbjExbWVtb3J5X3ZpZXdJbUVFAADQDQAANBQAAE4xMGVtc2NyaXB0ZW4xMW1lbW9yeV92aWV3SWZFRQAA0A0AAFwUAABOMTBlbXNjcmlwdGVuMTFtZW1vcnlfdmlld0lkRUUAANANAACEFAC0mwEEbmFtZQGrmwHPAQANX19hc3NlcnRfZmFpbAETX2VtdmFsX3NldF9wcm9wZXJ0eQIYX19jeGFfYWxsb2NhdGVfZXhjZXB0aW9uAwtfX2N4YV90aHJvdwQRX2VtdmFsX3Rha2VfdmFsdWUFDV9lbXZhbF9kZWNyZWYGFl9lbWJpbmRfcmVnaXN0ZXJfY2xhc3MHIl9lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfY29uc3RydWN0b3IIH19lbWJpbmRfcmVnaXN0ZXJfY2xhc3NfZnVuY3Rpb24JBWFib3J0ChVfZW1iaW5kX3JlZ2lzdGVyX3ZvaWQLFV9lbWJpbmRfcmVnaXN0ZXJfYm9vbAwbX2VtYmluZF9yZWdpc3Rlcl9zdGRfc3RyaW5nDRxfZW1iaW5kX3JlZ2lzdGVyX3N0ZF93c3RyaW5nDhZfZW1iaW5kX3JlZ2lzdGVyX2VtdmFsDxhfZW1iaW5kX3JlZ2lzdGVyX2ludGVnZXIQFl9lbWJpbmRfcmVnaXN0ZXJfZmxvYXQRHF9lbWJpbmRfcmVnaXN0ZXJfbWVtb3J5X3ZpZXcSFmVtc2NyaXB0ZW5fcmVzaXplX2hlYXATFWVtc2NyaXB0ZW5fbWVtY3B5X2JpZxQRX193YXNtX2NhbGxfY3RvcnMVH0F1ZGlvQ2FwdHVyZTo6QXVkaW9DYXB0dXJlKGludCkWLkF1ZGlvQ2FwdHVyZTo6cHJvY2Vzcyh1bnNpZ25lZCBsb25nLCBpbnQsIGludCkXSEVpZ2VuOjppbnRlcm5hbDo6dmFyaWFibGVfaWZfZHluYW1pYzxsb25nLCAwPjo6dmFyaWFibGVfaWZfZHluYW1pYyhsb25nKRg3RWlnZW46OlN0cmlkZTwwLCAwPjo6U3RyaWRlKEVpZ2VuOjpTdHJpZGU8MCwgMD4gY29uc3QmKRltRWlnZW46OkVpZ2VuQmFzZTxFaWdlbjo6TWFwPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIDEsIDAsIC0xLCAxPiwgMCwgRWlnZW46OlN0cmlkZTwwLCAwPiA+ID46OmRlcml2ZWQoKSBjb25zdBo6RWlnZW46OkRlbnNlU3RvcmFnZTxkb3VibGUsIC0xLCAtMSwgMSwgMD46On5EZW5zZVN0b3JhZ2UoKRsdQXVkaW9DYXB0dXJlOjpnZXRTYW1wbGVSYXRlKCkcKEF1ZGlvQ2FwdHVyZTo6cmVhZEJsb2NrKGVtc2NyaXB0ZW46OnZhbCkdUkVpZ2VuOjpEZW5zZUNvZWZmc0Jhc2U8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiwgMT46Om9wZXJhdG9yKCkobG9uZykeQXZvaWQgZW1zY3JpcHRlbjo6dmFsOjpzZXQ8aW50LCBkb3VibGU+KGludCBjb25zdCYsIGRvdWJsZSBjb25zdCYpHzt2b2lkIGVtc2NyaXB0ZW46OnZhbDo6c2V0PGludCwgaW50PihpbnQgY29uc3QmLCBpbnQgY29uc3QmKSBQRWlnZW46OkRlbnNlQ29lZmZzQmFzZTxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+LCAxPjo6Y29lZmZSZWYobG9uZykhLGVtc2NyaXB0ZW46OnZhbDo6dmFsPGludCBjb25zdCY+KGludCBjb25zdCYpIjJlbXNjcmlwdGVuOjp2YWw6OnZhbDxkb3VibGUgY29uc3QmPihkb3VibGUgY29uc3QmKSMXZW1zY3JpcHRlbjo6dmFsOjp+dmFsKCkkUXN0ZDo6X18yOjp2ZWN0b3I8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4gPjo6X19hbm5vdGF0ZV9kZWxldGUoKSBjb25zdCVPc3RkOjpfXzI6Ol9fdmVjdG9yX2Jhc2U8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4gPjo6fl9fdmVjdG9yX2Jhc2UoKSZEc3RkOjpfXzI6OnZlY3Rvcjxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiA+OjpzaXplKCkgY29uc3QnSHN0ZDo6X18yOjpfX3ZlY3Rvcl9iYXNlPGRvdWJsZSwgc3RkOjpfXzI6OmFsbG9jYXRvcjxkb3VibGU+ID46Ol9fYWxsb2MoKShPc3RkOjpfXzI6Ol9fdmVjdG9yX2Jhc2U8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4gPjo6Y2FwYWNpdHkoKSBjb25zdClZc3RkOjpfXzI6Ol9fdmVjdG9yX2Jhc2U8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4gPjo6X19kZXN0cnVjdF9hdF9lbmQoZG91YmxlKikqLXN0ZDo6X18yOjpfRGVhbGxvY2F0ZUNhbGxlcjo6X19kb19jYWxsKHZvaWQqKSstRWlnZW46OmludGVybmFsOjpoYW5kbWFkZV9hbGlnbmVkX2ZyZWUodm9pZCopLDlFaWdlbjo6RGVuc2VTdG9yYWdlPGRvdWJsZSwgLTEsIC0xLCAxLCAwPjo6RGVuc2VTdG9yYWdlKCktc0VpZ2VuOjpNYXBCYXNlPEVpZ2VuOjpNYXA8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgMSwgMCwgLTEsIDE+LCAwLCBFaWdlbjo6U3RyaWRlPDAsIDA+ID4sIDA+OjpNYXBCYXNlKGZsb2F0KiwgbG9uZykuSUVpZ2VuOjppbnRlcm5hbDo6dmFyaWFibGVfaWZfZHluYW1pYzxsb25nLCAtMT46OnZhcmlhYmxlX2lmX2R5bmFtaWMobG9uZykvSEVpZ2VuOjppbnRlcm5hbDo6dmFyaWFibGVfaWZfZHluYW1pYzxsb25nLCAxPjo6dmFyaWFibGVfaWZfZHluYW1pYyhsb25nKTCWA3ZvaWQgRWlnZW46OlBsYWluT2JqZWN0QmFzZTxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+ID46OnJlc2l6ZUxpa2U8RWlnZW46OkN3aXNlVW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jYXN0X29wPGZsb2F0LCBkb3VibGU+LCBFaWdlbjo6TWFwPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIDEsIDAsIC0xLCAxPiwgMCwgRWlnZW46OlN0cmlkZTwwLCAwPiA+IGNvbnN0PiA+KEVpZ2VuOjpFaWdlbkJhc2U8RWlnZW46OkN3aXNlVW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jYXN0X29wPGZsb2F0LCBkb3VibGU+LCBFaWdlbjo6TWFwPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIDEsIDAsIC0xLCAxPiwgMCwgRWlnZW46OlN0cmlkZTwwLCAwPiA+IGNvbnN0PiA+IGNvbnN0JikxugNFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+JiBFaWdlbjo6UGxhaW5PYmplY3RCYXNlPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gPjo6X3NldF9ub2FsaWFzPEVpZ2VuOjpDd2lzZVVuYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY2FzdF9vcDxmbG9hdCwgZG91YmxlPiwgRWlnZW46Ok1hcDxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAxLCAwLCAtMSwgMT4sIDAsIEVpZ2VuOjpTdHJpZGU8MCwgMD4gPiBjb25zdD4gPihFaWdlbjo6RGVuc2VCYXNlPEVpZ2VuOjpDd2lzZVVuYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY2FzdF9vcDxmbG9hdCwgZG91YmxlPiwgRWlnZW46Ok1hcDxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAxLCAwLCAtMSwgMT4sIDAsIEVpZ2VuOjpTdHJpZGU8MCwgMD4gPiBjb25zdD4gPiBjb25zdCYpMiZFaWdlbjo6aW50ZXJuYWw6OnRocm93X3N0ZF9iYWRfYWxsb2MoKTNSRWlnZW46OlBsYWluT2JqZWN0QmFzZTxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+ID46OnJlc2l6ZShsb25nLCBsb25nKTRqRWlnZW46Ok1hcEJhc2U8RWlnZW46Ok1hcDxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAxLCAwLCAtMSwgMT4sIDAsIEVpZ2VuOjpTdHJpZGU8MCwgMD4gPiwgMD46OnJvd3MoKSBjb25zdDVDRWlnZW46OkRlbnNlU3RvcmFnZTxkb3VibGUsIC0xLCAtMSwgMSwgMD46OnJlc2l6ZShsb25nLCBsb25nLCBsb25nKTZGRWlnZW46OmludGVybmFsOjpoYW5kbWFkZV9hbGlnbmVkX21hbGxvYyh1bnNpZ25lZCBsb25nLCB1bnNpZ25lZCBsb25nKTeSBHZvaWQgRWlnZW46OmludGVybmFsOjpjYWxsX2RlbnNlX2Fzc2lnbm1lbnRfbG9vcDxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+LCBFaWdlbjo6Q3dpc2VVbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX2Nhc3Rfb3A8ZmxvYXQsIGRvdWJsZT4sIEVpZ2VuOjpNYXA8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgMSwgMCwgLTEsIDE+LCAwLCBFaWdlbjo6U3RyaWRlPDAsIDA+ID4gY29uc3Q+LCBFaWdlbjo6aW50ZXJuYWw6OmFzc2lnbl9vcDxkb3VibGUsIGRvdWJsZT4gPihFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+JiwgRWlnZW46OkN3aXNlVW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jYXN0X29wPGZsb2F0LCBkb3VibGU+LCBFaWdlbjo6TWFwPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIDEsIDAsIC0xLCAxPiwgMCwgRWlnZW46OlN0cmlkZTwwLCAwPiA+IGNvbnN0PiBjb25zdCYsIEVpZ2VuOjppbnRlcm5hbDo6YXNzaWduX29wPGRvdWJsZSwgZG91YmxlPiBjb25zdCYpOOwDdm9pZCBFaWdlbjo6aW50ZXJuYWw6OnJlc2l6ZV9pZl9hbGxvd2VkPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4sIEVpZ2VuOjpDd2lzZVVuYXJ5T3A8RWlnZW46OmludGVybmFsOjpzY2FsYXJfY2FzdF9vcDxmbG9hdCwgZG91YmxlPiwgRWlnZW46Ok1hcDxFaWdlbjo6QXJyYXk8ZmxvYXQsIC0xLCAxLCAwLCAtMSwgMT4sIDAsIEVpZ2VuOjpTdHJpZGU8MCwgMD4gPiBjb25zdD4sIGRvdWJsZSwgZG91YmxlPihFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+JiwgRWlnZW46OkN3aXNlVW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jYXN0X29wPGZsb2F0LCBkb3VibGU+LCBFaWdlbjo6TWFwPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIDEsIDAsIC0xLCAxPiwgMCwgRWlnZW46OlN0cmlkZTwwLCAwPiA+IGNvbnN0PiBjb25zdCYsIEVpZ2VuOjppbnRlcm5hbDo6YXNzaWduX29wPGRvdWJsZSwgZG91YmxlPiBjb25zdCYpOXtFaWdlbjo6aW50ZXJuYWw6OmV2YWx1YXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+ID46OmV2YWx1YXRvcihFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0Jik64gVFaWdlbjo6aW50ZXJuYWw6OmRlbnNlX2Fzc2lnbm1lbnRfbG9vcDxFaWdlbjo6aW50ZXJuYWw6OmdlbmVyaWNfZGVuc2VfYXNzaWdubWVudF9rZXJuZWw8RWlnZW46OmludGVybmFsOjpldmFsdWF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiA+LCBFaWdlbjo6aW50ZXJuYWw6OmV2YWx1YXRvcjxFaWdlbjo6Q3dpc2VVbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX2Nhc3Rfb3A8ZmxvYXQsIGRvdWJsZT4sIEVpZ2VuOjpNYXA8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgMSwgMCwgLTEsIDE+LCAwLCBFaWdlbjo6U3RyaWRlPDAsIDA+ID4gY29uc3Q+ID4sIEVpZ2VuOjppbnRlcm5hbDo6YXNzaWduX29wPGRvdWJsZSwgZG91YmxlPiwgMD4sIDEsIDA+OjpydW4oRWlnZW46OmludGVybmFsOjpnZW5lcmljX2RlbnNlX2Fzc2lnbm1lbnRfa2VybmVsPEVpZ2VuOjppbnRlcm5hbDo6ZXZhbHVhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gPiwgRWlnZW46OmludGVybmFsOjpldmFsdWF0b3I8RWlnZW46OkN3aXNlVW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jYXN0X29wPGZsb2F0LCBkb3VibGU+LCBFaWdlbjo6TWFwPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIDEsIDAsIC0xLCAxPiwgMCwgRWlnZW46OlN0cmlkZTwwLCAwPiA+IGNvbnN0PiA+LCBFaWdlbjo6aW50ZXJuYWw6OmFzc2lnbl9vcDxkb3VibGUsIGRvdWJsZT4sIDA+Jik76QJFaWdlbjo6aW50ZXJuYWw6OmdlbmVyaWNfZGVuc2VfYXNzaWdubWVudF9rZXJuZWw8RWlnZW46OmludGVybmFsOjpldmFsdWF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiA+LCBFaWdlbjo6aW50ZXJuYWw6OmV2YWx1YXRvcjxFaWdlbjo6Q3dpc2VVbmFyeU9wPEVpZ2VuOjppbnRlcm5hbDo6c2NhbGFyX2Nhc3Rfb3A8ZmxvYXQsIGRvdWJsZT4sIEVpZ2VuOjpNYXA8RWlnZW46OkFycmF5PGZsb2F0LCAtMSwgMSwgMCwgLTEsIDE+LCAwLCBFaWdlbjo6U3RyaWRlPDAsIDA+ID4gY29uc3Q+ID4sIEVpZ2VuOjppbnRlcm5hbDo6YXNzaWduX29wPGRvdWJsZSwgZG91YmxlPiwgMD46OmFzc2lnbkNvZWZmKGxvbmcpPKUBRWlnZW46OkN3aXNlVW5hcnlPcDxFaWdlbjo6aW50ZXJuYWw6OnNjYWxhcl9jYXN0X29wPGZsb2F0LCBkb3VibGU+LCBFaWdlbjo6TWFwPEVpZ2VuOjpBcnJheTxmbG9hdCwgLTEsIDEsIDAsIC0xLCAxPiwgMCwgRWlnZW46OlN0cmlkZTwwLCAwPiA+IGNvbnN0Pjo6ZnVuY3RvcigpIGNvbnN0PW9FaWdlbjo6aW50ZXJuYWw6OnBsYWlub2JqZWN0YmFzZV9ldmFsdWF0b3JfZGF0YTxkb3VibGUsIDA+OjpwbGFpbm9iamVjdGJhc2VfZXZhbHVhdG9yX2RhdGEoZG91YmxlIGNvbnN0KiwgbG9uZyk+P3ZvaWQgRWlnZW46OmludGVybmFsOjppZ25vcmVfdW51c2VkX3ZhcmlhYmxlPGxvbmc+KGxvbmcgY29uc3QmKT9rRWlnZW46OmludGVybmFsOjpldmFsdWF0b3I8RWlnZW46OlBsYWluT2JqZWN0QmFzZTxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+ID4gPjo6Y29lZmZSZWYobG9uZylAcmRvdWJsZSogRWlnZW46OmludGVybmFsOjpjb25kaXRpb25hbF9hbGlnbmVkX3JlYWxsb2NfbmV3X2F1dG88ZG91YmxlLCB0cnVlPihkb3VibGUqLCB1bnNpZ25lZCBsb25nLCB1bnNpZ25lZCBsb25nKUFFRWlnZW46OmludGVybmFsOjphbGlnbmVkX3JlYWxsb2Modm9pZCosIHVuc2lnbmVkIGxvbmcsIHVuc2lnbmVkIGxvbmcpQk5FaWdlbjo6aW50ZXJuYWw6OmhhbmRtYWRlX2FsaWduZWRfcmVhbGxvYyh2b2lkKiwgdW5zaWduZWQgbG9uZywgdW5zaWduZWQgbG9uZylDSGVtc2NyaXB0ZW46OmludGVybmFsOjpXaXJlVHlwZVBhY2s8aW50IGNvbnN0Jj46OldpcmVUeXBlUGFjayhpbnQgY29uc3QmKUROZW1zY3JpcHRlbjo6aW50ZXJuYWw6OldpcmVUeXBlUGFjazxkb3VibGUgY29uc3QmPjo6V2lyZVR5cGVQYWNrKGRvdWJsZSBjb25zdCYpRRtSaW5nQnVmZmVyOjpSaW5nQnVmZmVyKGludClGXHN0ZDo6X18yOjp2ZWN0b3I8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4gPjo6cmVzaXplKHVuc2lnbmVkIGxvbmcsIGRvdWJsZSBjb25zdCYpR05zdGQ6Ol9fMjo6X192ZWN0b3JfYmFzZTxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiA+OjpfX3ZlY3Rvcl9iYXNlKClIXnN0ZDo6X18yOjp2ZWN0b3I8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4gPjo6X19hcHBlbmQodW5zaWduZWQgbG9uZywgZG91YmxlIGNvbnN0JilJQ1JpbmdCdWZmZXI6OndyaXRlSW50byhFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0JilKP3N0ZDo6X18yOjp2ZWN0b3I8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4gPjo6YmVnaW4oKUs1c3RkOjpfXzI6Ol9fd3JhcF9pdGVyPGRvdWJsZSo+OjpvcGVyYXRvcisobG9uZykgY29uc3RMR0VpZ2VuOjpEZW5zZUJhc2U8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiA+OjpiZWdpbigpIGNvbnN0TckDc3RkOjpfXzI6OmVuYWJsZV9pZjxfX2lzX3JhbmRvbV9hY2Nlc3NfaXRlcmF0b3I8RWlnZW46OmludGVybmFsOjpwb2ludGVyX2Jhc2VkX3N0bF9pdGVyYXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0PiA+Ojp2YWx1ZSwgc3RkOjpfXzI6Ol9fd3JhcF9pdGVyPGRvdWJsZSo+ID46OnR5cGUgc3RkOjpfXzI6OmNvcHlfbjxFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+LCBpbnQsIHN0ZDo6X18yOjpfX3dyYXBfaXRlcjxkb3VibGUqPiA+KEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4sIGludCwgc3RkOjpfXzI6Ol9fd3JhcF9pdGVyPGRvdWJsZSo+KU6BAUVpZ2VuOjppbnRlcm5hbDo6b3BlcmF0b3IrKEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4gY29uc3QmLCBsb25nKU/VAUVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD46OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yKEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4gY29uc3QmKVBMc3RkOjpfXzI6OnZlY3Rvcjxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiA+OjpfX21ha2VfaXRlcihkb3VibGUqKVH8AnN0ZDo6X18yOjpfX3dyYXBfaXRlcjxkb3VibGUqPiBzdGQ6Ol9fMjo6Y29weTxFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+LCBzdGQ6Ol9fMjo6X193cmFwX2l0ZXI8ZG91YmxlKj4gPihFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+LCBFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+LCBzdGQ6Ol9fMjo6X193cmFwX2l0ZXI8ZG91YmxlKj4pUkhFaWdlbjo6RGVuc2VCYXNlPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gPjo6Y2JlZ2luKCkgY29uc3RTPFJpbmdCdWZmZXI6OnJlYWRGcm9tKEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4mKVS6A3N0ZDo6X18yOjplbmFibGVfaWY8X19pc19yYW5kb21fYWNjZXNzX2l0ZXJhdG9yPHN0ZDo6X18yOjpfX3dyYXBfaXRlcjxkb3VibGUqPiA+Ojp2YWx1ZSwgRWlnZW46OmludGVybmFsOjpwb2ludGVyX2Jhc2VkX3N0bF9pdGVyYXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+ID4gPjo6dHlwZSBzdGQ6Ol9fMjo6Y29weV9uPHN0ZDo6X18yOjpfX3dyYXBfaXRlcjxkb3VibGUqPiwgaW50LCBFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gPiA+KHN0ZDo6X18yOjpfX3dyYXBfaXRlcjxkb3VibGUqPiwgaW50LCBFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gPilV7QJFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gPiBzdGQ6Ol9fMjo6Y29weTxzdGQ6Ol9fMjo6X193cmFwX2l0ZXI8ZG91YmxlKj4sIEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiA+ID4oc3RkOjpfXzI6Ol9fd3JhcF9pdGVyPGRvdWJsZSo+LCBzdGQ6Ol9fMjo6X193cmFwX2l0ZXI8ZG91YmxlKj4sIEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiA+KVZzc3RkOjpfXzI6Ol9fY29tcHJlc3NlZF9wYWlyX2VsZW08ZG91YmxlKiwgMCwgZmFsc2U+OjpfX2NvbXByZXNzZWRfcGFpcl9lbGVtPHN0ZDo6bnVsbHB0cl90LCB2b2lkPihzdGQ6Om51bGxwdHJfdCYmKVdoc3RkOjpfXzI6OnZlY3Rvcjxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiA+OjpfX2NvbnN0cnVjdF9hdF9lbmQodW5zaWduZWQgbG9uZywgZG91YmxlIGNvbnN0JilYWHN0ZDo6X18yOjp2ZWN0b3I8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4gPjo6X19yZWNvbW1lbmQodW5zaWduZWQgbG9uZykgY29uc3RZigFzdGQ6Ol9fMjo6X19zcGxpdF9idWZmZXI8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4mPjo6X19zcGxpdF9idWZmZXIodW5zaWduZWQgbG9uZywgdW5zaWduZWQgbG9uZywgc3RkOjpfXzI6OmFsbG9jYXRvcjxkb3VibGU+JilacHN0ZDo6X18yOjpfX3NwbGl0X2J1ZmZlcjxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiY+OjpfX2NvbnN0cnVjdF9hdF9lbmQodW5zaWduZWQgbG9uZywgZG91YmxlIGNvbnN0JilbkwFzdGQ6Ol9fMjo6dmVjdG9yPGRvdWJsZSwgc3RkOjpfXzI6OmFsbG9jYXRvcjxkb3VibGU+ID46Ol9fc3dhcF9vdXRfY2lyY3VsYXJfYnVmZmVyKHN0ZDo6X18yOjpfX3NwbGl0X2J1ZmZlcjxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiY+JilcXnN0ZDo6X18yOjp2ZWN0b3I8ZG91YmxlLCBzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4gPjo6X19hbm5vdGF0ZV9zaHJpbmsodW5zaWduZWQgbG9uZykgY29uc3RdlQF2b2lkIHN0ZDo6X18yOjphbGxvY2F0b3JfdHJhaXRzPHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiA+Ojpjb25zdHJ1Y3Q8ZG91YmxlLCBkb3VibGUgY29uc3QmPihzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4mLCBkb3VibGUqLCBkb3VibGUgY29uc3QmKV5Ic3RkOjpfXzI6OnZlY3Rvcjxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiA+OjptYXhfc2l6ZSgpIGNvbnN0X9kCc3RkOjpfXzI6OmVuYWJsZV9pZjwoKHN0ZDo6X18yOjppbnRlZ3JhbF9jb25zdGFudDxib29sLCB0cnVlPjo6dmFsdWUpIHx8ICghKF9faGFzX2NvbnN0cnVjdDxzdGQ6Ol9fMjo6YWxsb2NhdG9yPGRvdWJsZT4sIGJvb2wqLCBib29sPjo6dmFsdWUpKSkgJiYgKGlzX3RyaXZpYWxseV9tb3ZlX2NvbnN0cnVjdGlibGU8Ym9vbD46OnZhbHVlKSwgdm9pZD46OnR5cGUgc3RkOjpfXzI6OmFsbG9jYXRvcl90cmFpdHM8c3RkOjpfXzI6OmFsbG9jYXRvcjxkb3VibGU+ID46Ol9fY29uc3RydWN0X2JhY2t3YXJkPGRvdWJsZT4oc3RkOjpfXzI6OmFsbG9jYXRvcjxkb3VibGU+JiwgYm9vbCosIGJvb2wqLCBib29sKiYpYJwBc3RkOjpfXzI6OmVuYWJsZV9pZjwoaXNfbW92ZV9jb25zdHJ1Y3RpYmxlPGRvdWJsZSo+Ojp2YWx1ZSkgJiYgKGlzX21vdmVfYXNzaWduYWJsZTxkb3VibGUqPjo6dmFsdWUpLCB2b2lkPjo6dHlwZSBzdGQ6Ol9fMjo6c3dhcDxkb3VibGUqPihkb3VibGUqJiwgZG91YmxlKiYpYVtzdGQ6Ol9fMjo6dmVjdG9yPGRvdWJsZSwgc3RkOjpfXzI6OmFsbG9jYXRvcjxkb3VibGU+ID46Ol9fYW5ub3RhdGVfbmV3KHVuc2lnbmVkIGxvbmcpIGNvbnN0Yr4BdW5zaWduZWQgbG9uZyBjb25zdCYgc3RkOjpfXzI6Om1heDx1bnNpZ25lZCBsb25nLCBzdGQ6Ol9fMjo6X19sZXNzPHVuc2lnbmVkIGxvbmcsIHVuc2lnbmVkIGxvbmc+ID4odW5zaWduZWQgbG9uZyBjb25zdCYsIHVuc2lnbmVkIGxvbmcgY29uc3QmLCBzdGQ6Ol9fMjo6X19sZXNzPHVuc2lnbmVkIGxvbmcsIHVuc2lnbmVkIGxvbmc+KWO+AXVuc2lnbmVkIGxvbmcgY29uc3QmIHN0ZDo6X18yOjptaW48dW5zaWduZWQgbG9uZywgc3RkOjpfXzI6Ol9fbGVzczx1bnNpZ25lZCBsb25nLCB1bnNpZ25lZCBsb25nPiA+KHVuc2lnbmVkIGxvbmcgY29uc3QmLCB1bnNpZ25lZCBsb25nIGNvbnN0Jiwgc3RkOjpfXzI6Ol9fbGVzczx1bnNpZ25lZCBsb25nLCB1bnNpZ25lZCBsb25nPilkbHN0ZDo6X18yOjpfX2xlc3M8dW5zaWduZWQgbG9uZywgdW5zaWduZWQgbG9uZz46Om9wZXJhdG9yKCkodW5zaWduZWQgbG9uZyBjb25zdCYsIHVuc2lnbmVkIGxvbmcgY29uc3QmKSBjb25zdGUrc3RkOjpfXzI6Ol9fdGhyb3dfbGVuZ3RoX2Vycm9yKGNoYXIgY29uc3QqKWaEAXN0ZDo6X18yOjpfX3NwbGl0X2J1ZmZlcjxkb3VibGUsIHN0ZDo6X18yOjphbGxvY2F0b3I8ZG91YmxlPiY+OjpfX2Rlc3RydWN0X2F0X2VuZChkb3VibGUqLCBzdGQ6Ol9fMjo6aW50ZWdyYWxfY29uc3RhbnQ8Ym9vbCwgZmFsc2U+KWelAkVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4gc3RkOjpfXzI6Ol9fdW53cmFwX2l0ZXI8RWlnZW46OmludGVybmFsOjpwb2ludGVyX2Jhc2VkX3N0bF9pdGVyYXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0PiA+KEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4paI8Bc3RkOjpfXzI6OmVuYWJsZV9pZjxpc190cml2aWFsbHlfY29weV9hc3NpZ25hYmxlPGRvdWJsZT46OnZhbHVlLCBkb3VibGUqPjo6dHlwZSBzdGQ6Ol9fMjo6X191bndyYXBfaXRlcjxkb3VibGU+KHN0ZDo6X18yOjpfX3dyYXBfaXRlcjxkb3VibGUqPilpuAJkb3VibGUqIHN0ZDo6X18yOjpfX2NvcHk8RWlnZW46OmludGVybmFsOjpwb2ludGVyX2Jhc2VkX3N0bF9pdGVyYXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0PiwgZG91YmxlKj4oRWlnZW46OmludGVybmFsOjpwb2ludGVyX2Jhc2VkX3N0bF9pdGVyYXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0PiwgRWlnZW46OmludGVybmFsOjpwb2ludGVyX2Jhc2VkX3N0bF9pdGVyYXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0PiwgZG91YmxlKilqywFFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gY29uc3Q+OjpvcGVyYXRvciE9KEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiBjb25zdD4gY29uc3QmKSBjb25zdGtmRWlnZW46OmludGVybmFsOjpwb2ludGVyX2Jhc2VkX3N0bF9pdGVyYXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+IGNvbnN0Pjo6b3BlcmF0b3IrKygpbKoCRWlnZW46OmludGVybmFsOjpwb2ludGVyX2Jhc2VkX3N0bF9pdGVyYXRvcjxFaWdlbjo6QXJyYXk8ZG91YmxlLCAtMSwgMSwgMCwgLTEsIDE+ID4gc3RkOjpfXzI6Ol9fY29weTxkb3VibGUqLCBFaWdlbjo6aW50ZXJuYWw6OnBvaW50ZXJfYmFzZWRfc3RsX2l0ZXJhdG9yPEVpZ2VuOjpBcnJheTxkb3VibGUsIC0xLCAxLCAwLCAtMSwgMT4gPiA+KGRvdWJsZSosIGRvdWJsZSosIEVpZ2VuOjppbnRlcm5hbDo6cG9pbnRlcl9iYXNlZF9zdGxfaXRlcmF0b3I8RWlnZW46OkFycmF5PGRvdWJsZSwgLTEsIDEsIDAsIC0xLCAxPiA+KW1YRW1zY3JpcHRlbkJpbmRpbmdJbml0aWFsaXplcl9hdWRpb19jYXB0dXJlOjpFbXNjcmlwdGVuQmluZGluZ0luaXRpYWxpemVyX2F1ZGlvX2NhcHR1cmUoKW5Mdm9pZCBjb25zdCogZW1zY3JpcHRlbjo6aW50ZXJuYWw6OmdldEFjdHVhbFR5cGU8QXVkaW9DYXB0dXJlPihBdWRpb0NhcHR1cmUqKW9Gdm9pZCBlbXNjcmlwdGVuOjppbnRlcm5hbDo6cmF3X2Rlc3RydWN0b3I8QXVkaW9DYXB0dXJlPihBdWRpb0NhcHR1cmUqKXBKQXVkaW9DYXB0dXJlKiBlbXNjcmlwdGVuOjppbnRlcm5hbDo6b3BlcmF0b3JfbmV3PEF1ZGlvQ2FwdHVyZSwgaW50PihpbnQmJilxfXZvaWQgZW1zY3JpcHRlbjo6aW50ZXJuYWw6OlJlZ2lzdGVyQ2xhc3NDb25zdHJ1Y3RvcjxBdWRpb0NhcHR1cmUqICgqKShpbnQmJik+OjppbnZva2U8QXVkaW9DYXB0dXJlPihBdWRpb0NhcHR1cmUqICgqKShpbnQmJikpctMBdm9pZCBlbXNjcmlwdGVuOjppbnRlcm5hbDo6UmVnaXN0ZXJDbGFzc01ldGhvZDx2b2lkIChBdWRpb0NhcHR1cmU6OiopKHVuc2lnbmVkIGxvbmcsIGludCwgaW50KT46Omludm9rZTxBdWRpb0NhcHR1cmUsIGVtc2NyaXB0ZW46OmFsbG93X3Jhd19wb2ludGVycz4oY2hhciBjb25zdCosIHZvaWQgKEF1ZGlvQ2FwdHVyZTo6KikodW5zaWduZWQgbG9uZywgaW50LCBpbnQpKXODAXZvaWQgZW1zY3JpcHRlbjo6aW50ZXJuYWw6OlJlZ2lzdGVyQ2xhc3NNZXRob2Q8aW50IChBdWRpb0NhcHR1cmU6OiopKCk+OjppbnZva2U8QXVkaW9DYXB0dXJlPihjaGFyIGNvbnN0KiwgaW50IChBdWRpb0NhcHR1cmU6OiopKCkpdKMBdm9pZCBlbXNjcmlwdGVuOjppbnRlcm5hbDo6UmVnaXN0ZXJDbGFzc01ldGhvZDx2b2lkIChBdWRpb0NhcHR1cmU6OiopKGVtc2NyaXB0ZW46OnZhbCk+OjppbnZva2U8QXVkaW9DYXB0dXJlPihjaGFyIGNvbnN0Kiwgdm9pZCAoQXVkaW9DYXB0dXJlOjoqKShlbXNjcmlwdGVuOjp2YWwpKXVaZW1zY3JpcHRlbjo6aW50ZXJuYWw6Okludm9rZXI8QXVkaW9DYXB0dXJlKiwgaW50JiY+OjppbnZva2UoQXVkaW9DYXB0dXJlKiAoKikoaW50JiYpLCBpbnQpduoBZW1zY3JpcHRlbjo6aW50ZXJuYWw6Ok1ldGhvZEludm9rZXI8dm9pZCAoQXVkaW9DYXB0dXJlOjoqKSh1bnNpZ25lZCBsb25nLCBpbnQsIGludCksIHZvaWQsIEF1ZGlvQ2FwdHVyZSosIHVuc2lnbmVkIGxvbmcsIGludCwgaW50Pjo6aW52b2tlKHZvaWQgKEF1ZGlvQ2FwdHVyZTo6KiBjb25zdCYpKHVuc2lnbmVkIGxvbmcsIGludCwgaW50KSwgQXVkaW9DYXB0dXJlKiwgdW5zaWduZWQgbG9uZywgaW50LCBpbnQpd7kBdm9pZCAoQXVkaW9DYXB0dXJlOjoqKmVtc2NyaXB0ZW46OmludGVybmFsOjpnZXRDb250ZXh0PHZvaWQgKEF1ZGlvQ2FwdHVyZTo6KikodW5zaWduZWQgbG9uZywgaW50LCBpbnQpPih2b2lkIChBdWRpb0NhcHR1cmU6OiogY29uc3QmKSh1bnNpZ25lZCBsb25nLCBpbnQsIGludCkpKSh1bnNpZ25lZCBsb25nLCBpbnQsIGludCl4hwFlbXNjcmlwdGVuOjppbnRlcm5hbDo6TWV0aG9kSW52b2tlcjxpbnQgKEF1ZGlvQ2FwdHVyZTo6KikoKSwgaW50LCBBdWRpb0NhcHR1cmUqPjo6aW52b2tlKGludCAoQXVkaW9DYXB0dXJlOjoqIGNvbnN0JikoKSwgQXVkaW9DYXB0dXJlKil52QFlbXNjcmlwdGVuOjppbnRlcm5hbDo6TWV0aG9kSW52b2tlcjx2b2lkIChBdWRpb0NhcHR1cmU6OiopKGVtc2NyaXB0ZW46OnZhbCksIHZvaWQsIEF1ZGlvQ2FwdHVyZSosIGVtc2NyaXB0ZW46OnZhbD46Omludm9rZSh2b2lkIChBdWRpb0NhcHR1cmU6OiogY29uc3QmKShlbXNjcmlwdGVuOjp2YWwpLCBBdWRpb0NhcHR1cmUqLCBlbXNjcmlwdGVuOjppbnRlcm5hbDo6X0VNX1ZBTCopehtvcGVyYXRvciBuZXcodW5zaWduZWQgbG9uZyl7BnN0cmxlbnwbc3RkOjpleGNlcHRpb246OmV4Y2VwdGlvbigpfT1zdGQ6Ol9fMjo6X19saWJjcHBfcmVmc3RyaW5nOjpfX2xpYmNwcF9yZWZzdHJpbmcoY2hhciBjb25zdCopfhBfX2Vycm5vX2xvY2F0aW9ufxxzdGQ6OmV4Y2VwdGlvbjo6d2hhdCgpIGNvbnN0gAEcc3RkOjpiYWRfYWxsb2M6OndoYXQoKSBjb25zdIEBIHN0ZDo6bG9naWNfZXJyb3I6On5sb2dpY19lcnJvcigpggEzc3RkOjpfXzI6Ol9fbGliY3BwX3JlZnN0cmluZzo6fl9fbGliY3BwX3JlZnN0cmluZygpgwEic3RkOjpsb2dpY19lcnJvcjo6fmxvZ2ljX2Vycm9yKCkuMYQBInN0ZDo6bGVuZ3RoX2Vycm9yOjp+bGVuZ3RoX2Vycm9yKCmFAQZzdHJjbXCGAWFfX2N4eGFiaXYxOjpfX2Z1bmRhbWVudGFsX3R5cGVfaW5mbzo6Y2FuX2NhdGNoKF9fY3h4YWJpdjE6Ol9fc2hpbV90eXBlX2luZm8gY29uc3QqLCB2b2lkKiYpIGNvbnN0hwE8aXNfZXF1YWwoc3RkOjp0eXBlX2luZm8gY29uc3QqLCBzdGQ6OnR5cGVfaW5mbyBjb25zdCosIGJvb2wpiAFbX19jeHhhYml2MTo6X19jbGFzc190eXBlX2luZm86OmNhbl9jYXRjaChfX2N4eGFiaXYxOjpfX3NoaW1fdHlwZV9pbmZvIGNvbnN0Kiwgdm9pZComKSBjb25zdIkBDl9fZHluYW1pY19jYXN0igFrX19jeHhhYml2MTo6X19jbGFzc190eXBlX2luZm86OnByb2Nlc3NfZm91bmRfYmFzZV9jbGFzcyhfX2N4eGFiaXYxOjpfX2R5bmFtaWNfY2FzdF9pbmZvKiwgdm9pZCosIGludCkgY29uc3SLAW5fX2N4eGFiaXYxOjpfX2NsYXNzX3R5cGVfaW5mbzo6aGFzX3VuYW1iaWd1b3VzX3B1YmxpY19iYXNlKF9fY3h4YWJpdjE6Ol9fZHluYW1pY19jYXN0X2luZm8qLCB2b2lkKiwgaW50KSBjb25zdIwBcV9fY3h4YWJpdjE6Ol9fc2lfY2xhc3NfdHlwZV9pbmZvOjpoYXNfdW5hbWJpZ3VvdXNfcHVibGljX2Jhc2UoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQqLCBpbnQpIGNvbnN0jQFzX19jeHhhYml2MTo6X19iYXNlX2NsYXNzX3R5cGVfaW5mbzo6aGFzX3VuYW1iaWd1b3VzX3B1YmxpY19iYXNlKF9fY3h4YWJpdjE6Ol9fZHluYW1pY19jYXN0X2luZm8qLCB2b2lkKiwgaW50KSBjb25zdI4Bcl9fY3h4YWJpdjE6Ol9fdm1pX2NsYXNzX3R5cGVfaW5mbzo6aGFzX3VuYW1iaWd1b3VzX3B1YmxpY19iYXNlKF9fY3h4YWJpdjE6Ol9fZHluYW1pY19jYXN0X2luZm8qLCB2b2lkKiwgaW50KSBjb25zdI8BW19fY3h4YWJpdjE6Ol9fcGJhc2VfdHlwZV9pbmZvOjpjYW5fY2F0Y2goX19jeHhhYml2MTo6X19zaGltX3R5cGVfaW5mbyBjb25zdCosIHZvaWQqJikgY29uc3SQAV1fX2N4eGFiaXYxOjpfX3BvaW50ZXJfdHlwZV9pbmZvOjpjYW5fY2F0Y2goX19jeHhhYml2MTo6X19zaGltX3R5cGVfaW5mbyBjb25zdCosIHZvaWQqJikgY29uc3SRAVxfX2N4eGFiaXYxOjpfX3BvaW50ZXJfdHlwZV9pbmZvOjpjYW5fY2F0Y2hfbmVzdGVkKF9fY3h4YWJpdjE6Ol9fc2hpbV90eXBlX2luZm8gY29uc3QqKSBjb25zdJIBZl9fY3h4YWJpdjE6Ol9fcG9pbnRlcl90b19tZW1iZXJfdHlwZV9pbmZvOjpjYW5fY2F0Y2hfbmVzdGVkKF9fY3h4YWJpdjE6Ol9fc2hpbV90eXBlX2luZm8gY29uc3QqKSBjb25zdJMBgwFfX2N4eGFiaXYxOjpfX2NsYXNzX3R5cGVfaW5mbzo6cHJvY2Vzc19zdGF0aWNfdHlwZV9hYm92ZV9kc3QoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQgY29uc3QqLCB2b2lkIGNvbnN0KiwgaW50KSBjb25zdJQBdl9fY3h4YWJpdjE6Ol9fY2xhc3NfdHlwZV9pbmZvOjpwcm9jZXNzX3N0YXRpY190eXBlX2JlbG93X2RzdChfX2N4eGFiaXYxOjpfX2R5bmFtaWNfY2FzdF9pbmZvKiwgdm9pZCBjb25zdCosIGludCkgY29uc3SVAXNfX2N4eGFiaXYxOjpfX3ZtaV9jbGFzc190eXBlX2luZm86OnNlYXJjaF9iZWxvd19kc3QoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQgY29uc3QqLCBpbnQsIGJvb2wpIGNvbnN0lgGBAV9fY3h4YWJpdjE6Ol9fYmFzZV9jbGFzc190eXBlX2luZm86OnNlYXJjaF9hYm92ZV9kc3QoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQgY29uc3QqLCB2b2lkIGNvbnN0KiwgaW50LCBib29sKSBjb25zdJcBdF9fY3h4YWJpdjE6Ol9fYmFzZV9jbGFzc190eXBlX2luZm86OnNlYXJjaF9iZWxvd19kc3QoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQgY29uc3QqLCBpbnQsIGJvb2wpIGNvbnN0mAFyX19jeHhhYml2MTo6X19zaV9jbGFzc190eXBlX2luZm86OnNlYXJjaF9iZWxvd19kc3QoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQgY29uc3QqLCBpbnQsIGJvb2wpIGNvbnN0mQFvX19jeHhhYml2MTo6X19jbGFzc190eXBlX2luZm86OnNlYXJjaF9iZWxvd19kc3QoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQgY29uc3QqLCBpbnQsIGJvb2wpIGNvbnN0mgGAAV9fY3h4YWJpdjE6Ol9fdm1pX2NsYXNzX3R5cGVfaW5mbzo6c2VhcmNoX2Fib3ZlX2RzdChfX2N4eGFiaXYxOjpfX2R5bmFtaWNfY2FzdF9pbmZvKiwgdm9pZCBjb25zdCosIHZvaWQgY29uc3QqLCBpbnQsIGJvb2wpIGNvbnN0mwF/X19jeHhhYml2MTo6X19zaV9jbGFzc190eXBlX2luZm86OnNlYXJjaF9hYm92ZV9kc3QoX19jeHhhYml2MTo6X19keW5hbWljX2Nhc3RfaW5mbyosIHZvaWQgY29uc3QqLCB2b2lkIGNvbnN0KiwgaW50LCBib29sKSBjb25zdJwBfF9fY3h4YWJpdjE6Ol9fY2xhc3NfdHlwZV9pbmZvOjpzZWFyY2hfYWJvdmVfZHN0KF9fY3h4YWJpdjE6Ol9fZHluYW1pY19jYXN0X2luZm8qLCB2b2lkIGNvbnN0Kiwgdm9pZCBjb25zdCosIGludCwgYm9vbCkgY29uc3SdAQhfX3N0cmR1cJ4BDV9fZ2V0VHlwZU5hbWWfASpfX2VtYmluZF9yZWdpc3Rlcl9uYXRpdmVfYW5kX2J1aWx0aW5fdHlwZXOgAT92b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfaW50ZWdlcjxjaGFyPihjaGFyIGNvbnN0KimhAUZ2b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfaW50ZWdlcjxzaWduZWQgY2hhcj4oY2hhciBjb25zdCopogFIdm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX2ludGVnZXI8dW5zaWduZWQgY2hhcj4oY2hhciBjb25zdCopowFAdm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX2ludGVnZXI8c2hvcnQ+KGNoYXIgY29uc3QqKaQBSXZvaWQgKGFub255bW91cyBuYW1lc3BhY2UpOjpyZWdpc3Rlcl9pbnRlZ2VyPHVuc2lnbmVkIHNob3J0PihjaGFyIGNvbnN0KimlAT52b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfaW50ZWdlcjxpbnQ+KGNoYXIgY29uc3QqKaYBR3ZvaWQgKGFub255bW91cyBuYW1lc3BhY2UpOjpyZWdpc3Rlcl9pbnRlZ2VyPHVuc2lnbmVkIGludD4oY2hhciBjb25zdCoppwE/dm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX2ludGVnZXI8bG9uZz4oY2hhciBjb25zdCopqAFIdm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX2ludGVnZXI8dW5zaWduZWQgbG9uZz4oY2hhciBjb25zdCopqQE+dm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX2Zsb2F0PGZsb2F0PihjaGFyIGNvbnN0KimqAT92b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfZmxvYXQ8ZG91YmxlPihjaGFyIGNvbnN0KimrAUN2b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfbWVtb3J5X3ZpZXc8Y2hhcj4oY2hhciBjb25zdCoprAFKdm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX21lbW9yeV92aWV3PHNpZ25lZCBjaGFyPihjaGFyIGNvbnN0KimtAUx2b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfbWVtb3J5X3ZpZXc8dW5zaWduZWQgY2hhcj4oY2hhciBjb25zdCoprgFEdm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX21lbW9yeV92aWV3PHNob3J0PihjaGFyIGNvbnN0KimvAU12b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfbWVtb3J5X3ZpZXc8dW5zaWduZWQgc2hvcnQ+KGNoYXIgY29uc3QqKbABQnZvaWQgKGFub255bW91cyBuYW1lc3BhY2UpOjpyZWdpc3Rlcl9tZW1vcnlfdmlldzxpbnQ+KGNoYXIgY29uc3QqKbEBS3ZvaWQgKGFub255bW91cyBuYW1lc3BhY2UpOjpyZWdpc3Rlcl9tZW1vcnlfdmlldzx1bnNpZ25lZCBpbnQ+KGNoYXIgY29uc3QqKbIBQ3ZvaWQgKGFub255bW91cyBuYW1lc3BhY2UpOjpyZWdpc3Rlcl9tZW1vcnlfdmlldzxsb25nPihjaGFyIGNvbnN0KimzAUx2b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfbWVtb3J5X3ZpZXc8dW5zaWduZWQgbG9uZz4oY2hhciBjb25zdCoptAFEdm9pZCAoYW5vbnltb3VzIG5hbWVzcGFjZSk6OnJlZ2lzdGVyX21lbW9yeV92aWV3PGZsb2F0PihjaGFyIGNvbnN0Kim1AUV2b2lkIChhbm9ueW1vdXMgbmFtZXNwYWNlKTo6cmVnaXN0ZXJfbWVtb3J5X3ZpZXc8ZG91YmxlPihjaGFyIGNvbnN0Kim2AW5FbXNjcmlwdGVuQmluZGluZ0luaXRpYWxpemVyX25hdGl2ZV9hbmRfYnVpbHRpbl90eXBlczo6RW1zY3JpcHRlbkJpbmRpbmdJbml0aWFsaXplcl9uYXRpdmVfYW5kX2J1aWx0aW5fdHlwZXMoKbcBCGRsbWFsbG9juAEGZGxmcmVluQEJZGxyZWFsbG9jugERdHJ5X3JlYWxsb2NfY2h1bmu7AQ1kaXNwb3NlX2NodW5rvAEEc2Jya70BBm1lbWNweb4BBm1lbXNldL8BB21lbW1vdmXAAQhzZXRUaHJld8EBGXN0ZDo6dW5jYXVnaHRfZXhjZXB0aW9uKCnCAQlzdGFja1NhdmXDAQpzdGFja0FsbG9jxAEMc3RhY2tSZXN0b3JlxQEQX19ncm93V2FzbU1lbW9yecYBCmR5bkNhbGxfaWnHAQpkeW5DYWxsX3ZpyAENZHluQ2FsbF92aWlpackBC2R5bkNhbGxfdmlpygELZHluQ2FsbF9paWnLAQ5keW5DYWxsX3ZpaWlpacwBDGR5bkNhbGxfdmlpac0BDGR5bkNhbGxfaWlpac4BD2R5bkNhbGxfdmlpaWlpaQ==';
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




// STATICTOP = STATIC_BASE + 4960;
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
      return 5824;
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
    super()

    this.heapInputBuffer = new HeapAudioBuffer(
      CaptureModule, RENDER_QUANTUM_FRAMES,
      2, MAX_CHANNEL_COUNT
    )

    this.kernel = new CaptureModule.AudioCapture(44100)

    this.port.onmessage = this.onMessage.bind(this)
  }

  onMessage({data}) {
    if (data.type === 'getData') {
      let array = []
      this.kernel.readBlock(array)
      this.port.postMessage(array)
    } else {
      console.warn(`MessagePort event type ${data.type} does not exist.`, data)
    }
  }

  process(inputs, outputs) {
    const input = inputs[0]

    const channelCount = input.length
    const length = input[0].length

    this.heapInputBuffer.adaptChannel(channelCount)
    for (let ch = 0; ch < channelCount; ++ch) {
      this.heapInputBuffer.getChannelData(ch).set(input[ch])
    }

    this.kernel.process(this.heapInputBuffer.getHeapAddress(), length, channelCount)

    return true
  }
}

registerProcessor('audio-capture', AudioCapture)



  return CaptureModule
}
)(typeof CaptureModule === 'object' ? CaptureModule : {});
if (typeof exports === 'object' && typeof module === 'object')
      module.exports = CaptureModule;
    else if (typeof define === 'function' && define['amd'])
      define([], function() { return CaptureModule; });
    else if (typeof exports === 'object')
      exports["CaptureModule"] = CaptureModule;
    