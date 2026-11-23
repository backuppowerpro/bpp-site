/* Remove redundant pointer outlines without changing where focus goes.
   No standing “last input” mode: ambiguous, keyboard, and synthetic actions keep the ring. */
(function () {
  'use strict';
  var mark = 'data-bpp-pointer-focus', programMark = 'data-bpp-program-focus';
  var key = 'bpp:ui:pointer-handoff';
  var serial = 0, press, duringClick, marked;
  var handoffPaths = new Set(['/walk-v2/range', '/walk-v2/photos', '/walk-v2/photos-later', '/walk-v2/thankyou']);
  function clear() {
    if (marked) marked.removeAttribute(mark);
    marked = null;
  }
  function reset() { serial += 1; duringClick = null; press = null; clear(); }
  function control(target) {
    return target && target.closest && target.closest('button, a[href], summary, input, select, textarea, label, [role="button"], [tabindex]');
  }
  function physical(event) { return /^(mouse|touch|pen)$/.test(event.pointerType || ''); }
  function editable(target) {
    return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) ||
      target.matches('[role="textbox"], [role="combobox"], [role="spinbutton"]');
  }
  function apply(target) {
    if (target && target !== document.body && !editable(target)) {
      clear(); marked = target; target.setAttribute(mark, '');
    }
  }
  // The lease is invalidated by any newer action. Async handlers must explicitly
  // retain it before their first await; using focus() later is otherwise unknown.
  function valid(intent) { return intent && intent.serial === serial; }
  function capture() { return valid(duringClick) ? duringClick : null; }
  function focus(target, options, intent) {
    if (!target) return;
    var eligible = valid(intent === undefined ? capture() : intent);
    target.focus(options);
    if (eligible && document.activeElement === target) {
      target.removeAttribute(programMark); apply(target);
    } else {
      if (marked === target) clear();
      if (document.activeElement === target && !editable(target)) target.setAttribute(programMark, '');
    }
  }
  document.addEventListener('pointerdown', function (event) {
    reset();
    var origin = control(event.target);
    if (origin && event.isTrusted && event.isPrimary && event.button === 0 && physical(event)) {
      press = { origin: origin, time: event.timeStamp, id: event.pointerId, type: event.pointerType, releasedAt: null };
    }
  }, true);
  document.addEventListener('pointerup', function (event) {
    if (!press) return;
    var atPoint = document.elementFromPoint(event.clientX, event.clientY);
    if (!event.isTrusted || !event.isPrimary || event.button !== 0 || press.id !== event.pointerId ||
        press.type !== event.pointerType || control(event.target) !== press.origin || control(atPoint) !== press.origin) {
      reset(); return;
    }
    press.releasedAt = event.timeStamp;
  }, true);
  document.addEventListener('visibilitychange', function () { if (document.hidden) reset(); });
  document.addEventListener('pointercancel', reset, true);
  document.addEventListener('keydown', reset, true);
  document.addEventListener('focusin', function (event) {
    var intent = capture();
    if (intent && event.target === intent.origin) apply(event.target);
  }, true);
  document.addEventListener('focusout', function (event) { if (marked === event.target) clear(); event.target.removeAttribute(programMark); }, true);
  document.addEventListener('click', function (event) {
    var prior = press, target = control(event.target);
    var elapsed = prior && prior.releasedAt !== null ? event.timeStamp - prior.releasedAt : -1;
    reset();
    // Safari can emit a mouse-compatible click after a tap. Match the real press
    // to the same control rather than treating every click as pointer input.
    if (!prior || target !== prior.origin || !event.isTrusted || event.detail < 1 || elapsed < 0 || elapsed > 750 || event.timeStamp - prior.time > 1500) return;
    var intent = duringClick = { serial: serial, origin: target };
    if (document.activeElement === target) apply(target);
    setTimeout(function () { if (duringClick === intent) duringClick = null; }, 0);
  }, true);
  // Known same-origin scripted handoffs only. This stores no query or customer
  // data, cannot opt a reload/back-forward in, and may fail harmlessly in private mode.
  function canonical(path) { return path.replace(/\.html$/, '').replace(/\/$/, ''); }
  function beforeNavigation(target, intent) {
    try {
      sessionStorage.removeItem(key);
      if (!valid(intent === undefined ? capture() : intent)) return;
      var url = new URL(target, location.href), destination = canonical(url.pathname), source = canonical(location.pathname);
      if (url.origin !== location.origin || !/^\/walk-v2(?:\/|$)/.test(source) || !handoffPaths.has(destination) || source === destination) return;
      sessionStorage.setItem(key, JSON.stringify({ source: source, destination: destination, expires: Date.now() + 3000 }));
    } catch (_) {}
  }
  function acceptNavigation() {
    try {
      var raw = sessionStorage.getItem(key);
      sessionStorage.removeItem(key);
      var type = performance.getEntriesByType('navigation')[0];
      // The Quote Walk deliberately sends no referrer. Where a referrer exists
      // verify its origin and path too, but do not relax that privacy policy.
      var referrer = document.referrer ? new URL(document.referrer) : null;
      var source = referrer && canonical(referrer.pathname);
      var data = JSON.parse(raw);
      if (data && type && type.type === 'navigate' && /^\/walk-v2(?:\/|$)/.test(data.source) &&
          (!referrer || (referrer.origin === location.origin && data.source === source)) && handoffPaths.has(data.destination) &&
          data.destination === canonical(location.pathname) && Number.isFinite(data.expires) &&
          data.expires >= Date.now() && data.expires - Date.now() <= 3000) return { serial: serial };
    } catch (_) {}
    return null;
  }
  var arrival = acceptNavigation();
  window.BPPPointerFocus = {
    capture: capture, focus: focus, isPointer: valid, beforeNavigation: beforeNavigation,
    arrival: function () { return valid(arrival) ? arrival : null; }
  };
})();
