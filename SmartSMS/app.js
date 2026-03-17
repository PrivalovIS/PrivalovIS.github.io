const DB_NAME = "smartsms-db";
const DB_VERSION = 1;

const dom = {
  searchInput: document.querySelector("#searchInput"),
  tabButtons: [...document.querySelectorAll(".tab-btn")],
  tabPanels: [...document.querySelectorAll(".tab-panel")],
  chatList: document.querySelector("#chatList"),
  contactList: document.querySelector("#contactList"),
  createChatBtn: document.querySelector("#createChatBtn"),
  newChatNumber: document.querySelector("#newChatNumber"),
  contactNameInput: document.querySelector("#contactNameInput"),
  contactPhoneInput: document.querySelector("#contactPhoneInput"),
  saveContactBtn: document.querySelector("#saveContactBtn"),
  baudRate: document.querySelector("#baudRate"),
  connectBtn: document.querySelector("#connectBtn"),
  disconnectBtn: document.querySelector("#disconnectBtn"),
  exportDbBtn: document.querySelector("#exportDbBtn"),
  importDbBtn: document.querySelector("#importDbBtn"),
  importDbInput: document.querySelector("#importDbInput"),
  modemStatus: document.querySelector("#modemStatus"),
  activeChatTitle: document.querySelector("#activeChatTitle"),
  activeChatMeta: document.querySelector("#activeChatMeta"),
  messageList: document.querySelector("#messageList"),
  composerForm: document.querySelector("#composerForm"),
  messageInput: document.querySelector("#messageInput"),
  sendBtn: document.querySelector("#sendBtn"),
  toggleLogBtn: document.querySelector("#toggleLogBtn"),
  clearLogBtn: document.querySelector("#clearLogBtn"),
  logOutput: document.querySelector("#logOutput"),
  chatItemTemplate: document.querySelector("#chatItemTemplate"),
  contactItemTemplate: document.querySelector("#contactItemTemplate"),
  messageTemplate: document.querySelector("#messageTemplate"),
};

const state = {
  currentTab: "chats",
  searchQuery: "",
  port: null,
  reader: null,
  writer: null,
  inputClosed: null,
  outputClosed: null,
  keepReading: false,
  readBuffer: "",
  responseWaiter: null,
  chats: new Map(),
  contacts: new Map(),
  activeChatId: null,
  modemReady: false,
  isSending: false,
  baudRate: "115200",
  logVisible: true,
  autoSync: true,
  knownIndexes: new Set(),
  db: null,
};

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("contacts")) {
        db.createObjectStore("contacts", { keyPath: "phone" });
      }
      if (!db.objectStoreNames.contains("chats")) {
        db.createObjectStore("chats", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transaction(storeNames, mode = "readonly") {
  if (!state.db) {
    throw new Error("База данных еще не инициализирована");
  }
  return state.db.transaction(storeNames, mode);
}

function idbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const request = transaction([storeName]).objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbPut(storeName, value) {
  return new Promise((resolve, reject) => {
    const request = transaction([storeName], "readwrite").objectStore(storeName).put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function idbClear(storeName) {
  return new Promise((resolve, reject) => {
    const request = transaction([storeName], "readwrite").objectStore(storeName).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function loadDatabaseState() {
  const [contacts, chats, settings] = await Promise.all([
    idbGetAll("contacts"),
    idbGetAll("chats"),
    idbGetAll("settings"),
  ]);

  state.contacts = new Map(
    contacts.map((contact) => [
      contact.phone,
      {
        ...contact,
      },
    ])
  );

  state.chats = new Map(
    chats.map((chat) => [
      chat.id,
      {
        ...chat,
        updatedAt: new Date(chat.updatedAt),
        messages: (chat.messages ?? []).map((message) => ({
          ...message,
          timestamp: new Date(message.timestamp),
        })),
      },
    ])
  );

  const settingsRecord = settings.find((item) => item.key === "app");
  state.activeChatId = settingsRecord?.activeChatId ?? null;
  state.baudRate = settingsRecord?.baudRate ?? "115200";
  state.logVisible = settingsRecord?.logVisible ?? true;
}

async function saveSettings() {
  if (!state.db) {
    return;
  }
  await idbPut("settings", {
    key: "app",
    activeChatId: state.activeChatId,
    baudRate: state.baudRate,
    logVisible: state.logVisible,
  });
}

async function saveChat(chat) {
  if (!state.db) {
    return;
  }
  await idbPut("chats", {
    ...chat,
    updatedAt: new Date(chat.updatedAt).toISOString(),
    messages: chat.messages.map((message) => ({
      ...message,
      timestamp: new Date(message.timestamp).toISOString(),
    })),
  });
}

async function saveContact(contact) {
  if (!state.db) {
    return;
  }
  await idbPut("contacts", contact);
}

function normalizePhone(value) {
  return value.replace(/[^\d+]/g, "").trim();
}

function digitsOnly(phone) {
  return phone.replace(/\D/g, "");
}

function displayName(phone) {
  return state.contacts.get(phone)?.name || phone || "Неизвестный номер";
}

function initials(phone) {
  const label = displayName(phone).trim();
  return label.slice(0, 1).toUpperCase() || "#";
}

function formatTime(date) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(date));
}

function logLine(kind, message) {
  const row = document.createElement("div");
  row.className = `log-row ${kind}`;

  const time = document.createElement("time");
  time.textContent = new Date().toLocaleTimeString("ru-RU");

  const text = document.createElement("div");
  text.textContent = message;

  row.append(time, text);
  dom.logOutput.prepend(row);
}

function setStatus(text, connected = false) {
  dom.modemStatus.textContent = text;
  dom.modemStatus.classList.toggle("connected", connected);
}

function updateComposerState() {
  const ready = state.modemReady && Boolean(state.activeChatId);
  dom.messageInput.disabled = !ready;
  dom.sendBtn.disabled = !ready || state.isSending;
  dom.disconnectBtn.disabled = !state.port;
}

function applyLogVisibility() {
  dom.logOutput.classList.toggle("hidden", !state.logVisible);
  dom.toggleLogBtn.textContent = state.logVisible ? "Скрыть" : "Показать";
}

function switchTab(tab) {
  state.currentTab = tab;
  dom.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  dom.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tab);
  });
  renderLists();
}

function ensureChat(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return null;
  }

  if (!state.chats.has(normalized)) {
    state.chats.set(normalized, {
      id: normalized,
      phone: normalized,
      unread: 0,
      updatedAt: new Date(),
      messages: [],
    });
  }

  return state.chats.get(normalized);
}

async function setActiveChat(phone) {
  const chat = ensureChat(phone);
  if (!chat) {
    return;
  }

  state.activeChatId = chat.id;
  chat.unread = 0;
  await saveChat(chat);
  await saveSettings();
  renderLists();
  renderMessages();
  updateComposerState();
}

async function addMessage({ phone, text, direction, timestamp = new Date(), index = null, status = "" }) {
  const chat = ensureChat(phone);
  if (!chat) {
    return;
  }

  const duplicate = chat.messages.find(
    (message) =>
      message.direction === direction &&
      message.index === index &&
      message.text === text &&
      Math.abs(new Date(message.timestamp).getTime() - new Date(timestamp).getTime()) < 1000
  );

  if (duplicate) {
    return;
  }

  chat.messages.push({
    id: crypto.randomUUID(),
    phone: chat.phone,
    text,
    direction,
    timestamp: new Date(timestamp),
    index,
    status,
  });
  chat.messages.sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));
  chat.updatedAt = new Date(timestamp);

  if (direction === "incoming" && state.activeChatId !== chat.id) {
    chat.unread += 1;
  }

  if (!state.activeChatId) {
    state.activeChatId = chat.id;
    await saveSettings();
  }

  await saveChat(chat);
  renderLists();
  renderMessages();
}

function renderChats() {
  const query = state.searchQuery.toLowerCase();
  const chats = [...state.chats.values()]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .filter((chat) => {
      const name = displayName(chat.phone).toLowerCase();
      const lastText = (chat.messages.at(-1)?.text || "").toLowerCase();
      return !query || name.includes(query) || chat.phone.includes(query) || lastText.includes(query);
    });

  if (!chats.length) {
    dom.chatList.className = "entity-list empty-state";
    dom.chatList.innerHTML = "<p>Подходящие чаты не найдены.</p>";
    return;
  }

  dom.chatList.className = "entity-list";
  dom.chatList.innerHTML = "";

  for (const chat of chats) {
    const node = dom.chatItemTemplate.content.firstElementChild.cloneNode(true);
    node.classList.toggle("active", chat.id === state.activeChatId);
    node.querySelector(".entity-avatar").textContent = initials(chat.phone);
    node.querySelector(".entity-title").textContent = displayName(chat.phone);
    node.querySelector(".entity-subtitle").textContent = chat.messages.at(-1)?.text || chat.phone;
    node.querySelector(".entity-time").textContent = formatTime(chat.updatedAt);

    const badge = node.querySelector(".entity-badge");
    if (chat.unread > 0) {
      badge.textContent = String(chat.unread);
      badge.classList.remove("hidden");
    }

    node.addEventListener("click", () => {
      setActiveChat(chat.phone).catch((error) => logLine("error", error.message));
    });
    dom.chatList.append(node);
  }
}

function renderContacts() {
  const query = state.searchQuery.toLowerCase();
  const contacts = [...state.contacts.values()].filter((contact) => {
    return !query || contact.name.toLowerCase().includes(query) || contact.phone.includes(query);
  });

  if (!contacts.length) {
    dom.contactList.className = "entity-list empty-state";
    dom.contactList.innerHTML = "<p>Контакты не найдены.</p>";
    return;
  }

  dom.contactList.className = "entity-list";
  dom.contactList.innerHTML = "";

  for (const contact of contacts) {
    const node = dom.contactItemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".entity-avatar").textContent = initials(contact.phone);
    node.querySelector(".entity-title").textContent = contact.name;
    node.querySelector(".entity-subtitle").textContent = contact.phone;
    node.addEventListener("click", () => {
      ensureChat(contact.phone);
      setActiveChat(contact.phone).catch((error) => logLine("error", error.message));
      switchTab("chats");
    });
    dom.contactList.append(node);
  }
}

function renderMessages() {
  const chat = state.activeChatId ? state.chats.get(state.activeChatId) : null;
  if (!chat) {
    dom.activeChatTitle.textContent = "Выберите чат";
    dom.activeChatMeta.textContent = "История сообщений появится здесь.";
    dom.messageList.className = "message-list empty-state";
    dom.messageList.innerHTML = "<p>Откройте чат слева, чтобы увидеть историю SMS.</p>";
    return;
  }

  dom.activeChatTitle.textContent = displayName(chat.phone);
  dom.activeChatMeta.textContent = chat.phone;
  dom.messageList.className = "message-list";
  dom.messageList.innerHTML = "";

  for (const message of chat.messages) {
    const node = dom.messageTemplate.content.firstElementChild.cloneNode(true);
    node.classList.add(message.direction);
    node.querySelector(".message-direction").textContent =
      message.direction === "incoming" ? "Входящее SMS" : "Исходящее SMS";
    node.querySelector(".message-time").textContent = formatTime(message.timestamp);
    node.querySelector(".message-text").textContent = message.text;
    dom.messageList.append(node);
  }

  dom.messageList.scrollTop = dom.messageList.scrollHeight;
}

function renderLists() {
  renderChats();
  renderContacts();
}

function supportsWebSerial() {
  return "serial" in navigator;
}

function splitModemLines(chunk) {
  state.readBuffer += chunk.replace(/\r/g, "\n");
  const parts = state.readBuffer.split("\n");
  state.readBuffer = parts.pop() ?? "";
  return parts.map((line) => line.trim()).filter(Boolean);
}

function extractPromptFromBuffer() {
  const trimmed = state.readBuffer.trim();
  if (trimmed === ">" || trimmed.endsWith(">")) {
    state.readBuffer = "";
    return ">";
  }
  return null;
}

function settleResponse(line) {
  const waiter = state.responseWaiter;
  if (!waiter) {
    return;
  }

  waiter.lines.push(line);

  if (line === "OK" || line.includes(">")) {
    state.responseWaiter = null;
    waiter.resolve(waiter.lines);
    return;
  }

  if (line === "ERROR" || line.startsWith("+CMS ERROR") || line.startsWith("+CME ERROR")) {
    state.responseWaiter = null;
    waiter.reject(new Error(waiter.lines.join("\n")));
  }
}

function decodeUcs2(hex) {
  if (!hex || /[^0-9a-f]/i.test(hex) || hex.length % 4 !== 0) {
    return hex ?? "";
  }

  let output = "";
  for (let index = 0; index < hex.length; index += 4) {
    output += String.fromCharCode(Number.parseInt(hex.slice(index, index + 4), 16));
  }
  return output;
}

function encodeUcs2(text) {
  return [...text]
    .map((char) => char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0"))
    .join("");
}

function decodePhoneIfNeeded(raw) {
  const value = raw.replace(/^"|"$/g, "");
  if (/^[0-9A-F]+$/i.test(value) && value.length % 4 === 0) {
    return decodeUcs2(value);
  }
  return value;
}

function decodeSmsTimestamp(headerValue) {
  if (!headerValue) {
    return new Date();
  }

  const cleaned = headerValue.replace(/^"|"$/g, "");
  const match = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{2}),(\d{2}):(\d{2}):(\d{2})/);
  if (!match) {
    return new Date();
  }

  const [, yy, mm, dd, hh, mi, ss] = match;
  return new Date(2000 + Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
}

function parseCmgrResponse(lines) {
  const header = lines.find((line) => line.startsWith("+CMGR:"));
  const body = lines.find((line) => !line.startsWith("+CMGR:") && line !== "OK");

  if (!header || !body) {
    return null;
  }

  const headerValues = [...header.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  return {
    status: headerValues[0] ?? "",
    phone: decodePhoneIfNeeded(headerValues[1] ?? ""),
    timestamp: decodeSmsTimestamp(headerValues.at(-1)),
    text: decodeUcs2(body.trim()),
  };
}

function parseCmglEntries(lines) {
  const entries = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("+CMGL:")) {
      continue;
    }

    const body = lines[index + 1]?.trim();
    if (!body) {
      continue;
    }

    const headerValues = [...line.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
    const indexMatch = line.match(/^\+CMGL:\s*(\d+)/);
    entries.push({
      index: indexMatch ? Number.parseInt(indexMatch[1], 10) : null,
      status: headerValues[0] ?? "",
      phone: decodePhoneIfNeeded(headerValues[1] ?? ""),
      timestamp: decodeSmsTimestamp(headerValues.at(-1)),
      text: decodeUcs2(body),
    });
  }
  return entries;
}

function encodePhoneSemiOctet(phone) {
  const digits = digitsOnly(phone);
  const padded = digits.length % 2 === 0 ? digits : `${digits}F`;
  return padded.replace(/(..)/g, (pair) => `${pair[1]}${pair[0]}`);
}

function buildSubmitPdu(phone, text) {
  const digits = digitsOnly(phone);
  const toa = phone.startsWith("+") ? "91" : "81";
  const address = encodePhoneSemiOctet(phone);
  const payload = encodeUcs2(text);
  const userDataLength = (payload.length / 2).toString(16).toUpperCase().padStart(2, "0");

  const pdu = [
    "00",
    "11",
    "00",
    digits.length.toString(16).toUpperCase().padStart(2, "0"),
    toa,
    address,
    "00",
    "08",
    "AA",
    userDataLength,
    payload,
  ].join("");

  return {
    pdu,
    tpduLength: pdu.length / 2 - 1,
  };
}

async function processIncomingChunk(chunk) {
  const lines = splitModemLines(chunk);
  const prompt = extractPromptFromBuffer();
  if (prompt) {
    lines.push(prompt);
  }

  for (const line of lines) {
    logLine("rx", line);

    if (line.startsWith("+CMTI:")) {
      const match = line.match(/,(\d+)$/);
      if (match && state.autoSync) {
        readMessageByIndex(Number.parseInt(match[1], 10)).catch((error) => logLine("error", error.message));
      }
      continue;
    }

    if (state.responseWaiter) {
      settleResponse(line);
    }
  }
}

async function readLoop() {
  while (state.keepReading && state.reader) {
    const { value, done } = await state.reader.read();
    if (done) {
      break;
    }
    if (value) {
      await processIncomingChunk(value);
    }
  }
}

async function writeRaw(data) {
  if (!state.writer) {
    throw new Error("Порт не подключен");
  }
  await state.writer.write(data);
}

async function sendCommand(command, { timeout = 7000 } = {}) {
  if (state.responseWaiter) {
    throw new Error("Модем занят другой командой");
  }

  logLine("tx", command);

  const responsePromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (state.responseWaiter?.timer === timer) {
        state.responseWaiter = null;
      }
      reject(new Error(`Таймаут ответа на команду: ${command}`));
    }, timeout);

    state.responseWaiter = {
      lines: [],
      timer,
      resolve: (lines) => {
        clearTimeout(timer);
        resolve(lines);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      },
    };
  });

  await writeRaw(`${command}\r`);
  return responsePromise;
}

async function sendSms(phone, text) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw new Error("Введите корректный номер телефона");
  }
  if (!text.trim()) {
    throw new Error("Нельзя отправить пустое сообщение");
  }

  const { pdu, tpduLength } = buildSubmitPdu(normalizedPhone, text);
  state.isSending = true;
  updateComposerState();

  try {
    await sendCommand("AT+CMGF=0");
    const promptLines = await sendCommand(`AT+CMGS=${tpduLength}`, { timeout: 7000 });

    if (!promptLines.some((line) => line.includes(">"))) {
      throw new Error(`Модем не выдал приглашение для PDU-отправки:\n${promptLines.join("\n")}`);
    }

    logLine("tx", `${pdu}<Ctrl+Z>`);

    const submitResult = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (state.responseWaiter?.timer === timer) {
          state.responseWaiter = null;
        }
        reject(new Error("Таймаут отправки SMS"));
      }, 25000);

      state.responseWaiter = {
        lines: [],
        timer,
        resolve: (lines) => {
          clearTimeout(timer);
          resolve(lines);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
    });

    await writeRaw(`${pdu}\u001A`);
    await submitResult;
    await addMessage({
      phone: normalizedPhone,
      text,
      direction: "outgoing",
      timestamp: new Date(),
      status: "SENT",
    });
  } finally {
    try {
      await sendCommand("AT+CMGF=1");
      await sendCommand('AT+CSCS="UCS2"');
    } catch (error) {
      logLine("error", `Не удалось вернуть текстовый режим: ${error.message}`);
    }

    state.isSending = false;
    updateComposerState();
  }
}

async function configureModem() {
  await sendCommand("AT");
  await sendCommand("ATE0");
  await sendCommand("AT+CMGF=1");
  await sendCommand('AT+CSCS="UCS2"');
  await sendCommand("AT+CSMP=17,167,0,8");
  await sendCommand('AT+CPMS="SM","SM","SM"');
  await sendCommand("AT+CNMI=2,1,0,0,0");
  state.modemReady = true;
  setStatus("Модем подключен", true);
  logLine("rx", "Модем инициализирован. Автоприем входящих включен постоянно.");
  updateComposerState();
}

async function readMessageByIndex(index) {
  if (state.knownIndexes.has(index)) {
    return;
  }

  const lines = await sendCommand(`AT+CMGR=${index}`, { timeout: 9000 });
  const parsed = parseCmgrResponse(lines);
  if (!parsed || !parsed.phone) {
    return;
  }

  state.knownIndexes.add(index);
  await addMessage({
    phone: parsed.phone,
    text: parsed.text,
    direction: "incoming",
    timestamp: parsed.timestamp,
    index,
    status: parsed.status,
  });
}

async function refreshInbox() {
  const lines = await sendCommand('AT+CMGL="ALL"', { timeout: 12000 });
  const entries = parseCmglEntries(lines);

  for (const entry of entries) {
    if (entry.index !== null) {
      state.knownIndexes.add(entry.index);
    }
    await addMessage({
      phone: entry.phone,
      text: entry.text,
      direction: entry.status.includes("STO") ? "outgoing" : "incoming",
      timestamp: entry.timestamp,
      index: entry.index,
      status: entry.status,
    });
  }

  logLine("rx", `Синхронизация завершена. Найдено сообщений: ${entries.length}`);
}

async function connectModem() {
  if (!supportsWebSerial()) {
    throw new Error("Web Serial API недоступен. Используйте Chromium-браузер и localhost/https.");
  }

  const baudRate = Number.parseInt(dom.baudRate.value, 10);
  state.baudRate = dom.baudRate.value;
  try {
    await saveSettings();
  } catch (error) {
    logLine("error", `Не удалось сохранить настройки: ${error.message}`);
  }

  state.port = await navigator.serial.requestPort();
  await state.port.open({ baudRate, bufferSize: 4096 });

  const decoder = new TextDecoderStream();
  const encoder = new TextEncoderStream();
  state.inputClosed = state.port.readable.pipeTo(decoder.writable);
  state.reader = decoder.readable.getReader();
  state.outputClosed = encoder.readable.pipeTo(state.port.writable);
  state.writer = encoder.writable.getWriter();
  state.keepReading = true;

  readLoop().catch((error) => logLine("error", `Ошибка чтения порта: ${error.message}`));
  setStatus("COM-порт открыт", true);
  logLine("rx", "COM-порт открыт");

  await configureModem();
  await refreshInbox();
}

async function disconnectModem() {
  state.modemReady = false;
  state.keepReading = false;
  updateComposerState();

  try {
    await state.reader?.cancel();
  } catch {
    // ignore
  }

  try {
    state.writer?.releaseLock();
    state.reader?.releaseLock();
    await state.inputClosed?.catch(() => {});
    await state.outputClosed?.catch(() => {});
    await state.port?.close();
  } finally {
    state.port = null;
    state.reader = null;
    state.writer = null;
    state.inputClosed = null;
    state.outputClosed = null;
    state.responseWaiter = null;
    state.modemReady = false;
    setStatus("Модем не подключен", false);
    updateComposerState();
    logLine("rx", "Модем отключен");
  }
}

async function handleSaveContact() {
  const name = dom.contactNameInput.value.trim();
  const phone = normalizePhone(dom.contactPhoneInput.value);

  if (!name || !phone) {
    logLine("error", "Для контакта нужны имя и номер");
    return;
  }

  const contact = { name, phone };
  state.contacts.set(phone, contact);
  await saveContact(contact);
  dom.contactNameInput.value = "";
  dom.contactPhoneInput.value = "";
  renderLists();
}

async function exportDatabase() {
  if (!state.db) {
    throw new Error("База данных недоступна");
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    contacts: [...state.contacts.values()],
    chats: [...state.chats.values()].map((chat) => ({
      ...chat,
      updatedAt: new Date(chat.updatedAt).toISOString(),
      messages: chat.messages.map((message) => ({
        ...message,
        timestamp: new Date(message.timestamp).toISOString(),
      })),
    })),
    settings: {
      activeChatId: state.activeChatId,
      baudRate: state.baudRate,
      logVisible: state.logVisible,
    },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `smartsms-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  logLine("rx", "Экспорт базы данных выполнен");
}

async function importDatabase(file) {
  if (!state.db) {
    throw new Error("База данных недоступна");
  }
  const text = await file.text();
  const parsed = JSON.parse(text);

  await Promise.all([idbClear("contacts"), idbClear("chats"), idbClear("settings")]);

  for (const contact of parsed.contacts ?? []) {
    await idbPut("contacts", contact);
  }

  for (const chat of parsed.chats ?? []) {
    await idbPut("chats", chat);
  }

  await idbPut("settings", {
    key: "app",
    activeChatId: parsed.settings?.activeChatId ?? null,
    baudRate: parsed.settings?.baudRate ?? "115200",
    logVisible: parsed.settings?.logVisible ?? true,
  });

  await loadDatabaseState();
  dom.baudRate.value = state.baudRate;
  applyLogVisibility();
  renderLists();
  renderMessages();
  updateComposerState();
  logLine("rx", "Импорт базы данных завершен");
}

function initializeUi() {
  dom.baudRate.value = state.baudRate;
  applyLogVisibility();
  renderLists();
  renderMessages();
  setStatus("Модем не подключен", false);
  updateComposerState();
}

dom.tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

dom.searchInput.addEventListener("input", () => {
  state.searchQuery = dom.searchInput.value.trim();
  renderLists();
});

dom.createChatBtn.addEventListener("click", () => {
  const phone = normalizePhone(dom.newChatNumber.value);
  if (!phone) {
    logLine("error", "Введите номер для открытия чата");
    return;
  }

  ensureChat(phone);
  saveChat(state.chats.get(phone))
    .then(() => setActiveChat(phone))
    .catch((error) => logLine("error", error.message));
  dom.newChatNumber.value = "";
});

dom.saveContactBtn.addEventListener("click", () => {
  handleSaveContact().catch((error) => logLine("error", error.message));
});

dom.baudRate.addEventListener("change", () => {
  state.baudRate = dom.baudRate.value;
  saveSettings().catch((error) => logLine("error", error.message));
});

dom.connectBtn.addEventListener("click", async () => {
  try {
    dom.connectBtn.disabled = true;
    await connectModem();
  } catch (error) {
    logLine("error", error.message);
    setStatus("Ошибка подключения", false);
  } finally {
    dom.connectBtn.disabled = false;
    updateComposerState();
  }
});

dom.disconnectBtn.addEventListener("click", () => {
  disconnectModem().catch((error) => logLine("error", error.message));
});

dom.composerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const chat = state.activeChatId ? state.chats.get(state.activeChatId) : null;
  if (!chat) {
    logLine("error", "Сначала выберите чат");
    return;
  }

  try {
    await sendSms(chat.phone, dom.messageInput.value.trim());
    dom.messageInput.value = "";
  } catch (error) {
    logLine("error", error.message);
  }
});

dom.toggleLogBtn.addEventListener("click", () => {
  state.logVisible = !state.logVisible;
  applyLogVisibility();
  saveSettings().catch((error) => logLine("error", error.message));
});

dom.clearLogBtn.addEventListener("click", () => {
  dom.logOutput.innerHTML = "";
});

dom.exportDbBtn.addEventListener("click", () => {
  exportDatabase().catch((error) => logLine("error", error.message));
});

dom.importDbBtn.addEventListener("click", () => {
  dom.importDbInput.click();
});

dom.importDbInput.addEventListener("change", () => {
  const file = dom.importDbInput.files?.[0];
  if (!file) {
    return;
  }

  importDatabase(file)
    .catch((error) => logLine("error", `Ошибка импорта: ${error.message}`))
    .finally(() => {
      dom.importDbInput.value = "";
    });
});

window.addEventListener("beforeunload", () => {
  if (state.port) {
    disconnectModem().catch(() => {});
  }
});

async function bootstrap() {
  try {
    state.db = await openDatabase();
    await loadDatabaseState();
  } catch (error) {
    state.db = null;
    logLine("error", `IndexedDB недоступна, приложение работает без сохранения: ${error.message}`);
  }
  initializeUi();

  if (!supportsWebSerial()) {
    logLine("error", "Web Serial API недоступен. Откройте SmartSMS в Chromium-браузере через localhost или https.");
  } else {
    logLine("rx", "SmartSMS готов. Автоприем входящих включен всегда.");
  }
}

bootstrap().catch((error) => {
  logLine("error", `Ошибка запуска приложения: ${error.message}`);
});
