import _ from 'lodash';

module.exports = (Sigma) => {
  Sigma.classes.graph.addMethod('neighbors', function (nodeId) {
    const self = this;
    const neighbors = self.allNeighborsIndex.get(nodeId).keyList();
    return neighbors.map(k => ({ [k]: self.nodesIndex.get(k) })).reduce(_.assign, {});
  });
};
