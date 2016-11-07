import _ from 'lodash';
import chroma from 'chroma-js';

const backgroundColor = '#333333';
const selectedColor = '#D32F2F';
const influcedColor = '#448AFF';
const influcedByColor = '#CDDC39';
const lightColor = 'rgb(250, 82, 82)';
const darkColor = 'rgb(73, 80, 87)';

const globalStyles = {
  default: {
    backgroundColor,
    edge: {
      color: chroma(backgroundColor).brighten().css(),
    },
    node: {
      color: chroma(backgroundColor).brighten(2).css(),
    },
  },
  dark: {
    backgroundColor,
    node: {
      color: darkColor,
    },
    edge: {
      color: darkColor,
    },
  },
};

const nodeStyles = {
  selected: node => ({
    color: selectedColor,
    labelThreshold: 1,
    defaultLabelSize: 10,
    labelSize: node.size > 200 ? 'proportional' : 'fixed',
  }),

  dialect: node => ({
    color: chroma(selectedColor).brighten(2).css(),
    labelThreshold: 1,
    defaultLabelSize: 10,
    labelSize: node.size > 200 ? 'proportional' : 'fixed',
  }),

  parent_lang: node => ({
    color: chroma(selectedColor).darken(2).css(),
    labelThreshold: 1,
    defaultLabelSize: 10,
    labelSize: node.size > 200 ? 'proportional' : 'fixed',
  }),

  influenced: node => ({
    color: influcedColor,
    labelThreshold: 1,
    defaultLabelSize: 10,
    labelSize: node.size > 200 ? 'proportional' : 'fixed',
  }),

  influenced_by: node => ({
    color: influcedByColor,
    labelThreshold: 1,
    defaultLabelSize: 10,
    labelSize: node.size > 200 ? 'proportional' : 'fixed',
  }),

  fireball: node => ({
    color: chroma('white').css(),
    drawLabel: false,
    [`${node.__prefix}size`]: 1,
  }),

  originalColor: node => ({
    color: node.color,
  }),

  highlight: node => ({
    color: lightColor,
    labelThreshold: 1,
    defaultLabelSize: 10,
    labelSize: node.size > 200 ? 'proportional' : 'fixed',
  }),
};

const edgeStyles = {
  dialect: (edge) => ({
    edge: {
      color: chroma(selectedColor).brighten(2).css(),
      [`${edge.__prefix}size`]: 3,
    },
  }),

  parent_lang: (edge) => ({
    edge: {
      color: chroma(selectedColor).darken(2).css(),
      [`${edge.__prefix}size`]: 3,
    },
  }),

  influenced: (edge) => ({
    edge: {
      color: influcedColor,
      [`${edge.__prefix}size`]: 2,
    },
  }),

  influenced_by: (edge) => ({
    edge: {
      color: influcedByColor,
      [`${edge.__prefix}size`]: 2,
    },
  }),

  light: () => ({
    edge: {
      color: lightColor,
    },
  }),

  hidden: () => ({
    edge: {
      color: backgroundColor,
    },
  }),

  fireline: () => ({
    edge: {
      color: chroma(lightColor).brighten(2).css(),
    },
  }),

  originalColor: edge => ({
    edge: {
      color: edge.color,
    },
  }),
};

let currentGlobal = 'default';
const getGlobalStyle = field => globalStyles[currentGlobal][field];

function toStyled(target, getStyle, globalPart, ...classNames) {
  const original = target.original || target;
  const styles = classNames
    .map(getStyle)
    .filter(s => s)
    .reduce(_.assign, _.clone(getGlobalStyle(globalPart) || {}));
  if (_.isEmpty(styles)) return original;
  return _.assign({}, original, styles, { original });
}

module.exports = {
  addClass: (target, ...classNames) => {
    target.className = _.union(target.className, classNames);
    return target;
  },

  removeClass: (target, ...classNames) => {
    target.className = _.without(target.className, ...classNames);
    return target;
  },

  getGlobalStyle,
  useGlobalStyle: style => currentGlobal = style,

  mockSettings: (styled, original) => field =>
    styled[field] || original(field),

  toStyledNode: (node, ...classNames) =>
    toStyled(node, c => nodeStyles[c] && nodeStyles[c](node), 'node', ...classNames),

  toStyledEdge: (edge, source, target, ...classNames) => {
    const styleGetter = part => c =>
      edgeStyles[c] && edgeStyles[c](edge, source, target)[part];

    const getStyled = (part) => {
      const [partStr, partObj] = _.chain(part).toPairs().first().value();
      return toStyled(partObj, styleGetter(partStr), partStr, ...classNames);
    };

    return [
      getStyled({ edge }),
      getStyled({ source }),
      getStyled({ target }),
    ];
  },
};
