(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
/*!
 * template-obj
 * 
 * @version 0.0.2
 * @license MIT
 * @author tsuyoshiwada
 * @url https://github.com/tsuyoshiwada/template-obj
 */
(function(root){
  "use strict";

  var OBJECT = "object", STRING = "string", ARRAY = "array", FUNCTION = "function";
  var objectPrototype = Object.prototype;


  function hasProp(obj, key){
    return objectPrototype.hasOwnProperty.call(obj, key);
  }


  function is(type, obj){
    var clas = objectPrototype.toString.call(obj);

    if( type === ARRAY ){
      return clas === "[object Array]";

    }else if( type === OBJECT ){
      clas = typeof obj;
      return clas === FUNCTION || clas === OBJECT && !!obj && !is(ARRAY, obj);

    }else{
      clas = clas.slice(8, -1).toLowerCase();
      return obj !== undefined && obj != null && clas === type;
    }
  }


  function clone(obj){
    var _isArray = is(ARRAY, obj),
        _isObject = is(OBJECT, obj);
    if( !_isArray && !_isObject ) return undefined;
    var result = _isArray ? [] : {}, key, val;
    for( key in obj ){
      if( !hasProp(obj, key) ) continue;
      val = obj[key];
      if( is(ARRAY, val) || is(OBJECT, val) ) val = clone(val);
      result[key] = val;
    }
    return result;
  }


  function each(obj, iterate, context){
    if( obj === null ) return obj;
    context = context || obj;
    if( is(OBJECT, obj) ){
      for( var key in obj ){
        if( !hasProp(obj, key) ) continue;
        if( iterate.call(context, obj[key], key) === false ) break;
      }
    }else if( is(ARRAY, obj) ){
      var i, length = obj.length;
      for( i = 0; i < length; i++ ){
        if( iterate.call(context, obj[i], i) === false ) break;
      }
    }
    return obj;
  }


  function getValue(obj, key){
    if( hasProp(obj, key) ) return obj[key];

    // key[index] => key.index
    key = key.split("[").join(".").split("]").join("");

    var keys = key.split("."),
        results = clone(obj);

    each(keys, function(val){
      if( hasProp(results, val) ){
        results = results[val];
      }else{
        results = null;
        return false;
      }
    });

    return results;
  }


  function template(str, values){
    if( !is(STRING, str) ) return str;
    return str.replace(/\$\{(.*?)\}/g, function(all, key){
      var val = getValue(values, key);
      return val != null ? val : all;
    });
  }


  function templateObj(obj, rootObj){
    var results = clone(obj);
    
    rootObj = is(OBJECT, rootObj) ? rootObj : results;

    each(results, function(val, key){
      if( is(OBJECT, val) ){
        results[key] = templateObj(val, rootObj);
      }else{
        results[key] = template(val, rootObj);
      }
    });

    return results;
  }


  // export modules
  if( typeof module === OBJECT && typeof module.exports === OBJECT ){
    module.exports = templateObj;

  /*global define */
  }else if( typeof define === FUNCTION && define.amd ){
    define("template-obj", templateObj);

  }else{
    root.templateObj = templateObj;
  }

}(this));
},{}],3:[function(require,module,exports){
"use strict";

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _events = require("events");

var _utilsEvents = require("./utils/events");

var _utilsSelectors = require("./utils/selectors");

var _componentsTodo = require("./components/Todo");

var _componentsTodo2 = _interopRequireDefault(_componentsTodo);

var _componentsTodoList = require("./components/TodoList");

var _componentsTodoList2 = _interopRequireDefault(_componentsTodoList);

var _componentsTodoControl = require("./components/TodoControl");

var _componentsTodoControl2 = _interopRequireDefault(_componentsTodoControl);

// DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {

  // header control
  var $addTodo = (0, _utilsSelectors.$)("#add-todo"),
      $deleteDoneTodo = (0, _utilsSelectors.$)("#delete-done-todo");

  // control
  var todoControl = new _componentsTodoControl2["default"]("todo-control");

  // todo list
  var todoList = new _componentsTodoList2["default"]("todo-list");

  todoList.add(new _componentsTodo2["default"]("ForceTouchが動作するのは、未チェックの場合のみです"));
  todoList.add(new _componentsTodo2["default"]("削除"));
  todoList.add(new _componentsTodo2["default"]("チェック"));
  todoList.add(new _componentsTodo2["default"]("編集"));
  todoList.add(new _componentsTodo2["default"]("ForceTouchで次のアクションが実行できます"));
  todoList.add(new _componentsTodo2["default"]("リストをタップするとチェックをトグルできます"));
  todoList.add(new _componentsTodo2["default"]("テキストをタップすると編集できます"));

  todoList.on("selecttodo", function (todo) {
    todoControl.show(todo);
  });

  todoList.on("change", function (todo) {
    if (todoList.getDoneTodos().length > 0) {
      $deleteDoneTodo.disabled = false;
    } else {
      $deleteDoneTodo.disabled = true;
    }
  });

  // add
  $addTodo.addEventListener("touchend", function (e) {
    (0, _utilsEvents.cancelEvent)(e);
    var todo = new _componentsTodo2["default"]();
    todoList.add(todo);
    todo.focus();
  });

  // delete all done
  $deleteDoneTodo.addEventListener("touchend", function (e) {
    (0, _utilsEvents.cancelEvent)(e);
    todoList.deleteAllDone();
  });
}, false);

},{"./components/Todo":4,"./components/TodoControl":5,"./components/TodoList":6,"./utils/events":8,"./utils/selectors":10,"events":1}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _events = require("events");

var _templateObj = require("template-obj");

var _templateObj2 = _interopRequireDefault(_templateObj);

var _utilsEvents = require("../utils/events");

var _utilsNumbers = require("../utils/numbers");

var _eventsForceTouchEvent = require("../events/ForceTouchEvent");

var _eventsForceTouchEvent2 = _interopRequireDefault(_eventsForceTouchEvent);

var classSet = (0, _templateObj2["default"])({
  _editing: "--editing",
  _done: "--done",

  // base
  todo: "todo",
  label: "${todo}__label",
  input: "${todo}__input",

  // editing
  editing: {
    todo: "${todo}${_editing}",
    label: "${label}${_editing}",
    input: "${input}${_editing}"
  },

  // done
  done: {
    todo: "${todo}${_done}",
    label: "${label}${_done}",
    input: "${input}${_done}"
  }
});

var Todo = (function (_EventEmitter) {
  _inherits(Todo, _EventEmitter);

  function Todo() {
    var label = arguments.length <= 0 || arguments[0] === undefined ? "" : arguments[0];

    _classCallCheck(this, Todo);

    _get(Object.getPrototypeOf(Todo.prototype), "constructor", this).call(this);
    this.id = (0, _utilsNumbers.uniqueId)();
    this.label = label;
    this.done = false;
    this.editing = false;
    this.zIndex = 1000;
    this.boxShadowSize = 8;
    this.$el = null;
    this.$label = null;
    this.$input = null;
    this.$parent = null;
    this.buildHtml();
    this.bindEvents();
  }

  _createClass(Todo, [{
    key: "buildHtml",
    value: function buildHtml() {
      var $li = document.createElement("li"),
          $label = document.createElement("label"),
          $input = document.createElement("input");

      $li.className = classSet.todo;
      $label.className = classSet.label;
      $label.innerHTML = this.label;
      $input.className = classSet.input;
      $input.type = "text";
      $input.value = "";

      $li.appendChild($input);
      $li.appendChild($label);

      this.$el = $li;
      this.$label = $label;
      this.$input = $input;
    }
  }, {
    key: "bindEvents",
    value: function bindEvents() {
      this.forceTouch = new _eventsForceTouchEvent2["default"](this.$el);
      this.forceTouch.on(_eventsForceTouchEvent2["default"].CHANGE, this.handleForceTouchChange.bind(this));
      this.forceTouch.on(_eventsForceTouchEvent2["default"].DOWN, this.handleForceTouchDown.bind(this));
      this.forceTouch.on(_eventsForceTouchEvent2["default"].UP, this.handleForceTouchUp.bind(this));

      this.$el.addEventListener("click", this.handleClick.bind(this), false);
      this.$label.addEventListener("touchstart", this.handleLabelClick.bind(this), false);
      this.$input.addEventListener("change", this.handleInputChange.bind(this), false);
      this.$input.addEventListener("blur", this.handleInputChange.bind(this), false);
    }
  }, {
    key: "unbindEvents",
    value: function unbindEvents() {
      this.forceTouch.removeListener(_eventsForceTouchEvent2["default"].CHANGE, this.handleForceTouchChange.bind(this));
      this.forceTouch.removeListener(_eventsForceTouchEvent2["default"].DOWN, this.handleForceTouchDown.bind(this));
      this.forceTouch.removeListener(_eventsForceTouchEvent2["default"].UP, this.handleForceTouchUp.bind(this));
      this.forceTouch.unbindEvents();
      this.forceTouch = null;

      this.$el.removeEventListener("click", this.handleClick.bind(this), false);
      this.$label.removeEventListener("touchstart", this.handleLabelClick.bind(this), false);
      this.$input.removeEventListener("change", this.handleInputChange.bind(this), false);
      this.$input.removeEventListener("blur", this.handleInputChange.bind(this), false);
    }
  }, {
    key: "handleForceTouchChange",
    value: function handleForceTouchChange(e) {
      if (this.editing || this.done || this.forceTouch.down) {
        this.clearStyles();
        return;
      }
      this.$el.style.zIndex = this.zIndex;
      this.$el.style.boxShadow = "0 0 " + this.boxShadowSize * e.force + "px rgba(0, 0, 0, " + e.force + ")";
    }
  }, {
    key: "handleForceTouchDown",
    value: function handleForceTouchDown(e) {
      if (this.done || this.editing) return;
      this.clearStyles();
      this.emit("forcetouchdown", this);
    }
  }, {
    key: "handleForceTouchUp",
    value: function handleForceTouchUp(e) {
      if (this.editing) return;
      this.clearStyles();
    }
  }, {
    key: "handleClick",
    value: function handleClick(e) {
      if (this.editing) return;
      this.clearStyles();
      this.toggle();
    }
  }, {
    key: "handleLabelClick",
    value: function handleLabelClick(e) {
      if (this.done || this.editing) return;
      (0, _utilsEvents.cancelEvent)(e);
      this.focus();
    }
  }, {
    key: "handleInputChange",
    value: function handleInputChange(e) {
      this.unfocus();
    }
  }, {
    key: "render",
    value: function render() {
      this.$parent.insertBefore(this.$el, this.$parent.firstChild);
    }
  }, {
    key: "clearStyles",
    value: function clearStyles() {
      this.$el.style.zIndex = "";
      this.$el.style.boxShadow = "";
    }
  }, {
    key: "focus",
    value: function focus() {
      if (this.done || this.editing) return;
      this.editing = true;
      this.$el.className = classSet.editing.todo;
      this.$label.className = classSet.editing.label;
      this.$input.className = classSet.editing.input;
      this.$input.value = this.label;
      this.$input.focus();
    }
  }, {
    key: "unfocus",
    value: function unfocus() {
      if (this.done) return;
      var value = this.$input.value.trim();

      if (!value) {
        this.destroy();
        return;
      }

      this.editing = false;
      this.label = value;
      this.$el.className = classSet.todo;
      this.$label.className = classSet.label;
      this.$label.innerText = value;
      this.$input.className = classSet.input;
    }
  }, {
    key: "toggle",
    value: function toggle() {
      if (this.done) {
        this.uncheck();
      } else {
        this.check();
      }
    }
  }, {
    key: "check",
    value: function check() {
      this.done = true;
      this.$el.className = classSet.done.todo;
      this.$label.className = classSet.done.label;
      this.emit("change", this);
    }
  }, {
    key: "uncheck",
    value: function uncheck() {
      this.done = false;
      this.$el.className = classSet.todo;
      this.$label.className = classSet.label;
      this.emit("change", this);
    }
  }, {
    key: "destroy",
    value: function destroy() {
      if (!this.$el) return;
      this.unbindEvents();
      this.$parent.removeChild(this.$el);
      this.$el.innerHTML = "";
      this.$el = null;
      this.emit("destroy", this);
    }
  }]);

  return Todo;
})(_events.EventEmitter);

exports["default"] = Todo;
module.exports = exports["default"];

},{"../events/ForceTouchEvent":7,"../utils/events":8,"../utils/numbers":9,"events":1,"template-obj":2}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _events = require("events");

var _templateObj = require("template-obj");

var _templateObj2 = _interopRequireDefault(_templateObj);

var _utilsEvents = require("../utils/events");

var _utilsSelectors = require("../utils/selectors");

var classSet = (0, _templateObj2["default"])({
  _show: "--show",

  // base
  control: "todo-control",

  // show
  show: {
    control: "${control}${_show}"
  }
});

var TodoControl = (function (_EventEmitter) {
  _inherits(TodoControl, _EventEmitter);

  function TodoControl(id) {
    _classCallCheck(this, TodoControl);

    _get(Object.getPrototypeOf(TodoControl.prototype), "constructor", this).call(this);
    this.$el = (0, _utilsSelectors.$)("#" + id);
    this.$overlay = (0, _utilsSelectors.$)("#" + id + "-overlay");
    this.$delete = (0, _utilsSelectors.$)("#" + id + "-delete");
    this.$edit = (0, _utilsSelectors.$)("#" + id + "-edit");
    this.$done = (0, _utilsSelectors.$)("#" + id + "-done");
    this.todo = null;
    this.bindEvents();
  }

  _createClass(TodoControl, [{
    key: "bindEvents",
    value: function bindEvents() {
      this.$overlay.addEventListener("touchend", this.handleOverlayClick.bind(this), false);
      this.$delete.addEventListener("touchend", this.handleDeleteClick.bind(this), false);
      this.$edit.addEventListener("touchend", this.handleEditClick.bind(this), false);
      this.$done.addEventListener("touchend", this.handleDoneClick.bind(this), false);
    }
  }, {
    key: "handleOverlayClick",
    value: function handleOverlayClick(e) {
      (0, _utilsEvents.cancelEvent)(e);
      this.hide();
    }
  }, {
    key: "handleDeleteClick",
    value: function handleDeleteClick(e) {
      (0, _utilsEvents.cancelEvent)(e);
      if (!this.todo) return;
      this.todo.destroy();
      this.hide();
    }
  }, {
    key: "handleEditClick",
    value: function handleEditClick(e) {
      (0, _utilsEvents.cancelEvent)(e);
      if (!this.todo) return;
      this.todo.focus();
      this.hide();
    }
  }, {
    key: "handleDoneClick",
    value: function handleDoneClick(e) {
      (0, _utilsEvents.cancelEvent)(e);
      if (!this.todo) return;
      this.todo.check();
      this.hide();
    }
  }, {
    key: "show",
    value: function show(todo) {
      this.$el.className = classSet.show.control;
      this.todo = todo;
    }
  }, {
    key: "hide",
    value: function hide() {
      this.$el.className = classSet.control;
      this.todo = null;
    }
  }]);

  return TodoControl;
})(_events.EventEmitter);

exports["default"] = TodoControl;
module.exports = exports["default"];

},{"../utils/events":8,"../utils/selectors":10,"events":1,"template-obj":2}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _events = require("events");

var _utilsSelectors = require("../utils/selectors");

var TodoList = (function (_EventEmitter) {
  _inherits(TodoList, _EventEmitter);

  function TodoList(id) {
    _classCallCheck(this, TodoList);

    _get(Object.getPrototypeOf(TodoList.prototype), "constructor", this).call(this);
    this.list = [];
    this.$el = (0, _utilsSelectors.$)("#" + id);
  }

  _createClass(TodoList, [{
    key: "add",
    value: function add(todo) {
      this.list.push(todo);
      todo.$parent = this.$el;
      todo.on("change", this.handleTodoChange.bind(this));
      todo.on("forcetouchdown", this.handleTodoForceTouchDown.bind(this));
      todo.on("destroy", this.handleTodoDestory.bind(this));
      todo.render();
      this.emit("change");
    }
  }, {
    key: "delete",
    value: function _delete(todo) {
      for (var i = 0; i < this.list.length; i++) {
        var todoItem = this.list[i];
        if (todoItem.id === todo.id) {
          this.list.splice(i, 1);
          this.emit("change");
          break;
        }
      }
    }
  }, {
    key: "deleteAllDone",
    value: function deleteAllDone() {
      var todos = this.getDoneTodos();
      todos.forEach(function (todo) {
        todo.destroy();
      });
      this.emit("change");
    }
  }, {
    key: "getDoneTodos",
    value: function getDoneTodos() {
      return this.list.filter(function (todo) {
        return todo.done;
      });
    }
  }, {
    key: "handleTodoChange",
    value: function handleTodoChange(todo) {
      this.emit("change");
    }
  }, {
    key: "handleTodoForceTouchDown",
    value: function handleTodoForceTouchDown(todo) {
      this.emit("selecttodo", todo);
    }
  }, {
    key: "handleTodoDestory",
    value: function handleTodoDestory(todo) {
      this["delete"](todo);
    }
  }]);

  return TodoList;
})(_events.EventEmitter);

exports["default"] = TodoList;
module.exports = exports["default"];

},{"../utils/selectors":10,"events":1}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _events = require("events");

var _utilsEvents = require("../utils/events");

var ForceTouchEvent = (function (_EventEmitter) {
  _inherits(ForceTouchEvent, _EventEmitter);

  function ForceTouchEvent($el) {
    var threshold = arguments.length <= 1 || arguments[1] === undefined ? 0.95 : arguments[1];

    _classCallCheck(this, ForceTouchEvent);

    _get(Object.getPrototypeOf(ForceTouchEvent.prototype), "constructor", this).call(this);
    this.$el = $el;
    this.threshold = threshold;
    this.force = 0;
    this.touch = null;
    this.interval = 10;
    this.down = false;
    this.bindEvents();
  }

  _createClass(ForceTouchEvent, [{
    key: "bindEvents",
    value: function bindEvents() {
      this.$el.addEventListener("touchstart", this.handleTouchStart.bind(this), false);
      this.$el.addEventListener("touchmove", this.handleTouchMove.bind(this), false);
      this.$el.addEventListener("touchend", this.handleTouchEnd.bind(this), false);
    }
  }, {
    key: "unbindEvents",
    value: function unbindEvents() {
      this.$el.removeEventListener("touchstart", this.handleTouchStart.bind(this), false);
      this.$el.removeEventListener("touchmove", this.handleTouchMove.bind(this), false);
      this.$el.removeEventListener("touchend", this.handleTouchEnd.bind(this), false);
    }
  }, {
    key: "handleTouchStart",
    value: function handleTouchStart(e) {
      this.trigger(ForceTouchEvent.WILL_BEGIN);
      this.checkForce(e);
    }
  }, {
    key: "handleTouchMove",
    value: function handleTouchMove(e) {
      this.checkForce(e);
    }
  }, {
    key: "handleTouchEnd",
    value: function handleTouchEnd(e) {
      if (!this.down && this.force < this.threshold) {
        this.trigger(ForceTouchEvent.UP);
      }
      this.touch = null;
      this.down = false;
    }
  }, {
    key: "checkForce",
    value: function checkForce(e) {
      if (!e.touches) return;
      this.touch = e.touches[0];
      this.refreshForceValue();
    }
  }, {
    key: "refreshForceValue",
    value: function refreshForceValue() {
      if (!this.touch) return;
      var force = this.touch.force;

      // change
      if (this.force != force) {
        this.force = force;
        this.trigger(ForceTouchEvent.CHANGE);
      }

      // down
      if (!this.down && this.force >= this.threshold) {
        this.down = true;
        this.trigger(ForceTouchEvent.DOWN);
        return;
      }

      setTimeout(this.refreshForceValue.bind(this), this.interval);
    }
  }, {
    key: "trigger",
    value: function trigger(type) {
      var e = {};
      e.type = type;
      e.timestamp = Math.floor(Date.now() / 1000);
      e.target = this.$el;
      e.force = this.force;

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      this.emit(type, e, args);
    }
  }]);

  return ForceTouchEvent;
})(_events.EventEmitter);

ForceTouchEvent.WILL_BEGIN = "forcetouchwillbegin";
ForceTouchEvent.CHANGE = "forcetouchchange";
ForceTouchEvent.DOWN = "forcetouchdown";
ForceTouchEvent.UP = "forcetouchcup";

exports["default"] = ForceTouchEvent;
module.exports = exports["default"];

},{"../utils/events":8,"events":1}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cancelEvent = cancelEvent;

function cancelEvent(e) {
  var bubbling = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

  e.preventDefault();
  if (bubbling) e.stopPropagation();
}

},{}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.uniqueId = uniqueId;

function uniqueId() {
  return Math.floor(Math.random() * 1000) + Date.now().toString();
}

},{}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.$ = $;
exports.$$ = $$;

function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

},{}]},{},[3]);
