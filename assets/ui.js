/* 原型交互引擎（PC / 移动 / 大屏共享）
   页面只输出静态标记，所有按钮在这里按 data-act → 类名 → 按钮文字 路由到真实可演示的行为：
   导航、确认弹窗（驳回填原因 / 核减填数量 / 签字手写板 / 发货填车牌司机）、行状态更新、抽屉表单、
   CSV 导出、打印模板、前端筛选、页签筛选、真实分页、表头排序、全选、文件上传、扫码遮层、语音、称重、铃铛下拉。 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var PHONE = $('.phone');
  var IS_M = !!PHONE;
  var HOST = PHONE || document.body;
  var TODAY = '2026-09-25';
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var nowHM = function () { var d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  var ROLE_USER = { buyer: '李慧珍', canteen: '张建国', keeper: '王守仓', staple: '赵中仓', supplier: '刘经理', leader: '陈明远', office: '周综合', finance: '刘会计', device: '周维修', hr: '孙人事', admin: '赵运维', common: '王守仓' };
  var ROLE = (location.pathname.match(/\/(?:pc|mobile)\/([a-z]+)\//) || [])[1] || '';
  var USER = (function () {
    var u = $('.uname') || $('.mprofile .who b');
    var t = u ? u.textContent.trim().replace(/^(上午好|下午好|晚上好)[，,]\s*/, '') : '';
    return t || ROLE_USER[ROLE] || '王守仓';
  })();
  var SUP = ['湘江粮油有限公司', '中鲜肉业', '绿康蔬果基地', '海鲜世家水产', '本味调味品配送', '湘雅供应链'];
  var CAN = ['本部 1 食堂', '本部 2 食堂', '铁道校区食堂', '湘雅新校区 1 食堂', '南校区食堂', '升华公寓食堂'];
  var STALL = ['大众档口', '川湘档口', '面点档口', '清真档口', '风味档口'];
  var PEOPLE = ['刘志强', '王秀兰', '李文博', '马建军', '何春梅', '吴验收', '郑监督'];
  var MAT = ['优质长粒香米', '一级菜籽油', '鲜猪后腿肉', '土鸡蛋', '本地小白菜', '新鲜土豆', '冷冻草鱼段', '冷冻虾仁', '一级生抽', '干香菇'];
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var txtOf = function (el) { return (el && el.textContent || '').replace(/\s+/g, ' ').trim(); };

  /* ================= Toast ================= */
  var tt;
  function toast(msg, kind) {
    if (tt) tt.remove();
    tt = document.createElement('div');
    tt.className = (IS_M ? 'mtoast' : 'toast') + ' ' + (kind || 'info');
    tt.textContent = msg;
    HOST.appendChild(tt);
    var el = tt;
    setTimeout(function () { if (el.parentNode) el.remove(); if (tt === el) tt = null; }, 2600);
  }
  window.toast = toast;

  /* ================= 弹窗 / 抽屉 / 底部弹层 ================= */
  var LAYERS = [];
  function dialog(o) {
    var okText = o.okText || '确定', cancelText = o.cancelText === undefined ? '取消' : o.cancelText;
    var wrap, body, footer, closeFn;
    if (IS_M) {
      wrap = document.createElement('div'); wrap.className = 'mmask';
      wrap.innerHTML = '<div class="msheet' + (o.danger ? ' danger' : '') + '"><div class="sh-h"><span>' + esc(o.title) + '</span><span class="x" data-no>✕</span></div>' +
        '<div class="sh-b">' + o.body + '</div>' +
        (o.noFoot ? '' : '<div class="sh-f">' + (cancelText ? '<a class="mbtn def" data-no>' + esc(cancelText) + '</a>' : '') + '<a class="mbtn pri" data-ok>' + esc(okText) + '</a></div>') + '</div>';
      HOST.appendChild(wrap);
      body = $('.sh-b', wrap);
    } else {
      wrap = document.createElement('div'); wrap.className = 'mask' + (o.drawer ? ' right' : '');
      wrap.innerHTML = '<div class="' + (o.drawer ? 'drawer' + (o.wide ? ' wide' : '') : 'modal' + (o.danger ? ' danger' : '')) + '"' + (o.wide && !o.drawer ? ' style="min-width:760px"' : '') + '><div class="mh"><span>' + esc(o.title) + '</span><span class="x" data-no>✕</span></div>' +
        '<div class="mb">' + o.body + '</div>' +
        (o.noFoot ? '' : '<div class="mf">' + (cancelText ? '<button class="btn b-def" data-no>' + esc(cancelText) + '</button>' : '') + '<button class="btn b-pri" data-ok>' + esc(okText) + '</button></div>') + '</div>';
      document.body.appendChild(wrap);
      body = $('.mb', wrap);
    }
    closeFn = function () { wrap.remove(); var i = LAYERS.indexOf(closeFn); if (i > -1) LAYERS.splice(i, 1); };
    LAYERS.push(closeFn);
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.closest('[data-no]')) { e.preventDefault(); closeFn(); return; }
      if (e.target.closest('[data-ok]')) {
        e.preventDefault();
        if (o.validate && !o.validate(body)) return;
        closeFn(); o.onOk && o.onOk(body);
      }
    });
    $$('.signpad, .sign', body).forEach(initSign);
    if (o.onOpen) o.onOpen(body);
    return { el: wrap, body: body, close: closeFn };
  }
  window.confirmBox = function (title, body, onOk, okText) { return dialog({ title: title, body: body, onOk: onOk, okText: okText }); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && LAYERS.length) LAYERS[LAYERS.length - 1](); });

  var fld = function (label, inner, full) { return '<div class="fld' + (full ? ' full' : '') + '"><label>' + esc(label) + '</label>' + inner + '</div>'; };
  var inp = function (name, val, ph) { return '<input class="inp" data-f="' + esc(name) + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '请输入') + '">'; };
  var area = function (name, val, ph) { return '<textarea class="inp" data-f="' + esc(name) + '" placeholder="' + esc(ph || '请输入') + '">' + esc(val || '') + '</textarea>'; };
  var sel = function (name, opts, cur) { return '<select class="inp" data-f="' + esc(name) + '">' + opts.map(function (o) { return '<option' + (o === cur ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>'; };
  var kvHtml = function (pairs) { return '<div class="mkv">' + pairs.map(function (p) { return '<div' + (String(p[1]).length > 22 ? ' class="full"' : '') + '><label>' + esc(p[0]) + '</label><span>' + esc(p[1]) + '</span></div>'; }).join('') + '</div>'; };
  var note = function (t) { return '<div class="mnote">' + t + '</div>'; };
  var signHtml = function (who) { return '<div class="fld"><label>' + esc(who || '手写签名') + '</label><div class="' + (IS_M ? 'sign' : 'signpad') + '" data-signreq="1"><div class="ph">在此处手写签名</div><canvas></canvas></div></div>'; };

  /* ================= 通用取值 ================= */
  function docNoIn(text) { var m = String(text || '').match(/\b[A-Z]{2,4}-\d{6,8}(?:-[A-Z0-9]{2,6})?\b/); return m ? m[0] : ''; }
  function pageTitle() { var h = $('.hero-t h1') || $('.mnav .tt') || $('h1'); var t = h ? txtOf(h).replace(/(待核定|待审核|已通过|单级审核|待签|草稿)\s*$/, '') : document.title.split('·')[0].trim(); return t.replace(/\s*[（(].*$/, '').trim(); }
  function rowOf(el) { return el.closest('tr, .doc, .rw, .tdi, .nli, .bi, .chkrow, .signbox'); }
  function tableOf(el) {
    var t = el.closest('table');
    if (t) return t;
    var box = el.closest('.panel, .sec, .blk, .work, .mbody, .card');
    while (box) { t = $('table.tbl', box); if (t) return t; box = box.parentElement && box.parentElement.closest('.panel, .sec, .work, .mbody'); }
    return $('table.tbl');
  }
  function headersOf(tbl) { return $$('thead th', tbl).map(function (th) { return th.classList.contains('ck') ? '' : txtOf(th).replace(/\s*[↑↓]$/, ''); }); }
  function rowPairs(tr) {
    var tbl = tr.closest('table'), hs = headersOf(tbl), out = [];
    $$('td', tr).forEach(function (td, i) { var h = hs[i]; if (!h || /操作/.test(h)) return; var v = txtOf(td); if (v) out.push([h, v]); });
    return out;
  }
  function itemPairs(item) {
    if (item.tagName === 'TR') return rowPairs(item);
    var out = [];
    var b = $('b', item), s = $('.c > span:not(.tag), .dh .c > span, .qt > span', item);
    if (b) out.push(['名称', txtOf(b)]);
    if (s && s !== b) out.push(['说明', txtOf(s)]);
    $$('.kvs span', item).forEach(function (k) { var i = $('i', k); if (i) out.push([txtOf(i), txtOf(k).replace(txtOf(i), '').trim()]); });
    var r = $('.r', item); if (r) out.push(['数值', txtOf(r)]);
    var tg = $('.tag', item); if (tg) out.push(['状态', txtOf(tg)]);
    return out;
  }
  function statusTag(row) {
    if (!row) return null;
    var tags = $$('.tag', row).filter(function (t) { return !t.closest('.acts'); });
    if (!tags.length) return null;
    var st = tags.filter(function (t) { return /^(待|已|审核中|在途|草稿|执行中|处理中|正常|异常|超时|合格|不合格|部分|通过|未通过|有效|过期|临期|维修中|会签中|生效|停用|启用|未|进行中|完成)/.test(txtOf(t)); });
    return (st[st.length - 1]) || tags[tags.length - 1];
  }
  function clsFor(status) {
    if (/驳回|不合格|不通过|未通过|否决|超时|异常|作废|失败|拒收|过期|黑名单|冻结|锁定/.test(status)) return 't-e';
    if (/^待|草稿|退回|临期|部分|整改|关注|催办/.test(status)) return 't-w';
    if (/已通过|已完成|合格|已确认|已签|已发布|已入库|已出库|已上架|已接单|已派单|已归档|已生效|已授权|正常|成功|有效|已付款|已上传|已启用|已解除|已受理|已派工|已办结|已结案|已核定|已评分|已同步|已推送|已导入|已保存|已处理|已回复/.test(status)) return 't-s';
    if (/停用|已撤回|已删除|已报损|已过期|已终止|已删/.test(status)) return 't-d';
    return 't-i';
  }
  function setStatus(row, status) {
    var tg = statusTag(row);
    if (!tg) {
      if (!row) return;
      var host = $('.dh, .c, td:nth-last-child(2)', row) || row;
      tg = document.createElement('span'); tg.className = 'tag sm'; host.appendChild(tg);
    }
    tg.textContent = status;
    tg.className = tg.className.replace(/\bt-[iwsedp]\b/g, '').trim() + ' ' + clsFor(status) + ' flash';
    setTimeout(function () { tg.classList.remove('flash'); }, 1000);
  }
  function setHeroStatus(status) {
    var h = $('.hero-t h1 .tag') || $('.mnav + * .tag');
    if (!h) {
      var h1 = $('.hero-t h1'); if (!h1) return;
      h = document.createElement('span'); h.className = 'tag'; h1.appendChild(h);
    }
    h.textContent = status; h.className = 'tag ' + clsFor(status) + ' flash';
  }
  function decCount(el) {
    var c = el && $('.n', el);
    if (c && /^\d+$/.test(txtOf(c)) && +txtOf(c) > 0) c.textContent = +txtOf(c) - 1;
  }
  function decPending() {
    decCount($('.tab.on'));
    var seg = $('.seg a.on'); if (seg && /\d+$/.test(txtOf(seg)) && +txtOf(seg).match(/\d+$/)[0] > 0) seg.textContent = txtOf(seg).replace(/\d+$/, function (n) { return n - 1; });
    var k = $$('.kpi').filter(function (x) { return /待/.test(txtOf($('.t', x))); })[0];
    if (k) { var v = $('.v', k); var n = parseInt(txtOf(v)); if (!isNaN(n) && n > 0) v.innerHTML = v.innerHTML.replace(String(n), n - 1); }
    var mk = $$('.mk').filter(function (x) { return /待/.test(txtOf($('b', x))); })[0];
    if (mk) { var mv = $('.v', mk); var mn = parseInt(txtOf(mv)); if (!isNaN(mn) && mn > 0) mv.textContent = mn - 1; }
    $$('.bstat').forEach(function (b) { if (/待办/.test(txtOf($('span', b)))) { var bb = $('b', b); var n = parseInt(txtOf(bb)); if (n > 0) bb.textContent = n - 1; } });
  }
  function setTotal(tbl, n) {
    var pg = tbl && tbl.closest('.panel, .sec') && $('.pager .ptotal', tbl.closest('.panel, .sec'));
    if (pg) pg.textContent = n;
    var cnt = tbl && tbl.closest('.sec') && $('.sh .cnt', tbl.closest('.sec'));
    if (cnt && /\d/.test(txtOf(cnt))) cnt.textContent = txtOf(cnt).replace(/\d+/, n);
  }
  function markDone(el, label) {
    if (!el) return;
    el.classList.add('done');
    if (label) { var ico = $('.ico', el); el.textContent = label; if (ico) el.insertBefore(ico, el.firstChild); }
    if (el.tagName === 'BUTTON') el.disabled = true;
  }
  function busy(el, label, ms, done) {
    var old = el.innerHTML; el.classList.add('busy'); el.innerHTML = (label || '处理中') + '…';
    setTimeout(function () { el.classList.remove('busy'); el.innerHTML = old; done && done(); }, ms || 800);
  }
  function nextOf(el) {
    var n = el.getAttribute('data-next'); if (n) return n;
    var p = el.closest('[data-next]'); if (p) return p.getAttribute('data-next');
    var h = el.getAttribute('href'); if (h && h !== '#' && !/^javascript:/.test(h)) return h;
    return '';
  }
  function go(url, delay) { window.__pendingNav = url; window.__navTimer = setTimeout(function () { location.href = url; }, delay == null ? 1200 : delay); }
  function addTimeline(title, desc) {
    var tl = $('.tl');
    if (tl) {
      var it = document.createElement('div'); it.className = 'tli now';
      it.innerHTML = '<div class="dot"></div><div class="body"><div class="hd">' + esc(title) + '<span class="tm">' + TODAY + ' ' + nowHM() + '</span></div><div class="ds">' + esc(desc) + '</div></div>';
      $$('.tli.now', tl).forEach(function (x) { x.classList.remove('now'); });
      tl.appendChild(it);
    }
    var mtl = $('.mtl');
    if (mtl) {
      var mi = document.createElement('div'); mi.className = 'mtli now';
      mi.innerHTML = '<div class="dot"></div><div class="c"><b>' + esc(title) + '</b><span>' + TODAY + ' ' + nowHM() + ' · ' + esc(desc) + '</span></div>';
      $$('.mtli.now', mtl).forEach(function (x) { x.classList.remove('now'); });
      mtl.appendChild(mi);
    }
  }
  function advanceSteps() {
    var on = $('.step.on');
    if (!on) return;
    on.classList.remove('on'); on.classList.add('done');
    var d = $('.dot', on); if (d) d.textContent = '✓';
    var nx = on.nextElementSibling; if (nx && nx.classList.contains('step')) nx.classList.add('on');
  }
  function contextNo(el) {
    var row = rowOf(el);
    return docNoIn(row ? txtOf(row) : '') || docNoIn(txtOf($('.hero-t h1'))) || docNoIn(txtOf($('.kv'))) || docNoIn(txtOf($('.kvl'))) || docNoIn(document.body.textContent.slice(0, 4000)) || '';
  }
  function highlight(row) { row.classList.add('row-new'); setTimeout(function () { row.classList.remove('row-new'); }, 2500); }

  /* ================= 模拟行派生（分页补数 / 展开全部 / 新增） ================= */
  function rot(list, s, k) { for (var i = 0; i < list.length; i++) if (s.indexOf(list[i]) > -1) return s.split(list[i]).join(list[(i + k) % list.length]); return s; }
  function mutateText(s, k) {
    s = s.replace(/\b([A-Z]{2,4}-\d{6,8}-)(\d{2,4})\b/g, function (m, a, n) { var v = +n - k; if (v < 1) v = +n + k; return a + String(v).padStart(n.length, '0'); });
    s = s.replace(/\b([A-Z]{2,5}-)(\d{2,4})\b(?![-\d])/g, function (m, a, n) { return a + String(+n + k).padStart(n.length, '0'); });
    s = s.replace(/(20\d\d)-(\d\d)-(\d\d)/g, function (m, y, mo, d) { var dt = new Date(+y, +mo - 1, +d - k); return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); });
    s = s.replace(/\b(\d{1,2}):(\d\d)\b/g, function (m, h, mi) { var t = (+h * 60 + +mi - k * 23 + 1440) % 1440; if (t < 300) t += 300; return pad(Math.floor(t / 60)) + ':' + pad(t % 60); });
    s = rot(SUP, s, k); s = rot(CAN, s, k); s = rot(STALL, s, k); s = rot(PEOPLE, s, k);
    return s;
  }
  function varyNum(s, k) {
    if (!/\d/.test(s) || /[A-Z]{2}-\d|\d{4}-\d\d|\d:\d\d/.test(s)) return s;
    var f = 1 + ((k * 37) % 23 - 11) / 100;
    return s.replace(/(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(%?)/g, function (m, i, d, p) {
      var raw = parseFloat(i.replace(/,/g, '') + (d || '')); if (!raw) return m;
      var v = raw * f; if (p) v = Math.min(v, 100);
      var dec = d ? d.length - 1 : 0; var str = v.toFixed(dec);
      if (i.indexOf(',') > -1) str = Number(str).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      return str + p;
    });
  }
  function mutateNode(node, k) {
    if (node.nodeType === 3) { node.nodeValue = mutateText(node.nodeValue, k); return; }
    if (node.nodeType !== 1) return;
    if (node.matches('.tag, .acts, .cbox, .lnk, a, select, input, img, svg')) { if (node.matches('a.lnk')) return; if (node.tagName === 'A' && node.getAttribute('href') === '#') return; }
    if (node.matches('.num, .tnum, .r b, em')) { node.textContent = varyNum(txtOf(node), k); return; }
    Array.prototype.slice.call(node.childNodes).forEach(function (c) { mutateNode(c, k); });
  }
  function cloneRow(src, k) {
    var r = src.cloneNode(true);
    r.classList.remove('sel', 'warnrow', 'row-new', 'hide');
    $$('.cbox', r).forEach(function (c) { c.classList.remove('on'); });
    mutateNode(r, k);
    return r;
  }

  /* ================= 复选框 / 单选 ================= */
  function updateSelCount(tbl) {
    var n = $$('tbody .cbox.on', tbl).length;
    var box = tbl.closest('.panel, .sec');
    $$('.ttool span', box || document).forEach(function (s) { if (/已选/.test(txtOf(s))) s.textContent = '已选 ' + n + ' 项'; });
    $$('.ttool .b-mini, .hero-a .gbtn, .pbar-a .pill', box ? box.closest('.work') || document : document).forEach(function (b) {
      if (/批量/.test(txtOf(b))) { var base = b.getAttribute('data-base') || txtOf(b).replace(/（\d+ 项）$/, ''); b.setAttribute('data-base', base); var ico = $('.ico', b); b.textContent = base + (n ? '（' + n + ' 项）' : ''); if (ico) b.insertBefore(ico, b.firstChild); }
    });
  }
  document.addEventListener('click', function (e) {
    var cb = e.target.closest('.cbox');
    if (!cb) return;
    e.preventDefault();
    var tbl = cb.closest('table');
    if (cb.closest('thead')) {
      var on = !cb.classList.contains('on');
      cb.classList.toggle('on', on);
      $$('tbody .cbox', tbl).forEach(function (c) { c.classList.toggle('on', on); });
      $$('tbody tr', tbl).forEach(function (r) { r.classList.toggle('sel', on); });
      toast(on ? '已全选本页 ' + $$('tbody tr:not(.hide)', tbl).length + ' 条' : '已取消全选');
    } else {
      cb.classList.toggle('on');
      var tr = cb.closest('tr'); if (tr) tr.classList.toggle('sel', cb.classList.contains('on'));
      if (tbl) { var all = $$('tbody .cbox', tbl), head = $('thead .cbox', tbl); if (head) head.classList.toggle('on', all.length && all.every(function (c) { return c.classList.contains('on'); })); }
    }
    if (tbl) updateSelCount(tbl);
    if (!tbl) { var tool = cb.closest('.ttool'); if (tool) { var t2 = tableOf(tool); if (t2) { var on2 = cb.classList.contains('on'); $$('tbody .cbox', t2).forEach(function (c) { c.classList.toggle('on', on2); }); $$('tbody tr', t2).forEach(function (r) { r.classList.toggle('sel', on2); }); updateSelCount(t2); } } }
  });
  document.addEventListener('click', function (e) {
    var r = e.target.closest('.radio');
    if (r) { e.preventDefault(); $$('.radio', r.parentNode).forEach(function (x) { x.classList.remove('on'); }); r.classList.add('on'); return; }
    var c = e.target.closest('.chk');
    if (c) { e.preventDefault(); c.classList.toggle('on'); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('input[type="checkbox"]')) { toast((t.checked ? '已开启' : '已关闭') + '「' + (txtOf(t.closest('label')) || t.getAttribute('aria-label') || '该选项') + '」', 'ok'); return; }
    if (t.matches('.filter select, .filter input')) { t.setAttribute('data-dirty', '1'); return; }
    if (t.matches('.mfi select, .fld select') && !t.closest('.mask, .mmask')) { var l = t.closest('.mfi, .fld'); var lab = l && $('label', l); if (lab) toast('「' + txtOf(lab).replace('*', '') + '」已选择：' + t.options[t.selectedIndex].text); }
  });

  /* ================= 页签 / 分段 / 胶囊：真实筛选 ================= */
  function listItems(box) {
    var tbl = $('table.tbl', box); if (tbl) return { kind: 'table', items: $$('tbody tr', tbl).filter(function (r) { return !$('.empty', r); }), tbl: tbl, host: $('tbody', tbl) };
    var docs = $('.docs', box); if (docs) return { kind: 'list', items: $$('.doc', docs), host: docs };
    var rows = $('.rows', box); if (rows) return { kind: 'list', items: $$('.rw', rows), host: rows };
    var td = $('.tdlist', box); if (td) return { kind: 'list', items: $$('.tdi', td), host: td };
    var nl = $('.nlist', box); if (nl) return { kind: 'list', items: $$('.nli', nl), host: nl };
    return null;
  }
  function scopeOf(t) {
    var bar = t.closest('.tabs, .seg, .pills, .segs');
    var box = bar.closest('.panel, .blk, .sec');
    // 页签容器自身不含表格时，向后找同级/上级的列表
    var cur = box || bar, found = null, guard = 0;
    while (cur && !found && guard++ < 8) {
      if (cur !== bar && listItems(cur) && (cur.contains(bar) ? true : true)) { var li = listItems(cur); if (li && li.items.length) found = cur; }
      if (!found) { var sib = cur.nextElementSibling; while (sib && !found) { var li2 = listItems(sib); if (li2 && li2.items.length) found = sib; sib = sib.nextElementSibling; } }
      cur = cur.parentElement;
    }
    return found || $('.work') || $('.mbody');
  }
  function stashOrig(li) {
    if (!li.host.__orig) li.host.__orig = li.items.slice();
    return li.host.__orig;
  }
  function filterBy(li, label, wanted) {
    var orig = stashOrig(li);
    // 恢复原始行
    $$('.mock', li.host).forEach(function (m) { m.remove(); });
    orig.forEach(function (r) { r.classList.remove('hide'); });
    var isAll = /^全部|^所有|^全部状态|^全部类型|^全部供应商/.test(label) || label === '';
    if (isAll) { setTotal(li.tbl, orig.length); return orig.length; }
    var hit = orig.filter(function (r) {
      var tags = $$('.tag', r).map(txtOf);
      return tags.some(function (t) { return t === label || t.indexOf(label) > -1 || (label.length >= 2 && label.indexOf(t) > -1 && t.length >= 2); }) || (txtOf(r).indexOf(label) > -1 && label.length >= 2);
    });
    if (hit.length) { orig.forEach(function (r) { if (hit.indexOf(r) < 0) r.classList.add('hide'); }); setTotal(li.tbl, hit.length); return hit.length; }
    // 没有对应状态的行：基于已有行派生若干条并打上该状态标签
    var n = Math.max(2, Math.min(wanted || 3, 5));
    orig.forEach(function (r) { r.classList.add('hide'); });
    for (var i = 0; i < n; i++) {
      var src = orig[i % orig.length]; if (!src) break;
      var c = cloneRow(src, i + 1); c.classList.add('mock');
      var tg = statusTag(c); if (tg) { tg.textContent = label; tg.className = tg.className.replace(/\bt-[iwsedp]\b/g, '').trim() + ' ' + clsFor(label); }
      $$('.acts .lnk', c).forEach(function (a, j) { if (j > 0 && /核定|审核|处理|签收|受理|派工/.test(txtOf(a))) a.textContent = '详情'; });
      li.host.appendChild(c);
    }
    setTotal(li.tbl, n);
    return n;
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.tab, .seg a, .pills a, .segs .seg, .lg-tabs a');
    if (!t) return;
    var box = t.closest('.tabs, .seg, .pills, .segs, .lg-tabs');
    if (!box) return;
    e.preventDefault();
    $$('.tab, a, .seg', box).forEach(function (x) { if (x.parentNode === box) x.classList.remove('on'); });
    t.classList.add('on');
    var raw = txtOf(t), name = raw.replace(/\s*\d+$/, '').trim(), cnt = parseInt((raw.match(/(\d+)$/) || [])[1]);
    if (box.classList.contains('lg-tabs')) {
      var sso = $('.lg-sso'), or = $('.lg-or');
      var internal = $('#lg-internal'), sup = $('#lg-supplier');
      if (internal && sup) {
        internal.classList.toggle('hide', /供应商/.test(name));
        sup.classList.toggle('hide', !/供应商/.test(name));
      }
      if (sso) sso.style.display = /统一身份/.test(name) ? '' : 'none';
      if (or) or.style.display = /统一身份/.test(name) ? '' : 'none';
      toast('已切换到「' + name + '」登录方式');
      return;
    }
    var scope = scopeOf(t), li = scope && listItems(scope);
    if (li && li.items.length) {
      var n = filterBy(li, name, cnt);
      toast('已切换到「' + name + '」，显示 ' + n + ' 条');
    } else {
      // 非列表内容：切换同级内容块（data-panel）或提示
      var panes = $$('[data-pane]', scope || document);
      if (panes.length) { panes.forEach(function (p) { p.classList.toggle('hide', p.getAttribute('data-pane') !== name); }); }
      toast('已切换到「' + name + '」');
    }
  });

  /* ================= 分页：真实翻页，数据不足时派生补齐 ================= */
  function pagerData(pager) {
    var box = pager.closest('.panel, .sec') || document;
    var tbl = $('table.tbl', box); if (!tbl) return null;
    var tb = $('tbody', tbl);
    if (!tb.__pages) {
      var per = +pager.getAttribute('data-per') || 10;
      var total = +pager.getAttribute('data-total') || 0;
      var base = $$('tr', tb).filter(function (r) { return !$('.empty', r); });
      var pages = Math.max(2, Math.min(Math.ceil(total / per) || 3, 3));
      var need = Math.min(Math.max(total, base.length), pages * per);
      var all = base.slice(), k = 1;
      while (all.length < need && base.length) { all.push(cloneRow(base[(all.length - base.length) % base.length], k++)); }
      tb.__pages = { per: per, all: all, base: base, cur: 1, pages: Math.ceil(all.length / per) };
    }
    return { tbl: tbl, tb: tb, st: tb.__pages };
  }
  function showPage(pager, n) {
    var d = pagerData(pager); if (!d) return;
    var st = d.st; n = Math.min(Math.max(1, n), st.pages); st.cur = n;
    d.tb.innerHTML = '';
    st.all.slice((n - 1) * st.per, n * st.per).forEach(function (r) { d.tb.appendChild(r); });
    var nums = $$('.pg', pager).filter(function (x) { return /^\d+$/.test(txtOf(x)); });
    nums.forEach(function (x, i) { x.classList.toggle('on', i + 1 === n); x.classList.toggle('hide', i + 1 > st.pages); });
    var head = $('thead .cbox', d.tbl); if (head) head.classList.remove('on');
    updateSelCount(d.tbl);
    toast('第 ' + n + ' 页 · 共 ' + st.pages + ' 页');
  }
  document.addEventListener('click', function (e) {
    var p = e.target.closest('.pg');
    if (!p) return;
    e.preventDefault();
    var pager = p.closest('.pager'), d = pagerData(pager);
    var cur = d ? d.st.cur : 1;
    if (/^\d+$/.test(txtOf(p))) showPage(pager, +txtOf(p));
    else showPage(pager, cur + (p.classList.contains('prev') || p === p.parentNode.firstElementChild ? -1 : 1));
  });

  /* ================= 表头排序 ================= */
  document.addEventListener('click', function (e) {
    var th = e.target.closest('th.sortable');
    if (!th || e.target.closest('.cbox')) return;
    var tbl = th.closest('table'), tb = $('tbody', tbl);
    var idx = Array.prototype.indexOf.call(th.parentNode.children, th);
    var asc = !th.classList.contains('sort-asc');
    $$('th', th.parentNode).forEach(function (x) { x.classList.remove('sort-asc', 'sort-desc'); });
    th.classList.add(asc ? 'sort-asc' : 'sort-desc');
    var rows = $$('tr', tb).filter(function (r) { return !$('.empty', r); });
    var val = function (r) { var td = r.children[idx]; var s = td ? txtOf(td) : ''; var n = parseFloat(s.replace(/[¥,%\s万元]/g, '').replace('−', '-')); return isNaN(n) || !/^[-−¥]?[\d,.]+/.test(s) ? s : n; };
    rows.sort(function (a, b) { var x = val(a), y = val(b); if (typeof x === 'number' && typeof y === 'number') return asc ? x - y : y - x; return asc ? String(x).localeCompare(String(y), 'zh') : String(y).localeCompare(String(x), 'zh'); });
    rows.forEach(function (r) { tb.appendChild(r); });
    toast('已按「' + txtOf(th).replace(/\s*[↑↓]$/, '') + '」' + (asc ? '升序' : '降序') + '排列');
  });

  /* ================= 筛选查询 / 重置 / 顶部全局搜索 ================= */
  function applyFilter(scopeEl, words, opts) {
    var tbl = $('table.tbl', scopeEl) || $('table.tbl');
    var li = tbl ? { kind: 'table', items: $$('tbody tr', tbl).filter(function (r) { return !$('.empty', r); }), tbl: tbl, host: $('tbody', tbl) } : listItems(scopeEl) || listItems($('.mbody') || document.body);
    if (!li || !li.items.length) return -1;
    var orig = stashOrig(li);
    $$('.mock', li.host).forEach(function (m) { m.remove(); });
    var hit = 0;
    orig.forEach(function (r) {
      var t = txtOf(r).toLowerCase();
      var ok = words.every(function (w) { return t.indexOf(w.toLowerCase()) > -1; }) && (opts || []).every(function (o) { return t.indexOf(o) > -1; });
      r.classList.toggle('hide', !ok); if (ok) hit++;
    });
    if (!hit) {
      var er = document.createElement(li.kind === 'table' ? 'tr' : 'div'); er.className = 'mock';
      er.innerHTML = li.kind === 'table' ? '<td colspan="30"><div class="empty">未找到符合「' + esc(words.concat(opts || []).join(' ')) + '」的记录，请调整筛选条件</div></td>' : '<div class="empty">未找到符合条件的记录</div>';
      li.host.appendChild(er);
    }
    setTotal(li.tbl, hit);
    return hit;
  }
  function filterScope(btn) { var f = btn.closest('.filter'); var s = f ? f.nextElementSibling : null; while (s && !$('table.tbl', s)) s = s.nextElementSibling; return s || $('.work') || document.body; }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.b-search');
    if (b) {
      e.preventDefault();
      var f = b.closest('.filter');
      var words = $$('input.inp', f).filter(function (i) { return i.type !== 'date' && i.value.trim(); }).map(function (i) { return i.value.trim(); });
      var opts = $$('select.inp[data-dirty]', f).map(function (s) { return s.options[s.selectedIndex].text; }).filter(function (t) { return !/^全部|^请选择/.test(t); });
      var n = applyFilter(filterScope(b), words, opts);
      toast(n < 0 ? '已按条件查询' : (words.length || opts.length ? '查询完成，匹配 ' + n + ' 条记录' : '已按当前条件查询，共 ' + n + ' 条'), 'ok');
      return;
    }
    var r = e.target.closest('.b-reset');
    if (r) {
      e.preventDefault();
      var ff = r.closest('.filter');
      $$('input.inp', ff).forEach(function (i) { if (i.type !== 'date') i.value = ''; });
      $$('select.inp', ff).forEach(function (s) { s.selectedIndex = 0; s.removeAttribute('data-dirty'); });
      applyFilter(filterScope(r), [], []);
      toast('筛选条件已重置');
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var i = e.target;
    if (i.matches('.filter input.inp')) { var sb = $('.b-search', i.closest('.filter')); if (sb) sb.click(); return; }
    if (i.matches('.ttool .mini')) { e.preventDefault(); var n = applyFilter(i.closest('.panel, .sec') || document.body, i.value.trim() ? [i.value.trim()] : [], []); toast('匹配 ' + n + ' 条记录', 'ok'); return; }
    if (i.matches('.tb-search input')) {
      e.preventDefault();
      var q = i.value.trim(); if (!q) { toast('请输入物资 / 单据号 / 供应商关键词', 'warn'); return; }
      var target = i.closest('.tb-search').getAttribute('data-search');
      var here = location.pathname.split('/').pop();
      if (!target || target === here) { var n2 = applyFilter($('.work') || document.body, [q], []); toast(n2 < 0 ? '已搜索「' + q + '」' : '「' + q + '」匹配 ' + n2 + ' 条', 'ok'); return; }
      toast('正在搜索「' + q + '」…');
      go(target + '?q=' + encodeURIComponent(q), 400);
    }
  });
  function applyQuery() {
    var m = location.search.match(/[?&]q=([^&]+)/); if (!m) return;
    var q = decodeURIComponent(m[1]);
    var ti = $('.tb-search input'); if (ti) ti.value = q;
    var fi = $$('.filter input.inp').filter(function (i) { return i.type !== 'date'; })[0]; if (fi) fi.value = q;
    var n = applyFilter($('.work') || document.body, [q], []);
    setTimeout(function () { toast(n < 0 ? '已搜索「' + q + '」' : '已按「' + q + '」筛选，匹配 ' + n + ' 条', 'ok'); }, 200);
  }

  /* ================= 左侧树（多级展开收起） ================= */
  function syncTree(tree) {
    if (!tree) return;
    var items = $$('.ti', tree);
    var openAt = {};
    items.forEach(function (ti) {
      var lv = +(ti.getAttribute('data-lv') || 1);
      var vis = true;
      for (var i = 1; i < lv; i++) if (!openAt[i]) { vis = false; break; }
      ti.classList.toggle('hide', !vis);
      openAt[lv] = vis && ti.classList.contains('has-kids') && ti.classList.contains('open');
      for (var j = lv + 1; j <= 8; j++) openAt[j] = false;
    });
  }
  function initTrees() { $$('.tree').forEach(syncTree); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initTrees);
  else initTrees();

  function catMetaMap() {
    var el = $('#cat-nodes-data');
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }
  function setKvByLabel(root, label, val) {
    if (!root) return;
    $$('.kvi', root).forEach(function (kv) {
      if (txtOf($('label', kv)).replace(/\s/g, '') === String(label).replace(/\s/g, '')) $('span', kv).textContent = val;
    });
  }
  function updateCatPanel(name) {
    var host = $('#cat-attr-panel');
    var meta = catMetaMap();
    if (!host || !meta || !meta[name]) return;
    var n = meta[name];
    var sec = host.closest('.sec');
    var h3 = sec && $('.sh h3', sec);
    if (h3) {
      if (!h3.getAttribute('data-base')) h3.setAttribute('data-base', '类目属性');
      h3.textContent = h3.getAttribute('data-base') + ' · ' + name;
    }
    host.setAttribute('data-cat', name);
    var panel = $('.panel', host) || host;
    setKvByLabel(panel, '类目名称', name);
    setKvByLabel(panel, '上级类目', n.parent || '（顶级）');
    setKvByLabel(panel, '层级', n.level === 1 ? '一级类目' : '二级类目');
    setKvByLabel(panel, '下级类目数', n.level === 1 ? n.kids + ' 个' : '0 个');
    setKvByLabel(panel, '关联物资数', n.level === 1 ? String(128 + (n.kids * 11) % 420) + ' 条' : String(12 + (name.length * 3) % 48) + ' 条');
    setKvByLabel(panel, '采购分包', n.l1 + '包');
    setKvByLabel(panel, '报表归集', n.l1);
    var tbl = $('table.tbl', panel);
    if (!tbl) return;
    var tb = $('tbody', tbl);
    if (!tb) return;
    var kids = n.childNames || [];
    if (!kids.length) {
      tb.innerHTML = '<tr class="empty"><td colspan="8">当前为二级类目，无下级节点</td></tr>';
      setTotal(tbl, 0);
      return;
    }
    tb.innerHTML = kids.map(function (cn, i) {
      return '<tr><td>' + cn + '</td><td>二级</td><td><span class="num">' + (12 + (i * 7) % 48) + '</span></td><td>365 天</td><td>免检</td><td>¥' + ((28 + i * 13) * 1000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</td><td><span class="tag t-s">启用</span></td><td><a class="lnk" href="#">编辑</a></td></tr>';
    }).join('');
    setTotal(tbl, kids.length);
  }

  document.addEventListener('click', function (e) {
    var ti = e.target.closest('.tree .ti');
    if (!ti) return;
    e.preventDefault();
    var tree = ti.closest('.tree');
    var name = txtOf($('.tn', ti) || ti);
    if (ti.classList.contains('has-kids') && (e.target.closest('.tcaret') || e.detail >= 2)) {
      ti.classList.toggle('open');
      syncTree(tree);
      toast((ti.classList.contains('open') ? '已展开' : '已收起') + '「' + name + '」');
      return;
    }
    $$('.ti', tree).forEach(function (x) { x.classList.remove('on'); });
    ti.classList.add('on');
    if ($('#cat-attr-panel')) {
      updateCatPanel(name);
      toast('已选择「' + name + '」');
      return;
    }
    var split = ti.closest('.split, .cols') || $('.work');
    var tbl = split && $('table.tbl', split);
    if (tbl) {
      var li = { kind: 'table', items: $$('tbody tr', tbl), tbl: tbl, host: $('tbody', tbl) }, orig = stashOrig(li);
      $$('.mock', li.host).forEach(function (m) { m.remove(); });
      var hit = orig.filter(function (r) { return txtOf(r).indexOf(name.replace(/[（(].*$/, '')) > -1; });
      orig.forEach(function (r) { r.classList.toggle('hide', hit.length ? hit.indexOf(r) < 0 : false); });
      var h3 = $('.sh h3', tbl.closest('.sec') || split); if (h3) { h3.setAttribute('data-base', h3.getAttribute('data-base') || txtOf(h3)); h3.textContent = h3.getAttribute('data-base') + ' · ' + name; }
      setTotal(tbl, hit.length || orig.length);
      toast('已定位到「' + name + '」' + (hit.length ? '，' + hit.length + ' 条' : ''));
    } else toast('已选择「' + name + '」');
  });

  /* ================= CSV 导出 / 打印模板 ================= */
  function collectRows(el) {
    var tbl = tableOf(el);
    if (tbl) {
      var hs = headersOf(tbl).filter(Boolean).filter(function (h) { return !/操作/.test(h); });
      var rows = $$('tbody tr', tbl).filter(function (r) { return !r.classList.contains('hide') && !$('.empty', r); }).map(function (r) {
        return $$('td', r).filter(function (td) { return !td.classList.contains('ck'); }).map(txtOf).slice(0, hs.length);
      });
      return { name: txtOf($('h3', tbl.closest('.sec') || document) || $('.hero-t h1')) || pageTitle(), head: hs, rows: rows };
    }
    var docs = $$('.doc'); if (docs.length) return { name: pageTitle(), head: ['单号', '说明', '状态', '明细'], rows: docs.map(function (d) { return [txtOf($('.dh b', d)), txtOf($('.dh .c span', d)), txtOf($('.tag', d)), $$('.kvs span', d).map(txtOf).join('；')]; }) };
    var rws = $$('.rw'); if (rws.length) return { name: pageTitle(), head: ['名称', '说明', '数值', '状态'], rows: rws.map(function (r) { return [txtOf($('.c b', r)), txtOf($('.c span', r)), txtOf($('.r', r)), txtOf($('.tag', r))]; }) };
    var kv = $$('.kvi, .kvl .it'); if (kv.length) return { name: pageTitle(), head: ['字段', '值'], rows: kv.map(function (k) { return [txtOf($('label', k)), txtOf($('span', k))]; }) };
    var kp = $$('.kpi, .mk'); if (kp.length) return { name: pageTitle(), head: ['指标', '数值', '说明'], rows: kp.map(function (k) { return [txtOf($('.t, b', k)), txtOf($('.v', k)), txtOf($('.d, .s', k))]; }) };
    return null;
  }
  function exportCSV(el) {
    var d = collectRows(el);
    if (!d || !d.rows.length) { toast('当前页面没有可导出的数据', 'warn'); return false; }
    var q = function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; };
    var csv = '\uFEFF' + [d.head.map(q).join(',')].concat(d.rows.map(function (r) { return r.map(q).join(','); })).join('\r\n');
    var name = (d.name || '导出').replace(/[\\/:*?"<>|]/g, '_') + '_' + TODAY.replace(/-/g, '') + '.csv';
    try {
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    } catch (err) { /* file:// 下个别浏览器限制 */ }
    toast('已导出「' + name + '」，共 ' + d.rows.length + ' 行', 'ok');
    return true;
  }
  var PRINT_MAP = [
    [/溯源|打码|批次标签/, 'print-trace-label'], [/库位/, 'print-location-label'], [/设备二维码|设备标签/, 'print-equip-label'],
    [/公示牌|公示/, 'print-publicity-board'], [/工资/, 'print-payroll'], [/维修|报修|工单/, 'print-repair'],
    [/考评/, 'print-appraise'], [/准入|评审/, 'print-access-review'], [/新品/, 'print-newitem'], [/盘点/, 'print-stocktake'],
    [/结算/, 'print-settle'], [/对账/, 'print-reconcile'], [/退货/, 'print-return'], [/调入/, 'print-transfer-in'], [/调拨|调出/, 'print-transfer'],
    [/出库|领用|配货/, 'print-outbound'], [/入库|上架/, 'print-inbound'], [/验收/, 'print-acceptance'], [/送货|发货|在途/, 'print-delivery'],
    [/订单|派单|拆单/, 'print-order'], [/计划|补单/, 'print-plan'],
  ];
  function commonDir() {
    var p = location.pathname;
    if (/\/pc\/common\//.test(p)) return '';
    if (/\/pc\//.test(p)) return '../common/';
    if (/\/mobile\//.test(p)) return '../../pc/common/';
    if (/\/screen\//.test(p)) return '../pc/common/';
    return 'pc/common/';
  }
  function printFor(el) {
    var row = rowOf(el);
    var ctx = (row ? txtOf(row) + ' ' : '') + pageTitle() + ' ' + document.title;
    for (var i = 0; i < PRINT_MAP.length; i++) if (PRINT_MAP[i][0].test(ctx)) { toast('正在打开打印模板…'); go(commonDir() + PRINT_MAP[i][1] + '.html', 300); return; }
    toast('已调起打印预览', 'ok'); setTimeout(function () { try { window.print(); } catch (e) { } }, 300);
  }

  /* ================= 文件上传 / 拍照 ================= */
  var fileInput;
  function mockPhoto(label) {
    var c = document.createElement('canvas'); c.width = 320; c.height = 240;
    var g = c.getContext('2d'), lg = g.createLinearGradient(0, 0, 320, 240);
    lg.addColorStop(0, '#4C95F7'); lg.addColorStop(1, '#0B2545'); g.fillStyle = lg; g.fillRect(0, 0, 320, 240);
    g.fillStyle = 'rgba(255,255,255,.14)'; for (var i = 0; i < 6; i++) { g.beginPath(); g.arc(40 + i * 52, 150 + (i % 2) * 30, 34, 0, 6.3); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 196, 320, 44);
    g.fillStyle = '#fff'; g.font = '14px sans-serif'; g.fillText(label || '现场照片', 12, 214); g.font = '12px sans-serif'; g.fillText(TODAY + ' ' + nowHM() + ' · 本部 2 食堂 · ' + USER, 12, 232);
    return c.toDataURL('image/png');
  }
  function addPhoto(addEl, src, label) {
    var p = document.createElement('div'); p.className = 'photo shot';
    p.innerHTML = '<img src="' + src + '" alt="">';
    p.title = label || '';
    addEl.parentNode.insertBefore(p, addEl);
    return p;
  }
  function attachFiles(target, files) {
    var names = Array.prototype.map.call(files, function (f) { return f.name; });
    var row = rowOf(target);
    if (target.matches('.upload') || target.closest('.upload')) {
      var up = target.closest('.upload'); up.classList.add('has');
      var sp = $('span', up); if (sp) sp.textContent = '已上传 ' + names.length + ' 个文件：' + names.join('、');
    } else if (target.matches('.photo.add') || target.closest('.photos')) {
      var add = target.closest('.photos') && $('.photo.add', target.closest('.photos'));
      Array.prototype.forEach.call(files, function (f) { var url = /^image\//.test(f.type) ? URL.createObjectURL(f) : mockPhoto(f.name); addPhoto(add || target, url, f.name); });
    } else if (row) {
      setStatus(row, '已上传');
      var td = $('td:nth-last-child(2)', row) || row; if (row.tagName === 'TR') { var small = document.createElement('span'); small.className = 'tsub'; small.textContent = names.join('、'); td.appendChild(small); }
      markDone(target, '重新上传'); target.classList.remove('done'); target.style.pointerEvents = '';
    } else {
      var chips = target.parentNode.querySelector('.filechips');
      if (!chips) { chips = document.createElement('div'); chips.className = 'filechips'; target.parentNode.insertBefore(chips, target.nextSibling); }
      names.forEach(function (n) { var c = document.createElement('span'); c.className = 'filechip'; c.innerHTML = '📎 <span>' + esc(n) + '</span>'; chips.appendChild(c); });
    }
    toast('已上传 ' + names.length + ' 个文件：' + names.join('、'), 'ok');
  }
  function pickFile(target, accept, multiple) {
    if (!fileInput) { fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.style.display = 'none'; document.body.appendChild(fileInput); }
    fileInput.accept = accept || ''; fileInput.multiple = !!multiple; fileInput.value = '';
    fileInput.onchange = function () { if (fileInput.files.length) attachFiles(target, fileInput.files); };
    fileInput.click();
    toast('请选择要上传的文件');
  }
  document.addEventListener('click', function (e) {
    var up = e.target.closest('.upload');
    if (up) { e.preventDefault(); pickFile(up, '', true); return; }
    var add = e.target.closest('.photo.add');
    if (add) {
      e.preventDefault();
      if (IS_M) { var lbl = txtOf($('.bt', add.closest('.blk')) || $('.bt')) || '现场照片'; addPhoto(add, mockPhoto(lbl), lbl); toast('已拍照并添加时间、地点与单号水印', 'ok'); }
      else pickFile(add, 'image/*', true);
      return;
    }
    var ph = e.target.closest('.photo:not(.add)');
    if (ph) { e.preventDefault(); var img = $('img', ph); var lbl2 = txtOf($('.bt', ph.closest('.blk'))) || '照片'; dialog({ title: lbl2, noFoot: true, body: '<img src="' + (img ? img.src : mockPhoto(lbl2)) + '" style="width:100%;border-radius:8px">' + note('拍摄时间 ' + TODAY + ' ' + nowHM() + ' · 本部 2 食堂验收区 · 拍摄人 ' + USER + ' · 已加水印并关联单据') }); }
  });

  /* ================= 签字板 / 秤 ================= */
  function initSign(pad) {
    var cv = pad.querySelector('canvas');
    if (!cv || cv.__init) return; cv.__init = true;
    var r = pad.getBoundingClientRect();
    cv.width = (r.width || 300) * 2; cv.height = (r.height || 140) * 2;
    var ctx = cv.getContext('2d');
    ctx.scale(2, 2); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#123';
    if (pad.dataset.signed) {
      ctx.beginPath(); var w = r.width || 300, h = r.height || 140, y = h / 2;
      ctx.moveTo(w * .22, y + 12); ctx.bezierCurveTo(w * .3, y - 20, w * .36, y + 22, w * .44, y - 6);
      ctx.bezierCurveTo(w * .5, y - 24, w * .56, y + 20, w * .64, y + 2); ctx.bezierCurveTo(w * .7, y - 14, w * .74, y + 16, w * .8, y - 4); ctx.stroke();
      var ph0 = pad.querySelector('.ph, span'); if (ph0) ph0.style.display = 'none'; pad.dataset.has = '1';
      return;
    }
    var drawing = false;
    function pos(e) { var b = cv.getBoundingClientRect(); var t = e.touches ? e.touches[0] : e; return [t.clientX - b.left, t.clientY - b.top]; }
    function start(e) { drawing = true; var p = pos(e); ctx.beginPath(); ctx.moveTo(p[0], p[1]); var ph = pad.querySelector('.ph, span'); if (ph) ph.style.display = 'none'; pad.dataset.has = '1'; e.preventDefault(); }
    function move(e) { if (!drawing) return; var p = pos(e); ctx.lineTo(p[0], p[1]); ctx.stroke(); e.preventDefault(); }
    function end() { drawing = false; }
    cv.addEventListener('mousedown', start); cv.addEventListener('mousemove', move); document.addEventListener('mouseup', end);
    cv.addEventListener('touchstart', start, { passive: false }); cv.addEventListener('touchmove', move, { passive: false }); cv.addEventListener('touchend', end);
  }
  function autoSign(pad) {
    var cv = pad.querySelector('canvas'); if (!cv) return;
    var ctx = cv.getContext('2d'), r = pad.getBoundingClientRect(), w = r.width || 300, h = r.height || 140, y = h / 2;
    ctx.beginPath(); ctx.moveTo(w * .25, y + 10); ctx.bezierCurveTo(w * .32, y - 22, w * .4, y + 20, w * .48, y - 8);
    ctx.bezierCurveTo(w * .55, y - 26, w * .6, y + 18, w * .7, y); ctx.stroke();
    var ph = pad.querySelector('.ph, span'); if (ph) ph.style.display = 'none'; pad.dataset.has = '1';
  }
  function initScale() {
    $$('.scale .v').forEach(function (v) {
      var base = parseFloat(v.textContent) || 18.6;
      setInterval(function () { if (!v.__lock) v.textContent = (base + (Math.random() - 0.5) * 0.04).toFixed(2); }, 1400);
    });
  }

  /* ================= 铃铛 / 消息下拉 ================= */
  var BELL = {
    '预警': [['【临期】本部 2 食堂 4 个批次临近保质期', '17:20 · 干香菇剩 2 天，请优先出库', 0], ['【接口】一卡通营业额同步连续 3 次失败', '16:42 · 影响 9 月可分配额测算', 0], ['【证照】湘雅供应链营业执照 10-18 到期', '09:12 · 剩余 23 天', 1], ['【冷链】湘A·D8866 在途温度 6.2℃ 超限', '08:40 · 已通知供应商与验收员', 1]],
    '消息': [['【待办】湘雅新校区 1 食堂计划待核定', '08:20 · PP-20260925-018 · 42 行', 0], ['【审批】本周蔬菜价格调整已通过', '14:26 · 小白菜 ¥4.50 → ¥4.20', 0], ['【对账】9 月对账单已生成，请于 10-05 前确认', '11:26 · 6 家供应商', 0], ['【公告】国庆假期供餐与配送安排', '09-24 · 隔日配送', 1], ['【公告】系统 09-27 02:00 版本升级', '09-23 · 升级期间暂停服务', 1]],
  };
  function toggleBell(a) {
    var old = $('.bellpop');
    if (old) { var same = old.__owner === a; old.remove(); if (same) return; }
    var kind = a.getAttribute('data-kind') || '消息', list = BELL[kind] || BELL['消息'];
    var pop = document.createElement('div'); pop.className = 'bellpop'; pop.__owner = a;
    pop.innerHTML = '<div class="bh"><span>' + kind + '通知 · 未读 ' + list.filter(function (x) { return !x[2]; }).length + '</span><a href="#" data-readall>全部标为已读</a></div>' +
      list.map(function (m) { return '<div class="bi' + (m[2] ? ' read' : '') + '"><i></i><div><b>' + esc(m[0]) + '</b><span>' + esc(m[1]) + '</span></div></div>'; }).join('') +
      '<div class="bf">查看全部' + kind + '</div>';
    a.closest('.tb-tools').appendChild(pop);
    pop.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (e.target.closest('[data-readall]')) { $$('.bi', pop).forEach(function (b) { b.classList.add('read'); }); var bd = $('.bdg', a); if (bd) bd.remove(); toast('已全部标为已读', 'ok'); return; }
      var bi = e.target.closest('.bi');
      if (bi) { bi.classList.add('read'); var bd2 = $('.bdg', a); if (bd2) { var n = +txtOf(bd2) - 1; if (n > 0) bd2.textContent = n; else bd2.remove(); } toast('正在打开：' + txtOf($('b', bi))); go(a.getAttribute('href'), 500); return; }
      if (e.target.closest('.bf')) go(a.getAttribute('href'), 0);
    });
    setTimeout(function () { document.addEventListener('click', function h(ev) { if (!pop.contains(ev.target) && !a.contains(ev.target)) { pop.remove(); document.removeEventListener('click', h); } }); }, 0);
  }

  /* ================= 扫码 / 语音 / 称重 ================= */
  function scanOverlay(msg, then) {
    var m = document.createElement('div'); m.className = 'scanmask';
    m.innerHTML = '<div class="frame"><i></i></div><div class="msg">' + esc(msg || '请将二维码对准扫描框') + '</div>';
    HOST.appendChild(m);
    setTimeout(function () { var t = $('.msg', m); t.textContent = '识别成功 ✓'; t.classList.add('ok'); }, 1200);
    setTimeout(function () { m.remove(); then && then(); }, 1600);
  }
  function doScan(el) {
    var next = nextOf(el);
    var label = txtOf(el);
    var what = /盘点/.test(label + document.title) ? '批次标签 PC-20260908-04' : /设备|报修/.test(label + document.title) ? '设备铭牌 EQ-2021-0042' : /打码|溯源/.test(label) ? '溯源码 TR-20260925-006' : '送货单 DH-20260925-029';
    scanOverlay('正在识别' + what.split(' ')[0] + '…', function () {
      if (next && next !== location.pathname.split('/').pop()) { toast('已识别 ' + what + '，正在打开…', 'ok'); go(next, 300); }
      else {
        toast('已识别 ' + what + '，信息已带入当前页面', 'ok');
        var hint = $('.hint, .note'); if (hint) { hint.className = hint.className.replace(/\b(w|i|e|note-w|note-i)\b/g, function (c) { return c.length > 1 && c.indexOf('note') === 0 ? 'note-s' : 's'; }); var sp = $('span, div', hint); if (sp) sp.innerHTML = '已识别 <b>' + esc(what) + '</b>，已自动调出对应单据与明细。'; }
      }
    });
  }
  function doVoice(el) {
    var old = el.innerHTML; el.classList.add('busy'); el.innerHTML = '<span class="recdot"></span>录音中…';
    setTimeout(function () {
      el.classList.remove('busy'); el.innerHTML = old;
      var ta = (el.closest('.blk, .panel, .fgrp, .sec') && $('textarea', el.closest('.blk, .panel, .fgrp, .sec'))) || $('textarea');
      var text = '鲜猪后腿肉约 5.8 公斤色泽发暗，感官不合格，供应商送货人已确认当场带回。';
      if (ta) { ta.value = text; ta.focus(); }
      var box = el.closest('.blk') && $('[style*="text-align:left"]', el.closest('.blk')); if (box) box.innerHTML = '<div style="font-size:12px;color:#8595A4;margin-bottom:5px">识别结果（已匹配退货原因字典：质量不合格）</div>' + text;
      toast('语音已转写并匹配退货原因字典：质量不合格', 'ok');
    }, 1500);
  }
  function doWeigh(el) {
    var v = $('.scale .v');
    var val = (18 + Math.random() * 60).toFixed(2);
    if (v) { v.textContent = val; v.__lock = true; setTimeout(function () { v.__lock = false; }, 6000); var st = $('.scale .st'); if (st) st.innerHTML = st.innerHTML.replace(/读数.*$/, '读数已锁定 ' + nowHM()); }
    var inpq = $$('input').filter(function (i) { return /重|数量|净重/.test(txtOf(i.closest('.mfi, .fld') && $('label', i.closest('.mfi, .fld')))); })[0]; if (inpq) inpq.value = val;
    toast('云秤读数已采集：' + val + ' kg（已自动去皮 0.38 kg），与订单量核对完成', 'ok');
  }

  /* ================= 抽屉：详情 / 表单 / 评分 / 处理 ================= */
  function detailDrawer(el, title) {
    var row = rowOf(el), pairs = row ? itemPairs(row) : [];
    var no = contextNo(el) || docNoIn(pairs.map(function (p) { return p[1]; }).join(' '));
    var t = title || (no ? no + ' · 详情' : (row ? txtOf($('b, td', row)).slice(0, 24) : pageTitle()) + ' · 详情');
    var isDoc = /原件|PDF|预览|报告|附件|证照|凭证|发票|合同|评估|模板|流程图/.test(txtOf(el) + (title || ''));
    var isPhoto = /照片|张|拍照|图片|留证/.test(txtOf(el));
    var body = '';
    if (isPhoto) { var n = parseInt((txtOf(el).match(/(\d+)\s*张/) || [])[1]) || 3; body += '<div class="photogrid">' + Array.apply(null, Array(Math.min(n, 6))).map(function (_, i) { return '<img src="' + mockPhoto(['整体到货', '称重读数', '索证索票', '不合格实物', '冷链温度', '库位标签'][i % 6]) + '">'; }).join('') + '</div>' + note('共 ' + n + ' 张 · 拍摄人 ' + USER + ' · 已加时间、地点、单号水印并关联单据'); }
    else if (isDoc) {
      var docTitle = /流程图/.test(txtOf(el)) ? '审批流程图' : (pairs[0] ? pairs[0][1] : '') + ' ' + txtOf(el).replace(/查看|预览/g, '');
      body += /流程图/.test(txtOf(el)) ? '<div class="steps" style="padding:6px 0">' + ['发起', '部门审核', '分管领导审批', '归档'].map(function (s, i) { return '<div class="step ' + (i < 2 ? 'done' : i === 2 ? 'on' : '') + '"><div class="dot">' + (i < 2 ? '✓' : i + 1) + '</div><div class="lab"><b>' + s + '</b>' + ['已完成', '已完成', '处理中', '待处理'][i] + '</div>' + (i < 3 ? '<div class="bar"></div>' : '') + '</div>'; }).join('') + '</div>' + note('节点时限：部门审核 1 个工作日、领导审批 1 个工作日；驳回退回发起人修改后可重新提交。') :
        '<div class="docprev"><div class="dp-h">' + esc(docTitle.trim() || '单据原件') + '</div><div class="dp-m">中南大学后勤保障部饮食服务中心 · 编号 ' + esc(no || 'DOC-' + TODAY.replace(/-/g, '') + '-018') + ' · ' + TODAY + '</div>' +
        '<table>' + (pairs.length ? pairs.slice(0, 8).map(function (p) { return '<tr><th style="width:120px">' + esc(p[0]) + '</th><td>' + esc(p[1]) + '</td></tr>'; }).join('') : '<tr><th style="width:120px">出具单位</th><td>中南大学食品安全检测室</td></tr><tr><th>检测结论</th><td>合格</td></tr><tr><th>出具日期</th><td>' + TODAY + '</td></tr>') + '</table>' +
        '<div class="stamp">中南大学<br>饮食服务中心<br>业务专用章</div></div>';
    } else {
      body += pairs.length ? kvHtml(pairs) : kvHtml([['单据编号', no || '—'], ['经办人', USER], ['日期', TODAY]]);
      var tls = [['单据创建', TODAY + ' 08:12', USER + ' 创建并提交'], ['系统校验', TODAY + ' 08:12', '三一致 / 库存 / 定额校验通过'], ['当前节点', TODAY + ' ' + nowHM(), '等待下一环节处理']];
      body += IS_M ? '<div class="mtl">' + tls.map(function (t, i) { return '<div class="mtli ' + (i < 2 ? 'done' : 'now') + '"><div class="dot"></div><div class="c"><b>' + t[0] + '</b><span>' + t[1] + ' · ' + t[2] + '</span></div></div>'; }).join('') + '</div>'
        : '<div class="tl" style="margin-top:4px">' + tls.map(function (t, i) { return '<div class="tli ' + (i < 2 ? 'done' : 'now') + '"><div class="dot"></div><div class="body"><div class="hd">' + t[0] + '<span class="tm">' + t[1] + '</span></div><div class="ds">' + t[2] + '</div></div></div>'; }).join('') + '</div>';
    }
    dialog({ title: t, body: body, drawer: true, okText: '关闭', cancelText: '', onOk: function () { } });
  }
  var PREFILL = [
    [/供应商/, SUP[0]], [/食堂|收货点|调入|调出/, CAN[1]], [/档口|班组/, STALL[1]], [/物资|商品|品名|名称/, MAT[0]], [/数量|重量|行数/, '120'],
    [/单价/, '128.00'], [/金额|价格|成本/, '15,360.00'], [/电话|手机/, '138 0731 6688'], [/联系人|姓名|经办|申请人|负责人|操作人/, USER],
    [/原因|说明|备注|事由|意见|描述/, '按实际到货情况登记，已现场核实'], [/编码|编号|单号/, 'PP-20260925-019'], [/规格/, '25kg/袋'], [/单位/, '袋'],
    [/日期|时间/, TODAY], [/状态/, '待审核'], [/类目|品类|类别/, '粮油副食'], [/库位/, 'A-01-2'], [/批次/, 'PC-20260925-11'], [/比例|占比|率/, '5%'], [/系数/, '1.20'],
  ];
  function guess(label) { for (var i = 0; i < PREFILL.length; i++) if (PREFILL[i][0].test(label)) return PREFILL[i][1]; return ''; }
  function formDrawer(el, mode) {
    var tbl = tableOf(el), row = rowOf(el);
    var isEdit = mode === 'edit' && row;
    var title = txtOf(el).replace(/^(\+|＋)\s*/, '') || (isEdit ? '编辑' : '新增');
    var fields = [];
    if (tbl) {
      var hs = headersOf(tbl);
      var cells = isEdit && row.tagName === 'TR' ? $$('td', row) : [];
      if (!cells.length) { var first = $$('tbody tr', tbl).filter(function (r) { return !$('.empty', r); })[0]; if (first) cells = $$('td', cloneRow(first, $$('tbody tr', tbl).length + 1)); }
      hs.forEach(function (h, i) { if (!h || /操作|序号/.test(h)) return; var v = cells[i] ? (txtOf(cells[i]) || guess(h)) : guess(h); if ($('input', cells[i] || document.createElement('i'))) v = $('input', cells[i]).value; fields.push([h, v || guess(h) || '—', i]); });
    } else if (row) {
      itemPairs(row).forEach(function (p, i) { fields.push([p[0], p[1], i]); });
    }
    if (!fields.length) {
      var kvs = $$('.kvi, .kvl .it').slice(0, 8);
      if (kvs.length) kvs.forEach(function (k, i) { fields.push([txtOf($('label', k)), txtOf($('span', k)), i]); });
      else fields = [['名称', guess('名称'), 0], ['数量', '120', 1], ['生效日期', TODAY, 2], ['备注', '按业务口径登记', 3]];
    }
    fields = fields.slice(0, 12);
    var body = '<div class="mgrid">' + fields.map(function (f) {
      var isArea = /原因|说明|备注|事由|意见|描述/.test(f[0]);
      var isDate = /^\S*日期$|时间$/.test(f[0]) && /^\d{4}-\d\d-\d\d/.test(f[1] || TODAY);
      var isStatus = /状态/.test(f[0]);
      var inner = isArea ? area(f[0], f[1]) : isStatus ? sel(f[0], ['待审核', '已通过', '已驳回', '执行中', '已完成', '草稿'], f[1]) : isDate ? '<input class="inp" type="date" data-f="' + esc(f[0]) + '" value="' + esc((f[1] || TODAY).slice(0, 10)) + '">' : inp(f[0], f[1]);
      return fld(f[0], inner, isArea || (f[1] && f[1].length > 26));
    }).join('') + '</div>' + note(isEdit ? '修改将写入审计日志（记录修改前后值、操作人与时间）。' : '保存后新记录进入「待审核」状态，可在列表中继续编辑或提交。');
    dialog({
      title: title, body: body, drawer: !IS_M, okText: '保存',
      validate: function (b) { var bad = $$('[data-f]', b).filter(function (i) { return !i.value.trim(); })[0]; if (bad) { bad.style.borderColor = '#E41E3F'; bad.focus(); toast('「' + bad.getAttribute('data-f') + '」不能为空', 'err'); return false; } return true; },
      onOk: function (b) {
        var vals = {}; $$('[data-f]', b).forEach(function (i) { vals[i.getAttribute('data-f')] = i.value.trim(); });
        if (tbl) {
          var hs2 = headersOf(tbl), tb = $('tbody', tbl);
          if (isEdit && row.tagName === 'TR') {
            $$('td', row).forEach(function (td, i) { var h = hs2[i]; if (h in vals && !$('.tag, .acts, .cbox, input', td)) td.textContent = vals[h]; else if (h in vals && $('.tag', td) && !$('.acts', td)) setStatus(row, vals[h]); });
            highlight(row); toast('已保存修改，' + (docNoIn(txtOf(row)) || '该记录') + ' 已更新并写入审计日志', 'ok');
          } else {
            var src = $$('tr', tb).filter(function (r) { return !$('.empty', r); })[0];
            var nr = src ? cloneRow(src, 1) : document.createElement('tr');
            if (!src) nr.innerHTML = hs2.map(function () { return '<td></td>'; }).join('');
            $$('td', nr).forEach(function (td, i) { var h = hs2[i]; if (!h) return; if (h in vals && !$('.acts, .cbox, input', td)) { if ($('.tag', td)) setStatus(nr, vals[h]); else td.textContent = vals[h]; } });
            if (!statusTag(nr) || !/状态/.test(hs2.join())) { } else setStatus(nr, vals['状态'] || '待审核');
            $$('.empty', tb).forEach(function (x) { x.closest('tr').remove(); });
            tb.insertBefore(nr, tb.firstChild); highlight(nr);
            var pt = tbl.closest('.panel, .sec') && $('.ptotal', tbl.closest('.panel, .sec')); if (pt) pt.textContent = +txtOf(pt) + 1;
            toast('已新增 1 条记录（' + (vals[hs2.filter(Boolean)[0]] || '') + '），状态：待审核', 'ok');
          }
        } else if (row && row.tagName !== 'TR') {
          var b1 = $('b', row); if (b1 && vals['名称']) b1.textContent = vals['名称'];
          var s1 = $('.c span, .dh .c span', row); if (s1 && vals['说明']) s1.textContent = vals['说明'];
          highlight(row); toast('已保存修改', 'ok');
        } else {
          Object.keys(vals).forEach(function (k) { $$('.kvi, .kvl .it').forEach(function (kv) { if (txtOf($('label', kv)) === k) { $('span', kv).textContent = vals[k]; } }); });
          toast('已保存，' + title + '已生效并写入审计日志', 'ok');
          if (/变价|延期|调整|配置|设置|维护/.test(title)) setHeroStatus(/延期/.test(title) ? '已延期' : /变价/.test(title) ? '待审批' : '已更新');
        }
        addTimeline(USER + ' ' + title, Object.keys(vals).slice(0, 3).map(function (k) { return k + '：' + vals[k]; }).join('，'));
      },
    });
  }
  function rateDrawer(el) {
    var row = rowOf(el), who = row ? txtOf($('b, td:nth-child(2), td', row)) : (docNoIn(txtOf($('.hero-t h1'))) || pageTitle());
    var dims = ['到货及时', '质量合格', '规格一致', '服务响应', '票证齐全'];
    var body = '<div class="mnote">对象：' + esc(who) + ' · 评分人 ' + esc(USER) + ' · 同一人对同一对象只需评一次</div>' + dims.map(function (d, i) { return '<div class="rate-row"><label>' + d + '</label><div class="stars" data-dim="' + d + '">' + [1, 2, 3, 4, 5].map(function (n) { return '<i class="' + (n <= (i === 1 ? 4 : 5) ? 'on' : '') + '" data-v="' + n + '">★</i>'; }).join('') + '</div><span class="rv">' + (i === 1 ? 4 : 5) + ' 分</span></div>'; }).join('') + fld('评价意见', area('意见', '到货准时，票证齐全；' + (row ? '本次' : '本期') + '有 1 批部分合格已按流程处理。'), true);
    var d = dialog({
      title: '人工评分', body: body, okText: '提交评分', onOk: function (b) {
        var tot = 0; $$('.stars', b).forEach(function (s) { tot += $$('i.on', s).length; });
        var score = Math.round(tot / dims.length * 20 * 10) / 10;
        if (row) { setStatus(row, '已评分'); var sc = $$('td', row).filter(function (td) { return /^\d{2}\.\d$/.test(txtOf(td)); })[0]; if (sc) sc.textContent = score.toFixed(1); }
        markDone(el, '已评分'); decPending();
        toast('评分已提交：' + who + ' 人工评分 ' + score.toFixed(1) + ' 分，已并入综合得分', 'ok');
        addTimeline(USER + ' 完成人工评分', who + ' · ' + score.toFixed(1) + ' 分');
      },
    });
    d.body.addEventListener('click', function (e) { var i = e.target.closest('.stars i'); if (!i) return; var v = +i.getAttribute('data-v'); $$('i', i.parentNode).forEach(function (x) { x.classList.toggle('on', +x.getAttribute('data-v') <= v); }); i.parentNode.nextElementSibling.textContent = v + ' 分'; });
  }
  function handleDrawer(el) {
    var row = rowOf(el), pairs = row ? itemPairs(row) : [], no = contextNo(el);
    var body = kvHtml(pairs.length ? pairs : [['单据编号', no || '—'], ['申请人', PEOPLE[0]], ['提交时间', TODAY + ' 08:20']]) + fld('处理意见', area('意见', '经核实，材料齐全、口径一致，同意办理。'), true);
    var d = dialog({
      title: (no ? no + ' · ' : '') + '处理', body: body, drawer: !IS_M, okText: '通过', cancelText: '驳回',
      onOk: function () { finish(el, { status: '已通过', done: '已处理', msg: '已通过，{no}已流转至下一环节' }); },
    });
    var no2 = $('[data-no]:not(.x)', d.el);
    if (no2) { no2.addEventListener('click', function (e) { e.stopPropagation(); d.close(); confirmAction(el, ACTIONS.filter(function (a) { return a.key === 'reject'; })[0]); }, true); }
  }
  function expandAll(el) {
    var head = el.closest('.sh, .bh'), sec = head && head.parentNode;
    var li = sec && listItems(sec);
    if (!li || !li.items.length) { var href = el.getAttribute('href'); if (href && href !== '#') return false; toast('已展开全部'); return true; }
    var expanded = el.getAttribute('data-expanded') === '1';
    if (expanded) { $$('.mock', li.host).forEach(function (m) { m.remove(); }); el.setAttribute('data-expanded', '0'); el.innerHTML = el.getAttribute('data-label'); toast('已收起'); return true; }
    var want = parseInt((txtOf(el).match(/(\d+)/) || [])[1]) || li.items.length + 5;
    var add = Math.min(Math.max(want - li.items.length, 3), 8);
    for (var i = 0; i < add; i++) { var c = cloneRow(li.items[i % li.items.length], i + 1); c.classList.add('mock'); li.host.appendChild(c); }
    el.setAttribute('data-label', el.innerHTML); el.setAttribute('data-expanded', '1');
    var ico = $('.ico', el); el.textContent = '收起'; if (ico) el.appendChild(ico);
    toast('已展开全部 ' + (li.items.length + add) + ' 条', 'ok');
    return true;
  }
  function manageQuick(el) {
    var grid = $('.qgrid'); if (!grid) { toast('已进入常用功能管理'); return; }
    var cards = $$('.qcard', grid);
    var body = '<div class="mnote">勾选要显示在工作台的常用功能，最多 12 项，拖动顺序在正式版本中支持。</div>' + cards.map(function (c, i) { return '<div class="chkrow"><span class="cbox' + (c.classList.contains('hide') ? '' : ' on') + '" data-i="' + i + '"></span><span>' + esc(txtOf($('.qt b', c))) + '</span><span style="margin-left:auto;color:#7C8C9A;font-size:12px">' + esc(txtOf($('.qt span', c))) + '</span></div>'; }).join('');
    var d = dialog({ title: '管理常用功能', body: body, drawer: true, okText: '保存', onOk: function (b) { $$('.cbox', b).forEach(function (cb) { cards[+cb.getAttribute('data-i')].classList.toggle('hide', !cb.classList.contains('on')); }); toast('常用功能已更新，显示 ' + $$('.cbox.on', b).length + ' 项', 'ok'); } });
    d.body.addEventListener('click', function (e) { var cb = e.target.closest('.cbox'); if (cb) { e.stopPropagation(); cb.classList.toggle('on'); } }, true);
  }
  function itemSheet(el) {
    var row = rowOf(el) || el;
    var title = txtOf($('b', row)) || txtOf(el) || '详情';
    var v = $('.r b, .r', row), vt = v ? txtOf(v) : '';
    if (/^(开|关)$/.test(vt)) { var on = vt === '开'; $('.r b', row).textContent = on ? '关' : '开'; toast((on ? '已关闭' : '已开启') + '「' + title + '」', 'ok'); return; }
    if (/上传/.test(vt) || /上传/.test(txtOf(el))) { pickFile(el, '', false); return; }
    var pairs = itemPairs(row);
    var extra = /工资/.test(title) ? [['应发工资', '¥5,860.00'], ['岗位工资', '¥3,200.00'], ['绩效工资', '¥1,980.00'], ['工龄工资', '¥240.00'], ['代扣社保', '−¥486.00'], ['实发工资', '¥5,374.00'], ['发放月份', '2026-08'], ['发放状态', '已发放']]
      : /考勤/.test(title) ? [['应出勤', '26 天'], ['实出勤', '25 天'], ['请假', '1 天（事假）'], ['迟到 / 早退', '0 次'], ['出勤率', '96.2%'], ['考勤月份', '2026-09']]
        : /密码/.test(title) ? [] : /设备|云秤/.test(title) ? [['SC-02-01', '在线 · 常温区'], ['SC-02-02', '在线 · 冷藏区'], ['最近校准', '2026-09-20'], ['校准周期', '30 天']] : [];
    var body = /密码/.test(title) ? fld('原密码', '<input class="inp" type="password" data-f="原密码" value="123456">') + fld('新密码', '<input class="inp" type="password" data-f="新密码" value="Csu@2026">') + fld('确认新密码', '<input class="inp" type="password" data-f="确认新密码" value="Csu@2026">') + note('密码须 8 位以上且包含字母与数字，每 6 个月须修改一次。')
      : /反馈|建议/.test(title) ? fld('反馈类型', sel('类型', ['功能建议', '使用问题', '数据错误', '其他'])) + fld('反馈内容', area('内容', '', '请描述您遇到的问题或建议')) : kvHtml(pairs.concat(extra));
    dialog({
      title: title, body: body, okText: /密码/.test(title) ? '确认修改' : /反馈/.test(title) ? '提交反馈' : '知道了', cancelText: /密码|反馈/.test(title) ? '取消' : '',
      onOk: function () { if (/密码/.test(title)) toast('密码已修改，下次登录请使用新密码', 'ok'); else if (/反馈/.test(title)) toast('反馈已提交，编号 FB-20260925-006，我们将在 2 个工作日内回复', 'ok'); },
    });
  }

  /* ================= 业务动作表 ================= */
  var ACTIONS = [
    { key: 'reject', re: /驳回|退回|不同意|否决|拒收|退回补正|退回重填|不通过/, title: '确认驳回', danger: true, okText: '确认驳回', status: '已驳回', done: '已驳回', fields: 'reason', body: '驳回后单据将退回发起人，修改后可重新提交。请填写驳回原因（必填），原因将通知发起人。', msg: '已驳回，{no}已退回发起人并发送通知' },
    { key: 'ship', re: /确认发货|发货登记|登记发货|^发货$|出车/, title: '确认发货', okText: '确认发货', status: '在途', done: '已发货', fields: 'ship', body: '请核对运输信息，确认后生成送货二维码并通知收货食堂。', msg: '发货已确认，{no}状态更新为「在途」，已通知收货食堂' },
    { key: 'sign', re: /签字|签名|会签|签收|确认签收|确认接收|接收确认|三方签字|电子签/, title: '电子签字', okText: '确认签字', status: '已签字', done: '已签字', fields: 'sign', body: '电子签名与手写签名具有同等效力，请确认单据信息无误后在下方手写签名。', msg: '签字完成，{no}已归档并锁定' },
    { key: 'cut', re: /核减|核定并|核定量|确认核定|^核定$|调减/, title: '数量核定', okText: '确认核定', status: '已核定', done: '已核定', fields: 'qty', body: '请填写核定数量，核定量与报量差异超过 20% 时须填写核定理由。', msg: '核定完成，{no}已进入采购主管单级审核' },
    { key: 'approve', re: /审核通过|审批通过|同意|^通过$|批准|核准|确认生效|生效|审核并|审批$|确认通过|复核通过|准入通过|通过并/, title: '确认通过', okText: '确认通过', status: '已通过', done: '已通过', fields: 'opinion', body: '通过后单据将流转至下一环节并通知相关人员。', msg: '已通过，{no}已流转至下一环节' },
    { key: 'submit', re: /提交|发起|上报|申请$|申报|报送|推送|发布|公示|下发|派单|派工|受理|接单|立项|启动|生成工资表|生成对账|生成结算|生成盘点/, title: '确认提交', okText: '确认提交', status: '待审核', done: '已提交', fields: 'none', body: '提交后进入审批流程，审批期间不可修改。确定提交吗？', msg: '已提交，{no}已进入审批流程并通知下一节点' },
    { key: 'inbound', re: /上架|入库/, title: '确认上架入库', okText: '确认入库', status: '已入库', done: '已入库', fields: 'loc', body: '全部明细完成上架后库存才会增加，并同步核销在途量。', msg: '上架完成，{no}库存已增加并核销在途量' },
    { key: 'outbound', re: /出库|配货|发料|领用出库/, title: '确认出库', okText: '确认出库', status: '已出库', done: '已出库', fields: 'none', body: '确认出库时点即为库存扣减时点，按先进先出推荐批次扣减。', msg: '出库完成，{no}库存已按批次扣减，成本归集到领用档口' },
    { key: 'return', re: /退货|退库|换货/, title: '确认退货', okText: '确认退货', status: '退货生效', done: '已退货', fields: 'reason', body: '退货生效后将自动冲减验收单与入库单并重新打印，同时计入供应商考评扣分。', msg: '退货已生效，{no}已冲减验收单与入库单' },
    { key: 'pay', re: /付款|结算|推送财务|确认对账|对账确认|开票|申请开票|确认结算/, title: '确认操作', okText: '确认', status: '已确认', done: '已确认', fields: 'none', body: '三一致校验通过后方可结算，付款申请将推送学校财务系统并回写状态。', msg: '已确认，{no}已推送财务系统，付款状态将自动回写' },
    { key: 'void', re: /作废|终止|撤销|注销|报废|销毁|报损/, title: '确认作废', danger: true, okText: '确认', status: '已作废', done: '已作废', fields: 'reason', body: '该操作不可恢复，系统将记录操作人、时间与原因并写入审计日志。', msg: '{no}已作废，已写入审计日志' },
    { key: 'delete', re: /删除|移除|清除|移出/, title: '确认删除', danger: true, okText: '删除', remove: true, fields: 'none', body: '删除后该记录将不再显示，操作将写入审计日志。确定删除吗？', msg: '已删除 1 条记录' },
    { key: 'disable', re: /停用|禁用|冻结|锁定|下架|列入黑名单|加入黑名单/, title: '确认停用', danger: true, okText: '确认', status: '已停用', done: '已停用', fields: 'reason', body: '停用后相关权限 / 报价 / 接单能力立即关闭，历史记录保留可查。', msg: '{no}已停用，相关权限已关闭' },
    { key: 'enable', re: /启用|恢复|解除|解锁|解冻|重新启用|移出黑名单/, title: '确认启用', okText: '确认', status: '已启用', done: '已启用', fields: 'none', body: '启用后立即恢复相关权限与业务能力。', msg: '{no}已启用' },
    { key: 'withdraw', re: /撤回|撤单/, title: '确认撤回', okText: '确认撤回', status: '草稿', done: '已撤回', fields: 'reason', body: '撤回后单据回到草稿状态，可修改后重新提交；撤回记录写入审计日志。', msg: '{no}已撤回到草稿' },
    { key: 'remind', re: /催办|提醒|催签|催票|^催|重发|发送|通知供应商|发短信/, title: '发送提醒', okText: '发送', status: '已催办', done: '已催办', fields: 'message', body: '将通过站内消息与短信双通道发送提醒。', msg: '提醒已发送（站内消息 + 短信），{no}已标记催办' },
    { key: 'authorize', re: /授权|分配|绑定|指派|转办|移交|委托/, title: '确认授权', okText: '确认', status: '已授权', done: '已授权', fields: 'assign', body: '授权 / 指派后立即生效并通知被授权人。', msg: '{no}已授权并通知相关人员' },
    { key: 'confirm', re: /^确认|确认$|确认收货|确认到货|确认分量|确认入账|核对无误|确认无误|办结|结案|完工|完成验收|验收通过|验收确认|归档|锁定周期|关闭预警|已阅|标为已读|全部已读|已读/, title: '确认操作', okText: '确认', status: '已确认', done: '已确认', fields: 'none', body: '确认后将记录操作人与时间，相关状态同步更新。', msg: '已确认，{no}状态已更新' },
    { key: 'adopt', re: /采用|采纳|应用|套用|全部采用/, title: '确认采用', okText: '采用', status: '已采用', done: '已采用', fields: 'none', body: '将把系统建议值写入当前所有明细行，已手工修改的行将被覆盖。', msg: '已采用建议值，共更新明细 8 行' },
    { key: 'decision', re: /异议|不成立|拒绝|不予|暂缓|不续签|维持|暂不|约谈|返工|无薪|说明原因|协调|申请批次调整|不合格|不通过|整改|降级|警告|核查|放弃|稍后/, title: '确认处理意见', okText: '确认', fields: 'reason', body: '该处理意见将通知相关方并写入审计日志，请填写理由（必填）。', status: function (t) { return shortStatus(t); }, done: function (t) { return shortStatus(t); }, msg: '处理意见「{txt}」已登记，{no}状态已更新并通知相关人员' },
    { key: 'positive', re: /通过|完成|建档|开通|续期|续签|变更|批量|核实|通知|核定|按执行价|生成|重新盘点|手工录入|手动录重|手工输入|登记|确认|办理|处置|结转|冲销|补录|分摊|计提|测算|核算|发放|入账|抵扣|奖惩|升级|降级|激活|重置/, title: '确认操作', okText: '确认', fields: 'opinion', body: '确认后系统将执行该操作并记录操作人、时间与前后值。', status: function (t) { return shortStatus(t); }, done: function (t) { return shortStatus(t); }, msg: '「{txt}」已完成，{no}状态已更新' },
  ];
  function shortStatus(t) {
    t = t.replace(/^(批量|全部|手工|手动|立即|重新|确认|申请)/, '').split(/[，,（(·]/)[0];
    if (/通过/.test(t)) return '已通过';
    if (/完成/.test(t)) return '已完成';
    if (/续签|续期/.test(t)) return '已续签';
    if (/建档|开通/.test(t)) return '已建档';
    if (/异议/.test(t)) return '已提异议';
    if (/不成立|维持/.test(t)) return '维持原结论';
    if (/拒绝|不予|不通过/.test(t)) return '已拒绝';
    if (/暂缓|暂不/.test(t)) return '已暂缓';
    if (/整改|约谈/.test(t)) return '限期整改';
    if (/返工/.test(t)) return '待返工';
    if (/不续签/.test(t)) return '不续签';
    if (/协调/.test(t)) return '协调中';
    if (/批次调整/.test(t)) return '待授权';
    if (/核查/.test(t)) return '待核查';
    if (/稍后/.test(t)) return '已暂缓';
    if (/^已/.test(t)) return t.slice(0, 5);
    return '已' + (t.length > 4 ? t.slice(0, 2) : t);
  }
  function finish(el, act, no) {
    no = no || contextNo(el);
    var row = rowOf(el), txt = txtOf(el);
    var st = typeof act.status === 'function' ? act.status(txt) : act.status;
    var dn = typeof act.done === 'function' ? act.done(txt) : act.done;
    act = Object.assign({}, act, { status: st, done: dn });
    var msg = act.msg.replace('{no}', no ? no + ' ' : '').replace('{txt}', txt);
    if (act.remove && row) {
      row.classList.add('row-out');
      setTimeout(function () { var tbl = row.closest('table'); row.remove(); if (tbl) { var pt = tbl.closest('.panel, .sec') && $('.ptotal', tbl.closest('.panel, .sec')); if (pt) pt.textContent = Math.max(0, +txtOf(pt) - 1); } }, 350);
    } else if (act.status) {
      if (row && (row.tagName === 'TR' || row.classList.contains('doc') || row.classList.contains('rw'))) { setStatus(row, act.status); $$('.acts .lnk, .df .mbtn', row).forEach(function (a) { if (a !== el && ACTIONS.some(function (x) { return x.re.test(txtOf(a)); })) markDone(a); }); }
      else { setHeroStatus(act.status); advanceSteps(); $$('.footbar .btn, .actbar .mbtn', document).forEach(function (b) { if (b !== el && ACTIONS.some(function (x) { return x.re.test(txtOf(b)); }) && !/取消|返回/.test(txtOf(b))) b.classList.add('disabled'); }); }
    }
    markDone(el, act.done);
    if (!row || row.tagName !== 'TR') decPending(); else decPending();
    toast(msg, 'ok');
    addTimeline(USER + ' ' + (act.done || '完成操作'), msg);
    var next = nextOf(el);
    if (next && !row && next !== location.pathname.split('/').pop()) go(next, 1200);
    else if (next && row && el.matches('.actbar .mbtn, .footbar .btn')) go(next, 1200);
  }
  function confirmAction(el, act) {
    var no = contextNo(el), txt = txtOf(el);
    var head = '<div>' + act.body + '</div>' + (no ? note('单据：<b>' + esc(no) + '</b>' + (rowOf(el) ? ' · ' + esc(itemPairs(rowOf(el)).slice(1, 3).map(function (p) { return p[1]; }).join(' · ')) : '')) : '');
    var extra = '';
    if (act.fields === 'reason') extra = fld(/驳回|退回|不通过/.test(txt) ? '驳回原因' : '原因说明', area('原因', '', '请填写原因（必填）'), true);
    if (act.fields === 'opinion') extra = fld('审核意见', area('意见', '材料齐全、口径一致，同意。'), true);
    if (act.fields === 'message') extra = fld('提醒内容', area('内容', '【中南大学饮食服务中心】您有一项待办' + (no ? '（' + no + '）' : '') + '即将超时，请尽快处理。'), true);
    if (act.fields === 'qty') extra = '<div class="mgrid">' + fld('报量', inp('报量', '180')) + fld('核定量', inp('核定量', '165')) + fld('核定理由', area('理由', '按近 4 周同星期均量与当前库存核定'), true) + '</div>';
    if (act.fields === 'ship') extra = '<div class="mgrid">' + fld('车牌号', inp('车牌', '湘A·F2288')) + fld('司机姓名', inp('司机', '孙师傅')) + fld('司机电话', inp('电话', '139 7315 2200')) + fld('预计到达', inp('到达', TODAY + ' 15:30')) + fld('运输方式', sel('方式', ['冷链车（0~4℃）', '常温厢式货车', '冷冻车（−18℃）'])) + fld('随车资料', sel('资料', ['检测报告 + 检疫证明 + 送货单', '送货单 + 检测报告'])) + '</div>';
    if (act.fields === 'sign') extra = signHtml(USER + '（' + (txtOf($('.udept')) || '经办人').split('·').pop().trim() + '）手写签名');
    if (act.fields === 'loc') extra = '<div class="mgrid">' + fld('上架库位', sel('库位', ['A-01-2 常温区', 'B-01-1 冷藏区', 'C-01-3 冷冻区'])) + fld('批次号', inp('批次', 'PC-' + TODAY.replace(/-/g, '') + '-11')) + fld('打印批次标签', sel('标签', ['是（每批次 1 张）', '否'])) + fld('生产日期', '<input class="inp" type="date" data-f="生产日期" value="' + TODAY + '">') + '</div>';
    if (act.fields === 'assign') extra = fld('授权 / 指派给', sel('对象', ['张建国（食堂主任）', '李慧珍（采购主管）', '周维修（维修工）', '王守仓（保管员）'])) + fld('说明', area('说明', '按岗位职责授权，即时生效。'), true);
    dialog({
      title: act.title, body: head + extra, okText: act.okText, danger: act.danger,
      validate: function (b) {
        if (act.fields === 'reason') { var ta = $('textarea', b); if (!ta.value.trim()) { ta.style.borderColor = '#E41E3F'; ta.focus(); toast('请填写原因后再提交', 'err'); return false; } }
        if (act.fields === 'sign') { var pad = $('.signpad, .sign', b); if (!pad.dataset.has) { toast('请先在签名板手写签名', 'err'); autoSignHint(pad); return false; } }
        return true;
      },
      onOk: function (b) {
        if (act.fields === 'ship') { var car = $('[data-f="车牌"]', b), drv = $('[data-f="司机"]', b); $$('.kvi, .kvl .it').forEach(function (kv) { var l = txtOf($('label', kv)); if (/车牌/.test(l) && car) $('span', kv).textContent = car.value + (drv ? ' / ' + drv.value : ''); }); }
        if (act.fields === 'qty') { var q = $('[data-f="核定量"]', b); if (q && rowOf(el)) { var cell = $$('td input.inp', rowOf(el))[0]; if (cell) cell.value = q.value; } }
        finish(el, act, no);
      },
    });
  }
  var hinted = false;
  function autoSignHint(pad) { if (hinted) return; hinted = true; setTimeout(function () { if (pad && pad.isConnected && !pad.dataset.has) { autoSign(pad); toast('已示范签名笔迹，可直接确认或清除后重签'); } }, 900); }

  /* ================= 主路由 ================= */
  function route(el, e) {
    var txt = txtOf(el).replace(/^\+\s*/, ''), act = el.getAttribute('data-act') || '', href = el.getAttribute('href') || '';
    var real = href && href !== '#' && !/^javascript:/.test(href);
    var row = rowOf(el);

    /* data-act 优先 */
    if (act === 'bell') { e.preventDefault(); toggleBell(el); return; }
    if (act === 'oa-link' || /^前往 OA/.test(txt)) {
      e.preventDefault();
      toast('正在打开学校财务 OA 付款与发票页面…', 'ok');
      return;
    }
    if (act === 'price-import' || /^导入系统$/.test(txt)) {
      e.preventDefault();
      confirmAction(el, {
        title: '导入系统',
        okText: '确认导入',
        body: '将已审批价格写入执行价目并变为「已导入生效」，之后方可用于计划审核与自动派单。是否继续？',
        msg: '价格已导入系统，状态已更新为「已导入生效」',
        status: '已导入生效',
        done: '已导入',
        fields: 'none',
      });
      return;
    }
    if (act === 'scan' || /扫码|扫一扫|扫描|打码|扫库位|扫标签/.test(txt)) { e.preventDefault(); doScan(el); return; }
    if (act === 'login' || /^登\s*录$/.test(txt)) {
      e.preventDefault();
      var s = $('#lg-acc'), role = s ? s.value : '';
      var supSel = $('#lg-sup-acc');
      var supTabOn = $('.lg-tabs a.on') && /供应商/.test(txtOf($('.lg-tabs a.on')));
      var mSupMode = IS_M && supSel;
      if (supTabOn || mSupMode) {
        role = 'supplier';
        var sid = supSel ? supSel.value : 'sup-xiangjiang';
        var pwd = $('input[type="password"]'); if (pwd && !pwd.value) { pwd.style.borderColor = '#E41E3F'; toast('请输入密码', 'err'); return; }
        if (sid === 'sup-chupin' || sid === 'sup-xianhui') {
          toast('首次登录须先完善企业资料', 'ok');
          go(IS_M ? '../supplier/m-complete-profile.html' : '../supplier/complete-profile.html', 600);
          return;
        }
        toast('登录成功，正在进入供应商工作台…', 'ok');
        go(IS_M ? '../supplier/m-dashboard.html' : '../supplier/dashboard.html', 600);
        return;
      }
      var pwd = $('input[type="password"]'); if (pwd && !pwd.value) { pwd.style.borderColor = '#E41E3F'; toast('请输入密码', 'err'); return; }
      toast('登录成功，正在进入工作台…', 'ok');
      go(role ? (IS_M ? '../' + role + '/m-dashboard.html' : '../' + role + '/dashboard.html') : (real ? href : (IS_M ? '../keeper/m-dashboard.html' : '../keeper/dashboard.html')), 600);
      return;
    }
    if (act === 'sup-profile-submit') {
      e.preventDefault();
      var box = el.closest('.work, .shell, .mbody, body');
      var req = $$('[data-req="1"]', box);
      var bad = false;
      req.forEach(function (f) {
        var empty = !String(f.value || '').trim() || (f.tagName === 'SELECT' && /请选择/.test(f.value));
        f.style.borderColor = empty ? '#E41E3F' : '';
        if (empty) bad = true;
      });
      $$('.upload[data-req="1"]', box).forEach(function (u) {
        if (!$('.filetag', u)) { u.style.borderColor = '#E41E3F'; bad = true; }
      });
      if (bad) { toast('请补全必填项后再提交', 'err'); return; }
      toast('资料已提交，待采购主管资质初审', 'ok');
      go(IS_M ? 'm-complete-profile.html' : 'complete-profile.html', 800);
      return;
    }
    if (/忘记密码|获取验证码|重新发送/.test(txt)) { e.preventDefault(); if (/验证码/.test(txt)) { busy(el, '已发送 60s', 1500); toast('验证码已发送至 138 **** 6688', 'ok'); return; } dialog({ title: '找回密码', body: fld('账号 / 手机号', inp('账号', 'wangshoucang')) + fld('短信验证码', inp('验证码', '', '6 位验证码')) + note('验证通过后将短信下发临时密码，登录后请立即修改。'), okText: '提交', onOk: function () { toast('临时密码已短信发送，请注意查收', 'ok'); } }); return; }
    if (/退出登录|退出/.test(txt) && real) return;

    /* 文件名 / 附件 / 菜谱 / 报告 → 原件预览 */
    if (/\.(jpe?g|png|pdf|xlsx?|docx?|csv)$/i.test(txt) || /附件|菜谱|调价函|历史版本|版本$|报告[（(]|^\d+\s*(张|份|个|页)$/.test(txt)) { if (real) return; e.preventDefault(); detailDrawer(el, txt); return; }
    if (/^查看/.test(txt) && !real) { e.preventDefault(); detailDrawer(el, txt.replace(/^查看/, '') + ' · 详情'); return; }
    if (/^已/.test(txt) && txt.length <= 4 && !real) { e.preventDefault(); toast('该记录' + txt + '，无需重复操作'); return; }
    if (/^(查询|搜索|检索)$/.test(txt) && !real) { e.preventDefault(); var box0 = el.closest('.ttool, .panel, .sec, .blk, .filter') || document.body; var words0 = $$('input', box0).filter(function (i) { return i.type !== 'date' && i.value.trim() && !i.closest('table'); }).map(function (i) { return i.value.trim(); }); var n0 = applyFilter(el.closest('.panel, .sec, .blk') || $('.work') || document.body, words0, []); toast(n0 < 0 ? '已按条件查询' : '查询完成，匹配 ' + n0 + ' 条记录', 'ok'); return; }
    if (/反馈|建议|投诉/.test(txt) && !real && !/问题反馈处理/.test(txt)) { e.preventDefault(); itemSheet(el); return; }
    if (/^(手工|手动)/.test(txt) && !real) {
      e.preventDefault();
      if (/选/.test(txt)) { pickerDrawer(el, txt); return; }
      var lab = /单号/.test(txt) ? '单据号' : /重/.test(txt) ? '实测重量（kg）' : '录入内容';
      dialog({ title: txt, body: fld(lab, inp(lab, /单号/.test(txt) ? 'DH-20260925-029' : /重/.test(txt) ? '74.00' : '')) + note(/重/.test(txt) ? '云秤离线或读数异常时可手工录重，系统将标记「手工录入」并要求监督员复核。' : '手工录入的信息将标记来源并留痕。'), okText: '确认', onOk: function (b) { var v = $('[data-f]', b).value; if (/重/.test(txt)) { var sv = $('.scale .v'); if (sv) { sv.textContent = (+v || 0).toFixed(2); sv.__lock = true; } } toast(txt + '完成：' + v + '，已标记来源并留痕', 'ok'); } });
      return;
    }
    if (/一键登录|认证登录/.test(txt) && !real) { e.preventDefault(); toast('已通过企业微信身份认证，正在进入工作台…', 'ok'); go(IS_M ? '../keeper/m-dashboard.html' : '../keeper/dashboard.html', 800); return; }

    /* 语音 / 称重 / 忙态类 */
    if (/语音|录音|说话/.test(txt) || el.closest('.voice')) { e.preventDefault(); doVoice(el); return; }
    if (/称重|读数|采集重量|重新称重|去皮/.test(txt)) { e.preventDefault(); doWeigh(el); return; }

    /* 导出 / 打印 */
    if (/导出|下载/.test(txt)) { e.preventDefault(); if (real && /导出任务|导出中心/.test(txt)) { location.href = href; return; } if (/模板/.test(txt)) { toast('模板「' + txt.replace(/下载/, '') + '」已开始下载', 'ok'); exportCSV(el); return; } busy(el, '导出中', 600, function () { exportCSV(el); }); return; }
    if (/打印|制牌|打印标签|重打/.test(txt)) { if (real) return; e.preventDefault(); printFor(el); return; }

    /* 保存 / 草稿 */
    if (/保存草稿|存草稿|暂存|保存为草稿/.test(txt)) { e.preventDefault(); markDone(el, '已存草稿'); setTimeout(function () { el.classList.remove('done'); el.textContent = txt; }, 2500); setHeroStatus('草稿'); toast('草稿已保存，仅本人可见，不占正式单号', 'ok'); addTimeline(USER + ' 保存草稿', '草稿可继续编辑后提交'); return; }
    if (/^保存|保存并|保存核定|保存配置|保存设置|保存并生效|确认保存|应用并保存/.test(txt) && !real) { e.preventDefault(); busy(el, '保存中', 600, function () { toast('已保存' + (/生效/.test(txt) ? '并生效' : '') + '，修改已写入审计日志', 'ok'); if (!row) setHeroStatus(/生效/.test(txt) ? '已生效' : '已保存'); else highlight(row); addTimeline(USER + ' 保存', txt); }); return; }

    /* 忙态即时反馈类 */
    if ((/^(刷新|同步|重试|重跑|重新生成|重新计算|重新测算|重新校验|校验|校准|测试|连接|测试连接|重新识别|识别|重新推送|立即执行|立即同步|手动同步|重新拉取|更新|检测|自检|执行|运行|重算|重新汇总|重新匹配|全部重跑)/.test(txt) || /测试|重跑|备份|清理|分析|排查|追溯|统计|切换|重新盘点|诊断|扫描漏洞|压测|巡检|同步至/.test(txt)) && !real && !/提交|生成/.test(txt)) {
      e.preventDefault();
      busy(el, /识别/.test(txt) ? '识别中' : /测试|连接/.test(txt) ? '连接中' : /生成|测算|计算/.test(txt) ? '计算中' : '处理中', 900, function () {
        if (row) setStatus(row, /识别/.test(txt) ? '已识别' : /测试|连接/.test(txt) ? '连接正常' : /生成|测算|计算/.test(txt) ? '已生成' : /校验/.test(txt) ? '校验通过' : '正常');
        var m = /备份/.test(txt) ? '备份完成：全量 2.6 GB 已写入双热备节点，校验一致' : /清理/.test(txt) ? '已清理 180 天前日志 12,486 条，释放 1.2 GB' : /切换/.test(txt) ? txt + '完成，数据已按新范围刷新' : /分析|排查|追溯|统计|诊断|巡检/.test(txt) ? txt + '完成：未发现高风险项，报告已生成' : /测试|连接/.test(txt) ? '连接测试通过，响应 82ms，接口凭证有效' : /识别/.test(txt) ? '识别完成，共识别 18 行明细，2 行需人工核对' : /同步|拉取|推送/.test(txt) ? '数据同步完成：新增 126 条，更新 18 条，用时 2.4s' : /生成|测算|计算|汇总/.test(txt) ? txt + '完成，结果已更新到当前页面' : /校验|检测|自检/.test(txt) ? '校验通过：三一致 100%，未发现差异' : txt + '完成，数据已更新';
        toast(m, 'ok');
        var t = $('.kv .kvi span, .kvl .it span'); if (/同步|刷新|更新/.test(txt)) $$('.kvi, .kvl .it').forEach(function (kv) { if (/最近同步|最后同步|更新时间|同步时间/.test(txtOf($('label', kv)))) $('span', kv).textContent = TODAY + ' ' + nowHM(); });
      });
      return;
    }
    if (/复制|复用|复制上次|复用历史|带入/.test(txt) && !real) { e.preventDefault(); fillRequired(true); toast('已复制上次内容到当前表单，请核对后提交', 'ok'); return; }
    if (/上传|拍照|选择文件|补拍|补传|重新上传|导入|批量导入|选择图片|补充材料|补充资料|补充证明/.test(txt) && !real) { e.preventDefault(); if (IS_M && /拍照|补拍/.test(txt)) { var ph = $('.photos .photo.add'); if (ph) { addPhoto(ph, mockPhoto(txt), txt); toast('已拍照并添加水印', 'ok'); return; } } pickFile(el, /图片|拍照|照片/.test(txt) ? 'image/*' : /导入/.test(txt) ? '.xlsx,.xls,.csv' : '', !/^上传$/.test(txt)); if (/导入/.test(txt)) fileInput.onchange = function () { if (!fileInput.files.length) return; var tbl = tableOf(el); if (tbl) { var tb = $('tbody', tbl), src = $('tr', tb); for (var i = 0; i < 3; i++) { var c = cloneRow(src, i + 3); tb.insertBefore(c, tb.firstChild); highlight(c); } } toast('已导入「' + fileInput.files[0].name + '」，解析 3 行，全部校验通过', 'ok'); }; return; }

    /* 评分 / 处理 */
    if (/评分|打分|去评分|人工评分|评价/.test(txt) && !real) { e.preventDefault(); rateDrawer(el); return; }
    if (/^(去处理|处理|去审核|审核|去受理|去审批|去核定|办理|去确认|去签收|去执行|去核验|核验|去评审|评审|初核|复核|去复核|去对账)$/.test(txt) && !real) { e.preventDefault(); handleDrawer(el); return; }

    /* 全部 / 更多 / 管理常用 */
    if (/管理常用/.test(txt)) { e.preventDefault(); manageQuick(el); return; }
    if (/^(全部|更多|查看全部|展开|收起|全部\s*\d+\s*条|全部\s*\d+\s*种|全部\s*\d+\s*家|全部\s*\d+\s*项)/.test(txt) && el.closest('.sh, .bh') && !real) { e.preventDefault(); expandAll(el); return; }

    if (el.matches('.smore, .bmore') && !real) { e.preventDefault(); detailDrawer(el, txt); return; }
    if (/^(管理|预警阈值|阈值|接入|参数|规则配置|策略)$|接入$|阈值$/.test(txt) && !real) { e.preventDefault(); formDrawer(el, 'new'); return; }
    if (/^(告警|进度|预警|监控|看板|中心|台账|清单|名单|榜单)$|中心$|进度$|告警$/.test(txt) && !real) { e.preventDefault(); detailDrawer(el, txt); return; }

    /* 新增 / 编辑 类表单 */
    if (/^(编辑|修改|变价|延期|调整|调价|维护|配置|设置|录入|登记|更换|重置密码|改批次|申请改批次|变更|补录|修正|校正|标注|备注|填写|修改密码)/.test(txt) && !real) { e.preventDefault(); if (/重置密码/.test(txt)) { confirmAction(el, { title: '重置密码', okText: '确认重置', status: '已重置', done: '已重置', fields: 'none', body: '重置后将生成 8 位临时密码并短信发送给用户，用户首次登录须修改。', msg: '{no}密码已重置，临时密码已短信发送' }); return; } if (/修改密码/.test(txt)) { itemSheet(el); return; } formDrawer(el, row && el.matches('.lnk, .mbtn, .btn') ? 'edit' : 'new'); return; }
    if (/^(新增|新建|添加|加入|添加明细|添加物资|添加行|新增一行|增加|创建|新建任务|新增定价|加入调拨|发起补货|发起调拨|发起补单|临时考评|新增规则|添加成员|添加人员|添加设备|添加配件|新增仓库|新增库位|新建导出)/.test(txt) && !real) { e.preventDefault(); if (/加入|添加行|新增一行|添加明细|添加物资/.test(txt) && tableOf(el)) { var tbl2 = tableOf(el), tb2 = $('tbody', tbl2), src2 = $$('tr', tb2).filter(function (r) { return !$('.empty', r); })[0]; if (src2) { var nr2 = row && row.tagName === 'TR' && !tbl2.contains(row) ? null : null; var c2 = cloneRow(src2, $$('tr', tb2).length + 1); tb2.appendChild(c2); highlight(c2); if (row && row.tagName === 'TR') { setStatus(row, '已加入'); markDone(el, '已加入'); } toast('已' + (/加入/.test(txt) ? '加入' : '新增') + ' 1 行明细，请核对数量后提交', 'ok'); return; } } formDrawer(el, 'new'); return; }

    /* 查看类 → 抽屉 */
    if (/^(详情|查看|明细|记录|日志|流程图|追溯链路|历史|查看原件|原件|PDF|查看 PDF|预览|评估报告|档案|字典项|人员|权限|标签|公示码|退货单|核对报告|查看报告|查看日志|报告|附件|凭证|发票|合同|版本|对照|差异明细|查看原因|原因|去看|查看详情|履历|轨迹|路线|温度曲线|曲线|趋势|对比|比价|汇总|台账|违规台账|历史台账|撤回记录|评分表|照片|查看照片|查看\s*\d+\s*张|\d+\s*张|\d+\s*张照片|地图|定位|轨迹回放|溯源|批次|检测报告|证照|资质|评分明细|得分构成|说明|帮助|规则|示意|关联单据|关联订单|订单详情|验收单|入库单|出库单|计划单|对账单|结算单|盘点表|工单|工资条|考勤|统计|分析|报表|排名|榜单|看板|监控)$/.test(txt) && !real) { e.preventDefault(); detailDrawer(el); return; }
    if (/^(选择|选单|手工选单|选择物资|选择供应商|选择批次|选择库位|选择人员|选择设备|筛选|高级筛选|更多筛选)/.test(txt) && !real) { e.preventDefault(); pickerDrawer(el, txt); return; }

    /* 移动端行 / 宫格 / 卡片（整行可点）：详情 sheet，不按文字当动作 */
    if (!real && el.matches('.rw, .tile, .qcard, .tdi:not(.go)')) { e.preventDefault(); itemSheet(el); return; }

    /* 业务动作 → 确认弹窗 */
    for (var i = 0; i < ACTIONS.length; i++) {
      if (ACTIONS[i].re.test(txt)) {
        if (/^(取消|返回|返回列表|关闭|跳过|上一步|下一步)/.test(txt)) break;
        e.preventDefault();
        if (ACTIONS[i].fields === 'none' && /^(标为已读|全部已读|已读|已阅)$/.test(txt)) { finish(el, ACTIONS[i]); if (/全部/.test(txt)) { $$('.tag').forEach(function (t) { if (txtOf(t) === '未读') { t.textContent = '已读'; t.className = 'tag t-d'; } }); $$('.bdg').forEach(function (b) { b.remove(); }); } return; }
        confirmAction(el, ACTIONS[i]);
        return;
      }
    }

    /* 行内「取消」= 取消该单据 */
    if (/^取消$/.test(txt) && !real && row && row.tagName === 'TR') { e.preventDefault(); confirmAction(el, { title: '确认取消', danger: true, okText: '确认取消', fields: 'reason', status: '已取消', done: '已取消', body: '取消后该单据不再执行，已发生的业务按原批次回冲，操作写入审计日志。', msg: '{no}已取消，已通知相关人员' }); return; }

    /* 导航类占位 */
    if (/^(取消|返回|返回列表|关闭|上一步)$/.test(txt) && !real) { e.preventDefault(); var nx = nextOf(el); if (nx) { location.href = nx; return; } if (history.length > 1) history.back(); else toast('已关闭'); return; }
    if (/^(下一步|继续|开始|进入|前往|去|跳过)/.test(txt) && !real) { e.preventDefault(); advanceSteps(); toast('已进入下一步', 'ok'); return; }
    if (real) return; // 真实链接直接跳转

    /* 移动端行 / 宫格 / 卡片 */
    if (el.matches('.rw, .tile, .qcard, .doc, .tdi')) { e.preventDefault(); itemSheet(el); return; }
    if (el.matches('.pill, .gbtn, .btn, .mbtn, .lnk, .b-mini, .b-gho, .act, .bmore, .smore, .go')) {
      e.preventDefault();
      // 名词类 → 详情抽屉；动词类 → 完成式反馈
      if (txt.length <= 6 && !/[了完成]/.test(txt) && /^(.*[单表码册栏图库表账书证录]|.*(报告|记录|明细|档案|清单|台账|名单|列表|信息|数据|资料|模板|规则|参数|配置|方案|设置|结果|详情|预览))$/.test(txt)) { detailDrawer(el); return; }
      window.__route = 'fallback:' + txt;
      if (row) setStatus(row, txt.length <= 4 ? '已' + txt.replace(/^已/, '') : '已处理');
      markDone(el, txt.length <= 4 ? '已' + txt.replace(/^已/, '') : '已完成');
      toast(txt + '已完成，操作人与时间已记录', 'ok');
      addTimeline(USER + ' ' + txt, '操作已完成并写入操作日志');
      return;
    }
    if (el.tagName === 'A' && href === '#') { e.preventDefault(); if (txt) detailDrawer(el, txt); }
  }
  function pickerDrawer(el, txt) {
    var kind = /供应商/.test(txt) ? SUP : /物资|物料/.test(txt) ? MAT : /人员/.test(txt) ? PEOPLE : /批次/.test(txt) ? ['PC-20260925-08 · 鲜猪后腿肉 · 效期 09-28', 'PC-20260920-01 · 优质长粒香米 · 效期 2027-03-19', 'PC-20260918-03 · 一级菜籽油 · 效期 2027-09-17', 'PC-20260912-06 · 一级生抽 · 效期 2028-03-11'] : /库位/.test(txt) ? ['A-01-1 常温区', 'A-01-2 常温区', 'B-01-1 冷藏区', 'B-01-2 冷藏区', 'C-01-1 冷冻区'] : /设备/.test(txt) ? ['EQ-2021-0042 四头炒炉 · 川湘档口', 'EQ-2022-0018 洗碗机 · 洗消间', 'EQ-2020-0063 立式冷柜 · 库房'] : ['PO-20260925-004 湘江粮油 · 本部 2 食堂 · 2 品种', 'PO-20260925-006 中鲜肉业 · 本部 2 食堂 · 3 品种', 'PO-20260925-007 本味调味品 · 本部 2 食堂 · 2 品种', 'PO-20260925-005 绿康蔬果 · 本部 2 食堂 · 4 品种'];
    var body = '<input class="inp" placeholder="输入关键词过滤" data-filter style="margin-bottom:6px">' + kind.map(function (k, i) { return '<div class="chkrow"><span class="cbox' + (i === 0 ? ' on' : '') + '"></span><span>' + esc(k) + '</span></div>'; }).join('');
    var d = dialog({ title: txt, body: body, drawer: !IS_M, okText: '确定', onOk: function (b) { var sels = $$('.chkrow', b).filter(function (r) { return $('.cbox.on', r); }).map(function (r) { return txtOf($('span:last-child', r)); }); toast('已选择：' + (sels.join('、') || '无'), 'ok'); var hint = $('.hint'); if (hint && sels[0]) { var sp = $('span', hint); if (sp) sp.innerHTML = '已调出 <b>' + esc(sels[0]) + '</b>，明细已带入。'; } } });
    d.body.addEventListener('click', function (e) { var cb = e.target.closest('.cbox'); if (cb) { e.stopPropagation(); if (!/供应商|人员|物资|批次|库位|设备|筛选/.test(txt) || /选单|订单/.test(txt)) $$('.cbox', d.body).forEach(function (x) { x.classList.remove('on'); }); cb.classList.toggle('on'); } }, true);
    d.body.addEventListener('input', function (e) { if (!e.target.matches('[data-filter]')) return; var q = e.target.value.trim(); $$('.chkrow', d.body).forEach(function (r) { r.classList.toggle('hide', q && txtOf(r).indexOf(q) < 0); }); });
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('a, button');
    if (!el) return;
    if (el.closest('.mask, .mmask, .bellpop, .scanmask')) return;                     // 弹层内部自行处理
    if (el.matches('.cbox, .tab, .pg, .ti, .b-search, .b-reset, .lg-tabs a') || el.closest('.seg, .pills, .segs, .tabs, .pages, .tree')) return;
    if (el.closest('.navlbl')) return;
    if (el.tagName === 'BUTTON' && el.closest('.stop')) return;                      // 大屏顶栏自带逻辑
    var href = el.getAttribute('href') || '';
    var txt = txtOf(el);
    var real = href && href !== '#' && !/^javascript:/.test(href);
    if (el.getAttribute('data-act')) { route(el, e); return; }
    if (real && /扫码|扫一扫|打码|扫描/.test(txt) && !el.matches('.nav, .tile, .qcard')) { e.preventDefault(); doScan(el); return; }
    // 真实链接：仅业务动作按钮先确认再跳；导航类直接放行
    if (real) {
      // 只有表单页底部提交栏 / 移动端操作栏里的业务动作才「先确认再跳转」，其余真实链接（行内、卡片、菜单）直接导航
      var isAction = el.closest('.footbar, .actbar') && ACTIONS.some(function (a) { return a.re.test(txt); }) && !/^(取消|返回|跳过|下一步|上一步|去|查看|详情|处理|开始|进入|继续|全部|更多|手工|重新|返回)/.test(txt);
      if (!isAction) return;
      if (/^(登\s*录)$/.test(txt)) { route(el, e); return; }
      e.preventDefault();
      el.setAttribute('data-next', href);
      route(el, e);
      return;
    }
    route(el, e);
  });

  /* ================= 必填项演示预填 / 校验 ================= */
  function fillRequired(force) {
    $$('.fld').forEach(function (f) {
      var l = f.querySelector('label'); if (!l || (!force && !l.classList.contains('req'))) return;
      var i = f.querySelector('input.inp, textarea.inp'); if (!i || (i.value && !force) || i.type === 'date' || i.type === 'password') return;
      if (i.closest('.mask')) return;
      var v = guess(l.textContent); i.value = v || (i.placeholder && !/^请/.test(i.placeholder) ? i.placeholder : '已填写');
    });
    $$('.mfi').forEach(function (f) {
      var l = f.querySelector('label'); if (!l || (!force && !l.classList.contains('req'))) return;
      var i = f.querySelector('input, textarea'); if (!i || (i.value && !force) || i.type === 'date') return;
      var v = guess(l.textContent); i.value = v || (i.placeholder && !/^请/.test(i.placeholder) && !/位|如 /.test(i.placeholder) ? i.placeholder : '已填写');
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('a, button');
    if (!b || b.closest('.mask, .mmask') || !/提交|核定并|审核通过|签字|确认发货|提交审核|提交审批/.test(txtOf(b))) return;
    var bad = null;
    $$('.fld, .mfi').forEach(function (f) {
      if (bad || f.closest('.mask, .mmask')) return;
      var l = f.querySelector('label'); if (!l || !l.classList.contains('req')) return;
      var i = f.querySelector('input, textarea, select'); if (i && !i.value) bad = f;
    });
    if (bad) {
      e.preventDefault(); e.stopImmediatePropagation();
      var i2 = bad.querySelector('input, textarea, select'); if (i2) { i2.style.borderColor = '#E41E3F'; i2.focus(); }
      toast('「' + bad.querySelector('label').textContent.replace('*', '').trim() + '」为必填项，请填写后提交', 'err');
    }
  }, true);

  /* ================= 初始化 ================= */
  function init() {
    $$('.signpad, .sign').forEach(initSign);
    initScale();
    fillRequired();
    applyQuery();
    // 移动端 select 原生可用；旧标记 .mid 兜底
    $$('.tabbar .mid').forEach(function (a) { if (!a.getAttribute('data-act')) a.setAttribute('data-act', 'scan'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
