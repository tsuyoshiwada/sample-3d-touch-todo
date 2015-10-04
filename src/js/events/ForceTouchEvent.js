import {EventEmitter} from "events"
import {cancelEvent} from "../utils/events"


class ForceTouchEvent extends EventEmitter {
  constructor($el, threshold=0.95) {
    super();
    this.$el = $el;
    this.threshold = threshold;
    this.force = 0;
    this.touch = null;
    this.interval = 10;
    this.down = false;
    this.bindEvents();
  }

  bindEvents() {
    this.$el.addEventListener("touchstart", this.handleTouchStart.bind(this), false);
    this.$el.addEventListener("touchmove", this.handleTouchMove.bind(this), false);
    this.$el.addEventListener("touchend", this.handleTouchEnd.bind(this), false);
  }

  unbindEvents() {
    this.$el.removeEventListener("touchstart", this.handleTouchStart.bind(this), false);
    this.$el.removeEventListener("touchmove", this.handleTouchMove.bind(this), false);
    this.$el.removeEventListener("touchend", this.handleTouchEnd.bind(this), false);
  }

  handleTouchStart(e) {
    this.trigger(ForceTouchEvent.WILL_BEGIN);
    this.checkForce(e);
  }

  handleTouchMove(e) {
    this.checkForce(e);
  }

  handleTouchEnd(e) {
    if( !this.down && this.force < this.threshold ){
      this.trigger(ForceTouchEvent.UP);
    }
    this.touch = null;
    this.down = false;
  }

  checkForce(e) {
    if( !e.touches ) return;
    this.touch = e.touches[0];
    this.refreshForceValue();
  }

  refreshForceValue() {
    if( !this.touch ) return;
    let force = this.touch.force;

    // change
    if( this.force != force ){
      this.force = force;
      this.trigger(ForceTouchEvent.CHANGE);
    }

    // down
    if( !this.down && this.force >= this.threshold ){
      this.down = true;
      this.trigger(ForceTouchEvent.DOWN);
      return;
    }

    setTimeout(this.refreshForceValue.bind(this), this.interval);
  }

  trigger(type, ...args) {
    let e = {};
    e.type = type;
    e.timestamp = Math.floor(Date.now() / 1000);
    e.target = this.$el;
    e.force = this.force;
    this.emit(type, e, args);
  }
}

ForceTouchEvent.WILL_BEGIN = "forcetouchwillbegin";
ForceTouchEvent.CHANGE = "forcetouchchange";
ForceTouchEvent.DOWN = "forcetouchdown";
ForceTouchEvent.UP = "forcetouchcup";


export default ForceTouchEvent;