(function () {
  const labels = {
    home: 'Inicio',
    data: 'Explorador de datos',
    audit: 'Auditoría',
    connections: 'Conexiones y bases',
    designer: 'Diseñador visual',
    services: 'APIs de servicio'
  };

  function ripple(event) {
    const button = event.currentTarget;
    if (button.disabled) return;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const dot = document.createElement('span');
    dot.className = 'ripple';
    dot.style.width = dot.style.height = `${size}px`;
    dot.style.left = `${event.clientX - rect.left - size / 2}px`;
    dot.style.top = `${event.clientY - rect.top - size / 2}px`;
    button.appendChild(dot);
    setTimeout(() => dot.remove(), 600);
  }

  function bindRipples(root = document) {
    root.querySelectorAll('.btn:not([data-ripple-bound]), .user-tab:not([data-ripple-bound]), .module-tab:not([data-ripple-bound])').forEach(button => {
      button.dataset.rippleBound = '1';
      button.addEventListener('pointerdown', ripple);
    });
  }

  function setTopbarState() {
    document.querySelector('.topbar')?.classList.toggle('scrolled', window.scrollY > 4);
  }

  function iconFor(name) {
    return ({home:'⌂',data:'▦',audit:'◎',connections:'⇄',designer:'◇',services:'↗'})[name] || '•';
  }

  window.syncModuleTabs = function syncModuleTabs() {
    const target = document.getElementById('module-tabs');
    if (!target) return;
    const activeView = document.querySelector('.nav-link[data-view].active')?.dataset.view || 'home';
    const navButtons = [...document.querySelectorAll('#main-nav .nav-link[data-view]')].filter(button => !button.classList.contains('hidden'));
    target.innerHTML = '';
    navButtons.forEach(button => {
      const name = button.dataset.view;
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = `module-tab ${name === activeView ? 'active' : ''}`;
      tab.dataset.moduleView = name;
      tab.innerHTML = `<span class="tab-dot"></span><span>${labels[name] || button.textContent.trim()}</span>`;
      tab.title = labels[name] || button.textContent.trim();
      tab.addEventListener('click', () => {
        if (typeof window.openView === 'function') window.openView(name);
        else button.click();
      });
      target.appendChild(tab);
    });
    bindRipples(target);
  };

  window.activateModuleTab = function activateModuleTab(name) {
    document.querySelectorAll('.module-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.moduleView === name));
    const title = document.getElementById('topbar-subtitle');
    if (title) title.textContent = labels[name] || 'Panel de trabajo';
  };

  function modalRoot() {
    return document.querySelector('.main') || document.body;
  }

  function closePanelModal(layer, value, resolve) {
    if (layer._panelKeyHandler) document.removeEventListener('keydown', layer._panelKeyHandler);
    layer.classList.add('closing');
    window.setTimeout(() => { layer.remove(); resolve(value); }, 150);
  }

  window.panelDialog = function panelDialog(options = {}) {
    const {
      title = 'Turimiquire DataGov',
      message = '',
      type = 'info',
      confirmText = 'Aceptar',
      cancelText = '',
      input = null,
      danger = false
    } = options;

    return new Promise(resolve => {
      const layer = document.createElement('div');
      layer.className = 'panel-modal-layer';
      layer.setAttribute('role', 'presentation');

      const modal = document.createElement('section');
      modal.className = `panel-modal panel-modal-${type}`;
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'panel-modal-title');

      const icon = ({success:'✓', error:'!', warning:'!', danger:'!', info:'i'})[type] || 'i';
      const field = input ? `<label class="panel-modal-field"><span>${input.label || 'Dato'}</span><input class="input panel-modal-input" type="${input.type || 'text'}" value="${String(input.value || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" placeholder="${String(input.placeholder || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" ${input.required === false ? '' : 'required'}></label>` : '';
      modal.innerHTML = `
        <div class="panel-modal-head">
          <div class="panel-modal-icon">${icon}</div>
          <div><span class="panel-modal-kicker">Ventana del sistema</span><h2 id="panel-modal-title"></h2></div>
        </div>
        <div class="panel-modal-body"><p></p>${field}</div>
        <div class="panel-modal-actions"></div>`;
      modal.querySelector('h2').textContent = title;
      modal.querySelector('.panel-modal-body p').textContent = message;
      const actions = modal.querySelector('.panel-modal-actions');
      const inputEl = modal.querySelector('.panel-modal-input');

      if (cancelText) {
        const cancel = document.createElement('button');
        cancel.type = 'button'; cancel.className = 'btn btn-ghost'; cancel.textContent = cancelText;
        cancel.addEventListener('click', () => closePanelModal(layer, input ? null : false, resolve));
        actions.appendChild(cancel);
      }

      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
      confirm.textContent = confirmText;
      confirm.addEventListener('click', () => {
        if (inputEl) {
          const value = inputEl.value.trim();
          if (input?.required !== false && !value) {
            inputEl.classList.add('input-invalid'); inputEl.focus(); return;
          }
          closePanelModal(layer, value, resolve);
        } else closePanelModal(layer, true, resolve);
      });
      actions.appendChild(confirm);

      layer.appendChild(modal);
      modalRoot().appendChild(layer);
      bindRipples(layer);

      const onKey = event => {
        if (event.key === 'Escape' && cancelText) {
          document.removeEventListener('keydown', onKey);
          closePanelModal(layer, input ? null : false, resolve);
        }
        if (event.key === 'Enter' && inputEl && document.activeElement === inputEl) confirm.click();
      };
      layer._panelKeyHandler = onKey;
      document.addEventListener('keydown', onKey, {once:false});
      layer.addEventListener('click', event => {
        if (event.target === layer && cancelText) {
          document.removeEventListener('keydown', onKey);
          closePanelModal(layer, input ? null : false, resolve);
        }
      });
      window.setTimeout(() => (inputEl || confirm).focus(), 30);
    });
  };

  window.panelAlert = function panelAlert(message, title = 'Información', type = 'info') {
    return window.panelDialog({title, message, type, confirmText:'Entendido'});
  };

  window.panelConfirm = function panelConfirm(message, title = 'Confirmar acción', options = {}) {
    return window.panelDialog({
      title, message, type: options.type || (options.danger ? 'danger' : 'warning'),
      confirmText: options.confirmText || 'Confirmar', cancelText: options.cancelText || 'Cancelar', danger: !!options.danger
    });
  };

  window.panelPrompt = function panelPrompt(message, title = 'Dato requerido', options = {}) {
    return window.panelDialog({
      title, message, type: options.type || 'info', confirmText: options.confirmText || 'Continuar', cancelText: options.cancelText || 'Cancelar',
      input: {label: options.label || 'Valor', placeholder: options.placeholder || '', value: options.value || '', type: options.inputType || 'text', required: options.required !== false}
    });
  };

  window.toast = function toast(message, type = 'success') {
    return window.panelAlert(message, type === 'error' ? 'Revisa esta acción' : 'Operación completada', type === 'error' ? 'error' : 'success');
  };

  window.addEventListener('scroll', setTopbarState, {passive:true});
  document.addEventListener('DOMContentLoaded', () => {
    setTopbarState();
    bindRipples();
    const observer = new MutationObserver(() => bindRipples());
    observer.observe(document.body, {subtree:true, childList:true});
  });
})();
