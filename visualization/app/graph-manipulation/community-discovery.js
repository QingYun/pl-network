import Sigma from 'linkurious';
import _ from 'lodash';
import chroma from 'chroma-js';
import randomColor from 'randomcolor';
import { addClass, removeClass } from '../styles/sigma-style';
import oneOffEvent from '../utils/one-off-event';

module.exports = options => {
  const { sigma: s } = options;
  const louvain = Sigma.plugins.louvain(s.graph);
  const communities = _.chain(louvain.getPartitions())
    .toPairs()
    .groupBy(p => p[1])
    .omitBy(v => v.length < 5)
    .mapValues(v => ({
      color: randomColor('light'),
      nodes: v.map(([nodeId, communityId]) => nodeId),
      size: v.length,
    }))
    .value();
    
  const nodeColors = {};
  s.graph.nodes().forEach((n) => {
    if (!communities[n._louvain]) {
      n.hidden = true;
      return ;
    }
    n.color = communities[n._louvain].color;
    addClass(n, 'originalColor');
    nodeColors[n.id] = n.color;
  });

  const cancelNodeHighlight = oneOffEvent({
    sigma: s,
    keyboard: ['27'],
    onEvent: () => {
      s.graph.nodes().forEach(n => removeClass(n, 'originalColor'));
      s.refresh({ skipIndexation: true });
    },
  });

  s.refresh({ skipIndexation: true });
 
  const cancelEdgeHighlight = oneOffEvent({
    sigma: s,
    keyboard: ['27'],
    onEvent: () => {
      s.graph.edges().forEach(e => removeClass(e, 'originalColor'));
      s.refresh({ skipIndexation: true });
    },
  });

  s.graph.edges().forEach((e) => {
    const color = nodeColors[e.source];
    if (!color) return ;
    e.color = chroma(color).darken().desaturate(2).css();
    addClass(e, 'originalColor');
  });
  s.refresh({ skipIndexation: true });

  return {
    sigma: s,
    cancelHighlight: [cancelNodeHighlight, cancelEdgeHighlight],
    nodeColors,
    communities,
  };
};
