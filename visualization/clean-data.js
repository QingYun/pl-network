const fs = require('fs');
const _ = require('lodash');

fs.readFile('./data/first-screen.json', (err, data) => {
  fs.readFile('./data/pl-network.json', (err, pl_data) => {
    const obj = JSON.parse(data);
    const pl = JSON.parse(pl_data);

    obj.nodes = obj.nodes
      .filter(n => n.label && n.label.length > 0)
      .map(n => _.omit(n, 'color'))
      .map(n => _.merge(n, {
        attributes: {
          paradigms: pl[n.id]['ns:computer.programming_language.language_paradigms'],
        },
      })
    );

    const existingNodes = obj.nodes.map(n => ({ [n.id]: true })).reduce(_.assign, {});

    obj.edges = _.chain(obj.edges)
      .filter(e => existingNodes[e.source] && existingNodes[e.target])
      .map(e => _.omit(e, 'color'))
      .value();

    fs.writeFile('./data/first-screen.new.json', JSON.stringify(obj), () => {
      console.log('finished');
    });
  });
});
