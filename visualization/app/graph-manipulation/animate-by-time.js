import Sigma from 'linkurious';
import { getGlobalStyle, useGlobalStyle, addClass, removeClass } from '../styles/sigma-style';
import { highlightNodes, cancelHighlight } from './highlight-node';
import introducedIn from '../utils/introduced-in';

module.exports = (options) => {
  const { sigma: s, setYearRange, step, duration, onFinish } = options;
  const filter = Sigma.plugins.filter(s);
  let curYear = 1955;

  let timerHandle = null;
  const stop = () => {
    if (timerHandle) clearTimeout(timerHandle);
    filter
      .undo()
      .apply();
    cancelHighlight(s.graph, () => true, 'highlight', false, false);
    useGlobalStyle('default');
    setYearRange('');
    onFinish();
  };

  const nextRange = () => {
    if (curYear > 2015) {
      timerHandle = null;
      stop();
     } else {
      filter
        .undo()
        .nodesBy(n => introducedIn(n, 1950, curYear))
        .apply();
      cancelHighlight(s.graph, () => true, 'highlight', false, false);
      highlightNodes(s.graph, n => introducedIn(n, curYear - step, curYear), 'highlight', false, false);
      setYearRange(`${curYear - step} ~ ${curYear}`);
      curYear += step;
      timerHandle = setTimeout(nextRange, duration);
    }
    s.refresh();
  };
  
  const pause = () => {
    clearTimeout(timerHandle);
  };
  
  const resume = () => {
    nextRange();
  }

  useGlobalStyle('dark');
  nextRange();
  return { stop, pause, resume };
};
