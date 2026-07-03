// Minimal hash router. Routes are registered as "#/path/:param" patterns.

const Router = {
  routes: [],
  register(pattern, renderFn) {
    const paramNames = [];
    const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, (m) => {
      paramNames.push(m.slice(1));
      return '([^/]+)';
    }) + '$');
    this.routes.push({ regex, paramNames, renderFn });
  },
  start(rootId) {
    this.rootId = rootId;
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  },
  navigate(path) {
    window.location.hash = path;
  },
  resolve() {
    const full = (window.location.hash || '#/dashboard').slice(1) || '/dashboard';
    const [path, queryStr] = full.split('?');
    const query = {};
    if (queryStr) {
      new URLSearchParams(queryStr).forEach((v, k) => { query[k] = v; });
    }
    const container = qs(this.rootId);
    for (const route of this.routes) {
      const match = path.match(route.regex);
      if (match) {
        const params = { ...query };
        route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });
        container.innerHTML = '';
        route.renderFn(container, params);
        this.updateNav(path);
        window.scrollTo(0, 0);
        return;
      }
    }
    container.innerHTML = '<p class="empty">Page not found.</p>';
  },
  updateNav(path) {
    document.querySelectorAll('.nav-item').forEach(item => {
      const target = item.getAttribute('data-path');
      item.classList.toggle('active', path === target || path.startsWith(target + '/'));
    });
  },
};
