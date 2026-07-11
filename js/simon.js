/* SIMON LIES — a memory game with a dishonesty problem.
   Repeat the sequence. Except:
   - round 3: it accuses you of being wrong when you were right (then refunds
     half your aura as a "processing fee")
   - round 5: one flash in the playback is "sponsored content" (dimmer) and
     must be ignored — forgiven once, explained after
   - round 6: it demands the sequence BACKWARDS, announced after playback
   Survive 7 rounds and it admits your memory is real. */
window.PLAYLAB = window.PLAYLAB || { vis: {} };

(() => {
  const Sound = () => window.PLAYLAB.Sound;
  const toast = (m) => window.PLAYLAB.toast?.(m);
  const NOTES = [330, 415, 494, 587];

  let pads, msgEl, roundEl, startBtn;
  let seq = [], input = [], round = 0, phase = 'idle';  // idle|show|guess|over
  let liarIndex = -1, backwards = false, sponsoredForgiven = false, accusedYet = false;

  function flash(i, dim = false) {
    const pad = pads[i];
    pad.classList.add(dim ? 'lit-dim' : 'lit');
    Sound()?.blip(NOTES[i]);
    setTimeout(() => pad.classList.remove('lit', 'lit-dim'), dim ? 240 : 340);
  }

  async function playback() {
    phase = 'show';
    msgEl.textContent = 'watch. carefully. (or don\'t.)';
    backwards = round === 6;
    liarIndex = round === 5 ? (Math.random() * seq.length) | 0 : -1;
    await wait(700);
    for (let i = 0; i < seq.length; i++) {
      if (i === liarIndex) {
        flash((seq[i] + 1 + (Math.random() * 3 | 0)) % 4, true);   // the sponsored lie — dimmer
        await wait(560);
      }
      flash(seq[i]);
      await wait(560);
    }
    if (backwards) {
      msgEl.textContent = 'now repeat it BACKWARDS. oh — should\'ve mentioned that first?';
      toast('⇄ backwards round. deal with it.');
      Sound()?.zap();
    } else {
      msgEl.textContent = liarIndex >= 0 ? 'repeat it. (one of those flashes was… off.)' : 'your turn.';
    }
    input = [];
    phase = 'guess';
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  function expected() {
    return backwards ? [...seq].reverse() : seq;
  }

  function press(i) {
    if (phase !== 'guess') return;
    flash(i);
    input.push(i);
    const target = expected();
    const idx = input.length - 1;

    if (input[idx] !== target[idx]) {
      // sponsored-content forgiveness: they included the fake flash
      if (liarIndex >= 0 && !sponsoredForgiven) {
        sponsoredForgiven = true;
        input.pop();
        toast('that flash was sponsored content. it doesn\'t count. forgiven. once.');
        Sound()?.trap();
        return;
      }
      return lose();
    }

    if (input.length === target.length) {
      // round 3 false accusation
      if (round === 3 && !accusedYet) {
        accusedYet = true;
        phase = 'show';
        msgEl.textContent = 'WRONG. that is not what I played.';
        window.PLAYLAB.Roast?.addAura(-100, document.querySelector('.simon__stage'));
        Sound()?.trap();
        setTimeout(() => {
          msgEl.textContent = 'jk. you were right. I was testing your loyalty.';
          window.PLAYLAB.Roast?.addAura(50, document.querySelector('.simon__stage'));
          toast('aura refunded. minus a 50% processing fee.');
          setTimeout(nextRound, 1400);
        }, 1800);
        return;
      }
      nextRound();
    }
  }

  function nextRound() {
    round += 1;
    roundEl.textContent = round + '/7';
    if (round > 7) return winGame();
    seq.push((Math.random() * 4) | 0);
    Sound()?.coin();
    setTimeout(playback, 500);
  }

  function lose() {
    phase = 'over';
    const R = window.PLAYLAB.Roast;
    const r = R?.loss({ tier: round >= 5 ? 'mid' : 'brutal', anchor: document.querySelector('.simon__stage'), auraHit: round >= 5 ? -200 : -400 });
    msgEl.innerHTML = r
      ? `<b>${r.headline}</b> — ${r.line} (round ${round})`
      : `wrong. round ${round}.`;
    startBtn.textContent = 'TRY AGAIN';
    startBtn.hidden = false;
  }

  function winGame() {
    phase = 'over';
    window.PLAYLAB.Roast?.win({ anchor: document.querySelector('.simon__stage'), auraGain: 1200 });
    msgEl.textContent = 'seven rounds. your memory is real. this game wasn\'t. +1200 AURA';
    startBtn.textContent = 'ONE MORE';
    startBtn.hidden = false;
    Sound()?.win();
  }

  function start() {
    seq = [(Math.random() * 4) | 0];
    round = 1; accusedYet = false; sponsoredForgiven = false;
    roundEl.textContent = '1/7';
    startBtn.hidden = true;
    playback();
  }

  window.PLAYLAB.initSimon = () => {
    pads = [...document.querySelectorAll('.simon__pad')];
    msgEl = document.getElementById('simonMsg');
    roundEl = document.getElementById('simonRound');
    startBtn = document.getElementById('simonStart');
    pads.forEach((p, i) => p.addEventListener('click', () => press(i)));
    startBtn.addEventListener('click', start);

    /* debug handle */
    window.PLAYLAB._simon = () => ({ phase, round, seq: [...seq], backwards, liarIndex });
  };
})();
