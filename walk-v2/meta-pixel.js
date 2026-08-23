(function () {
  'use strict';
  if (navigator.globalPrivacyControl === true) {
    window.BPPMeta = { trackLead: function () {} };
    return;
  }
  if (!window.fbq) {
    var fbq = window.fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    var firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(script, firstScript);
  }
  window.fbq('init', '1389648775800936');
  window.fbq('track', 'PageView');
  window.fbq('track', 'ViewContent', {
    content_name: 'quote-walk',
    content_category: 'generator-installation'
  });
  window.BPPMeta = {
    trackLead: function (eventId) {
      if (!eventId || typeof window.fbq !== 'function') return;
      window.fbq('track', 'Lead', {
        content_name: 'generator-inlet-quote',
        content_category: 'generator-installation'
      }, { eventID: eventId });
    }
  };
})();
