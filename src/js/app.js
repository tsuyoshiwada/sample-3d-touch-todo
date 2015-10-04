import {EventEmitter} from "events"
import {cancelEvent} from "./utils/events"
import {$} from "./utils/selectors"
import Todo from "./components/Todo"
import TodoList from "./components/TodoList"
import TodoControl from "./components/TodoControl"


// DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {

  // header control
  let $addTodo = $("#add-todo"),
      $deleteDoneTodo = $("#delete-done-todo");


  // control
  let todoControl = new TodoControl("todo-control");


  // todo list
  let todoList = new TodoList("todo-list");

  todoList.add(new Todo("ForceTouchが動作するのは、未チェックの場合のみです"));
  todoList.add(new Todo("削除"));
  todoList.add(new Todo("チェック"));
  todoList.add(new Todo("編集"));
  todoList.add(new Todo("ForceTouchで次のアクションが実行できます"));
  todoList.add(new Todo("リストをタップするとチェックをトグルできます"));
  todoList.add(new Todo("テキストをタップすると編集できます"));

  todoList.on("selecttodo", todo => {
    todoControl.show(todo);
  });

  todoList.on("change", todo => {
    if( todoList.getDoneTodos().length > 0 ){
      $deleteDoneTodo.disabled = false;
    }else{
      $deleteDoneTodo.disabled = true;
    }
  });


  // add
  $addTodo.addEventListener("touchend", e => {
    cancelEvent(e);
    let todo = new Todo();
    todoList.add(todo);
    todo.focus();
  });

  // delete all done
  $deleteDoneTodo.addEventListener("touchend", e => {
    cancelEvent(e);
    todoList.deleteAllDone();
  });

}, false);