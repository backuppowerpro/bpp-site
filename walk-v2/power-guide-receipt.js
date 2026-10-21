/* Read-only presentation of a protected server projection. No dispatch or consent authority. */
(function () {
  'use strict';
  var CONTRACT = 'bpp-power-guide-delivery-v1';
  function element(tag, text, className) {
    var node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  // Match the accepted intake's ASCII/local/domain limits without rewriting a
  // protected recipient or treating corrupt legacy state as a send receipt.
  function validRecipient(email) {
    if (!email || email.length > 254 || email !== email.trim() || /[\u0000-\u001f\u007f]/.test(email)) return false;
    var parts = email.split('@');
    return parts.length === 2 && parts[0].length <= 64
      && /^[A-Za-z0-9!#$%&'*+\/=?^_{|}~.-]+$/.test(parts[0])
      && !parts[0].startsWith('.') && !parts[0].endsWith('.') && !parts[0].includes('..')
      && parts[1].includes('.') && parts[1].split('.').every(function (label) {
        return /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label);
      });
  }
  function render(container, view, localChoice) {
    if (!container || !window.BPPEstimateTerminal || !BPPEstimateTerminal.confirmed(view)) return false;
    var receipt = view.quote_walk_v2.power_guide_delivery;
    var valid = receipt && receipt.contract === CONTRACT
      && ['sent', 'pending', 'failed', 'not_requested', 'unavailable'].indexOf(receipt.status) !== -1;
    if (localChoice === false || valid && receipt.status === 'not_requested' || !valid && localChoice !== true) return false;
    var status = valid ? receipt.status : 'pending';
    var email = valid && typeof receipt.email === 'string' ? receipt.email : '';
    var sent = status === 'sent' && receipt.providerAccepted === true && validRecipient(email);
    if (status === 'sent' && !sent) status = 'pending';
    var copy = sent ? 'We emailed your guide to ' + email + '.'
      : status === 'failed' ? "We couldn't email your guide. You can view it now."
      : status === 'unavailable' ? 'Guide email is unavailable right now. You can view it now.'
      : 'Your guide email is not confirmed yet. You can view it now.';
    var section = element('section', '', 'guided-power-guide-receipt');
    section.dataset.powerGuideReceipt = status;
    section.setAttribute('aria-label', 'Your free generator guide');
    section.appendChild(element('h3', 'What Can My Generator Power?'));
    section.appendChild(element('p', copy));
    var link = element('a', 'View your guide', 'guided-link');
    // No token, email, arbitrary projection URL or marketing identity leaves this page.
    link.href = '/power-guide/';
    section.appendChild(link);
    container.appendChild(section);
    return true;
  }
  function renderCompact(container, view, localChoice) {
    if (!container || !window.BPPEstimateTerminal || !BPPEstimateTerminal.confirmed(view)) return false;
    var receipt = view.quote_walk_v2.power_guide_delivery;
    var valid = receipt && receipt.contract === CONTRACT
      && ['sent', 'pending', 'failed', 'not_requested', 'unavailable'].indexOf(receipt.status) !== -1;
    if (localChoice === false || localChoice !== true && valid && receipt.status === 'not_requested' && receipt.reason === 'guide_not_requested') {
      var link = element('a', 'View your guide', 'guided-link guided-received-guide-link');
      // Public access is separate from the optional email choice and carries no identity.
      link.href = '/power-guide/'; link.dataset.powerGuideDirect = '';
      container.appendChild(link); return true;
    }
    if (localChoice !== true && (!valid || receipt.status === 'not_requested')) return false;
    var status = valid ? receipt.status : 'pending';
    var email = valid && typeof receipt.email === 'string' ? receipt.email : '';
    var sent = status === 'sent' && receipt.providerAccepted === true && validRecipient(email);
    if (status === 'sent' && !sent || status === 'not_requested') status = 'pending';
    var copy = sent ? 'We emailed your guide to ' + email + '.'
      : status === 'failed' ? "We couldn't email your guide."
      : status === 'unavailable' ? 'Guide email is unavailable right now.'
      : 'Your guide email is not confirmed yet.';
    var note = element('p', copy, 'guided-received-guide'); note.dataset.powerGuideReceipt = status;
    container.appendChild(note);
    var fallback = element('a', 'View your guide', 'guided-link guided-received-guide-link');
    // Keep the identity-free guide available alongside every email status.
    fallback.href = '/power-guide/'; fallback.dataset.powerGuideDirect = '';
    container.appendChild(fallback);
    return true;
  }
  window.BPPPowerGuideReceipt = { version: 1, render: render, renderCompact: renderCompact };
})();
