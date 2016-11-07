import _ from 'lodash';
import { useGlobalStyle, addClass, removeClass } from '../styles/sigma-style';
import { highlightNodes, cancelHighlight } from '../graph-manipulation/highlight-node';
import shootEdge from '../graph-manipulation/shoot-edge';
import oneOffEvent from '../utils/one-off-event';

module.exports = (options) => {
  const { sigma: s } = options;

  let removePrevHighlight = () => {};
  let prevNode = null;
  const onClickNode = (evt) => {
    const nodeId = evt.data.node.id;

    removePrevHighlight();
    if (prevNode === nodeId) return;
    prevNode = nodeId;
    useGlobalStyle('dark');

    let [dialects, parentLang, influenced, influencedBy] = [
      s.graph.dialects(nodeId),
      s.graph.parentLang(nodeId),
      s.graph.influenced(nodeId),
      s.graph.influencedBy(nodeId),
    ];

    [dialects, parentLang] = [[dialects, influenced], [parentLang, influencedBy]]
      .map(([src, cand]) => _.mapValues(src, (v, k) => (
        s.graph.edges().indexOf(v) > s.graph.edges().indexOf(cand[k])
          ? v
          : cand[k]
      )));

    [influenced, influencedBy] = [
      _.omit(influenced, _.keys(dialects)),
      _.omit(influencedBy, _.keys(parentLang)),
    ];

    highlightNodes(s.graph, [nodeId], 'selected', false, false);
    highlightNodes(s.graph, _.keys(dialects), 'dialect', false, false);
    highlightNodes(s.graph, _.keys(parentLang), 'parent_lang', false, false);
    highlightNodes(s.graph, _.keys(influenced), 'influenced', false, false);
    highlightNodes(s.graph, _.keys(influencedBy), 'influenced_by', false, false);

    const cancelEdgeHighlight = [];
    shootEdge({
      sigma: s,
      edges: _.values(influencedBy),
      edgeClass: 'influenced_by',
      targetId: nodeId,
      onFinish: (edges) => {
        edges.forEach(e => addClass(e, 'influenced_by'));
        cancelEdgeHighlight.push(() => {
          edges.forEach(e => removeClass(e, 'influenced_by'));
        });
        s.refresh({ skipIndexation: true });
      },
    }, {
      sigma: s,
      edges: _.values(parentLang),
      edgeClass: 'parent_lang',
      targetId: nodeId,
      onFinish: (edges) => {
        edges.forEach(e => addClass(e, 'parent_lang'));
        cancelEdgeHighlight.push(() => {
          edges.forEach(e => removeClass(e, 'parent_lang'));
        });
        s.refresh({ skipIndexation: true });
      },
    }).then(() => shootEdge({
      sigma: s,
      edges: _.values(influenced),
      edgeClass: 'influenced',
      sourceId: nodeId,
      onFinish: (edges) => {
        edges.forEach(e => addClass(e, 'influenced'));
        cancelEdgeHighlight.push(() => {
          edges.forEach(e => removeClass(e, 'influenced'));
        });
        s.refresh({ skipIndexation: true });
      },
    }, {
      sigma: s,
      edges: _.values(dialects),
      edgeClass: 'dialect',
      sourceId: nodeId,
      onFinish: (edges) => {
        edges.forEach(e => addClass(e, 'dialect'));
        cancelEdgeHighlight.push(() => {
          edges.forEach(e => removeClass(e, 'dialect'));
        });
        s.refresh({ skipIndexation: true });
      },
    })).then(() => {
      options.showSnackbar(`Node ${evt.data.node.label} selected. Press ESC or click it again to cancel.`);
    });

    removePrevHighlight = oneOffEvent({
      sigma: s,
      keyboard: ['27'],
      onEvent: () => {
        useGlobalStyle('default');
        cancelHighlight(s.graph, [nodeId], 'selected', false, false);
        cancelHighlight(s.graph, _.keys(dialects), 'dialect', false, false);
        cancelHighlight(s.graph, _.keys(parentLang), 'parent_lang', false, false);
        cancelHighlight(s.graph, _.keys(influenced), 'influenced', false, false);
        cancelHighlight(s.graph, _.keys(influencedBy), 'influenced_by', false, false);
        cancelEdgeHighlight.forEach(f => f());
        s.refresh({ skipIndexation: true });
        removePrevHighlight = () => {};
      },
    });

    s.refresh({ skipIndexation: true });
  };

  s.bind('clickNode', onClickNode);
};
