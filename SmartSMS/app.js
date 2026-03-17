const dom = {
  baudRate: document.querySelector("#baudRate"),
  connectBtn: document.querySelector("#connectBtn"),
  disconnectBtn: document.querySelector("#disconnectBtn"),
  createChatBtn: document.querySelector("#createChatBtn"),
  newChatNumber: document.querySelector("#newChatNumber"),
  chatCount: document.querySelector("#chatCount"),
  chatList: document.querySelector("#chatList"),
  activeChatTitle: document.querySelector("#activeChatTitle"),
  refreshInboxBtn: document.querySelector("#refreshInboxBtn"),
  messageList: document.querySelector("#messageList"),
  messageInput: document.querySelector("#messageInput"),
  composerForm: document.querySelector("#composerForm"),
  sendBtn: document.querySelector("#sendBtn"),
  clearLogBtn: document.querySelector("#clearLogBtn"),
  logOutput: document.querySelector("#logOutput"),
  chatItemTemplate: document.querySelector("#chatItemTemplate"),
  messageTemplate: document.querySelector("#messageTemplate"),
};

const state = {
  port: null,
  reader: null,
  writer: null,
  inputClosed: null,
  outputClosed: null,
  keepReading: false,
  readBuffer: "",
  responseWaiter: null,
  chats: new Map(),
  activeChatId: null,
  modemReady: false,
  isSending: false,
  knownIndexes: new Set(),
};

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

function normalizePhone(value) {
  return value.replace(/[^\d+]/g, "").trim();
}

function chatDisplayName(phone) {
  return phone || "Неизвестный номер";
}

function formatTimestamp(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(value);
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
      messages: [],
      updatedAt: new Date(),
    });
  }

  return state.chats.get(normalized);
}

function setActiveChat(phone) {
  const chat = ensureChat(phone);
  if (!chat) {
    return;
  }

  state.activeChatId = chat.id;
  chat.unread = 0;
  renderChats();
  renderMessages();
  updateComposerState();
}

function addMessage({ phone, text, direction, timestamp = new Date(), index = null, status = "" }) {
  const chat = ensureChat(phone);
  if (!chat) {
    return;
  }

  const duplicate = chat.messages.find(
    (item) =>
      item.direction === direction &&
      item.text === text &&
      Math.abs(new Date(item.timestamp).getTime() - new Date(timestamp).getTime()) < 1000 &&
      item.index === index
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
  chat.updatedAt = new Date(timestamp);
  chat.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  if (direction === "incoming" && state.activeChatId !== chat.id) {
    chat.unread += 1;
  }

  if (!state.activeChatId) {
    state.activeChatId = chat.id;
  }

  renderChats();
  renderMessages();
}

function renderChats() {
  const chats = [...state.chats.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  dom.chatCount.textContent = String(chats.length);

  if (!chats.length) {
    dom.chatList.className = "chat-list empty-state";
    dom.chatList.innerHTML = "<p>Пока нет диалогов. Подключите модем и создайте чат.</p>";
    return;
  }

  dom.chatList.className = "chat-list";
  dom.chatList.innerHTML = "";

  for (const chat of chats) {
    const node = dom.chatItemTemplate.content.firstElementChild.cloneNode(true);
    node.classList.toggle("active", chat.id === state.activeChatId);
    node.querySelector(".chat-item-title").textContent = chatDisplayName(chat.phone);
    node.querySelector(".chat-item-preview").textContent =
      chat.messages.at(-1)?.text ?? "Нет сообщений";
    node.querySelector(".chat-item-time").textContent = formatTimestamp(chat.updatedAt);

    const badge = node.querySelector(".chat-item-badge");
    if (chat.unread > 0) {
      badge.textContent = String(chat.unread);
      badge.classList.remove("hidden");
    }

    node.addEventListener("click", () => setActiveChat(chat.phone));
    dom.chatList.append(node);
  }
}

function renderMessages() {
  const chat = state.activeChatId ? state.chats.get(state.activeChatId) : null;

  if (!chat) {
    dom.activeChatTitle.textContent = "Выберите чат";
    dom.messageList.className = "message-list empty-state";
    dom.messageList.innerHTML = "<p>Здесь будут сообщения выбранного диалога.</p>";
    return;
  }

  dom.activeChatTitle.textContent = chatDisplayName(chat.phone);
  dom.messageList.className = "message-list";
  dom.messageList.innerHTML = "";

  for (const message of chat.messages) {
    const node = dom.messageTemplate.content.firstElementChild.cloneNode(true);
    node.classList.add(message.direction);
    node.querySelector(".message-direction").textContent =
      message.direction === "incoming" ? "Входящее" : "Исходящее";
    node.querySelector(".message-time").textContent = formatTimestamp(message.timestamp);
    node.querySelector(".message-text").textContent = message.text;
    dom.messageList.append(node);
  }

  dom.messageList.scrollTop = dom.messageList.scrollHeight;
}

function updateComposerState() {
  const ready = state.modemReady && Boolean(state.activeChatId);
  dom.messageInput.disabled = !ready;
  dom.sendBtn.disabled = !ready || state.isSending;
  dom.refreshInboxBtn.disabled = !state.modemReady;
  dom.disconnectBtn.disabled = !state.port;
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
  if (trimmed === ">") {
    state.readBuffer = "";
    return ">";
  }
  return null;
}

function settleResponse(line) {
  const waiter = state.responseWaiter;
  if (!waiter) {
    return false;
  }

  waiter.lines.push(line);

  if (line === "OK" || line.includes(">")) {
    state.responseWaiter = null;
    waiter.resolve(waiter.lines);
    return true;
  }

  if (line === "ERROR" || line.startsWith("+CMS ERROR") || line.startsWith("+CME ERROR")) {
    state.responseWaiter = null;
    waiter.reject(new Error(waiter.lines.join("\n")));
    return true;
  }

  return true;
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

function decodePhoneIfNeeded(raw) {
  const value = raw.replace(/^"|"$/g, "");
  if (/^[0-9A-F]+$/i.test(value) && value.length % 4 === 0) {
    return decodeUcs2(value);
  }
  return value;
}

function parseCmgrResponse(lines) {
  const header = lines.find((line) => line.startsWith("+CMGR:"));
  const messageBody = lines.find((line) => !line.startsWith("+CMGR:") && line !== "OK");

  if (!header || !messageBody) {
    return null;
  }

  const headerValues = [...header.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
  const status = headerValues[0] ?? "";
  const phone = decodePhoneIfNeeded(headerValues[1] ?? "");
  const timestamp = decodeSmsTimestamp(headerValues.at(-1));

  return {
    status,
    phone,
    text: decodeUcs2(messageBody.trim()),
    timestamp,
  };
}

function parseCmglEntries(lines) {
  const entries = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("+CMGL:")) {
      continue;
    }

    const indexMatch = line.match(/^\+CMGL:\s*(\d+)/);
    const entryIndex = indexMatch ? Number.parseInt(indexMatch[1], 10) : null;
    const body = lines[index + 1]?.trim();
    if (!body) {
      continue;
    }

    const headerValues = [...line.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
    entries.push({
      index: entryIndex,
      status: headerValues[0] ?? "",
      phone: decodePhoneIfNeeded(headerValues[1] ?? ""),
      timestamp: decodeSmsTimestamp(headerValues.at(-1)),
      text: decodeUcs2(body),
    });
  }
  return entries;
}

function handleUnsolicited(line) {
  if (line.startsWith("+CMTI:")) {
    const match = line.match(/,(\d+)$/);
    const index = match ? Number.parseInt(match[1], 10) : null;
    logLine("rx", `Новая SMS в памяти модема${index !== null ? `, слот ${index}` : ""}`);
    if (index !== null) {
      readMessageByIndex(index).catch((error) => logLine("error", error.message));
    }
    return true;
  }

  if (line.startsWith("^")) {
    return true;
  }

  return false;
}

async function processIncomingChunk(chunk) {
  const text = chunk;
  const lines = splitModemLines(text);
  const prompt = extractPromptFromBuffer();
  if (prompt) {
    lines.push(prompt);
  }

  for (const line of lines) {
    logLine("rx", line);

    if (handleUnsolicited(line)) {
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

  const promise = new Promise((resolve, reject) => {
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
  return promise;
}

async function sendSms(phone, text) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw new Error("Введите корректный номер телефона");
  }

  const payload = encodeUcs2(text);
  if (!payload) {
    throw new Error("Сообщение пустое");
  }

  state.isSending = true;
  updateComposerState();

  try {
    const promptLines = await sendCommand(`AT+CMGS="${normalizedPhone}"`, { timeout: 5000 });
    if (!promptLines.some((line) => line.includes(">"))) {
      throw new Error(`Модем не выдал приглашение для текста SMS:\n${promptLines.join("\n")}`);
    }

    logLine("tx", `${payload}<Ctrl+Z>`);
    const response = new Promise((resolve, reject) => {
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

    await writeRaw(`${payload}\u001A`);
    await response;
  } finally {
    state.isSending = false;
    updateComposerState();
  }

  addMessage({
    phone: normalizedPhone,
    text,
    direction: "outgoing",
    timestamp: new Date(),
    status: "SENT",
  });
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
  updateComposerState();
  logLine("rx", "Модем инициализирован в текстовом режиме UCS2");
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
  addMessage({
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

    addMessage({
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
    throw new Error("Ваш браузер не поддерживает Web Serial API");
  }

  const baudRate = Number.parseInt(dom.baudRate.value, 10);
  state.port = await navigator.serial.requestPort();
  await state.port.open({ baudRate, bufferSize: 4096 });

  const decoder = new TextDecoderStream();
  const encoder = new TextEncoderStream();

  state.inputClosed = state.port.readable.pipeTo(decoder.writable);
  state.reader = decoder.readable.getReader();
  state.outputClosed = encoder.readable.pipeTo(state.port.writable);
  state.writer = encoder.writable.getWriter();
  state.keepReading = true;

  readLoop().catch((error) => logLine("error", `Ошибка чтения: ${error.message}`));
  updateComposerState();
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
    updateComposerState();
    logLine("rx", "Модем отключен");
  }
}

dom.connectBtn.addEventListener("click", async () => {
  try {
    dom.connectBtn.disabled = true;
    await connectModem();
  } catch (error) {
    logLine("error", error.message);
  } finally {
    dom.connectBtn.disabled = false;
    updateComposerState();
  }
});

dom.disconnectBtn.addEventListener("click", async () => {
  try {
    await disconnectModem();
  } catch (error) {
    logLine("error", error.message);
  }
});

dom.createChatBtn.addEventListener("click", () => {
  const phone = normalizePhone(dom.newChatNumber.value);
  if (!phone) {
    logLine("error", "Введите номер телефона для нового чата");
    return;
  }

  setActiveChat(phone);
  dom.newChatNumber.value = "";
});

dom.composerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const chat = state.activeChatId ? state.chats.get(state.activeChatId) : null;
  const text = dom.messageInput.value.trim();

  if (!chat) {
    logLine("error", "Сначала выберите чат");
    return;
  }

  if (!text) {
    logLine("error", "Нельзя отправить пустое сообщение");
    return;
  }

  try {
    await sendSms(chat.phone, text);
    dom.messageInput.value = "";
    renderMessages();
  } catch (error) {
    logLine("error", error.message);
  }
});

dom.refreshInboxBtn.addEventListener("click", async () => {
  try {
    await refreshInbox();
  } catch (error) {
    logLine("error", error.message);
  }
});

dom.clearLogBtn.addEventListener("click", () => {
  dom.logOutput.innerHTML = "";
});

window.addEventListener("beforeunload", () => {
  if (state.port) {
    disconnectModem().catch(() => {});
  }
});

if (!supportsWebSerial()) {
  logLine("error", "Web Serial API недоступен. Используйте Chromium-браузер и HTTPS/localhost.");
} else {
  logLine("rx", "Приложение готово. Подключите GSM-модем к COM-порту.");
}
