import _ from 'lodash';

module.exports = {
  byParadigm: (options) => {
    const { sigma: s, paradigm, onParadigm, offParadigm } = options;
    s.graph.nodes().forEach(n => {
      if (n.attributes.paradigms.indexOf(paradigm) !== -1) {
        onParadigm(n);
      } else {
        offParadigm(n);
      }
    });
    s.refresh();  
  },
  
  getParadigms: (options) => {
    const { sigma: s } = options;
    const paradigms = {};
    s.graph.nodes()
      .forEach(n => n.attributes.paradigms.forEach(p => paradigms[p] = true ))
    return _.keys(paradigms);
  }
};