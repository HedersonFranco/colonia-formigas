(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SeededRNG = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function createRng(seed) {
    let a = Number(seed) >>> 0;
    return function next() {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  return { createRng };
});
