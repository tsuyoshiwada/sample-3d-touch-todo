import {EventEmitter} from "events"
import templateObj from "template-obj"
import {cancelEvent} from "../utils/events"
import {$} from "../utils/selectors"


const classSet = templateObj({
  _show: "--show",

  // base
  control: "todo-control",

  // show
  show: {
    control: "${control}${_show}",
  }
});


export default class TodoControl extends EventEmitter {
  constructor(id) {
    super();
    this.$el = $(`#${id}`);
    this.$overlay = $(`#${id}-overlay`);
    this.$delete = $(`#${id}-delete`);
    this.$edit = $(`#${id}-edit`);
    this.$done = $(`#${id}-done`);
    this.todo = null;
    this.bindEvents();
  }

  bindEvents() {
    this.$overlay.addEventListener("touchend", this.handleOverlayClick.bind(this), false);
    this.$delete.addEventListener("touchend", this.handleDeleteClick.bind(this), false);
    this.$edit.addEventListener("touchend", this.handleEditClick.bind(this), false);
    this.$done.addEventListener("touchend", this.handleDoneClick.bind(this), false);
  }

  handleOverlayClick(e) {
    cancelEvent(e);
    this.hide();
  }

  handleDeleteClick(e) {
    cancelEvent(e);
    if( !this.todo ) return;
    this.todo.destroy();
    this.hide();
  }

  handleEditClick(e) {
    cancelEvent(e);
    if( !this.todo ) return;
    this.todo.focus();
    this.hide();
  }

  handleDoneClick(e) {
    cancelEvent(e);
    if( !this.todo ) return;
    this.todo.check();
    this.hide();
  }

  show(todo) {
    this.$el.className = classSet.show.control;
    this.todo = todo;
  }

  hide() {
    this.$el.className = classSet.control;
    this.todo = null;
  }
}