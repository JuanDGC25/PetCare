/* ==========================================================
   PetCare · Interacciones de la maquetación (Actividad 2)
   Simula la navegación y la retroalimentación de la interfaz.
   No contiene lógica de negocio ni guarda datos en un servidor.
   ========================================================== */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const page = location.pathname.split("/").pop() || "index.html";
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem("pc-" + k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem("pc-" + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
  };

  /* ---------- Mensajes emergentes (retroalimentación inmediata) ---------- */
  function toast(msg, icon = "check") {
    const region = $(".toast-region");
    if (!region || !msg) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<svg class="i" aria-hidden="true"><use href="#i-${icon}"/></svg><span></span>`;
    t.querySelector("span").textContent = msg;
    region.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-toast]");
    if (el) toast(el.dataset.toast);
    const soon = e.target.closest("[data-soon]");
    if (soon) { e.preventDefault(); toast("Esta sección se diseñará en la siguiente iteración.", "info"); }
  });

  /* ---------- Menú lateral en celular ---------- */
  const sidebar = $("#sidebar");
  $$("[data-menu]").forEach((b) => b.addEventListener("click", () => sidebar && sidebar.classList.toggle("open")));
  document.addEventListener("click", (e) => {
    if (sidebar && sidebar.classList.contains("open") && !e.target.closest("#sidebar") && !e.target.closest("[data-menu]")) sidebar.classList.remove("open");
  });

  /* ---------- Modales ---------- */
  let lastTrigger = null;
  const openStack = [];
  function openModal(id, trigger) {
    const m = document.getElementById(id);
    if (!m) return;
    if (trigger) lastTrigger = trigger;
    m.hidden = false;
    openStack.push({ m, trigger });
    document.body.classList.add("modal-open");
    const first = $("input:not([type=hidden]), select, textarea, button:not(.modal-close)", $(".modal-body", m)) || $(".modal-foot .btn", m);
    if (first) setTimeout(() => first.focus(), 30);
  }
  function closeModal(m) {
    if (!m) return;
    m.hidden = true;
    const i = openStack.findIndex((x) => x.m === m);
    const entry = i > -1 ? openStack.splice(i, 1)[0] : null;
    if (!openStack.length) document.body.classList.remove("modal-open");
    if (entry && entry.trigger && document.contains(entry.trigger)) entry.trigger.focus();
  }
  const closeAll = () => [...openStack].reverse().forEach((x) => closeModal(x.m));
  document.addEventListener("click", (e) => {
    const op = e.target.closest("[data-open]");
    if (op) { e.preventDefault(); openModal(op.dataset.open, op); return; }
    if (e.target.closest("[data-close-all]")) { closeAll(); return; }
    const cl = e.target.closest("[data-close]");
    if (cl) { closeModal(cl.closest(".modal-backdrop")); return; }
    if (e.target.classList && e.target.classList.contains("modal-backdrop")) closeModal(e.target);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (openStack.length) closeModal(openStack[openStack.length - 1].m);
    $$(".popover").forEach((p) => (p.hidden = true));
    const f = $("#filters"); if (f) f.classList.remove("open");
  });

  /* ---------- Notificaciones ---------- */
  $$("[data-popover]").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const p = document.getElementById(b.dataset.popover);
    p.hidden = !p.hidden;
    b.setAttribute("aria-expanded", String(!p.hidden));
  }));
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".popover")) $$(".popover").forEach((p) => (p.hidden = true));
  });

  /* ---------- Validación de formularios ---------- */
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  function valid(input) {
    const v = input.value.trim();
    let ok = v.length > 0;
    if (ok && input.type === "email") ok = emailOk(v);
    if (ok && input.dataset.min) ok = v.replace(/\D/g, "").length >= +input.dataset.min;
    if (ok && "pass" in input.dataset) ok = v.length >= 8 && /[a-zA-Z]/.test(v) && /\d/.test(v);
    if (ok && input.dataset.match) ok = v === $("#" + input.dataset.match).value.trim();
    return ok;
  }
  function mark(input, ok) {
    const f = input.closest(".field");
    if (f) f.classList.toggle("has-error", !ok);
    input.setAttribute("aria-invalid", String(!ok));
  }
  function validateForm(form) {
    let all = true, firstBad = null;
    $$("[required]", form).forEach((i) => { const ok = valid(i); mark(i, ok); if (!ok && !firstBad) firstBad = i; all = all && ok; });
    if (firstBad) firstBad.focus();
    return all;
  }
  $$("form [required]").forEach((i) => i.addEventListener("blur", () => { if (i.value) mark(i, valid(i)); }));

  /* ---------- Contraseña visible ---------- */
  $$(".toggle-pass").forEach((b) => b.addEventListener("click", () => {
    const input = b.parentElement.querySelector("input");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    b.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
    b.querySelector("use").setAttribute("href", show ? "#i-eye-off" : "#i-eye");
  }));

  /* ---------- Inicio de sesión ---------- */
  const login = $("#login-form");
  if (login) login.addEventListener("submit", (e) => {
    e.preventDefault();
    $("#login-alert").classList.remove("show");
    if (!validateForm(login)) return;
    const btn = $("button[type=submit]", login);
    btn.classList.add("is-loading"); btn.disabled = true;
    setTimeout(() => {
      if ($("#pass").value === "error123") {
        btn.classList.remove("is-loading"); btn.disabled = false;
        $("#login-alert").classList.add("show");
        return;
      }
      location.href = "panel.html";
    }, 900);
  });

  /* ---------- Registro ---------- */
  const reg = $("#reg-form");
  if (reg) {
    const fields = $$("input[required]", reg), terms = $("#terms"), btn = $("#reg-btn");
    const update = () => { btn.disabled = !(fields.every(valid) && terms.checked); };
    fields.forEach((f) => f.addEventListener("input", () => { if (f.closest(".field").classList.contains("has-error")) mark(f, valid(f)); update(); }));
    terms.addEventListener("change", update);
    reg.addEventListener("submit", (e) => {
      e.preventDefault();
      toast("¡Cuenta creada con éxito!");
      setTimeout(() => (location.href = "index.html"), 1500);
    });
  }

  /* ---------- Formularios de modales ---------- */
  $$(".modal form, form[data-success]").forEach((form) => form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateForm(form)) return;
    const action = form.dataset.action;
    if (action === "add-pet") addPet(form);
    if (action === "add-appt") addAppt(form);
    toast(form.dataset.success || (action === "add-pet" ? "Mascota registrada." : action === "add-appt" ? "Cita agendada y confirmada." : "Cambios guardados."));
    const m = form.closest(".modal-backdrop");
    if (m) { closeModal(m); form.reset(); $$(".has-error", form).forEach((x) => x.classList.remove("has-error")); }
  }));
  // Botones de envío asociados con form="…" fuera del <form>
  $$("button[type=submit][form]").forEach((b) => b.addEventListener("click", (e) => {
    const f = document.getElementById(b.getAttribute("form"));
    if (f && typeof f.requestSubmit !== "function") { e.preventDefault(); f.dispatchEvent(new Event("submit", { cancelable: true })); }
  }));

  const colors = ["av-y", "av-p", "av-g", "av-b", "av-r"];
  function addPet(form) {
    const n = $("[id$='-n']", form).value.trim(), sp = $("[id$='-e']", form).value, r = $("[id$='-r']", form).value.trim(), a = $("[id$='-a']", form).value.trim();
    const size = ($("[id$='-s']", form) || {}).value || "", w = (($("[id$='-w']", form) || {}).value || "—");
    const av = colors[Math.floor(Math.random() * colors.length)];
    const grid = $("#pets-grid");
    if (grid) {
      const card = document.createElement("article");
      card.className = "card pet-card";
      card.innerHTML = `<div class="top"><span class="avatar ${av}"></span><div><h3 style="font-size:20px"></h3><p class="muted" style="font-size:14px;font-weight:700"></p></div></div>
        <dl><div><dt>Edad</dt><dd>${a} años</dd></div><div><dt>Tamaño</dt><dd></dd></div><div><dt>Peso</dt><dd>${w === "—" ? "—" : w + " kg"}</dd></div><div><dt>Próxima vacuna</dt><dd>Por definir</dd></div></dl>
        <div class="row-2"><button class="btn btn-outline btn-sm" data-toast="Edición de mascota disponible en el formulario.">Editar</button><a class="btn btn-primary btn-sm" href="buscar.html">Reservar</a></div>`;
      $(".avatar", card).textContent = n[0].toUpperCase();
      $("h3", card).textContent = n;
      $("p", card).textContent = `${sp} · ${r}`;
      $$("dd", card)[1].textContent = size;
      grid.insertBefore(card, $(".add-card", grid));
    }
    const choices = $("#pet-choices");
    if (choices) {
      const l = document.createElement("label");
      l.className = "choice";
      l.innerHTML = `<input type="radio" name="pet" checked><span class="avatar ${av}"></span><span><strong></strong><small></small></span><span class="tick"><svg class="i i-sm"><use href="#i-check"/></svg></span>`;
      $("input", l).value = n; $(".avatar", l).textContent = n[0].toUpperCase(); $("strong", l).textContent = n; $("small", l).textContent = `${sp} · ${r} · ${size} · ${a} años`;
      choices.appendChild(l);
      $("input", l).dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  function addAppt(form) {
    const body = $("#agenda tbody");
    if (!body) return;
    const [pet, owner] = $("#na-pet").value.split(" · ");
    const tr = document.createElement("tr");
    const hour = $("#na-time").value;
    tr.dataset.turn = +hour.slice(0, 2) < 12 ? "manana" : "tarde";
    tr.innerHTML = `<td></td><td><div class="pet"><span class="avatar av-g"></span><div><strong></strong><small></small></div></div></td><td></td><td class="muted"></td><td><span class="badge b-ok">Confirmada</span></td><td class="go"><svg class="i i-sm"><use href="#i-chevron-right"/></svg></td>`;
    const td = $$("td", tr);
    td[0].textContent = hour; $(".avatar", tr).textContent = pet[0]; $("strong", tr).textContent = pet; $("small", tr).textContent = owner;
    td[2].textContent = $("#na-svc").value; td[3].textContent = $("#na-vet").value;
    tr.dataset.appt = JSON.stringify({ h: hour, n: pet, d: owner, s: $("#na-svc").value, v: $("#na-vet").value, e: "Confirmada" });
    tr.tabIndex = 0;
    const after = $$("tr", body).find((r) => $("td", r).textContent > hour);
    body.insertBefore(tr, after || null);
    bindAppt(tr);
  }

  /* ---------- Pestañas ---------- */
  $$("[data-tabs]").forEach((list) => {
    const tabs = $$("button.tab[aria-controls]", list);
    tabs.forEach((t) => t.addEventListener("click", () => {
      tabs.forEach((x) => { x.setAttribute("aria-selected", String(x === t)); const p = document.getElementById(x.getAttribute("aria-controls")); if (p) p.hidden = x !== t; });
    }));
  });

  /* ---------- Controles segmentados ---------- */
  $$(".segmented").forEach((g) => g.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $$("button", g).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    if (g.dataset.filter === "agenda") $$("#agenda tbody tr").forEach((tr) => { tr.hidden = b.dataset.v !== "todas" && tr.dataset.turn !== b.dataset.v; });
  }));

  /* ---------- Detalle de cita ---------- */
  function bindAppt(tr) {
    const open = () => {
      const d = JSON.parse(tr.dataset.appt);
      if (!$("#m-appt-detail")) return;
      $("#ad-av").textContent = d.n[0]; $("#ad-n").textContent = d.n; $("#ad-d").textContent = d.d;
      $("#ad-h").textContent = d.h; $("#ad-s").textContent = d.s; $("#ad-v").textContent = d.v; $("#ad-e").textContent = d.e;
      openModal("m-appt-detail", tr);
    };
    tr.addEventListener("click", open);
    tr.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  }
  $$("tr[data-appt]").forEach(bindAppt);

  /* ---------- Solicitudes de la clínica ---------- */
  function setPending(delta) {
    $$("[data-pending-count]").forEach((c) => {
      const n = Math.max(0, (+c.textContent || 0) + delta);
      c.textContent = n; c.hidden = n === 0;
    });
  }
  function resolveReq(card, accepted) {
    const st = $("[data-status]", card);
    st.className = "badge " + (accepted ? "b-ok" : "b-err");
    st.textContent = accepted ? "Aceptada" : "Rechazada";
    $("[data-actions]", card).remove();
    card.classList.add("is-done");
    setPending(-1);
    toast(accepted ? "Solicitud aceptada. El dueño ya ve el estado «Aceptada»." : "Solicitud rechazada. Se notificó al dueño.", accepted ? "check" : "circle-x");
    setTimeout(() => {
      card.remove();
      const left = $$("[data-req]").length;
      const empty = $("[data-req-empty]"); if (empty) empty.hidden = left > 0;
    }, 1600);
  }
  $$("[data-accept]").forEach((b) => b.addEventListener("click", () => resolveReq(b.closest("[data-req]"), true)));
  const rejectBtn = $("[data-reject-confirm]");
  if (rejectBtn) rejectBtn.addEventListener("click", () => {
    const card = lastTrigger && lastTrigger.closest("[data-req]");
    closeModal($("#m-reject"));
    if (card) resolveReq(card, false);
  });

  /* ---------- Cancelar reserva (dueño) ---------- */
  const cancelBtn = $("[data-cancel-confirm]");
  if (cancelBtn) cancelBtn.addEventListener("click", () => {
    const card = lastTrigger && lastTrigger.closest("[data-booking]");
    closeModal($("#m-cancel"));
    if (!card) return;
    const st = $("[data-status]", card);
    st.className = "badge b-cancel"; st.textContent = "Cancelada";
    $(".item-actions", card).innerHTML = "";
    $(".date-box", card).style.cssText = "background:var(--cream-100);color:var(--ink-700)";
    toast("Reserva cancelada. El proveedor fue notificado.", "circle-x");
  });

  /* ---------- Gestión de información ---------- */
  const pets = $("#pets");
  if (pets) {
    let group = "todas";
    const apply = () => {
      const q = $("#pet-search").value.trim().toLowerCase();
      let n = 0;
      $$("tbody tr", pets).forEach((tr) => { const show = (group === "todas" || tr.dataset.g === group) && tr.textContent.toLowerCase().includes(q); tr.hidden = !show; if (show) n++; });
      $("#pet-count").textContent = `Mostrando ${n} de 1.248 mascotas`;
    };
    $("#species-filter").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      group = b.dataset.g;
      $$("button", e.currentTarget).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      apply();
    });
    $("#pet-search").addEventListener("input", apply);
    const q0 = store.get("q");
    if (q0) { $("#pet-search").value = q0; store.set("q", ""); apply(); }
    const select = (tr) => {
      const d = JSON.parse(tr.dataset.pet);
      $$("tbody tr", pets).forEach((x) => x.classList.toggle("is-selected", x === tr));
      const av = $("#d-av"); av.textContent = d.n[0]; av.className = "avatar " + d.av;
      $("#d-name").textContent = d.n; $("#d-sub").textContent = `${d.hc} · ${d.e}`;
      $("#d-n").value = d.n; $("#d-r").value = d.r; $("#d-e").value = d.edad; $("#d-p").value = d.peso; $("#d-o").value = d.p; $("#d-obs").value = d.obs;
      if (window.innerWidth < 1280) $(".detail").scrollIntoView({ behavior: "smooth", block: "start" });
    };
    $$("tbody tr", pets).forEach((tr) => {
      tr.addEventListener("click", () => select(tr));
      tr.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(tr); } });
    });
    $("#pet-form-detail").addEventListener("submit", (e) => { e.preventDefault(); toast(`Cambios guardados en la historia clínica de ${$("#d-n").value}.`); });
  }

  /* ---------- Búsqueda en la barra superior ---------- */
  $$("form[data-search-go]").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("input", f).value.trim();
    const target = f.getAttribute("action");
    if (target === page && window.PCsearch) window.PCsearch(q);
    else { store.set("q", q); location.href = target; }
  }));

  /* ---------- Configuración: servicios y horario ---------- */
  $$("[data-toggle-svc]").forEach((b) => b.addEventListener("click", () => {
    const row = b.closest("[data-svc]"), st = $("[data-svc-status]", row);
    const active = st.textContent === "Activo";
    st.textContent = active ? "Pausado" : "Activo";
    st.className = "badge " + (active ? "b-warn" : "b-ok");
    $("span", b).textContent = active ? "Activar" : "Pausar";
    $("use", b).setAttribute("href", active ? "#i-play" : "#i-pause");
    toast(active ? "Servicio pausado: ya no aparece en la búsqueda." : "Servicio activado: ya aparece en la búsqueda.");
  }));
  document.addEventListener("click", (e) => {
    const op = e.target.closest("[data-open='m-svc']");
    if (!op || !$("#m-svc")) return;
    const title = $("#m-svc-t");
    if (op.dataset.editSvc) {
      const [n, p, t] = op.dataset.editSvc.split("|");
      title.textContent = "Editar servicio"; $("#s-n").value = n; $("#s-p").value = p; $("#s-t").value = t;
    } else { title.textContent = "Publicar servicio"; $("#svc-form").reset(); }
  });
  $$("[data-day]").forEach((c) => c.addEventListener("change", () => c.closest(".week-row").classList.toggle("off", !c.checked)));

  /* ---------- Buscar servicios (dueño) ---------- */
  const results = $("#results");
  if (results) {
    const CATS = { veterinaria: "Veterinaria", peluqueria: "Peluquería", paseo: "Paseo", guarderia: "Guardería" };
    const fmt = (n) => "$" + Number(n).toLocaleString("es-CO").replace(/,/g, ".");
    let text = store.get("q") || ""; store.set("q", "");
    const hash = location.hash.slice(1);
    if (CATS[hash]) $("#f-cat").value = hash;
    const state = () => ({
      cat: $("#f-cat").value,
      days: $$("input[name=day]:checked").map((i) => i.value),
      sp: $$("input[name=sp]:checked").map((i) => i.value),
      price: +$("#f-price").value,
      barrio: $("#f-barrio").value,
    });
    const DAY_N = { L: "Lunes", M: "Martes", X: "Miércoles", J: "Jueves", V: "Viernes", S: "Sábado", D: "Domingo" };
    const SP_N = { perro: "Perro", gato: "Gato", conejo: "Conejo", otro: "Otras especies" };
    function apply() {
      const s = state();
      let n = 0;
      $$("[data-prov]", results).forEach((c) => {
        const days = c.dataset.days.split(" "), sps = c.dataset.species.split(" ");
        const ok = (!s.cat || c.dataset.cat === s.cat) && s.days.every((d) => days.includes(d)) && s.sp.every((x) => sps.includes(x)) &&
          +c.dataset.price <= s.price && (!s.barrio || c.dataset.barrio === s.barrio) && (!text || c.textContent.toLowerCase().includes(text.toLowerCase()));
        c.hidden = !ok; if (ok) n++;
      });
      $("#result-count").textContent = n === 1 ? "1 resultado" : `${n} resultados`;
      $("#no-results").hidden = n > 0;
      $("#f-price-v").textContent = fmt(s.price);
      $("#search-title").textContent = s.cat ? CATS[s.cat] : "Buscar servicios";
      // Etiquetas de filtros activos
      const chips = [];
      if (s.cat) chips.push(["cat", CATS[s.cat]]);
      s.days.forEach((d) => chips.push(["day:" + d, DAY_N[d]]));
      s.sp.forEach((x) => chips.push(["sp:" + x, SP_N[x]]));
      if (s.price < 80000) chips.push(["price", "Hasta " + fmt(s.price)]);
      if (s.barrio) chips.push(["barrio", s.barrio]);
      if (text) chips.push(["text", `“${text}”`]);
      const box = $("#active-filters");
      box.innerHTML = "";
      chips.forEach(([k, label]) => {
        const c = document.createElement("span");
        c.className = "fchip";
        c.innerHTML = `<span></span><button aria-label="Quitar filtro"><svg class="i i-sm"><use href="#i-x"/></svg></button>`;
        $("span", c).textContent = label;
        $("button", c).addEventListener("click", () => removeFilter(k));
        box.appendChild(c);
      });
      if (chips.length) { const b = document.createElement("button"); b.className = "link-btn"; b.textContent = "Limpiar filtros"; b.addEventListener("click", clear); box.appendChild(b); }
    }
    function removeFilter(k) {
      if (k === "cat") $("#f-cat").value = "";
      else if (k === "price") $("#f-price").value = 80000;
      else if (k === "barrio") $("#f-barrio").value = "";
      else if (k === "text") text = "";
      else { const [t, v] = k.split(":"); const i = $(`input[name=${t}][value="${v}"]`); if (i) i.checked = false; }
      apply();
    }
    function clear() {
      $("#f-cat").value = ""; $("#f-barrio").value = ""; $("#f-price").value = 80000; text = "";
      $$("#filters input[type=checkbox]").forEach((i) => (i.checked = false));
      apply();
    }
    $$("#filters input, #filters select").forEach((i) => i.addEventListener("input", apply));
    $$("[data-clear-filters]").forEach((b) => b.addEventListener("click", clear));
    $$("[data-open-filters]").forEach((b) => b.addEventListener("click", () => $("#filters").classList.add("open")));
    $$("[data-close-filters]").forEach((b) => b.addEventListener("click", () => $("#filters").classList.remove("open")));
    window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (CATS[h]) { $("#f-cat").value = h; apply(); } });
    window.PCsearch = (q) => { text = q; apply(); };
    apply();
  }

  /* ---------- Días y horarios ---------- */
  $$("[data-week]").forEach((w) => w.addEventListener("click", (e) => {
    const b = e.target.closest(".wday"); if (!b || b.disabled) return;
    $$(".wday", w).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    updateSummary();
  }));
  $$("[data-slots]").forEach((g) => g.addEventListener("click", (e) => {
    const b = e.target.closest(".slot"); if (!b) return;
    $$(".slot", g).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    updateSummary();
  }));

  /* ---------- Asistente de reserva ---------- */
  const wizard = $("#wizard");
  function updateSummary() {
    if (!wizard) return;
    const [svc, price] = $("#svc-sel").value.split("|");
    const pet = ($("input[name=pet]:checked") || {}).value || "—";
    const day = $(".wday[aria-pressed=true]", wizard), slot = $(".slot[aria-pressed=true]", wizard);
    const set = (k, v) => $$(`[data-sum=${k}]`).forEach((d) => (d.textContent = v));
    set("svc", svc); set("pet", pet); set("price", "$" + Number(price).toLocaleString("es-CO").replace(/,/g, "."));
    set("day", day ? day.dataset.day : "—"); set("hour", slot ? slot.textContent : "Elige una hora");
    store.set("booking", { svc, pet, day: day ? day.dataset.day : "", hour: slot ? slot.textContent : "", price });
  }
  if (wizard) {
    const slug = location.hash.slice(1);
    const opt = $(`#svc-sel option[data-slug="${slug}"]`); if (opt) opt.selected = true;
    let step = 1;
    const steps = $$(".step", wizard), marks = $$(".stepper li", wizard);
    const next = $("[data-next]", wizard), prev = $("[data-prev]", wizard);
    const render = () => {
      steps.forEach((s) => (s.hidden = +s.dataset.step !== step));
      marks.forEach((m, i) => { m.className = i + 1 < step ? "done" : i + 1 === step ? "current" : ""; });
      prev.style.visibility = step === 1 ? "hidden" : "visible";
      next.innerHTML = step === 3 ? 'Confirmar solicitud<svg class="i i-sm"><use href="#i-check"/></svg>' : 'Continuar<svg class="i i-sm"><use href="#i-arrow-right"/></svg>';
      updateSummary();
    };
    next.addEventListener("click", () => {
      if (step === 1 && !$("input[name=pet]:checked")) { toast("Elige una mascota para continuar.", "info"); return; }
      if (step === 2 && !$(".slot[aria-pressed=true]", wizard)) { toast("Elige un horario disponible.", "info"); return; }
      if (step < 3) { step++; render(); wizard.scrollIntoView({ behavior: "smooth", block: "start" }); }
      else { next.classList.add("is-loading"); next.disabled = true; setTimeout(() => (location.href = "solicitud-enviada.html"), 700); }
    });
    prev.addEventListener("click", () => { if (step > 1) { step--; render(); } });
    wizard.addEventListener("change", updateSummary);
    $("#svc-sel").addEventListener("change", updateSummary);
    render();
  }

  /* ---------- Solicitud enviada ---------- */
  if (page === "solicitud-enviada.html") {
    const b = store.get("booking");
    if (b && b.svc) {
      const h2 = $(".done-wrap h2"); if (h2) h2.textContent = `${b.svc} · ${b.pet}`;
      const w = $("[data-sum=when]"); if (w) w.textContent = `${b.day} · ${b.hour}`;
      const t = $(".done-wrap .total dd"); if (t) t.textContent = "$" + Number(b.price).toLocaleString("es-CO").replace(/,/g, ".");
    }
  }
})();
