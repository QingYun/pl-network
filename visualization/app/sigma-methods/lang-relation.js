import _ from 'lodash';

function inBound(nodeId, category) {
  const graph = this;
  const result = {};
  graph.inNeighborsIndex.get(nodeId)
    .forEach(n => n.keyList().forEach((e) => {
      const edge = graph.edgesIndex.get(e);
      if (edge.category === category) {
        result[edge.source] = edge;
      }
    }));
  return result;
}

function outBound(nodeId, category) {
  const graph = this;
  const result = {};
  graph.outNeighborsIndex.get(nodeId)
    .forEach(n => n.keyList().forEach((e) => {
      const edge = graph.edgesIndex.get(e);
      if (edge.category === category) {
        result[edge.target] = edge;
      }
    }));
  return result;
}

function getHigherEdges({ source, target }) {
  return function (nodeId) {
    return _.mergeWith(
      outBound.apply(this, [nodeId, source]),
      inBound.apply(this, [nodeId, target]),
      (obj, src) => {
        if (!obj) return src;
        if (!src) return obj;
        const r = (this.edgesArray.indexOf(obj) > this.edgesArray.indexOf(src)) ? obj : src;
        return r;
      });
  };
}

module.exports = (Sigma) => {
  Sigma.classes.graph.addMethod('influenced', getHigherEdges({
    source: 'ns:computer.programming_language.influenced',
    target: 'ns:computer.programming_language.influenced_by',
  }));

  Sigma.classes.graph.addMethod('influencedBy', getHigherEdges({
    source: 'ns:computer.programming_language.influenced_by',
    target: 'ns:computer.programming_language.influenced',
  }));

  Sigma.classes.graph.addMethod('dialects', getHigherEdges({
    source: 'ns:computer.programming_language.dialects',
    target: 'ns:computer.programming_language.parent_language',
  }));

  Sigma.classes.graph.addMethod('parentLang', getHigherEdges({
    source: 'ns:computer.programming_language.parent_language',
    target: 'ns:computer.programming_language.dialects',
  }));
};
