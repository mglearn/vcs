/**
 * StickyBoard — Collaborative Sticky-Note Canvas
 * Google Apps Script Web App backend
 *
 * Static files expected:
 * - index.html  public sticky-note board
 * - Submit.html public sticky-note submission form
 * - Admin.html  passcode-protected moderation/settings console
 */

const PROJECT_NAME = 'StickyBoard';
const SHEET_NAME = 'StickyBoard Notes';
const MAX_NOTE_CHARS = 240;
const MAX_NAME_CHARS = 40;
const MAX_CATEGORY_CHARS = 40;
const ALLOWED_STATUSES = ['pending', 'approved', 'hidden'];
const ALLOWED_COLORS = ['yellow', 'blue', 'green', 'pink', 'purple', 'orange'];

const SHEET_HEADERS = [
  'id',
  'timestamp',
  'note',
  'displayName',
  'category',
  'color',
  'x',
  'y',
  'status',
  'adminNote',
  'lastUpdated'
];

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = String(p.action || 'list');

  try {
    if (action === 'ping') {
      return jsonResponse({
        ok: true,
        project: PROJECT_NAME,
        sheet: SHEET_NAME,
        passcodeSet: Boolean(PropertiesService.getScriptProperties().getProperty('ADMIN_PASSCODE')),
        moderationEnabled: isModerationEnabled(),
        time: new Date().toISOString()
      });
    }

    if (action === 'settings') {
      return jsonResponse({
        ok: true,
        moderationEnabled: isModerationEnabled(),
        colors: ALLOWED_COLORS
      });
    }

    if (action === 'list') {
      const notes = readSheet(getOrCreateSheet())
        .filter(function (n) { return n.id && n.status === 'approved'; })
        .map(publicNote);
      return jsonResponse({ ok: true, notes: notes, moderationEnabled: isModerationEnabled() });
    }

    return jsonResponse({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return jsonResponse({ ok: false, error: errorMessage(err) });
  }
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  const action = String(p.action || 'submit');

  try {
    if (action === 'submit') return submitNote(p);
    if (action === 'move') return moveNote(p);
    if (action === 'adminList') return adminList(p);
    if (action === 'approve') return adminSetStatus(p, 'approved');
    if (action === 'hide') return adminSetStatus(p, 'hidden');
    if (action === 'restore') return adminSetStatus(p, 'pending');
    if (action === 'delete') return adminDelete(p);
    if (action === 'update') return adminUpdate(p);
    if (action === 'settings') return adminUpdateSettings(p);

    return jsonResponse({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return jsonResponse({ ok: false, error: errorMessage(err) });
  }
}

function submitNote(p) {
  let note = cleanText(p.note || '');
  let displayName = cleanText(p.displayName || '');
  let category = cleanText(p.category || 'General');
  let color = cleanText(p.color || randomColor());
  let x = clampNumber(p.x, 4, 76, randomInt(8, 70));
  let y = clampNumber(p.y, 6, 74, randomInt(10, 64));

  if (!note) return jsonResponse({ ok: false, error: 'Sticky note text is required.' });
  if (note.length > MAX_NOTE_CHARS) note = note.slice(0, MAX_NOTE_CHARS);
  if (displayName.length > MAX_NAME_CHARS) displayName = displayName.slice(0, MAX_NAME_CHARS);
  if (category.length > MAX_CATEGORY_CHARS) category = category.slice(0, MAX_CATEGORY_CHARS);
  if (!category) category = 'General';
  if (ALLOWED_COLORS.indexOf(color) === -1) color = randomColor();

  const moderationEnabled = isModerationEnabled();
  const now = new Date();
  const row = {
    id: Utilities.getUuid(),
    timestamp: now.toISOString(),
    note: note,
    displayName: displayName,
    category: category,
    color: color,
    x: x,
    y: y,
    status: moderationEnabled ? 'pending' : 'approved',
    adminNote: '',
    lastUpdated: now.toISOString()
  };

  appendRow(getOrCreateSheet(), row);
  return jsonResponse({ ok: true, id: row.id, status: row.status, moderationEnabled: moderationEnabled });
}

function moveNote(p) {
  const id = String(p.id || '').trim();
  if (!id) return jsonResponse({ ok: false, error: 'Missing note id.' });

  const x = clampNumber(p.x, 0, 88, 10);
  const y = clampNumber(p.y, 0, 84, 10);
  const sheet = getOrCreateSheet();
  const found = findRowById(sheet, id);
  if (!found) return jsonResponse({ ok: false, error: 'Note not found.' });

  const status = String(getCell(sheet, found, 'status'));
  if (status !== 'approved') return jsonResponse({ ok: false, error: 'Only visible notes can be moved.' });

  setCell(sheet, found, 'x', x);
  setCell(sheet, found, 'y', y);
  setCell(sheet, found, 'lastUpdated', new Date().toISOString());
  return jsonResponse({ ok: true, id: id, x: x, y: y });
}

function adminList(p) {
  const authError = checkAdminAuth(p);
  if (authError) return jsonResponse({ ok: false, error: authError });
  const notes = readSheet(getOrCreateSheet()).filter(function (n) { return n.id; }).reverse();
  return jsonResponse({ ok: true, notes: notes, moderationEnabled: isModerationEnabled() });
}

function adminSetStatus(p, status) {
  const authError = checkAdminAuth(p);
  if (authError) return jsonResponse({ ok: false, error: authError });
  if (ALLOWED_STATUSES.indexOf(status) === -1) return jsonResponse({ ok: false, error: 'Invalid status.' });

  const id = String(p.id || '').trim();
  if (!id) return jsonResponse({ ok: false, error: 'Missing note id.' });

  const sheet = getOrCreateSheet();
  const found = findRowById(sheet, id);
  if (!found) return jsonResponse({ ok: false, error: 'Note not found.' });

  setCell(sheet, found, 'status', status);
  setCell(sheet, found, 'lastUpdated', new Date().toISOString());
  return jsonResponse({ ok: true, id: id, status: status });
}

function adminUpdate(p) {
  const authError = checkAdminAuth(p);
  if (authError) return jsonResponse({ ok: false, error: authError });

  const id = String(p.id || '').trim();
  if (!id) return jsonResponse({ ok: false, error: 'Missing note id.' });

  let note = cleanText(p.note || '');
  let displayName = cleanText(p.displayName || '');
  let category = cleanText(p.category || 'General');
  let color = cleanText(p.color || 'yellow');
  let adminNote = cleanText(p.adminNote || '');

  if (!note) return jsonResponse({ ok: false, error: 'Sticky note text cannot be blank.' });
  if (note.length > MAX_NOTE_CHARS) note = note.slice(0, MAX_NOTE_CHARS);
  if (displayName.length > MAX_NAME_CHARS) displayName = displayName.slice(0, MAX_NAME_CHARS);
  if (category.length > MAX_CATEGORY_CHARS) category = category.slice(0, MAX_CATEGORY_CHARS);
  if (!category) category = 'General';
  if (ALLOWED_COLORS.indexOf(color) === -1) color = 'yellow';

  const sheet = getOrCreateSheet();
  const found = findRowById(sheet, id);
  if (!found) return jsonResponse({ ok: false, error: 'Note not found.' });

  setCell(sheet, found, 'note', note);
  setCell(sheet, found, 'displayName', displayName);
  setCell(sheet, found, 'category', category);
  setCell(sheet, found, 'color', color);
  setCell(sheet, found, 'adminNote', adminNote);
  setCell(sheet, found, 'lastUpdated', new Date().toISOString());
  return jsonResponse({ ok: true, id: id });
}

function adminUpdateSettings(p) {
  const authError = checkAdminAuth(p);
  if (authError) return jsonResponse({ ok: false, error: authError });

  const moderationEnabled = String(p.moderationEnabled || 'true') === 'true';
  PropertiesService.getScriptProperties().setProperty('MODERATION_ENABLED', moderationEnabled ? 'true' : 'false');
  return jsonResponse({ ok: true, moderationEnabled: moderationEnabled });
}

function adminDelete(p) {
  const authError = checkAdminAuth(p);
  if (authError) return jsonResponse({ ok: false, error: authError });

  const id = String(p.id || '').trim();
  if (!id) return jsonResponse({ ok: false, error: 'Missing note id.' });

  const sheet = getOrCreateSheet();
  const found = findRowById(sheet, id);
  if (!found) return jsonResponse({ ok: false, error: 'Note not found.' });

  sheet.deleteRow(found.rowIndex);
  return jsonResponse({ ok: true, id: id });
}

function checkAdminAuth(p) {
  const saved = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSCODE');
  if (!saved) return 'Admin passcode has not been set in Script Properties.';
  const provided = String(p.passcode || '').trim();
  if (provided !== saved) return 'Incorrect admin passcode.';
  return '';
}

function isModerationEnabled() {
  const value = PropertiesService.getScriptProperties().getProperty('MODERATION_ENABLED');
  return value !== 'false';
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  const range = sheet.getRange(1, 1, 1, SHEET_HEADERS.length);
  const current = range.getValues()[0];
  const needsHeaders = SHEET_HEADERS.some(function (h, i) { return current[i] !== h; });
  if (needsHeaders) {
    range.setValues([SHEET_HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function appendRow(sheet, row) {
  sheet.appendRow(SHEET_HEADERS.map(function (h) { return row[h] !== undefined ? row[h] : ''; }));
}

function readSheet(sheet) {
  ensureHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, SHEET_HEADERS.length).getValues();
  return values.map(function (row) {
    const obj = {};
    SHEET_HEADERS.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function findRowById(sheet, id) {
  ensureHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) {
      return { rowIndex: i + 2, headers: SHEET_HEADERS };
    }
  }
  return null;
}

function setCell(sheet, found, header, value) {
  const col = found.headers.indexOf(header) + 1;
  if (col <= 0) throw new Error('Missing column: ' + header);
  sheet.getRange(found.rowIndex, col).setValue(value);
}

function getCell(sheet, found, header) {
  const col = found.headers.indexOf(header) + 1;
  if (col <= 0) throw new Error('Missing column: ' + header);
  return sheet.getRange(found.rowIndex, col).getValue();
}

function publicNote(n) {
  return {
    id: n.id,
    timestamp: n.timestamp,
    note: n.note,
    displayName: n.displayName,
    category: n.category,
    color: n.color,
    x: Number(n.x || 10),
    y: Number(n.y || 10)
  };
}

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n * 100) / 100));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomColor() {
  return ALLOWED_COLORS[randomInt(0, ALLOWED_COLORS.length - 1)];
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorMessage(err) {
  return err && err.message ? err.message : String(err);
}
