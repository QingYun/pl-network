import _ from 'lodash';

module.exports = (options) => {
  const { sigma: s, mouse, keyboard, onEvent, param } = _.assign({
    mouse: [],
    keyboard: [],
  }, options);

  const onEventWrapper = () => {
    onEvent(param);
    setTimeout(() => {
      mouse.forEach(evt => s.unbind(evt, onEventWrapper));
      s.keyboard.unbind(keyboard.join(' '), onEventWrapper);
    }, 0);
  };

  mouse.forEach(evt => s.bind(evt, onEventWrapper));
  s.keyboard.bind(keyboard.join(' '), onEventWrapper);
  return onEvent;
};
