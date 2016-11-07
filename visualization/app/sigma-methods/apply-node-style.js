import _ from 'lodash';
import { mockSettings, toStyledNode } from '../styles/sigma-style';

module.exports = (Sigma) => {
  const oldAddNode = Sigma.webgl.nodes.def.addNode;
  Sigma.webgl.nodes.def.addNode = function (originalNode, data, i, prefix, originalSettings) {
    if (_.isNaN(originalNode[prefix + 'x'])) {
      console.log('NaN')
    }
    const node = toStyledNode(_.assign(originalNode, { __prefix: prefix }),
                              ...originalNode.className || []);
    const settings = mockSettings(node, originalSettings);
    return oldAddNode.apply(this, [node, data, i, prefix, settings]);
  };

  const oldLabelRenderer = Sigma.canvas.labels.def;
  Sigma.canvas.labels.def = function (originalNode, context, originalSettings) {
    const node = toStyledNode(originalNode, ...originalNode.className || []);
    const settings = mockSettings(node, originalSettings);
    return oldLabelRenderer.apply(this, [node, context, settings]);
  };

  const oldOnHover = Sigma.canvas.hovers.def;
  Sigma.canvas.hovers.def = function (originalNode, context, originalSettings) {
    const node = toStyledNode(originalNode, ...originalNode.className || []);
    const settings = mockSettings(node, originalSettings);
    return oldOnHover.apply(this, [node, context, settings]);
  };
};
