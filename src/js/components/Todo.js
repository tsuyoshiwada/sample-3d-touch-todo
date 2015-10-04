import {EventEmitter} from "events"
import templateObj from "template-obj"
import {cancelEvent} from "../utils/events"
import {uniqueId} from "../utils/numbers"
import ForceTouchEvent from "../events/ForceTouchEvent"


const classSet = templateObj({
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


export default class Todo extends EventEmitter {
  constructor(label="") {
    super();
    this.id = uniqueId();
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

  buildHtml() {
    let $li = document.createElement("li"),
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

  bindEvents() {
    this.forceTouch = new ForceTouchEvent(this.$el);
    this.forceTouch.on(ForceTouchEvent.CHANGE, this.handleForceTouchChange.bind(this));
    this.forceTouch.on(ForceTouchEvent.DOWN, this.handleForceTouchDown.bind(this));
    this.forceTouch.on(ForceTouchEvent.UP, this.handleForceTouchUp.bind(this));

    this.$el.addEventListener("click", this.handleClick.bind(this), false);
    this.$label.addEventListener("touchstart", this.handleLabelClick.bind(this), false);
    this.$input.addEventListener("change", this.handleInputChange.bind(this), false);
    this.$input.addEventListener("blur", this.handleInputChange.bind(this), false);
  }

  unbindEvents() {
    this.forceTouch.removeListener(ForceTouchEvent.CHANGE, this.handleForceTouchChange.bind(this));
    this.forceTouch.removeListener(ForceTouchEvent.DOWN, this.handleForceTouchDown.bind(this));
    this.forceTouch.removeListener(ForceTouchEvent.UP, this.handleForceTouchUp.bind(this));
    this.forceTouch.unbindEvents();
    this.forceTouch = null;

    this.$el.removeEventListener("click", this.handleClick.bind(this), false);
    this.$label.removeEventListener("touchstart", this.handleLabelClick.bind(this), false);
    this.$input.removeEventListener("change", this.handleInputChange.bind(this), false);
    this.$input.removeEventListener("blur", this.handleInputChange.bind(this), false);
  }

  handleForceTouchChange(e) {
    if( this.editing || this.done || this.forceTouch.down ){
      this.clearStyles();
      return;
    }
    this.$el.style.zIndex = this.zIndex;
    this.$el.style.boxShadow = `0 0 ${this.boxShadowSize * e.force}px rgba(0, 0, 0, ${e.force})`;
  }

  handleForceTouchDown(e) {
    if( this.done || this.editing ) return;
    this.clearStyles();
    this.emit("forcetouchdown", this);
  }

  handleForceTouchUp(e) {
    if( this.editing ) return;
    this.clearStyles();
  }

  handleClick(e) {
    if( this.editing ) return;
    this.clearStyles();
    this.toggle();
  }

  handleLabelClick(e) {
    if( this.done || this.editing ) return;
    cancelEvent(e);
    this.focus();
  }

  handleInputChange(e) {
    this.unfocus();
  }

  render() {
    this.$parent.insertBefore(this.$el, this.$parent.firstChild);
  }

  clearStyles() {
    this.$el.style.zIndex = "";
    this.$el.style.boxShadow = "";
  }

  focus() {
    if( this.done || this.editing ) return;
    this.editing = true;
    this.$el.className = classSet.editing.todo;
    this.$label.className = classSet.editing.label;
    this.$input.className = classSet.editing.input;
    this.$input.value = this.label;
    this.$input.focus();
  }

  unfocus() {
    if( this.done ) return;
    let value = this.$input.value.trim();

    if( !value ){
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

  toggle() {
    if( this.done ){
      this.uncheck();
    }else{
      this.check();
    }
  }

  check() {
    this.done = true;
    this.$el.className = classSet.done.todo;
    this.$label.className = classSet.done.label;
    this.emit("change", this);
  }

  uncheck() {
    this.done = false;
    this.$el.className = classSet.todo;
    this.$label.className = classSet.label;
    this.emit("change", this);
  }

  destroy() {
    if( !this.$el ) return;
    this.unbindEvents();
    this.$parent.removeChild(this.$el);
    this.$el.innerHTML = "";
    this.$el = null;
    this.emit("destroy", this);
  }
}
