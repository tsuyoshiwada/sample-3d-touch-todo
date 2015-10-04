export function cancelEvent(e, bubbling=true){
  e.preventDefault();
  if( bubbling ) e.stopPropagation();
}