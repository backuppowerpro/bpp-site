/* Walk v2 shared wiring (staging). The pages are the approved Claude Design
 * comps; this file only moves data: token plumbing, the four endpoints,
 * PostHog events. No visual decisions live here. */
(function () {
  var BASE = 'https://reowtzedjflwmlptupbk.supabase.co/functions/v1';

  function token() {
    var t = new URLSearchParams(window.location.search).get('t') || '';
    return /^[a-f0-9]{32,64}$/i.test(t) ? t : '';
  }
  function go(page, t) {
    window.location.href = '/walk-v2/' + page + (t ? '?t=' + encodeURIComponent(t) : '');
  }
  /* explicit back-a-step, token preserved everywhere. With no prevPage we send
   * them to the landing WITH the token so the landing's resume guard routes them
   * to their first unanswered step (routeFromState), never a blank form and never
   * a dead-end. Not a forward loop: routeFromState targets the FIRST unanswered
   * step, and step pages do not redirect back to the landing on load. */
  function back(prevPage, t) {
    if (prevPage) { go(prevPage, t); return; }
    window.location.href = '/walk-v2/' + (t ? '?t=' + encodeURIComponent(t) : '');
  }
  function ph(event, props) {
    try { window.posthog && posthog.capture(event, Object.assign({ funnel: 'walkv2' }, props || {})); } catch (_) {}
  }
  function getJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('http_' + r.status);
      return r.json();
    });
  }
  function postJson(url, body, timeoutMs) {
    /* A weak rural signal can leave a POST (especially a photo upload) hanging
       forever, which froze the photo step on "uploading" with the CTA greyed out
       and no recovery. Abort after timeoutMs so the promise rejects and the
       caller's .catch (e.g. photos.html flips the entry to "failed" -> Retry)
       can recover instead of hanging. Default 30s. */
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs || 30000) : null;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) { var e = new Error(j && j.error || 'http_' + r.status); e.body = j; throw e; }
        return j;
      });
    }).finally(function () { if (timer) clearTimeout(timer); });
  }

  window.WALK = {
    token: token,
    go: go,
    back: back,
    ph: ph,
    view: function (t) { return getJson(BASE + '/pre-read-view?token=' + encodeURIComponent(t)); },
    confirm: function (t, fields) { return postJson(BASE + '/pre-read-confirm', Object.assign({ token: t }, fields)); },
    photo: function (t, dataUrl, idx) { return postJson(BASE + '/pre-read-photo', { token: t, image: dataUrl, idx: idx }); },
    saveLater: function (t) { return postJson(BASE + '/pre-read-save-later', { token: t }); },
    emailCapture: function (t, email) { return postJson(BASE + '/walk-email-capture', { token: t, email: email }); },
    /* address auto-suggest via Mapbox Geocoding, the same provider the rest of
       BPP uses (quote.html, m/, pre-read). Publishable pk. token, US addresses,
       biased to Greenville. Returns {description} so the dropdown render is shared. */
    addrSuggest: function (q) {
      var MB = 'pk.eyJ1Ijoia2V5ZWxlY3RyaWN1cHN0YXRlIiwiYSI6ImNtcm8zZ3NkeTFodmgyeG9hY284Z3F4YXcifQ.3mLKvFGpDEdkjEMQNVQhmg';
      var url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(q)
        + '.json?access_token=' + MB + '&country=us&types=address&autocomplete=true&limit=5&proximity=-82.3940,34.8526';
      return fetch(url)
        .then(function (r) { return r.ok ? r.json() : { features: [] }; })
        .then(function (d) { return (d.features || []).map(function (f) {
          /* pull structured city/state/zip from the Mapbox feature context so the
             contact + pre_read carry them (the every-detail rule), not just the
             free-text place_name. region.short_code is like "US-SC" -> "SC". */
          var ctx = f.context || [];
          function ctxText(prefix) {
            for (var i = 0; i < ctx.length; i++) {
              if (String(ctx[i].id || '').indexOf(prefix) === 0) return ctx[i].text || '';
            }
            return '';
          }
          function ctxState() {
            for (var i = 0; i < ctx.length; i++) {
              if (String(ctx[i].id || '').indexOf('region') === 0) {
                return (ctx[i].short_code || '').replace(/^US-/i, '') || ctx[i].text || '';
              }
            }
            return '';
          }
          return {
            description: f.place_name || '',
            city: ctxText('place'),
            state: ctxState(),
            zip: ctxText('postcode'),
          };
        }); })
        .catch(function () { return []; });
    },
    newLead: function (payload) { return postJson(BASE + '/quo-ai-new-lead', payload); },
    /* Thank-you finalize: tells the backend the customer finished the walk UI
       (including photo-deferred). Fires the opener when SMS_AUTO_ENABLED. */
    markThankyou: function (t) {
      return postJson(BASE + '/pre-read-confirm', { token: t, mark_thankyou: true });
    },
    /* require a token or bounce to the start (no dead ends) */
    requireToken: function () {
      var t = token();
      if (!t) { window.location.replace('/walk-v2/'); return null; }
      return t;
    },
    /* resume routing: land on the first unanswered step (D6) */
    routeFromState: function (t, v) {
      /* an outlet-unsure lead (amperage still null) picks the outlet first, on the
         educated guide page, before the walk. In the walk null amperage only happens
         for the unsure branch (30/50 leads have it set, none leads never enter), so
         this also makes the evening reminder's /w/ short link land them on the page. */
      if (v.amperage == null) return go('outlet.html', t);
      if (!v.confirmed_panel_room) return go('location.html', t);
      if (!v.distance_band) return go('distance.html', t);
      if (!v.photo_count && !v.photo_received) return go('photos.html', t);
      return go('thankyou.html', t);
    },
    /* shrink a photo to a phone-friendly JPEG dataURL before upload */
    resizeImage: function (file, maxPx) {
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          try {
            var scale = Math.min(1, maxPx / Math.max(img.width, img.height));
            var w = Math.max(1, Math.round(img.width * scale));
            var h = Math.max(1, Math.round(img.height * scale));
            var cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            cv.getContext('2d').drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(url);
            resolve(cv.toDataURL('image/jpeg', 0.85));
          } catch (e) { reject(e); }
        };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('bad_image')); };
        img.src = url;
      });
    },
  };
})();
