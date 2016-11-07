import _ from 'lodash';
import { addClass, removeClass } from '../styles/sigma-style';

function getEdgeById({ sigma: { graph }, edgeId }) {
  return _.find(graph.edges(), { id: edgeId });
}

function getEdgeByEnds({ sigma: { graph }, sourceId, targetId }) {
  return _.filter(graph.edges(), e =>
    (!sourceId || e.source === sourceId) && (!targetId || e.target === targetId));
}

function getEdgeByPredicate({ sigma: { graph }, edgePicker }) {
  return graph.edges().filter(edgePicker);
}

function createAnimation(duration, onProgress, onFinish) {
  let startTime = null;
  return (timestamp) => {
    if (!startTime) {
      startTime = timestamp;
      return false;
    }
    const progress = (timestamp - startTime) / duration;
    if (progress > 1) {
      onProgress(1);
      onFinish();
      return true;
    }
    onProgress(progress);
    return false;
  };
}

function findEnds(graph, edges) {
  const endIds = _.chain(edges)
    .flatMap(e => [e.source, e.target])
    .map(id => ({ [id]: null }))
    .reduce(_.assign, {})
    .value();

  graph.nodes().forEach((n) => {
    if (endIds[n.id] === null) {
      endIds[n.id] = n;
    }
  });

  return endIds;
}

function createAnimator(options) {
  const { sigma, source, target, nodeClass, drawEdge, edgeClass } = _.merge({
    drawEdge: false,
  }, options);

  const [startX, startY] = [source.x, source.y];
  const [disX, disY] = [target.x - startX, target.y - startY];
  const nodeId = `__ANIMATION_NODE_${source.id}_${target.id}_${_.random(1000)}`;
  sigma.graph.addNode({
    id: nodeId,
    x: startX,
    y: startY,
  });
  const node = _.find(sigma.graph.nodes(), { id: nodeId });
  addClass(node, nodeClass);

  let edgeId = null;
  if (drawEdge) {
    edgeId = `__ANIMATION_EDGE_${source.id}_${target.id}_${_.random(1000)}`;
    sigma.graph.addEdge({
      id: edgeId,
      source: source.id,
      target: nodeId,
      className: [edgeClass],
    });
  }

  return [
    (progress) => {
      node.x = startX + (disX * progress);
      node.y = startY + (disY * progress);
    },
    () => {
      if (edgeId !== null) sigma.graph.dropEdge(edgeId);
      sigma.graph.dropNode(nodeId);
    },
  ];
}

function animateEdge(optionsParam) {
  const options = _.merge({
    duration: 1000,
    nodeClass: 'fireball',
    edgeClass: 'fireline',
  }, optionsParam);

  const edges = _.uniqBy(
    options.edgePicker ? getEdgeByPredicate(options) :
    options.edges ? options.edges : [options.edge]
      .concat(getEdgeById(options))
      .concat(getEdgeByEnds(options))
      .filter(e => e),
    e => e.source + e.target);

  const edgeEnds = findEnds(options.sigma.graph, edges);
  const getSource = (e) => {
    if (options.sourceId) return edgeEnds[options.sourceId];
    if (options.targetId) {
      return edgeEnds[e.target === options.targetId ? e.source : e.target];
    }
    return edgeEnds[e.source];
  };
  const getTarget = (e) => {
    if (options.targetId) return edgeEnds[options.targetId];
    if (options.sourceId) {
      return edgeEnds[e.source === options.sourceId ? e.target : e.source];
    }
    return edgeEnds[e.target];
  };

  edges.forEach(e => addClass(e, 'hidden'));
  return {
    onFrames: edges.map(e =>
      createAnimation(
        options.duration,
        ...createAnimator({
          sigma: options.sigma,
          source: getSource(e),
          target: getTarget(e),
          nodeClass: options.nodeClass,
          drawEdge: true,
          edgeClass: options.edgeClass,
        })
      )
    ),
    done: () => {
      edges.forEach(e => removeClass(e, 'hidden'));
      if (options.onFinish) {
        let realEdges = edges;
        if (options.edges) {
          realEdges = options.sigma.graph.edges().filter(e =>
            _.find(options.edges, { id: e.id })
          );
        }
        options.onFinish(realEdges);
      }
    },
  };
}

module.exports = (...options) => new Promise((resolve) => {
  const { sigma } = options[0];
  let animations = options.map(animateEdge);

  sigma.refresh({ skipIndexation: false });
  requestAnimationFrame(function step(timestamp) {
    animations = animations.reduce((acc, { onFrames, done }) => {
      const nextFrame = onFrames.reduce((acc, animate) =>
        (animate(timestamp) ? acc : acc.concat(animate)), []);
      if (nextFrame.length === 0) {
        done();
        return acc;
      }
      return acc.concat({ onFrames: nextFrame, done });
    }, []);
    sigma.refresh({ skipIndexation: true });

    if (animations.length > 0) {
      requestAnimationFrame(step);
    } else {
      resolve();
    }
  });
});
