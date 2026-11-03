#!/usr/bin/env node
/* Usage:  node tools/simulate.js [rounds=2000000] [--buy]
   Runs the REAL game maths (js/math.js) and prints RTP, hit frequency, free-spin frequency
   and the win distribution. --buy simulates the BUY FREE SPINS feature instead. */
const M = require('../js/math.js');
const N = parseInt(process.argv[2], 10) || 2000000;
const buy = process.argv.includes('--buy');

let a = 123456789;                                       // fast deterministic rng, so runs are repeatable
const rng = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const bet = 20;
let paid = 0, hits = 0, trig = 0, baseWin = 0, fsWin = 0, fsSpins = 0, maxWin = 0, capped = 0, bolts = 0, sq = 0;
const buckets = { '0': 0, '<1x': 0, '1-2x': 0, '2-5x': 0, '5-10x': 0, '10-25x (BIG)': 0, '25-50x (MEGA)': 0, '50-500x (EPIC)': 0, '500x+': 0 };
const bucketOf = (x) => x === 0 ? '0' : x < 1 ? '<1x' : x < 2 ? '1-2x' : x < 5 ? '2-5x' : x < 10 ? '5-10x' : x < 25 ? '10-25x (BIG)' : x < 50 ? '25-50x (MEGA)' : x < 500 ? '50-500x (EPIC)' : '500x+';

for (let i = 0; i < N; i++) {
  const r = M.playRound(rng, bet, buy ? { forceScatters: true } : {});
  paid += r.total; baseWin += r.base; fsWin += r.fs; fsSpins += r.fsSpins;
  const x = r.total / bet; sq += x * x;
  if (r.total > 0) hits++;
  if (r.triggered) trig++;
  if (r.capped) capped++;
  if (r.bolts) bolts++;
  maxWin = Math.max(maxWin, x); buckets[bucketOf(x)]++;
}
const spent = N * bet * (buy ? M.BUY_COST_X : 1);
const mean = paid / (N * bet), sd = Math.sqrt(Math.max(0, sq / N - mean * mean));
console.log(`${buy ? 'BUY FREE SPINS' : 'BASE GAME'}   rounds: ${N.toLocaleString()}`);
console.log(`RTP            : ${(paid / spent * 100).toFixed(2)} %   (return on ${buy ? 'the buy price of ' + M.BUY_COST_X + 'x' : 'the bet'})`);
console.log(`  from base    : ${(baseWin / (N * bet) * 100).toFixed(2)} % of bet`);
console.log(`  from free sp.: ${(fsWin / (N * bet) * 100).toFixed(2)} % of bet`);
console.log(`hit frequency  : ${(hits / N * 100).toFixed(2)} %   (1 in ${(N / Math.max(1, hits)).toFixed(2)})`);
console.log(`free spins     : 1 in ${trig ? (N / trig).toFixed(0) : '-'}  (avg ${trig ? (fsSpins / trig).toFixed(1) : 0} spins per feature)`);
console.log(`lightning wild : 1 in ${bolts ? (N / bolts).toFixed(0) : '-'} spins`);
console.log(`max win        : ${maxWin.toFixed(0)}x bet   (capped rounds: ${capped})`);
console.log(`volatility (sd): ${sd.toFixed(2)}`);
console.log('distribution:');
for (const k in buckets) console.log('  ' + k.padEnd(18) + (buckets[k] / N * 100).toFixed(3) + ' %');
