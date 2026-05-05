/**
 * Rewrites root-absolute internal links for file:// viewing (local disk).
 * Deployed https:// hosts are unchanged (script exits early).
 */
(function () {
  if (window.location.protocol !== 'file:') return;

  var siteSegment = '/bahrain-saudi-gcc-transport/';

  function getCurrentDepth() {
    var path = window.location.pathname.replace(/\\/g, '/');
    var match = path.match(/bahrain-saudi-gcc-transport\/(.*)$/);
    if (!match || !match[1] || match[1].endsWith('index.html')) {
      var clean = match && match[1] ? match[1].replace(/index\.html$/, '') : '';
      return clean ? clean.split('/').filter(Boolean).length : 0;
    }
    return match[1].split('/').filter(Boolean).length;
  }

  function makeRelativeToRoot(tail) {
    var depth = getCurrentDepth();
    var prefix = depth === 0 ? './' : new Array(depth + 1).join('../');
    var hash = '';
    var pathOnly = tail || '';
    var hi = pathOnly.indexOf('#');
    if (hi >= 0) {
      hash = pathOnly.slice(hi);
      pathOnly = pathOnly.slice(0, hi);
    }
    pathOnly = pathOnly.replace(/^\/+|\/+$/g, '');
    if (!pathOnly) {
      return prefix + 'index.html' + hash;
    }
    return prefix + pathOnly + '/index.html' + hash;
  }

  function stripHost(href) {
    if (href.indexOf('https://getvendora.net') === 0) {
      try {
        return new URL(href).pathname + (new URL(href).hash || '');
      } catch (e) {
        return href;
      }
    }
    return href;
  }

  document.querySelectorAll('a[href]').forEach(function (anchor) {
    var rawHref = anchor.getAttribute('href');
    if (!rawHref || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('#')) return;
    if (/^https?:\/\//i.test(rawHref) && rawHref.indexOf('getvendora.net') === -1) return;

    var href = rawHref.indexOf('getvendora.net') !== -1 ? stripHost(rawHref) : rawHref;
    if (href.startsWith(siteSegment)) {
      var clean = href.slice(siteSegment.length).replace(/^\/+/, '');
      anchor.setAttribute('href', makeRelativeToRoot(clean));
      return;
    }
    if (href.startsWith('/') && href.indexOf(siteSegment) !== -1) {
      var rest = href.split(siteSegment)[1] || '';
      anchor.setAttribute('href', makeRelativeToRoot(rest));
    }
  });
})();
