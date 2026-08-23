(function () {
  "use strict";

  window.__BPP_UNIFIED_PHOTOS__ = true;
  var t = WALK.requireToken();
  if (!t) return;

  var main = document.getElementById("mainPage");
  main.querySelectorAll(".rv").forEach(function (element) {
    element.classList.add("in");
  });
  var slots = main.querySelector("[data-slots]");
  var cta = main.querySelector("[data-cta]");
  var ctaInner = main.querySelector("[data-cta-inner]");
  var hint = main.querySelector("[data-hint]");
  var later = main.querySelector("[data-photo-later]");
  var preview = main.querySelector("[data-photo-preview]");
  var previewImage = main.querySelector("[data-preview-image]");
  var previewClose = main.querySelector("[data-preview-close]");
  var previewReplace = main.querySelector("[data-preview-replace]");
  var photos = [];
  var panelConfirmed = false;
  var nextIndex = 1;
  var sending = false;
  var previewPhoto = null;

  var file = document.createElement("input");
  file.type = "file";
  file.accept = "image/*";
  file.multiple = true;
  file.hidden = true;
  document.body.appendChild(file);

  var replacementFile = document.createElement("input");
  replacementFile.type = "file";
  replacementFile.accept = "image/*";
  replacementFile.hidden = true;
  document.body.appendChild(replacementFile);

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[character];
    });
  }

  function hasUsefulPanelSet() {
    return panelConfirmed && photos.some(function (photo) { return photo.status === "done"; });
  }

  function hasAuthoritativePanelPhoto(value, hasSavedPhoto) {
    var state = value && value.quote_walk_v2 || value || {};
    var blockers = Array.isArray(state.blockers)
      ? state.blockers
      : state.readiness && Array.isArray(state.readiness.input_blockers)
        ? state.readiness.input_blockers
        : null;
    return Boolean(
      hasSavedPhoto
      && blockers
      && blockers.indexOf("panel_photo") === -1
    );
  }

  function render() {
    var html = "";
    photos.forEach(function (photo) {
      html += '<article class="slot unified-photo ' + escapeHtml(photo.status) + '" data-local-id="' + escapeHtml(photo.localId) + '">' +
        '<button class="thumb" type="button" data-preview="' + escapeHtml(photo.localId) + '" aria-label="Preview uploaded photo">' +
          (photo.dataUrl ? '<img src="' + escapeHtml(photo.dataUrl) + '" alt="" />' : "") +
          (photo.status === "uploading" ? '<span class="tag">Saving photo</span>' : "") +
          (photo.status === "failed" ? '<span class="tag">Upload failed</span>' : "") +
        '</button>' +
        '<button class="remove" type="button" data-remove="' + escapeHtml(photo.localId) + '" aria-label="Remove uploaded photo"></button>' +
        (photo.status === "failed" ? '<button class="retry" type="button" data-retry="' + escapeHtml(photo.localId) + '">Retry upload</button>' : '') +
      '</article>';
    });
    html += '<button class="add-photo-tile" type="button" data-add-more aria-label="Add photo">' +
      '<span aria-hidden="true">+</span><span>Add photo</span></button>';
    slots.className = "slots unified-photo-list";
    slots.innerHTML = html;
    cta.disabled = !hasUsefulPanelSet() || photos.some(function (photo) {
      return photo.status === "uploading";
    });
    later.hidden = hasUsefulPanelSet();
    ctaInner.textContent = hasUsefulPanelSet() ? "Continue" : "Add a photo to continue";
    hint.textContent = photos.length
      ? hasUsefulPanelSet()
        ? "Photos saved. Add more helpful views, or continue."
        : "Add at least one clear photo of a panel to continue."
      : "Choose several at once. At least one clear panel photo is needed before your project range.";
  }

  function removeServerPhoto(photo) {
    if (!photo.mediaId) return Promise.resolve();
    return WALK.stateAction(t, "supersede_media", { media_id: photo.mediaId });
  }

  function send(photo) {
    photo.status = "uploading";
    render();
    WALK.photo(t, photo.dataUrl, photo.idx, {
      role: "setup_photo",
      panel_id: null,
      synthetic_name: photo.name
    }).then(function (value) {
      photo.mediaId = value && value.media_receipt_id || null;
      photo.status = "done";
      panelConfirmed = hasAuthoritativePanelPhoto(value, true);
      WALK.ph("walk_v2_photo_uploaded", { role: photo.role });
      render();
    }).catch(function () {
      photo.status = "failed";
      WALK.ph("walk_v2_photo_upload_failed", { role: photo.role });
      render();
    });
  }

  function addFile(selected) {
    if (!selected) return;
    if (selected.type && selected.type.indexOf("image/") !== 0) {
      hint.textContent = "That file is not a photo. Choose an image.";
      return;
    }
    if (selected.size > 40 * 1024 * 1024) {
      hint.textContent = "That photo is too large. Choose a smaller image.";
      return;
    }
    WALK.resizeImage(selected, 1600).then(function (dataUrl) {
      var photo = {
        localId: "photo-" + Date.now() + "-" + nextIndex,
        idx: nextIndex++,
        name: selected.name || "photo",
        role: "setup_photo",
        dataUrl: dataUrl,
        mediaId: null,
        status: "uploading"
      };
      photos.push(photo);
      send(photo);
    }).catch(function () {
      hint.textContent = "That photo would not open. Choose another image.";
    });
  }

  file.addEventListener("change", function () {
    var selected = Array.from(file.files || []);
    file.value = "";
    if (!selected.length) return;
    selected.forEach(function (item) { addFile(item); });
  });

  slots.addEventListener("click", function (event) {
    var retry = event.target.closest("[data-retry]");
    var remove = event.target.closest("[data-remove]");
    var previewButton = event.target.closest("[data-preview]");
    if (event.target.closest("[data-add-more]")) {
      file.multiple = true;
      file.click();
      return;
    }
    var id = (retry || remove || previewButton) && (retry || remove || previewButton).getAttribute(
      retry ? "data-retry" : remove ? "data-remove" : "data-preview"
    );
    var photo = photos.find(function (item) { return item.localId === id; });
    if (!photo) return;
    if (retry) {
      send(photo);
      return;
    }
    if (previewButton) {
      previewPhoto = photo;
      previewImage.src = photo.dataUrl;
      preview.showModal();
      return;
    }
    removeServerPhoto(photo).then(function (value) {
      photos = photos.filter(function (item) { return item !== photo; });
      panelConfirmed = hasAuthoritativePanelPhoto(value, photos.some(function (item) {
        return item.status === "done";
      }));
      render();
    }).catch(function () {
      hint.textContent = "That photo could not be removed. Try again.";
    });
  });

  previewClose.addEventListener("click", function () {
    preview.close();
  });

  previewReplace.addEventListener("click", function () {
    if (!previewPhoto || previewPhoto.status === "uploading") return;
    replacementFile.click();
  });

  replacementFile.addEventListener("change", function () {
    var selected = replacementFile.files && replacementFile.files[0];
    replacementFile.value = "";
    var photo = previewPhoto;
    if (!selected || !photo) return;
    if (selected.type && selected.type.indexOf("image/") !== 0) {
      hint.textContent = "That file is not a photo. Choose an image.";
      return;
    }
    if (selected.size > 40 * 1024 * 1024) {
      hint.textContent = "That photo is too large. Choose a smaller image.";
      return;
    }
    WALK.resizeImage(selected, 1600).then(function (dataUrl) {
      return removeServerPhoto(photo).then(function () {
        photo.idx = nextIndex++;
        photo.name = selected.name || "photo";
        photo.dataUrl = dataUrl;
        photo.mediaId = null;
        preview.close();
        send(photo);
      });
    }).catch(function () {
      hint.textContent = "That photo could not be replaced. Try again.";
    });
  });

  preview.addEventListener("close", function () {
    previewImage.removeAttribute("src");
    previewPhoto = null;
  });

  cta.addEventListener("click", function () {
    if (cta.disabled || sending) return;
    sending = true;
    WALK.view(t).then(function (latest) {
      var state = latest.quote_walk_v2 || {};
      if (Array.isArray(state.blockers) && state.blockers.length) WALK.go("incomplete.html", t);
      else WALK.go("range.html", t);
    }).catch(function () {
      sending = false;
      hint.textContent = "Your saved photos could not be checked. Try again.";
    });
  });

  later.addEventListener("click", function () {
    if (sending || hasUsefulPanelSet()) return;
    sending = true;
    WALK.confirm(t, { photos_pending: true }).then(function () {
      WALK.go("incomplete.html", t);
    }).catch(function () {
      sending = false;
      hint.textContent = "Your progress did not save. Try again.";
    });
  });

  var back = main.querySelector("[data-back]");
  if (back) back.addEventListener("click", function () {
    WALK.back("distance.html", t);
  });

  WALK.view(t).then(function (value) {
    var state = value.quote_walk_v2 || {};
    var sequentialEntry = new URLSearchParams(window.location.search).get("sequence") === "1";
    var connectionAnswered = (Array.isArray(state.observed_connections) && state.observed_connections.length)
      || value.connection_status === "pending_access";
    if (!sequentialEntry && (!connectionAnswered || !value.confirmed_panel_room || !state.distance_band)) {
      WALK.routeFromState(t, value);
      return;
    }
    photos = (Array.isArray(state.media) ? state.media : []).map(function (media, index) {
      return {
        localId: "saved-" + media.id,
        idx: index + 1,
        name: "Saved photo",
        role: media.role,
        dataUrl: media.preview_href || "",
        mediaId: media.id,
        status: "done"
      };
    });
    panelConfirmed = hasAuthoritativePanelPhoto(value, photos.length > 0);
    nextIndex = photos.length + 1;
    render();
  }).catch(function () {
    hint.textContent = "Your saved photos could not be loaded. Try again.";
    cta.disabled = true;
  });
})();
