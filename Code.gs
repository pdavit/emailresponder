/*******************************************************************************
 * EmailResponder — Gmail Add-on
 * Complete Code.gs (with Language + Tone + Stance + Length)
 ******************************************************************************/

const API_BASE = "https://app.skyntco.com/api";
const PRIVACY_URL = "https://skyntco.com/legal/privacy";
const SHARED_SECRET = PropertiesService.getScriptProperties().getProperty("ER_SHARED_SECRET");

function onHomepageOpen() {
  return buildCard_("Open an email to generate a reply.");
}

function onGmailMessageOpen(e) {
  const accessToken = e?.gmail?.accessToken;
  if (accessToken) GmailApp.setCurrentMessageAccessToken(accessToken);

  const msgId = e?.gmail?.messageId;
  if (!msgId) return buildCard_("Open an email to generate a reply.");

  const message = GmailApp.getMessageById(msgId);
  const subject = safeLimit_(message.getSubject(), 300);
  const body = safeLimit_(message.getPlainBody(), 10000);

  const uc = CacheService.getUserCache();
  uc.put(`subject:${msgId}`, subject, 60);
  uc.put(`body:${msgId}`, body, 60);

  // 🌍 Language dropdown (extended list)
  const langSelector = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName("language")
    .setTitle("Language")
    .addItem("English", "en", true)
    .addItem("Spanish", "es", false)
    .addItem("German", "de", false)
    .addItem("French", "fr", false)
    .addItem("Chinese (Simplified)", "zh", false)
    .addItem("Chinese (Traditional)", "zh-Hant", false)
    .addItem("Japanese", "ja", false)
    .addItem("Korean", "ko", false)
    .addItem("Italian", "it", false)
    .addItem("Portuguese (Brazil)", "pt-BR", false)
    .addItem("Russian", "ru", false)
    .addItem("Hindi", "hi", false)
    .addItem("Armenian", "hy", false);

  // 🎛 Tone dropdown
  const toneSelector = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName("tone")
    .setTitle("Tone")
    .addItem("Concise", "concise", true)
    .addItem("Friendly", "friendly", false)
    .addItem("Professional", "professional", false)
    .addItem("Formal", "formal", false)
    .addItem("Casual", "casual", false);

  // 📌 Stance (Positive/Neutral/Negative)
  const stanceSelector = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.RADIO_BUTTON)
    .setFieldName("stance")
    .setTitle("Reply stance")
    .addItem("Positive ✅", "positive", true)
    .addItem("Neutral 😐", "neutral", false)
    .addItem("Negative ❌", "negative", false);

  // 📏 Length dropdown
  const lengthSelector = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName("length")
    .setTitle("Length")
    .addItem("Short", "short", true)
    .addItem("Medium", "medium", false)
    .addItem("Long", "long", false);

  const genBtn = CardService.newTextButton()
    .setText("Generate reply")
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    .setOnClickAction(
      CardService.newAction()
        .setFunctionName("generateReply_")
        .setParameters({ msgId })
    );

  const privacyBtn = CardService.newTextButton()
    .setText("Privacy & data use")
    .setOpenLink(CardService.newOpenLink().setUrl(PRIVACY_URL).setOpenAs(CardService.OpenAs.FULL_SIZE));

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("EmailResponder — AI Reply"))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(`<b>Subject:</b> ${escape_(subject)}`))
        .addWidget(langSelector)
        .addWidget(toneSelector)
        .addWidget(stanceSelector)
        .addWidget(lengthSelector)
        .addWidget(genBtn)
    )
    .addSection(CardService.newCardSection().addWidget(privacyBtn))
    .build();
}

function onGmailComposeOpen() {
  return buildCard_("Type while composing, or open an email to generate a reply.");
}

function generateReply_(e) {
  try {
    if (!SHARED_SECRET) return notify_("Missing ER_SHARED_SECRET. Set it in Script properties.");
    const msgId = e?.parameters?.msgId;
    if (!msgId) return notify_("Message not found. Reopen the email and try again.");

    const form = e.commonEventObject?.formInputs || {};
    const language = getFormValue_(form, "language", "en");
    const tone     = getFormValue_(form, "tone", "concise");
    const stance   = getFormValue_(form, "stance", "positive");
    const length   = getFormValue_(form, "length", "short");

    const uc = CacheService.getUserCache();
    const subject = uc.get(`subject:${msgId}`) || "";
    const body = uc.get(`body:${msgId}`) || "";
    if (!subject && !body) return notify_("Couldn’t read this email. Please reopen it and try again.");

    const payload = { subject, body, language, tone, stance, length, threadMessageId: msgId };

    const res = UrlFetchApp.fetch(`${API_BASE}/emailresponder/generate`, {
      method: "post",
      contentType: "application/json",
      muteHttpExceptions: true,
      headers: { "X-ER-Shared-Secret": SHARED_SECRET },
      payload: JSON.stringify(payload),
    });

    if (res.getResponseCode() >= 300) return notify_("Generation failed. Please try again.");

    const data = safeJson_(res.getContentText());
    const reply = data?.reply;
    if (!reply) return notify_("Empty result. Try again.");

    const draft = CardService.newGmailDraft().setReplyToMessageId(msgId).setBody(reply);
    return CardService.newComposeActionResponseBuilder().setGmailDraft(draft).build();

  } catch (err) {
    return notify_("Something went wrong. Try again.");
  }
}

/** ====== HELPERS ====== */

function buildCard_(text) {
  const privacyBtn = CardService.newTextButton()
    .setText("Privacy & data use")
    .setOpenLink(CardService.newOpenLink().setUrl(PRIVACY_URL).setOpenAs(CardService.OpenAs.FULL_SIZE));

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("EmailResponder — AI Reply"))
    .addSection(CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(text)))
    .addSection(CardService.newCardSection().addWidget(privacyBtn))
    .build();
}

function notify_(msg) {
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification().setText(msg))
    .build();
}

function getFormValue_(formInputs, name, fallback) {
  try {
    const entry = formInputs[name];
    const vals = entry?.stringInputs?.value;
    return (vals && vals[0]) || fallback;
  } catch (_) {
    return fallback;
  }
}

function escape_(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[m]));
}

function safeLimit_(s, max) {
  s = String(s || "");
  return s.length > max ? s.slice(0, max) : s;
}

function safeJson_(txt) {
  try { return JSON.parse(txt); } catch (_) { return null; }
}
