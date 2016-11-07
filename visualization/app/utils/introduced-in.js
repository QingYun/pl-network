import _ from 'lodash';

module.exports = (node, minYear, maxYear) => {
  const year = node.attributes['ns:computer.programming_language.introduced']
  if (!year || year === '') return false;
  const numYear = _.toInteger(year.split('-')[0]);
  if (!maxYear) return numYear === minYear;
  return _.inRange(numYear, minYear, maxYear)
};
