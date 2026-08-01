(function () {
  'use strict';

  // ---------- Storage keys ----------
  var STORAGE_KEYS = {
    entries: 'diary_entries',
    tags: 'diary_customTags',
    groups: 'diary_customGroups',
    apiKey: 'diary_apiKey',
    model: 'diary_model',
    hiddenTags: 'diary_hiddenTags',
    groupOrder: 'diary_groupOrder',
    groupOrderCustomized: 'diary_groupOrderCustomized',
    aiProvider: 'diary_aiProvider',
    geminiApiKey: 'diary_geminiApiKey',
    geminiModel: 'diary_geminiModel',
  };

  var SYNC_KEYS = {
    url: 'diary_syncUrl',
    anonKey: 'diary_syncAnonKey',
    passphrase: 'diary_syncPassphrase',
  };

  var DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
  var DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

  // ---------- Static data ----------
  var MOODS = [
    { value: 1, emoji: '😊', label: 'とても良い' },
    { value: 2, emoji: '🙂', label: '良い' },
    { value: 3, emoji: '😐', label: '普通' },
    { value: 4, emoji: '😕', label: 'いまいち' },
    { value: 5, emoji: '😞', label: '悪い' },
  ];

  var TAG_GROUPS = ['起床時間', '食事', '場所・買い物', '外食', '日課', 'その他'];

  var DEFAULT_TAGS = [
    // 起床時間
    { id: 'wake_6', label: '6時', group: '起床時間' },
    { id: 'wake_7', label: '7時', group: '起床時間' },
    { id: 'wake_8', label: '8時', group: '起床時間' },
    // 食事
    { id: 'breakfast', label: '朝食', group: '食事' },
    { id: 'lunch', label: '昼食', group: '食事' },
    { id: 'dinner', label: '夕食', group: '食事' },
    { id: 'snack', label: 'おやつ', group: '食事' },
    { id: 'between_meals', label: '間食', group: '食事' },
    // 場所・買い物
    { id: 'school', label: '学校', group: '場所・買い物' },
    { id: 'work', label: '会社', group: '場所・買い物' },
    { id: 'seven', label: 'セブン', group: '場所・買い物' },
    { id: 'lawson', label: 'ローソン', group: '場所・買い物' },
    { id: 'famima', label: 'ファミマ', group: '場所・買い物' },
    { id: 'aeon', label: 'イオン', group: '場所・買い物' },
    // 外食
    { id: 'yoshinoya', label: '吉野家', group: '外食' },
    { id: 'mac', label: 'マック', group: '外食' },
    { id: 'starbucks', label: 'スタバ', group: '外食' },
    { id: 'hanamaru', label: 'はなまる', group: '外食' },
    // 日課
    { id: 'reading', label: '読書', group: '日課' },
    { id: 'tv', label: 'TV視聴', group: '日課' },
    { id: 'youtube', label: 'Youtube視聴', group: '日課' },
    { id: 'anime', label: 'アニメ視聴', group: '日課' },
    { id: 'drama', label: 'ドラマ視聴', group: '日課' },
    { id: 'movie', label: '映画視聴', group: '日課' },
    { id: 'walk', label: '散歩', group: '日課' },
    { id: 'cooking', label: '料理', group: '日課' },
    { id: 'laundry', label: '洗濯', group: '日課' },
    { id: 'cleaning', label: '掃除', group: '日課' },
    { id: 'jpop', label: 'Jpop視聴', group: '日課' },
    { id: 'invest', label: '投資', group: '日課' },
    { id: 'training', label: '筋トレ', group: '日課' },
    { id: 'golf', label: 'ゴルフ', group: '日課' },
    { id: 'study', label: '資格勉強', group: '日課' },
    { id: 'homework', label: '宿題', group: '日課' },
  ];

  // ---------- Utilities ----------
  function uid(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function toISODateLocal(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function formatDateJP(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
  }

  function formatDateShortJP(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getStatus(entry) {
    return entry.status || (entry.generatedText ? 'done' : 'draft');
  }

  function fallbackText(moodLabel, tagLabels, memo) {
    var s = '';
    if (tagLabels.length > 0) {
      s += '今日は' + tagLabels.join('、') + 'をした。';
    } else {
      s += '今日は特に何もない、いつも通りの一日だった。';
    }
    if (memo && memo.trim()) {
      s += memo.trim() + '。';
    }
    s += '気分は' + moodLabel + 'だった。';
    return s;
  }

  function loadJSON(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('保存に失敗しました', e);
    }
  }

  // ---------- Icons (inline SVG strings) ----------
  var ICONS = {
    back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
    home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
    book: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    spinner: '<svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-9-9"></path></svg>',
    hanko: function (size) {
      return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 140 140">' +
        '<circle cx="70" cy="70" r="62" fill="var(--hanko)" opacity="0.92"/>' +
        '<circle cx="70" cy="70" r="62" fill="none" stroke="var(--hanko)" stroke-width="4" opacity="0.4"/>' +
        '<text x="70" y="88" text-anchor="middle" font-size="54" font-family="\'Shippori Mincho\', serif" font-weight="700" fill="#F6EFE3">済</text>' +
        '</svg>';
    },
  };

  // ---------- State ----------
  var state = {
    view: 'home',
    entries: loadJSON(STORAGE_KEYS.entries, []),
    customTags: loadJSON(STORAGE_KEYS.tags, []),
    customGroups: loadJSON(STORAGE_KEYS.groups, []),
    hiddenTagIds: loadJSON(STORAGE_KEYS.hiddenTags, []),
    groupOrder: loadJSON(STORAGE_KEYS.groupOrder, null),
    groupOrderCustomized: localStorage.getItem(STORAGE_KEYS.groupOrderCustomized) === '1',
    apiKey: localStorage.getItem(STORAGE_KEYS.apiKey) || '',
    aiProvider: localStorage.getItem(STORAGE_KEYS.aiProvider) || 'anthropic',
    anthropicModel: localStorage.getItem(STORAGE_KEYS.model) || DEFAULT_MODEL,
    geminiApiKey: localStorage.getItem(STORAGE_KEYS.geminiApiKey) || '',
    geminiModel: localStorage.getItem(STORAGE_KEYS.geminiModel) || DEFAULT_GEMINI_MODEL,
    draft: null,
    newTagInput: '',
    newTagGroup: '場所・買い物',
    addingGroup: false,
    newGroupInput: '',
    tagEditMode: false,
    generating: false,
    genNotice: '',
    toast: '',
    showStamp: false,
    showSettings: false,
    exportText: '',
    importInput: '',
    importNotice: '',
    syncUrl: localStorage.getItem(SYNC_KEYS.url) || '',
    syncAnonKey: localStorage.getItem(SYNC_KEYS.anonKey) || '',
    syncPassphrase: localStorage.getItem(SYNC_KEYS.passphrase) || '',
    syncStatus: 'idle', // idle | syncing | synced | error
    lastSyncedAt: null,
    calendarMonth: null, // 'YYYY-MM', null = current month
  };

  function persistEntries() { saveJSON(STORAGE_KEYS.entries, state.entries); }
  function persistTags() { saveJSON(STORAGE_KEYS.tags, state.customTags); }
  function persistGroups() { saveJSON(STORAGE_KEYS.groups, state.customGroups); }
  function persistHiddenTags() { saveJSON(STORAGE_KEYS.hiddenTags, state.hiddenTagIds); }
  function persistGroupOrder() { saveJSON(STORAGE_KEYS.groupOrder, state.groupOrder); }

  function allTags() { return DEFAULT_TAGS.concat(state.customTags); }

  // Keeps state.groupOrder in sync with the actual set of categories
  // (default + custom), preserving any manual reordering the user made,
  // and appending newly-added categories at the end.
  function reconcileGroupOrder() {
    var actual = TAG_GROUPS.concat(state.customGroups);
    if (!Array.isArray(state.groupOrder)) state.groupOrder = actual.slice();
    state.groupOrder = state.groupOrder.filter(function (g) { return actual.indexOf(g) !== -1; });
    actual.forEach(function (g) { if (state.groupOrder.indexOf(g) === -1) state.groupOrder.push(g); });
  }
  reconcileGroupOrder();

  function allGroups() {
    reconcileGroupOrder();
    return state.groupOrder;
  }

  function isTagHidden(id) { return state.hiddenTagIds.indexOf(id) !== -1; }
  function visibleTags() { return allTags().filter(function (t) { return !isTagHidden(t.id); }); }

  function todayStr() { return toISODateLocal(new Date()); }

  // ---------- Actions ----------
  function newDraft(dateStr) {
    return { date: dateStr, mood: 3, tags: new Set(), memo: '', generatedText: '', editedText: '', editingId: null };
  }

  function startToday() {
    var existing = state.entries.find(function (e) { return e.date === todayStr(); });
    if (existing) {
      openEntry(existing);
    } else {
      state.draft = newDraft(todayStr());
      state.genNotice = '';
      state.view = 'record';
    }
    render();
  }

  function openEntry(entry) {
    state.draft = {
      date: entry.date,
      mood: entry.mood,
      tags: new Set(entry.tags || []),
      memo: entry.memo || '',
      generatedText: entry.generatedText || '',
      editedText: entry.editedText || entry.generatedText || '',
      editingId: entry.id,
    };
    state.genNotice = '';
    state.view = 'record';
    render();
  }

  function toggleTag(id) {
    if (!state.draft) return;
    if (state.draft.tags.has(id)) state.draft.tags.delete(id); else state.draft.tags.add(id);
    render();
  }

  function addCustomTag() {
    var label = (state.newTagInput || '').trim();
    if (!label) return;
    var id = uid('custom');
    state.customTags.push({ id: id, label: label, group: state.newTagGroup });
    persistTags();
    if (state.draft) state.draft.tags.add(id);
    state.newTagInput = '';
    render();
    if (syncEnabled()) pushToSupabase();
  }

  function addCustomGroup() {
    var label = (state.newGroupInput || '').trim();
    if (!label) {
      state.addingGroup = false;
      render();
      return;
    }
    if (allGroups().indexOf(label) === -1) {
      state.customGroups.push(label);
      persistGroups();
      reconcileGroupOrder();
      persistGroupOrder();
    }
    state.newTagGroup = label;
    state.newGroupInput = '';
    state.addingGroup = false;
    render();
    if (syncEnabled()) pushToSupabase();
  }

  // Tags are never truly erased: "deleting" hides a tag from the selection
  // UI (so past entries that reference it still display correctly).
  function deleteTag(id) {
    var tag = allTags().filter(function (t) { return t.id === id; })[0];
    var label = tag ? tag.label : 'このタグ';
    if (!window.confirm(label + ' を削除しますか？（過去の記録には影響しません。あとで「非表示にしたタグ」から戻せます）')) return;
    if (state.hiddenTagIds.indexOf(id) === -1) state.hiddenTagIds.push(id);
    persistHiddenTags();
    if (state.draft) state.draft.tags.delete(id);
    render();
    if (syncEnabled()) pushToSupabase();
  }

  function restoreTag(id) {
    state.hiddenTagIds = state.hiddenTagIds.filter(function (x) { return x !== id; });
    persistHiddenTags();
    render();
    if (syncEnabled()) pushToSupabase();
  }

  function moveGroupOrder(name, dir) {
    reconcileGroupOrder();
    var idx = state.groupOrder.indexOf(name);
    if (idx === -1) return;
    var newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= state.groupOrder.length) return;
    var arr = state.groupOrder.slice();
    var tmp = arr[idx];
    arr[idx] = arr[newIdx];
    arr[newIdx] = tmp;
    state.groupOrder = arr;
    persistGroupOrder();
    state.groupOrderCustomized = true;
    localStorage.setItem(STORAGE_KEYS.groupOrderCustomized, '1');
    render();
    if (syncEnabled()) pushToSupabase();
  }

  function callAnthropic(prompt) {
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': state.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: state.anthropicModel || DEFAULT_MODEL,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('api_error_' + res.status);
        return res.json();
      })
      .then(function (data) {
        var text = (data.content || [])
          .filter(function (b) { return b.type === 'text'; })
          .map(function (b) { return b.text; })
          .join('')
          .trim();
        if (!text) throw new Error('empty');
        return text;
      });
  }

  function callGemini(prompt) {
    var model = state.geminiModel || DEFAULT_GEMINI_MODEL;
    return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': state.geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('api_error_' + res.status);
        return res.json();
      })
      .then(function (data) {
        var candidate = (data.candidates || [])[0];
        var parts = candidate && candidate.content && candidate.content.parts ? candidate.content.parts : [];
        var text = parts.map(function (p) { return p.text || ''; }).join('').trim();
        if (!text) throw new Error('empty');
        return text;
      });
  }

  function buildPrompt(moodLabel, tagLabels, memo) {
    return '以下の情報から、日本語で自然な一人称の日記文を2〜3文で作成してください。' +
      '淡々とした一日の記録として書き、誇張や過度な感情表現は避けてください。' +
      '日記本文のみを出力し、前置き・タイトル・鍵括弧は付けないでください。\n\n' +
      '気分: ' + moodLabel + '\n' +
      '行動・場所: ' + (tagLabels.length ? tagLabels.join('、') : '特になし') + '\n' +
      'メモ: ' + (memo && memo.trim() ? memo.trim() : 'なし');
  }

  function handleGenerate() {
    if (!state.draft || state.generating) return;
    state.generating = true;
    state.genNotice = '';
    render();

    var moodObj = MOODS.filter(function (m) { return m.value === state.draft.mood; })[0];
    var moodLabel = moodObj ? moodObj.label : '普通';
    var tagLabels = Array.from(state.draft.tags).map(function (id) {
      var t = allTags().filter(function (x) { return x.id === id; })[0];
      return t ? t.label : null;
    }).filter(Boolean);
    var memo = state.draft.memo || '';

    function finishWithFallback(notice) {
      var text = fallbackText(moodLabel, tagLabels, memo);
      state.draft.generatedText = text;
      state.draft.editedText = text;
      state.generating = false;
      state.genNotice = notice;
      render();
    }

    var activeKey = state.aiProvider === 'gemini' ? state.geminiApiKey : state.apiKey;
    if (!activeKey) {
      finishWithFallback('APIキー未設定のため、簡易文を作成しました。右上の設定からAPIキーを登録すると、AIが自然な文章を作ってくれます。');
      return;
    }

    var prompt = buildPrompt(moodLabel, tagLabels, memo);
    var call = state.aiProvider === 'gemini' ? callGemini(prompt) : callAnthropic(prompt);

    call
      .then(function (text) {
        state.draft.generatedText = text;
        state.draft.editedText = text;
        state.generating = false;
        state.genNotice = '';
        render();
      })
      .catch(function (err) {
        console.error('AI生成に失敗しました', err);
        finishWithFallback('AIでの生成ができなかったため、簡易文を作成しました。下で書き直せます。（' + err.message + '）');
      });
  }

  function handleSaveDraft() {
    if (!state.draft) return;
    var now = Date.now();
    var existingByDate = state.entries.find(function (e) { return e.date === state.draft.date; });
    var targetId = state.draft.editingId || (existingByDate ? existingByDate.id : null);

    if (targetId) {
      state.entries = state.entries.map(function (e) {
        if (e.id !== targetId) return e;
        return Object.assign({}, e, {
          mood: state.draft.mood,
          tags: Array.from(state.draft.tags),
          memo: state.draft.memo,
          status: 'draft',
          updatedAt: now,
        });
      });
    } else {
      var entry = {
        id: uid('e'),
        date: state.draft.date,
        mood: state.draft.mood,
        tags: Array.from(state.draft.tags),
        memo: state.draft.memo,
        generatedText: '',
        editedText: '',
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      };
      state.entries = [entry].concat(state.entries);
    }
    state.entries.sort(function (a, b) { return b.date.localeCompare(a.date); });
    persistEntries();
    state.draft = null;
    state.view = 'home';
    state.toast = '下書きを保存しました。あとでまとめて日記にできます。';
    render();
    scheduleToastClear();
    if (syncEnabled()) pushToSupabase();
  }

  function handleSave() {
    if (!state.draft) return;
    var finalText = (state.draft.editedText || state.draft.generatedText || '').trim();
    if (!finalText) return;
    var now = Date.now();

    if (state.draft.editingId) {
      state.entries = state.entries.map(function (e) {
        if (e.id !== state.draft.editingId) return e;
        return Object.assign({}, e, {
          mood: state.draft.mood,
          tags: Array.from(state.draft.tags),
          memo: state.draft.memo,
          generatedText: state.draft.generatedText,
          editedText: finalText,
          status: 'done',
          updatedAt: now,
        });
      });
    } else {
      var entry = {
        id: uid('e'),
        date: state.draft.date,
        mood: state.draft.mood,
        tags: Array.from(state.draft.tags),
        memo: state.draft.memo,
        generatedText: state.draft.generatedText,
        editedText: finalText,
        status: 'done',
        createdAt: now,
        updatedAt: now,
      };
      var idx = state.entries.findIndex(function (e) { return e.date === state.draft.date; });
      if (idx >= 0) {
        state.entries = state.entries.slice();
        state.entries[idx] = entry;
      } else {
        state.entries = [entry].concat(state.entries);
      }
    }
    state.entries.sort(function (a, b) { return b.date.localeCompare(a.date); });
    persistEntries();
    state.showStamp = true;
    render();
    if (syncEnabled()) pushToSupabase();
    setTimeout(function () {
      state.showStamp = false;
      state.draft = null;
      state.view = 'home';
      render();
    }, 950);
  }

  function resetAll() {
    if (!window.confirm('保存されている記録をすべて削除します。よろしいですか？')) return;
    state.entries = [];
    persistEntries();
    render();
  }

  function saveAiSettings() {
    var anthKeyEl = document.querySelector('[data-bind="apiKeyInput"]');
    var anthModelEl = document.querySelector('[data-bind="anthropicModelInput"]');
    var geminiKeyEl = document.querySelector('[data-bind="geminiApiKeyInput"]');
    var geminiModelEl = document.querySelector('[data-bind="geminiModelInput"]');

    if (anthKeyEl) {
      state.apiKey = anthKeyEl.value.trim();
      if (state.apiKey) localStorage.setItem(STORAGE_KEYS.apiKey, state.apiKey);
      else localStorage.removeItem(STORAGE_KEYS.apiKey);
    }
    if (anthModelEl) {
      state.anthropicModel = anthModelEl.value.trim() || DEFAULT_MODEL;
      localStorage.setItem(STORAGE_KEYS.model, state.anthropicModel);
    }
    if (geminiKeyEl) {
      state.geminiApiKey = geminiKeyEl.value.trim();
      if (state.geminiApiKey) localStorage.setItem(STORAGE_KEYS.geminiApiKey, state.geminiApiKey);
      else localStorage.removeItem(STORAGE_KEYS.geminiApiKey);
    }
    if (geminiModelEl) {
      state.geminiModel = geminiModelEl.value.trim() || DEFAULT_GEMINI_MODEL;
      localStorage.setItem(STORAGE_KEYS.geminiModel, state.geminiModel);
    }
    state.showSettings = false;
    render();
  }

  function exportDataString() {
    return JSON.stringify({
      entries: state.entries,
      customTags: state.customTags,
      customGroups: state.customGroups,
      hiddenTagIds: state.hiddenTagIds,
      groupOrder: state.groupOrder,
      exportedAt: Date.now(),
    });
  }

  // Merge data exported from another device into this device's storage.
  // Entries are merged by id (newest updatedAt wins). If two different
  // entries exist for the same date (created independently on two devices
  // before ever syncing), only the most recently updated one is kept, since
  // the app's model assumes one entry per date.
  function mergeImportedData(imported) {
    var incomingEntries = Array.isArray(imported.entries) ? imported.entries : [];
    var byId = {};
    state.entries.forEach(function (e) { byId[e.id] = e; });
    incomingEntries.forEach(function (e) {
      var existing = byId[e.id];
      if (!existing || (e.updatedAt || 0) > (existing.updatedAt || 0)) {
        byId[e.id] = e;
      }
    });
    var merged = Object.keys(byId).map(function (k) { return byId[k]; });

    var byDate = {};
    merged.forEach(function (e) {
      var cur = byDate[e.date];
      if (!cur || (e.updatedAt || 0) > (cur.updatedAt || 0)) byDate[e.date] = e;
    });
    state.entries = Object.keys(byDate).map(function (k) { return byDate[k]; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); });
    persistEntries();

    var incomingTags = Array.isArray(imported.customTags) ? imported.customTags : [];
    incomingTags.forEach(function (t) {
      if (!state.customTags.some(function (x) { return x.id === t.id; })) state.customTags.push(t);
    });
    persistTags();

    var incomingGroups = Array.isArray(imported.customGroups) ? imported.customGroups : [];
    incomingGroups.forEach(function (g) {
      if (allGroups().indexOf(g) === -1) state.customGroups.push(g);
    });
    persistGroups();

    // Hidden tags: union of both devices' hidden lists (once hidden on
    // either device, it stays hidden after merging).
    var incomingHidden = Array.isArray(imported.hiddenTagIds) ? imported.hiddenTagIds : [];
    incomingHidden.forEach(function (id) {
      if (state.hiddenTagIds.indexOf(id) === -1) state.hiddenTagIds.push(id);
    });
    persistHiddenTags();

    // Category order: only adopt the incoming order if this device hasn't
    // manually reordered categories itself, so a device that already
    // reordered isn't silently overridden by another device's order.
    if (!state.groupOrderCustomized && Array.isArray(imported.groupOrder)) {
      state.groupOrder = imported.groupOrder.slice();
    }
    reconcileGroupOrder();
    persistGroupOrder();
  }

  // ---------- Auto sync (Supabase) ----------
  function syncEnabled() {
    return !!(state.syncUrl && state.syncAnonKey && state.syncPassphrase);
  }

  async function sha256Hex(text) {
    var enc = new TextEncoder().encode(text);
    var hash = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(hash)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  async function pushToSupabase() {
    if (!syncEnabled()) return;
    try {
      var keyHash = await sha256Hex(state.syncPassphrase);
      var payload = {
        entries: state.entries,
        customTags: state.customTags,
        customGroups: state.customGroups,
        hiddenTagIds: state.hiddenTagIds,
        groupOrder: state.groupOrder,
      };
      var res = await fetch(state.syncUrl.replace(/\/$/, '') + '/rest/v1/diary_sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: state.syncAnonKey,
          Authorization: 'Bearer ' + state.syncAnonKey,
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify([{ sync_key: keyHash, payload: payload, updated_at: new Date().toISOString() }]),
      });
      if (!res.ok) throw new Error('push_failed_' + res.status);
      state.syncStatus = 'synced';
      state.lastSyncedAt = Date.now();
    } catch (e) {
      console.error('同期(送信)に失敗しました', e);
      state.syncStatus = 'error';
    }
    render();
  }

  async function pullFromSupabase(silent) {
    if (!syncEnabled()) return;
    try {
      var keyHash = await sha256Hex(state.syncPassphrase);
      var url = state.syncUrl.replace(/\/$/, '') + '/rest/v1/diary_sync?sync_key=eq.' + encodeURIComponent(keyHash) + '&select=payload,updated_at';
      var res = await fetch(url, {
        headers: { apikey: state.syncAnonKey, Authorization: 'Bearer ' + state.syncAnonKey },
      });
      if (!res.ok) throw new Error('pull_failed_' + res.status);
      var rows = await res.json();
      if (rows && rows.length > 0 && rows[0].payload) {
        mergeImportedData(rows[0].payload);
      }
      state.syncStatus = 'synced';
      state.lastSyncedAt = Date.now();
    } catch (e) {
      console.error('同期(取得)に失敗しました', e);
      if (!silent) state.syncStatus = 'error';
    }
    render();
  }

  var toastTimer = null;
  function scheduleToastClear() {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { state.toast = ''; render(); }, 3200);
  }

  // ---------- Rendering ----------
  var root = document.getElementById('app');

  function headerTitle() {
    if (state.view === 'home') return 'ポチっと日記';
    if (state.view === 'record' && state.draft) return formatDateJP(state.draft.date);
    if (state.view === 'list') return '記録一覧';
    return '';
  }

  function renderDraftCard(e) {
    var mood = MOODS.filter(function (m) { return m.value === e.mood; })[0];
    var tags = (e.tags || []).map(function (tid) {
      var t = allTags().filter(function (x) { return x.id === tid; })[0];
      return t ? '<span class="entry-tag-chip">' + escapeHtml(t.label) + '</span>' : '';
    }).join('');
    return '<div class="entry-card draft" data-action="open-entry" data-id="' + escapeHtml(e.id) + '">' +
      '<div class="entry-card-top">' +
      '<span class="entry-date">' + formatDateShortJP(e.date) + '</span>' +
      '<span class="entry-mood">' + (mood ? mood.emoji : '') + '</span>' +
      '<span class="badge-draft">未生成</span>' +
      '</div>' +
      (tags ? '<div class="entry-tags">' + tags + '</div>' : '') +
      (e.memo ? '<div class="entry-text">' + escapeHtml(e.memo) + '</div>' : '') +
      '</div>';
  }

  function renderHome() {
    var today = state.entries.find(function (e) { return e.date === todayStr(); });
    var drafts = state.entries.filter(function (e) { return getStatus(e) === 'draft'; });
    var recent = state.entries.slice(0, 5);
    var ctaLabel = '今日を記録する';
    if (today) {
      ctaLabel = getStatus(today) === 'draft' ? '今日の続きを記録する' : '今日の記録を見る・直す';
    }

    var html = '';
    if (state.toast) html += '<div class="toast">' + escapeHtml(state.toast) + '</div>';
    html += '<div class="hero-copy"><div class="mincho">ちいさな一日を、ひとことで。</div></div>';
    html += '<button class="cta-button" data-action="start-today">' + escapeHtml(ctaLabel) + '</button>';

    if (drafts.length > 0) {
      html += '<div class="section-label">生成待ちの記録（' + drafts.length + '件）</div>';
      html += '<div class="empty-note draft-hint">外出先でつけたタグ・メモがたまっています。落ち着いたときにまとめて日記にしましょう。</div>';
      drafts.forEach(function (e) { html += renderDraftCard(e); });
    }

    html += '<div class="section-label">直近の記録</div>';
    if (recent.length === 0) {
      html += '<div class="empty-note">まだ記録がありません。今日から、タップだけで始めてみましょう。</div>';
    } else {
      html += '<div class="recent-strip">';
      recent.forEach(function (e) {
        var mood = MOODS.filter(function (m) { return m.value === e.mood; })[0];
        var text = e.editedText || (getStatus(e) === 'draft' ? '（タグのみ・未生成）' : '');
        html += '<div class="mini-card" data-action="open-entry" data-id="' + escapeHtml(e.id) + '">' +
          '<div class="mc-date">' + formatDateShortJP(e.date) + '</div>' +
          '<div class="mc-emoji">' + (mood ? mood.emoji : '') + '</div>' +
          '<div class="mc-text">' + escapeHtml(text) + '</div>' +
          '</div>';
      });
      html += '</div>';
    }

    if (state.entries.length > 0) {
      html += '<button class="reset-link" data-action="reset-all">保存データをすべて削除（テスト用）</button>';
    }
    return html;
  }

  function shiftMonth(monthStr, delta) {
    var parts = monthStr.split('-');
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var d = new Date(y, m + delta, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function renderCalendar() {
    var monthStr = state.calendarMonth || todayStr().slice(0, 7);
    var parts = monthStr.split('-');
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var startWeekday = new Date(y, m, 1).getDay();
    var todayS = todayStr();

    var byDate = {};
    var entryByDate = {};
    state.entries.forEach(function (e) {
      byDate[e.date] = getStatus(e);
      entryByDate[e.date] = e;
    });

    var html = '<div class="cal-header">' +
      '<button class="cal-nav" data-action="cal-prev">‹</button>' +
      '<span class="cal-title mincho">' + y + '年' + (m + 1) + '月</span>' +
      '<button class="cal-nav" data-action="cal-next">›</button>' +
      '</div>';

    html += '<div class="cal-grid cal-weekdays">';
    ['日', '月', '火', '水', '木', '金', '土'].forEach(function (w) {
      html += '<div class="cal-weekday">' + w + '</div>';
    });
    html += '</div>';

    html += '<div class="cal-grid">';
    for (var i = 0; i < startWeekday; i++) html += '<div class="cal-cell empty"></div>';
    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      var status = byDate[dateStr];
      var cls = 'cal-cell';
      if (dateStr === todayS) cls += ' today';
      if (status) cls += ' has-entry ' + status;
      var entry = entryByDate[dateStr];
      html += '<div class="' + cls + '"' + (entry ? ' data-action="open-entry" data-id="' + escapeHtml(entry.id) + '"' : '') + '>' +
        '<span class="cal-daynum">' + day + '</span>' +
        (status ? '<span class="cal-dot"></span>' : '') +
        '</div>';
    }
    html += '</div>';

    html += '<div class="cal-legend">' +
      '<span class="legend-item"><span class="cal-dot-icon done"></span>確定済み</span>' +
      '<span class="legend-item"><span class="cal-dot-icon draft"></span>下書きのみ</span>' +
      '</div>';

    return html;
  }

  function renderList() {
    var html = renderCalendar();
    html += '<div class="section-label">すべての記録</div>';
    if (state.entries.length === 0) {
      html += '<div class="empty-note">まだ記録がありません。ホームから今日の記録をつけてみましょう。</div>';
      return html;
    }
    html += state.entries.map(function (e) {
      var mood = MOODS.filter(function (m) { return m.value === e.mood; })[0];
      var status = getStatus(e);
      var tags = (e.tags || []).map(function (tid) {
        var t = allTags().filter(function (x) { return x.id === tid; })[0];
        return t ? '<span class="entry-tag-chip">' + escapeHtml(t.label) + '</span>' : '';
      }).join('');
      var text = e.editedText || (status === 'draft' ? (e.memo || '（タグのみ・まだ日記文は未生成です）') : '');
      return '<div class="entry-card ' + (status === 'draft' ? 'draft' : '') + '" data-action="open-entry" data-id="' + escapeHtml(e.id) + '">' +
        '<div class="entry-card-top">' +
        '<span class="entry-date">' + formatDateShortJP(e.date) + '</span>' +
        '<span class="entry-mood">' + (mood ? mood.emoji : '') + '</span>' +
        (status === 'draft' ? '<span class="badge-draft">未生成</span>' : '') +
        '</div>' +
        (tags ? '<div class="entry-tags">' + tags + '</div>' : '') +
        '<div class="entry-text">' + escapeHtml(text) + '</div>' +
        '</div>';
    }).join('');
    return html;
  }

  function renderRecord() {
    var d = state.draft;
    var html = '';

    html += '<div class="field-label">今日の気分は？</div><div class="mood-row">';
    MOODS.forEach(function (m) {
      html += '<button class="mood-btn ' + (d.mood === m.value ? 'selected' : '') + '" data-action="set-mood" data-value="' + m.value + '">' +
        '<span class="me">' + m.emoji + '</span><span class="ml">' + m.label + '</span></button>';
    });
    html += '</div>';

    html += '<div class="field-label-row">' +
      '<div class="field-label" style="margin:0;">今日したこと・行った場所</div>' +
      '<button class="tag-edit-toggle" data-action="toggle-tag-edit">' + (state.tagEditMode ? '編集を終了' : 'タグを編集') + '</button>' +
      '</div>';

    if (!state.tagEditMode) {
      allGroups().forEach(function (group) {
        var groupTags = visibleTags().filter(function (t) { return t.group === group; });
        if (groupTags.length === 0) return;
        html += '<div class="tag-group-title">' + escapeHtml(group) + '</div><div class="tag-wrap">';
        groupTags.forEach(function (t) {
          var selected = d.tags.has(t.id);
          html += '<button class="chip ' + (selected ? 'selected' : '') + '" data-action="toggle-tag" data-id="' + escapeHtml(t.id) + '">' + escapeHtml(t.label) + '</button>';
        });
        html += '</div>';
      });
    } else {
      html += '<div class="empty-note" style="margin-bottom:14px;">タップでタグを削除、▲▼でカテゴリの表示順を変えられます。</div>';
      var groups = allGroups();
      groups.forEach(function (group, gi) {
        var groupTags = allTags().filter(function (t) { return t.group === group && !isTagHidden(t.id); });
        html += '<div class="tag-group-title edit-row">' +
          '<span>' + escapeHtml(group) + '</span>' +
          '<span class="group-move-btns">' +
          '<button class="cal-nav" data-action="move-group-up" data-group="' + escapeHtml(group) + '" ' + (gi === 0 ? 'disabled' : '') + '>▲</button>' +
          '<button class="cal-nav" data-action="move-group-down" data-group="' + escapeHtml(group) + '" ' + (gi === groups.length - 1 ? 'disabled' : '') + '>▼</button>' +
          '</span></div>';
        if (groupTags.length === 0) {
          html += '<div class="empty-note" style="margin-bottom:10px;">このカテゴリにはタグがありません</div>';
        } else {
          html += '<div class="tag-wrap">';
          groupTags.forEach(function (t) {
            html += '<button class="chip chip-deletable" data-action="delete-tag" data-id="' + escapeHtml(t.id) + '">' + escapeHtml(t.label) + ' ✕</button>';
          });
          html += '</div>';
        }
      });
      var hidden = allTags().filter(function (t) { return isTagHidden(t.id); });
      if (hidden.length > 0) {
        html += '<div class="tag-group-title">非表示にしたタグ</div><div class="tag-wrap">';
        hidden.forEach(function (t) {
          html += '<button class="chip chip-restorable" data-action="restore-tag" data-id="' + escapeHtml(t.id) + '">' + escapeHtml(t.label) + ' ↺</button>';
        });
        html += '</div>';
      }
    }

    html += '<div class="add-tag-group-row"><span class="add-tag-group-label">追加先：</span>';
    allGroups().forEach(function (g) {
      html += '<button class="group-pick ' + (state.newTagGroup === g ? 'selected' : '') + '" data-action="set-new-tag-group" data-group="' + escapeHtml(g) + '">' + escapeHtml(g) + '</button>';
    });
    html += '<button class="group-pick add-group-btn" data-action="show-add-group">＋ 新規カテゴリ</button></div>';

    if (state.addingGroup) {
      html += '<div class="add-group-row">' +
        '<input type="text" data-bind="newGroupInput" placeholder="新しいカテゴリ名（例：推し活）" value="' + escapeHtml(state.newGroupInput) + '" />' +
        '<button data-action="add-group">追加</button>' +
        '<button class="cancel-btn" data-action="cancel-add-group">✕</button>' +
        '</div>';
    }

    html += '<div class="add-tag-row">' +
      '<input type="text" data-bind="newTagInput" placeholder="タグを追加（例：温泉、実家帰省）" value="' + escapeHtml(state.newTagInput) + '" />' +
      '<button data-action="add-tag" aria-label="タグを追加">' + ICONS.plus + '</button>' +
      '</div>';

    html += '<div class="field-label">ひとことメモ（任意）</div>' +
      '<textarea class="memo-textarea" data-bind="draftMemo" placeholder="今日あったことをひとことで（空欄でもOK）">' + escapeHtml(d.memo) + '</textarea>';

    html += '<button class="draft-save-btn" data-action="save-draft">下書き保存（あとでAI生成）</button>';
    html += '<button class="generate-btn" data-action="generate" ' + (state.generating ? 'disabled' : '') + '>' +
      (state.generating ? ICONS.spinner : '') + (state.generating ? '生成しています…' : '今すぐ日記を生成する') + '</button>';
    if (state.genNotice) html += '<div class="gen-notice">' + escapeHtml(state.genNotice) + '</div>';

    if (d.generatedText) {
      html += '<div class="preview-card"><div class="preview-label">できあがった日記（編集できます）</div>' +
        '<textarea class="preview-textarea" data-bind="draftEditedText">' + escapeHtml(d.editedText) + '</textarea></div>';
      html += '<div class="action-row"><button class="save-btn" data-action="save-final">保存する</button>' +
        '<button class="ghost-btn" data-action="generate">書き直す</button></div>';
    } else {
      html += '<div class="action-row"><button class="save-btn" data-action="save-final" disabled>保存する</button></div>';
    }

    return html;
  }

  function renderSettings() {
    var syncOn = syncEnabled();
    var syncStatusText = '';
    if (state.syncStatus === 'syncing') syncStatusText = '同期中…';
    else if (state.syncStatus === 'error') syncStatusText = '同期エラー。URL・キー・通信環境を確認してください。';
    else if (state.syncStatus === 'synced' && state.lastSyncedAt) syncStatusText = '最終同期: ' + new Date(state.lastSyncedAt).toLocaleString('ja-JP');

    return '<div class="settings-overlay" id="settings-overlay">' +
      '<div class="settings-card">' +
      '<div class="settings-title mincho">設定</div>' +
      '<div class="settings-desc">AIによる日記の自動生成を使う場合、どちらかのAIサービスのAPIキーを登録してください。' +
      'キーはこの端末のブラウザ内にのみ保存され、選んだAI以外には送信されません。未設定でも、簡易文での日記作成は引き続き使えます。</div>' +

      '<label class="settings-label">使用するAI</label>' +
      '<div class="provider-toggle">' +
      '<button class="provider-btn ' + (state.aiProvider === 'anthropic' ? 'selected' : '') + '" data-action="set-provider" data-provider="anthropic">Claude（Anthropic）</button>' +
      '<button class="provider-btn ' + (state.aiProvider === 'gemini' ? 'selected' : '') + '" data-action="set-provider" data-provider="gemini">Gemini（Google）</button>' +
      '</div>' +

      (state.aiProvider === 'anthropic'
        ? '<label class="settings-label">Anthropic APIキー</label>' +
          '<input type="password" class="settings-input" data-bind="apiKeyInput" placeholder="sk-ant-..." value="' + escapeHtml(state.apiKey) + '" />' +
          '<label class="settings-label">モデル名</label>' +
          '<input type="text" class="settings-input" data-bind="anthropicModelInput" value="' + escapeHtml(state.anthropicModel) + '" />' +
          '<div class="settings-hint">console.anthropic.com で発行できます（無料枠なし）</div>'
        : '<label class="settings-label">Gemini APIキー</label>' +
          '<input type="password" class="settings-input" data-bind="geminiApiKeyInput" placeholder="AIzaSy..." value="' + escapeHtml(state.geminiApiKey) + '" />' +
          '<label class="settings-label">モデル名</label>' +
          '<input type="text" class="settings-input" data-bind="geminiModelInput" value="' + escapeHtml(state.geminiModel) + '" />' +
          '<div class="settings-hint">aistudio.google.com/apikey で無料発行できます</div>'
      ) +

      '<div class="settings-divider"></div>' +
      '<div class="settings-label">自動同期（Supabase）' + (syncOn ? ' ✓ 有効' : '') + '</div>' +
      '<div class="settings-desc">設定すると、スマホとPCなど複数端末で自動的にデータが同期されます。' +
      '同期パスフレーズは実質的なパスワードです。他人に教えず、長めの文字列にしてください。</div>' +
      '<label class="settings-label">Project URL</label>' +
      '<input type="text" class="settings-input" data-bind="syncUrlInput" placeholder="https://xxxx.supabase.co" value="' + escapeHtml(state.syncUrl) + '" />' +
      '<label class="settings-label">anon public key</label>' +
      '<input type="password" class="settings-input" data-bind="syncAnonKeyInput" placeholder="eyJhbGciOi..." value="' + escapeHtml(state.syncAnonKey) + '" />' +
      '<label class="settings-label">同期パスフレーズ</label>' +
      '<input type="password" class="settings-input" data-bind="syncPassphraseInput" placeholder="長めのランダムな文字列" value="' + escapeHtml(state.syncPassphrase) + '" />' +
      '<div class="settings-actions">' +
      '<button class="save-btn" data-action="enable-sync">' + (syncOn ? '設定を更新' : '同期を有効にする') + '</button>' +
      (syncOn ? '<button class="ghost-btn" data-action="sync-now">今すぐ同期</button>' : '') +
      '</div>' +
      (syncStatusText ? '<div class="settings-hint">' + escapeHtml(syncStatusText) + '</div>' : '') +
      (syncOn ? '<button class="reset-link" data-action="disable-sync">同期を無効にする</button>' : '') +

      '<div class="settings-divider"></div>' +
      '<div class="settings-label">手動バックアップ（同期を使わない場合）</div>' +
      '<div class="settings-desc">自動同期を使わない場合、エクスポートした内容をコピーして他の端末に貼り付けることでも移行できます。</div>' +
      '<button class="ghost-btn full" data-action="export-data">この端末のデータをエクスポート</button>' +
      (state.exportText
        ? '<textarea class="settings-input mono-area" readonly data-bind="exportOutput">' + escapeHtml(state.exportText) + '</textarea>' +
          '<button class="ghost-btn full" data-action="copy-export">コピーする</button>'
        : '') +
      '<textarea class="settings-input mono-area" placeholder="他の端末でエクスポートした内容をここに貼り付け" data-bind="importInput">' + escapeHtml(state.importInput) + '</textarea>' +
      '<button class="save-btn full" data-action="import-data">読み込む（追加）</button>' +
      (state.importNotice ? '<div class="gen-notice">' + escapeHtml(state.importNotice) + '</div>' : '') +

      '<div class="settings-actions">' +
      '<button class="save-btn" data-action="save-api-key">保存</button>' +
      '<button class="ghost-btn" data-action="close-settings">閉じる</button>' +
      '</div></div></div>';
  }

  function renderApp() {
    var header = '<div class="app-header">';
    if (state.view === 'record') {
      header += '<button class="back-btn" data-action="go-home" aria-label="戻る">' + ICONS.back + '</button>';
    }
    header += '<div class="app-header-titles"><div class="app-eyebrow mincho">ぽつり、と記す</div>' +
      '<div class="app-title mincho">' + escapeHtml(headerTitle()) + '</div></div>';
    if (state.view !== 'record') {
      header += '<button class="settings-btn" data-action="open-settings" aria-label="設定">' + ICONS.settings + '</button>';
    }
    header += '</div>';

    var body = '<div class="app-body">';
    if (state.view === 'home') body += renderHome();
    if (state.view === 'record' && state.draft) body += renderRecord();
    if (state.view === 'list') body += renderList();
    body += '</div>';

    var nav = '';
    if (state.view !== 'record') {
      nav = '<div class="bottom-nav">' +
        '<button class="nav-btn ' + (state.view === 'home' ? 'active' : '') + '" data-action="go-home">' + ICONS.home + ' ホーム</button>' +
        '<button class="nav-btn ' + (state.view === 'list' ? 'active' : '') + '" data-action="go-list">' + ICONS.book + ' 記録一覧</button>' +
        '</div>';
    }

    var stampOverlay = state.showStamp
      ? '<div class="stamp-overlay"><div class="stamp-pop">' + ICONS.hanko(140) + '</div><div class="stamp-caption mincho">記録しました</div></div>'
      : '';

    var settingsOverlay = state.showSettings ? renderSettings() : '';

    return '<div class="app-outer"><div class="app-frame">' + header + body + nav + stampOverlay + settingsOverlay + '</div></div>';
  }

  function focusSoon(selector) {
    setTimeout(function () {
      var el = root.querySelector(selector);
      if (el) el.focus();
    }, 0);
  }

  function render() {
    root.innerHTML = renderApp();
  }

  // ---------- Event delegation (attached once, survives re-renders) ----------
  function handleClick(e) {
    var btn = e.target.closest('[data-action]');
    if (btn) {
      var action = btn.getAttribute('data-action');
      switch (action) {
        case 'go-home': state.view = 'home'; state.draft = null; render(); break;
        case 'go-list': state.view = 'list'; render(); break;
        case 'start-today': startToday(); break;
        case 'open-entry': {
          var id = btn.getAttribute('data-id');
          var entry = state.entries.filter(function (x) { return x.id === id; })[0];
          if (entry) openEntry(entry);
          break;
        }
        case 'set-mood': state.draft.mood = parseInt(btn.getAttribute('data-value'), 10); render(); break;
        case 'toggle-tag': toggleTag(btn.getAttribute('data-id')); break;
        case 'toggle-tag-edit': state.tagEditMode = !state.tagEditMode; render(); break;
        case 'delete-tag': deleteTag(btn.getAttribute('data-id')); break;
        case 'restore-tag': restoreTag(btn.getAttribute('data-id')); break;
        case 'move-group-up': moveGroupOrder(btn.getAttribute('data-group'), -1); break;
        case 'move-group-down': moveGroupOrder(btn.getAttribute('data-group'), 1); break;
        case 'cal-prev': state.calendarMonth = shiftMonth(state.calendarMonth || todayStr().slice(0, 7), -1); render(); break;
        case 'cal-next': state.calendarMonth = shiftMonth(state.calendarMonth || todayStr().slice(0, 7), 1); render(); break;
        case 'set-new-tag-group': state.newTagGroup = btn.getAttribute('data-group'); render(); break;
        case 'show-add-group': state.addingGroup = true; render(); focusSoon('[data-bind="newGroupInput"]'); break;
        case 'cancel-add-group': state.addingGroup = false; state.newGroupInput = ''; render(); break;
        case 'add-group': addCustomGroup(); break;
        case 'add-tag': addCustomTag(); break;
        case 'save-draft': handleSaveDraft(); break;
        case 'generate': handleGenerate(); break;
        case 'save-final': handleSave(); break;
        case 'reset-all': resetAll(); break;
        case 'open-settings': state.showSettings = true; render(); break;
        case 'close-settings': state.showSettings = false; render(); break;
        case 'save-api-key': saveAiSettings(); break;
        case 'set-provider': {
          state.aiProvider = btn.getAttribute('data-provider');
          localStorage.setItem(STORAGE_KEYS.aiProvider, state.aiProvider);
          render();
          break;
        }
        case 'enable-sync': {
          localStorage.setItem(SYNC_KEYS.url, state.syncUrl || '');
          localStorage.setItem(SYNC_KEYS.anonKey, state.syncAnonKey || '');
          localStorage.setItem(SYNC_KEYS.passphrase, state.syncPassphrase || '');
          state.syncStatus = 'syncing';
          render();
          pullFromSupabase(false).then(function () { return pushToSupabase(); });
          break;
        }
        case 'sync-now': {
          state.syncStatus = 'syncing';
          render();
          pullFromSupabase(false).then(function () { return pushToSupabase(); });
          break;
        }
        case 'disable-sync': {
          state.syncUrl = '';
          state.syncAnonKey = '';
          state.syncPassphrase = '';
          localStorage.removeItem(SYNC_KEYS.url);
          localStorage.removeItem(SYNC_KEYS.anonKey);
          localStorage.removeItem(SYNC_KEYS.passphrase);
          state.syncStatus = 'idle';
          render();
          break;
        }
        case 'export-data': state.exportText = exportDataString(); render(); break;
        case 'copy-export': {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(state.exportText)
              .then(function () { state.importNotice = 'コピーしました。もう片方の端末に貼り付けてください。'; render(); })
              .catch(function () { state.importNotice = 'コピーに失敗しました。テキストを手動で選択してコピーしてください。'; render(); });
          }
          break;
        }
        case 'import-data': {
          var importEl = document.querySelector('[data-bind="importInput"]');
          var text = importEl ? importEl.value.trim() : '';
          try {
            var parsed = JSON.parse(text);
            mergeImportedData(parsed);
            state.importInput = '';
            state.importNotice = '読み込みました。閉じてホーム画面で確認してください。';
          } catch (err) {
            state.importNotice = '読み込みに失敗しました。コピーした内容をそのまま貼り付けているか確認してください。';
          }
          render();
          break;
        }
      }
      return;
    }
    // close settings when clicking the backdrop itself
    if (e.target && e.target.id === 'settings-overlay') {
      state.showSettings = false;
      render();
    }
  }

  function handleInput(e) {
    var el = e.target;
    var bind = el.getAttribute && el.getAttribute('data-bind');
    if (!bind) return;
    switch (bind) {
      case 'newTagInput': state.newTagInput = el.value; break;
      case 'newGroupInput': state.newGroupInput = el.value; break;
      case 'draftMemo': if (state.draft) state.draft.memo = el.value; break;
      case 'draftEditedText': if (state.draft) state.draft.editedText = el.value; break;
      case 'importInput': state.importInput = el.value; break;
      case 'syncUrlInput': state.syncUrl = el.value; break;
      case 'syncAnonKeyInput': state.syncAnonKey = el.value; break;
      case 'syncPassphraseInput': state.syncPassphrase = el.value; break;
      case 'apiKeyInput': state.apiKey = el.value; break;
      case 'anthropicModelInput': state.anthropicModel = el.value; break;
      case 'geminiApiKeyInput': state.geminiApiKey = el.value; break;
      case 'geminiModelInput': state.geminiModel = el.value; break;
      default: break;
    }
    // Deliberately not calling render() here so the input keeps focus/caret.
  }

  function handleKeydown(e) {
    var el = e.target;
    var bind = el.getAttribute && el.getAttribute('data-bind');
    if (e.key === 'Enter' && bind === 'newTagInput') { e.preventDefault(); addCustomTag(); }
    if (e.key === 'Enter' && bind === 'newGroupInput') { e.preventDefault(); addCustomGroup(); }
  }

  root.addEventListener('click', handleClick);
  root.addEventListener('input', handleInput);
  root.addEventListener('keydown', handleKeydown);

  // ---------- Service worker ----------
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('service-worker.js').catch(function (err) {
          console.warn('Service worker registration failed', err);
        });
      });
    }
  }

  // ---------- Init ----------
  render();
  registerServiceWorker();

  if (syncEnabled()) {
    pullFromSupabase(true);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && syncEnabled()) {
      pullFromSupabase(true);
    }
  });
})();
