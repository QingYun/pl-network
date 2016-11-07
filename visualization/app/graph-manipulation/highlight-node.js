import _ from 'lodash';
import { addClass, removeClass } from '../styles/sigma-style';

const setHighlight = setter => (graph, nodeIds, className, neighbor = true, edge = true) => {
  let targetIds = null;
  if (_.isFunction(nodeIds)) {
    targetIds = graph.nodes().filter(n => nodeIds(n)).map(n => n.id);
  } else {
    targetIds = nodeIds || graph.nodes().map(n => n.id);
  }
  const targetNodes = targetIds
    .concat(!neighbor ? [] : _.flatMap(targetIds, n => _.keys(graph.neighbors(n))))
    .map(n => ({ [n]: true }))
    .reduce(_.assign, {});

  graph.nodes().forEach((n) => {
    if (targetNodes[n.id]) {
      setter(n, className);
    }
  });

  if (edge) {
    graph.edges().forEach((e) => {
      if (targetNodes[e.source] && targetNodes[e.target]) {
        setter(e, className);
      }
    });
  }
};

module.exports = {
  highlightNodes: setHighlight(addClass),
  cancelHighlight: setHighlight(removeClass),
};
