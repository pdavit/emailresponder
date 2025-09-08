/*******************************************************************************
 * EmailResponder — Gmail Add-on (Code.gs)
 * Shows controls → calls API → opens composer (or creates server draft).
 * Minimal scopes. No data persistence (short-lived UserCache only).
 ******************************************************************************/

/* ------------------------------ Constants ---------------------------------- */
var API_BASE        = (typeof API_BASE        !== 'undefined') ? API_BASE        : 'https://app.skyntco.com/api';
var GENERATE_URL    = (typeof GENERATE_URL    !== 'undefined') ? GENERATE_URL    : (API_BASE + '/emailresponder/generate');
var PRIVACY_URL     = (typeof PRIVACY_URL     !== 'undefined') ? PRIVACY_URL     : 'https://skyntco.com/legal/privacy';
var SP              = (typeof SP              !== 'undefined') ? SP              : PropertiesService.getScriptProperties();
var SHARED_SECRET   = (typeof SHARED_SECRET   !== 'undefined') ? SHARED_SECRET   : ((SP && (SP.getProperty('ER_SHARED_SECRET') || '').trim()) || '');
var DEBUG           = (typeof DEBUG           !== 'undefined') ? DEBUG           : (((SP && SP.getProperty('ER_DEBUG')) || '') === '1');
var USER_CACHE_SEC  = (typeof USER_CACHE_SEC  !== 'undefined') ? USER_CACHE_SEC  : 300; // pass data between UI actions

/* ------------------------------ Entry points -------------------------------- */
function onHomepageOpen(_e) {
  return buildInfoCard_('Open any email, choose settings, then tap <b>Generate reply</b>.');
}

function onGmailComposeOpen(_e) {
  return buildInfoCard_('Open an email message to generate a reply, then edit & send.');
}

/**
 * Contextual trigger when a Gmail message is opened.
 * Caches subject/body and shows the controls + Generate button.
 */
function onGmailMessageOpen(e) {
  try {
    if (e && e.gmail && e.gmail.accessToken) GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);

    var msgId    = e && e.gmail && e.gmail.messageId;
    var threadId = e && e.gmail && e.gmail.threadId;
    if (!msgId) return buildInfoCard_('Open an email to generate a reply.');

    // Read the message
    var msg     = GmailApp.getMessageById(msgId);
    var subject = safeLimit_(msg.getSubject(), 300);
    var bodyRaw = (msg.getPlainBody && msg.getPlainBody()) || '';
    if (!bodyRaw) bodyRaw = (msg.getBody() || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    var body    = safeLimit_(bodyRaw, 16000);

    // Cache bits for subsequent actions
    var uc = CacheService.getUserCache();
    uc.put('subject:' + msgId, subject, USER_CACHE_SEC);
    uc.put('body:'    + msgId, body,    USER_CACHE_SEC);
    uc.put('thread:'  + msgId, String(threadId || ''), USER_CACHE_SEC);

    return buildControlsCard_(msgId, subject, null);

  } catch (err) {
    if (DEBUG) Logger.log(err && err.stack ? err.stack : String(err));
    return buildInfoCard_('Could not load this message. Please try again.');
  }
}

/* ------------------------------ UI builders -------------------------------- */

/** Main instructions card (used for homepage & compose open). */
function buildInfoCard_(text) {
  var header = CardService.newCardHeader().setTitle('EmailResponder — AI Reply');
  var info   = CardService.newTextParagraph().setText(text);

  return CardService.newCardBuilder()
    .setHeader(header)
    .addSection(CardService.newCardSection().addWidget(info))
    .addSection(CardService.newCardSection().addWidget(privacyButtonSet_()))
    .build();
}

/** Settings/pickers + Generate button (can be shown again after Clear). */
function buildControlsCard_(msgId, subject, prefsOpt) {
  prefsOpt = prefsOpt || tryParseJson_(CacheService.getUserCache().get('prefs:' + msgId)) || {};

  var defLang   = prefsOpt.language || 'en';
  var defTone   = prefsOpt.tone     || 'concise';
  var defStance = prefsOpt.stance   || 'positive';
  var defLength = prefsOpt.length   || 'short';

  var lang = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('language')
    .setTitle('Language')
    .addItem('English',                 'en',      defLang === 'en')
    .addItem('Spanish',                 'es',      defLang === 'es')
    .addItem('German',                  'de',      defLang === 'de')
    .addItem('French',                  'fr',      defLang === 'fr')
    .addItem('Chinese (Simplified)',    'zh',      defLang === 'zh')
    .addItem('Chinese (Traditional)',   'zh-Hant', defLang === 'zh-Hant')
    .addItem('Japanese',                'ja',      defLang === 'ja')
    .addItem('Korean',                  'ko',      defLang === 'ko')
    .addItem('Italian',                 'it',      defLang === 'it')
    .addItem('Portuguese (Brazil)',     'pt-BR',   defLang === 'pt-BR')
    .addItem('Russian',                 'ru',      defLang === 'ru')
    .addItem('Hindi',                   'hi',      defLang === 'hi')
    .addItem('Armenian',                'hy',      defLang === 'hy');

  var tone = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('tone')
    .setTitle('Tone')
    .addItem('Concise',      'concise',      defTone === 'concise')
    .addItem('Friendly',     'friendly',     defTone === 'friendly')
    .addItem('Professional', 'professional', defTone === 'professional')
    .addItem('Formal',       'formal',       defTone === 'formal')
    .addItem('Casual',       'casual',       defTone === 'casual');

  var stance = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.RADIO_BUTTON)
    .setFieldName('stance')
    .setTitle('Reply stance')
    .addItem('Positive ✅', 'positive', defStance === 'positive')
    .addItem('Neutral 😐',  'neutral',  defStance === 'neutral')
    .addItem('Negative ❌', 'negative', defStance === 'negative');

  var length = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('length')
    .setTitle('Length')
    .addItem('Short',  'short',  defLength === 'short')
    .addItem('Medium', 'medium', defLength === 'medium')
    .addItem('Long',   'long',   defLength === 'long');

  var generateBtn = CardService.newTextButton()
    .setText('Generate reply')
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(CardService.newAction().setFunctionName('generateReply_').setParameters({ msgId: String(msgId) }));

  var subjectKV = CardService.newKeyValue().setTopLabel('Subject').setContent(subject || '(no subject)');

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('EmailResponder — AI Reply'))
    .addSection(CardService.newCardSection().addWidget(subjectKV))
    .addSection(CardService.newCardSection().addWidget(lang).addWidget(tone).addWidget(stance).addWidget(length))
    .addSection(CardService.newCardSection().addWidget(CardService.newButtonSet().addButton(generateBtn)))
    .addSection(CardService.newCardSection().addWidget(privacyButtonSet_()))
    .build();
}

/** Result card with buttons. */
function buildReplyCard_(msgId, replyText, prefs, threadId, replyKey) {
  var openDraftBtn = CardService.newTextButton()
    .setText('Open reply draft')
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(CardService.newAction().setFunctionName('openReplyDraftAction').setParameters({ msgId: String(msgId), key: replyKey }));

  var openThreadBtn = CardService.newTextButton()
    .setText('Open thread (add draft)')
    .setOnClickAction(CardService.newAction().setFunctionName('openThreadWithDraftAction').setParameters({ msgId: String(msgId), key: replyKey }));

  var regenBtn = CardService.newTextButton()
    .setText('Regenerate')
    .setOnClickAction(CardService.newAction().setFunctionName('generateReply_').setParameters({ msgId: String(msgId) }));

  var clearBtn = CardService.newTextButton()
    .setText('Clear')
    .setOnClickAction(CardService.newAction().setFunctionName('clearReplyAction').setParameters({ msgId: String(msgId) }));

  var textBlock = CardService.newTextParagraph()
    .setText('<b>Generated reply</b><br>' + escape_(replyText).replace(/\n/g, '<br>'));

  var tip = CardService.newTextParagraph()
    .setText('If the composer cannot be opened here, tap “Open thread (add draft)”.');

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Generated Reply'))
    .addSection(CardService.newCardSection().addWidget(textBlock))
    .addSection(CardService.newCardSection().addWidget(CardService.newButtonSet()
      .addButton(openDraftBtn).addButton(openThreadBtn).addButton(regenBtn).addButton(clearBtn)))
    .addSection(CardService.newCardSection().addWidget(tip))
    .addSection(CardService.newCardSection().addWidget(privacyButtonSet_()))
    .build();
}

/* ------------------------------ Actions ------------------------------------ */

/** Generate the reply via API, then show the result card. */
function generateReply_(e) {
  try {
    if (!SHARED_SECRET) return notify_('Missing ER_SHARED_SECRET (Script Properties).');

    var msgId = (e && e.parameters && e.parameters.msgId) || (e.gmail && e.gmail.messageId) || '';
    if (!msgId) return notify_('Message not found. Please reopen and try again.');
    if (e && e.gmail && e.gmail.accessToken) GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);

    var form = (e && e.commonEventObject && e.commonEventObject.formInputs) || {};
    // Use either current form inputs, or last-saved prefs, or defaults
    var saved = tryParseJson_(CacheService.getUserCache().get('prefs:' + msgId)) || {};
    var language = getFormValue_(form, 'language', saved.language || 'en');
    var tone     = getFormValue_(form, 'tone',     saved.tone     || 'concise');
    var stance   = getFormValue_(form, 'stance',   saved.stance   || 'positive');
    var length   = getFormValue_(form, 'length',   saved.length   || 'short');

    function clamp(v, allowed, fb){ return allowed.indexOf(v) >= 0 ? v : fb; }
    language = clamp(language, ['en','es','de','fr','zh','zh-Hant','ja','ko','it','pt-BR','ru','hi','hy'],'en');
    tone     = clamp(tone,     ['concise','friendly','professional','formal','casual'],'concise');
    stance   = clamp(stance,   ['positive','neutral','negative'],'positive');
    length   = clamp(length,   ['short','medium','long'],'short');

    var uc = CacheService.getUserCache();
    var subject = uc.get('subject:' + msgId) || '';
    var body    = uc.get('body:'    + msgId) || '';

    if (!subject || !body) {
      // fallback re-read
      var msg = GmailApp.getMessageById(msgId);
      subject = subject || safeLimit_(msg.getSubject(), 300);
      var raw = (msg.getPlainBody && msg.getPlainBody()) || (msg.getBody() || '').replace(/<[^>]+>/g, ' ');
      body    = body || safeLimit_((raw || '').replace(/\s+/g, ' ').trim(), 16000);
    }

    var payload = { subject: subject, body: body, language: language, tone: tone, stance: stance, length: length, threadMessageId: msgId };
    var res = UrlFetchApp.fetch(GENERATE_URL, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'X-ER-Shared-Secret': SHARED_SECRET },
      payload: JSON.stringify(payload)
    });

    var code = res.getResponseCode(), text = res.getContentText();
    if (code < 200 || code >= 300) {
      if (DEBUG) Logger.log('HTTP ' + code + ' : ' + text);
      return pushCard_(errorCard_('Generation failed', 'HTTP ' + code, subject));
    }

    var data  = tryParseJson_(text) || {};
    var reply = (data && data.reply && String(data.reply).trim()) || '';
    if (!reply) return notify_('Empty result. Please try again.');

    // cache prefs + reply (under unique key) so result actions can find it
    uc.put('prefs:' + msgId, JSON.stringify({ language:language, tone:tone, stance:stance, length:length }), USER_CACHE_SEC);
    var replyKey = makeReplyKey_(msgId);
    uc.put('reply:' + replyKey, reply, USER_CACHE_SEC);
    uc.put('replyKey:' + msgId, replyKey, USER_CACHE_SEC);

    var threadId = uc.get('thread:' + msgId) || '';
    return pushCard_(buildReplyCard_(msgId, reply, {language,tone,stance,length}, threadId, replyKey));

  } catch (err) {
    if (DEBUG) Logger.log(err && err.stack ? err.stack : String(err));
    return notify_('Something went wrong. Please try again.');
  }
}

/** Try to open composer with a UI draft; otherwise fall back to server draft path. */
function openReplyDraftAction(e) {
  try {
    var msgId = (e && e.parameters && e.parameters.msgId) || (e.gmail && e.gmail.messageId) || '';
    var key   = e && e.parameters && e.parameters.key;
    if (!msgId) return notify_('No message id.');
    if (e && e.gmail && e.gmail.accessToken) GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);

    var reply = getReplyByKey_(msgId, key);
    if (!reply) return notify_('No generated reply found. Please generate again.');

    if (CardService.newGmailDraft) {
      try {
        var draft = CardService.newGmailDraft().setReplyToMessageId(msgId).setBody(reply);
        return CardService.newComposeActionResponseBuilder().setGmailDraft(draft).build();
      } catch (err) {
        if (DEBUG) Logger.log('newGmailDraft failed, falling back: ' + err);
      }
    }
    // fallback
    return openThreadWithDraftAction(e);

  } catch (err) {
    if (DEBUG) Logger.log(err && err.stack ? err.stack : String(err));
    return notify_('Could not open a draft. Try “Open thread (add draft)”.');
  }
}

/** Create a server draft and open the thread in the correct account (no /u/0). */
function openThreadWithDraftAction(e) {
  try {
    var msgId = (e && e.parameters && e.parameters.msgId) || (e.gmail && e.gmail.messageId) || '';
    var key   = e && e.parameters && e.parameters.key;
    if (!msgId) return notify_('No message id.');
    if (e && e.gmail && e.gmail.accessToken) GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);

    var reply = getReplyByKey_(msgId, key);
    if (!reply) return notify_('No generated reply found. Please generate again.');

    var msg = GmailApp.getMessageById(msgId);
    if (!msg) return notify_('Message not found.');
    msg.createDraftReplyAll(reply);

    var thread = msg.getThread();
    var permalink = thread.getPermalink();
var userEmail = e.gmail && e.gmail.userEmail;
var url = userEmail ? forceAuthUserUrl_(permalink, userEmail) : permalink;

    return CardService.newActionResponseBuilder()
      .setOpenLink(CardService.newOpenLink().setUrl(url).setOpenAs(CardService.OpenAs.FULL_SIZE))
      .build();

  } catch (err) {
    if (DEBUG) Logger.log(err && err.stack ? err.stack : String(err));
    return notify_('Could not create/open the draft. Please try again.');
  }
}

/** Clear the last generated reply & return to controls UI. */
function clearReplyAction(e) {
  try {
    var msgId = (e && e.parameters && e.parameters.msgId) || (e.gmail && e.gmail.messageId) || '';
    var uc = CacheService.getUserCache();
    var key = uc.get('replyKey:' + msgId) || '';
    if (key) {
      // best-effort invalidate
      uc.put('reply:' + key, '', 1);
      uc.put('replyKey:' + msgId, '', 1);
    }
    var subject = uc.get('subject:' + msgId) || '(no subject)';
    return pushCard_(buildControlsCard_(msgId, subject, null));

  } catch (err) {
    if (DEBUG) Logger.log(err && err.stack ? err.stack : String(err));
    return notify_('Cleared.');
  }
}

/* ------------------------------ Privacy ------------------------------------ */
var PRIVACY_TEXT = (typeof PRIVACY_TEXT !== 'undefined') ? PRIVACY_TEXT : [
  'What this add-on does',
  '• Generates a suggested reply for the email you have open in Gmail.',
  '',
  'What we access',
  '• Only the currently open message’s subject and plain-text body, plus its IDs to anchor drafts.',
  '• Your on-screen settings (language, tone, stance, length).',
  '',
  'What we send',
  '• Subject + trimmed/plain-text body and your settings to our API at app.skyntco.com to generate text.',
  '',
  'Storage & retention',
  '• Reply text is cached in Apps Script UserCache for ~60 seconds to pass between UI actions.',
  '• Backend discards message content after generating the reply; no persistent storage of email content.',
  '',
  'Drafts & sending',
  '• Drafts are created in your Gmail. You review and send; nothing is sent automatically.',
  '',
  'Sharing',
  '• No sale of data. No advertising. Only a reply-generation subprocessor strictly for processing.',
  '',
  'Security',
  '• HTTPS/TLS for all traffic. Script Properties store only a shared secret.',
  '',
  'Your choices',
  '• You can choose not to generate a reply. Removing the add-on stops any access.',
  '',
  'Contact',
  '• privacy@skyntco.com'
].join('\n');

function buildPrivacyCard_() {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Privacy & Data Use'))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(PRIVACY_TEXT.replace(/\n/g, '<br>')))
        .addWidget(
          CardService.newButtonSet().addButton(
            CardService.newTextButton()
              .setText('View full policy')
              .setOpenLink(CardService.newOpenLink().setUrl(PRIVACY_URL).setOpenAs(CardService.OpenAs.FULL_SIZE))
          )
        )
    )
    .build();
}

function openPrivacyAction(_e) { return pushCard_(buildPrivacyCard_()); }

function privacyButtonSet_() {
  return CardService.newButtonSet().addButton(
    CardService.newTextButton().setText('Privacy & Data Use').setOnClickAction(CardService.newAction().setFunctionName('openPrivacyAction'))
  );
}

/* ------------------------------ Utilities ---------------------------------- */

function pushCard_(card) {
  return CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().pushCard(card)).build();
}

function notify_(msg) {
  return CardService.newActionResponseBuilder().setNotification(CardService.newNotification().setText(msg)).build();
}

function tryParseJson_(s) { try { return JSON.parse(s); } catch (_e) { return null; } }

function escape_(s) {
  return String(s || '').replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

function safeLimit_(s, max) {
  s = String(s || ''); return s.length > max ? s.slice(0, max) : s;
}

/** Extract first string from compose form inputs. */
function getFormValue_(formInputs, name, fallback) {
  try {
    var entry = formInputs[name];
    var vals = entry && entry.stringInputs && entry.stringInputs.value;
    return (vals && vals[0]) || fallback;
  } catch (_e) { return fallback; }
}

/* ---------- Reply key + account-safe URL helpers (core reliability) -------- */

function makeReplyKey_(msgId) { return 'r:' + msgId + ':' + String(new Date().getTime()); }

function getReplyByKey_(msgId, keyOpt) {
  var uc = CacheService.getUserCache();
  var key = keyOpt || uc.get('replyKey:' + msgId) || '';
  if (!key) return '';
  return uc.get('reply:' + key) || '';
}

/** Force the Gmail URL to open for the active user instead of /u/0. */
function forceAuthUserUrl_(rawUrl, userEmail) {
  // Preserve both the query string (?fs=1&...&th=...) and any hash
  var qIndex = rawUrl.indexOf('?');
  var hIndex = rawUrl.indexOf('#');

  var query = (qIndex >= 0)
    ? rawUrl.substring(qIndex + 1, (hIndex >= 0 ? hIndex : rawUrl.length))
    : '';

  var hash  = (hIndex >= 0) ? rawUrl.substring(hIndex) : '';

  var base  = 'https://mail.google.com/mail/?authuser=' + encodeURIComponent(userEmail || '');

  // Example result: https://mail.google.com/mail/?authuser=me@gmail.com&fs=1&tf=pt&search=all&th=XXXXXXXX
  return base + (query ? '&' + query : '') + hash;
}
