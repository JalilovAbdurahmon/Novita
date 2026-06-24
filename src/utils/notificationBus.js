// utils/notificationBus.js
const bus = new EventTarget();

export const notificationBus = {
  emit: (event) => bus.dispatchEvent(new Event(event)),
  on:   (event, cb) => bus.addEventListener(event, cb),
  off:  (event, cb) => bus.removeEventListener(event, cb),
};