import {EventEmitter} from "events"
import {$} from "../utils/selectors"


export default class TodoList extends EventEmitter {
  constructor(id) {
    super();
    this.list = [];
    this.$el = $(`#${id}`);
  }

  add(todo) {
    this.list.push(todo);
    todo.$parent = this.$el;
    todo.on("change", this.handleTodoChange.bind(this));
    todo.on("forcetouchdown", this.handleTodoForceTouchDown.bind(this));
    todo.on("destroy", this.handleTodoDestory.bind(this));
    todo.render();
    this.emit("change");
  }

  delete(todo) {
    for( let i = 0; i < this.list.length; i++ ){
      let todoItem = this.list[i];
      if( todoItem.id === todo.id ){
        this.list.splice(i, 1);
        this.emit("change");
        break;
      }
    }
  }

  deleteAllDone() {
    let todos = this.getDoneTodos();
    todos.forEach(todo => {
      todo.destroy();
    });
    this.emit("change");
  }

  getDoneTodos() {
    return this.list.filter(todo => todo.done);
  }

  handleTodoChange(todo) {
    this.emit("change");
  }

  handleTodoForceTouchDown(todo) {
    this.emit("selecttodo", todo);
  }

  handleTodoDestory(todo) {
    this.delete(todo);
  }
}