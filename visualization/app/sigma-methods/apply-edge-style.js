import _ from 'lodash';
import { mockSettings, toStyledEdge } from '../styles/sigma-style';

module.exports = (Sigma) => {
  const oldAddEdge = Sigma.webgl.edges.def.addEdge;
  Sigma.webgl.edges.def.addEdge = function (originalEdge, originalSource, originalTarget,
                                              data, i, prefix, originalSettings) {
    const [edge, source, target] =
      toStyledEdge(_.assign(originalEdge, { __prefix: prefix }),
                    originalSource, originalTarget, ...originalEdge.className || []);
    const settings = mockSettings(edge, originalSettings);
    return oldAddEdge.apply(this, [edge, source, target, data, i, prefix, settings]);
  };
};
