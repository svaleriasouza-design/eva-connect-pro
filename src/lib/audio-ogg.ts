// Remux de WebM/Opus (o que o MediaRecorder do Chrome/Firefox grava) para
// Ogg/Opus — o único container com Opus que a Meta Cloud API aceita.
// Não há recodificação: os pacotes Opus são idênticos, só trocamos o container.
// Puro TypeScript, sem dependências, roda no navegador.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let j = 0; j < 8; j++) r = r & 0x80000000 ? ((r << 1) ^ 0x04c11db7) >>> 0 : (r << 1) >>> 0;
    t[i] = r >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < buf.length; i++) crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ buf[i]) & 0xff]) >>> 0;
  return crc >>> 0;
}

/** Duração (amostras a 48kHz) de um pacote Opus, lida do byte TOC. */
function opusPacketSamples(pkt: Uint8Array): number {
  if (!pkt.length) return 0;
  const toc = pkt[0];
  const config = toc >> 3;
  const code = toc & 0x03;
  let ms: number;
  if (config < 12) ms = [10, 20, 40, 60][config % 4];
  else if (config < 16) ms = [10, 20][config % 2];
  else ms = [2.5, 5, 10, 20][config % 4];
  let frames = 1;
  if (code === 1 || code === 2) frames = 2;
  else if (code === 3) frames = pkt.length > 1 ? pkt[1] & 0x3f : 1;
  return Math.round(ms * 48 * frames);
}

// ---------------------------------------------------------------------------
// EBML / WebM
// ---------------------------------------------------------------------------

type Reader = { buf: Uint8Array; pos: number };

function readVint(r: Reader, stripMarker: boolean): { value: number; length: number } | null {
  if (r.pos >= r.buf.length) return null;
  const first = r.buf[r.pos];
  if (first === 0) return null;
  let length = 1;
  while (length <= 8 && !(first & (0x80 >> (length - 1)))) length++;
  if (length > 8 || r.pos + length > r.buf.length) return null;
  let value = stripMarker ? first & (0xff >> length) : first;
  for (let i = 1; i < length; i++) value = value * 256 + r.buf[r.pos + i];
  r.pos += length;
  return { value, length };
}

const MASTER_IDS = new Set([0x18538067, 0x1654ae6b, 0xae, 0x1f43b675, 0x1a45dfa3, 0xe0]);

/** Extrai OpusHead (CodecPrivate) e os pacotes Opus de um arquivo WebM. */
function parseWebmOpus(data: Uint8Array): { head: Uint8Array | null; packets: Uint8Array[] } {
  const packets: Uint8Array[] = [];
  let head: Uint8Array | null = null;

  const walk = (start: number, end: number) => {
    const r: Reader = { buf: data, pos: start };
    while (r.pos < end) {
      const id = readVint(r, false);
      if (!id) return;
      const size = readVint(r, true);
      if (!size) return;
      const contentStart = r.pos;
      const unknownSize = size.value >= Math.pow(2, 7 * size.length) - 1;
      const contentEnd = unknownSize ? end : Math.min(end, contentStart + size.value);

      if (MASTER_IDS.has(id.value)) {
        walk(contentStart, contentEnd);
      } else if (id.value === 0x63a2 && !head) {
        head = data.subarray(contentStart, contentEnd);
      } else if (id.value === 0xa3) {
        // SimpleBlock: track vint + timecode(2) + flags(1) + frame(s)
        const br: Reader = { buf: data, pos: contentStart };
        const track = readVint(br, true);
        if (track) {
          const p = br.pos + 3;
          const lacing = (data[br.pos + 2] >> 1) & 0x03;
          if (lacing === 0 && p < contentEnd) packets.push(data.subarray(p, contentEnd));
        }
      } else if (id.value === 0xa1) {
        // BlockGroup > Block: mesmo layout do SimpleBlock
        const br: Reader = { buf: data, pos: contentStart };
        const track = readVint(br, true);
        if (track) {
          const p = br.pos + 3;
          if (p < contentEnd) packets.push(data.subarray(p, contentEnd));
        }
      }
      r.pos = contentEnd;
    }
  };

  walk(0, data.length);
  return { head, packets };
}

// ---------------------------------------------------------------------------
// Ogg
// ---------------------------------------------------------------------------

function oggPage(
  serial: number,
  seq: number,
  granule: number,
  headerType: number,
  segments: Uint8Array[],
): Uint8Array {
  const lacing: number[] = [];
  for (const s of segments) {
    let n = s.length;
    while (n >= 255) {
      lacing.push(255);
      n -= 255;
    }
    lacing.push(n);
  }
  const bodyLength = segments.reduce((a, s) => a + s.length, 0);
  const page = new Uint8Array(27 + lacing.length + bodyLength);
  const view = new DataView(page.buffer);
  page.set([0x4f, 0x67, 0x67, 0x53], 0); // "OggS"
  page[4] = 0;
  page[5] = headerType;
  // granule 64-bit LE
  view.setUint32(6, granule % 0x100000000, true);
  view.setUint32(10, Math.floor(granule / 0x100000000), true);
  view.setUint32(14, serial, true);
  view.setUint32(18, seq, true);
  view.setUint32(22, 0, true); // CRC preenchido depois
  page[26] = lacing.length;
  page.set(lacing, 27);
  let off = 27 + lacing.length;
  for (const s of segments) {
    page.set(s, off);
    off += s.length;
  }
  view.setUint32(22, crc32(page), true);
  return page;
}

function opusHeadFallback(channels = 1, rate = 48000): Uint8Array {
  const h = new Uint8Array(19);
  h.set([0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64], 0); // OpusHead
  h[8] = 1; // version
  h[9] = channels;
  new DataView(h.buffer).setUint16(10, 3840, true); // pre-skip
  new DataView(h.buffer).setUint32(12, rate, true);
  new DataView(h.buffer).setUint16(16, 0, true); // output gain
  h[18] = 0; // mapping family
  return h;
}

function opusTags(): Uint8Array {
  const vendor = new TextEncoder().encode("eva-ia");
  const out = new Uint8Array(8 + 4 + vendor.length + 4);
  out.set([0x4f, 0x70, 0x75, 0x73, 0x54, 0x61, 0x67, 0x73], 0); // OpusTags
  const view = new DataView(out.buffer);
  view.setUint32(8, vendor.length, true);
  out.set(vendor, 12);
  view.setUint32(12 + vendor.length, 0, true); // 0 comentários
  return out;
}

/**
 * Converte um Blob WebM contendo Opus em um Blob Ogg/Opus (audio/ogg).
 * Lança erro quando o WebM não contém faixa Opus (ex.: Vorbis).
 */
export async function webmOpusToOgg(blob: Blob): Promise<Blob> {
  const data = new Uint8Array(await blob.arrayBuffer());
  const { head, packets } = parseWebmOpus(data);
  if (!packets.length) throw new Error("Não foi possível ler os quadros de áudio da gravação.");

  const isOpusHead =
    head && head.length >= 8 && String.fromCharCode(...head.subarray(0, 8)) === "OpusHead";
  const headerPacket = isOpusHead ? head! : opusHeadFallback();

  const serial = (Math.random() * 0xffffffff) >>> 0;
  const pages: Uint8Array[] = [];
  let seq = 0;
  pages.push(oggPage(serial, seq++, 0, 0x02, [headerPacket])); // BOS
  pages.push(oggPage(serial, seq++, 0, 0x00, [opusTags()]));

  let granule = 0;
  const MAX_PER_PAGE = 50;
  for (let i = 0; i < packets.length; i += MAX_PER_PAGE) {
    const group = packets.slice(i, i + MAX_PER_PAGE);
    for (const p of group) granule += opusPacketSamples(p);
    const last = i + MAX_PER_PAGE >= packets.length;
    pages.push(oggPage(serial, seq++, granule, last ? 0x04 : 0x00, group));
  }

  const total = pages.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of pages) {
    out.set(p, off);
    off += p.length;
  }
  return new Blob([out as unknown as BlobPart], { type: "audio/ogg" });
}

/** true quando o blob é MP4/M4A com faixa AAC de verdade (box "mp4a"). */
export async function mp4HasAac(blob: Blob): Promise<boolean> {
  const head = new Uint8Array(await blob.slice(0, Math.min(blob.size, 262144)).arrayBuffer());
  const needle = [0x6d, 0x70, 0x34, 0x61]; // "mp4a"
  for (let i = 0; i + 4 <= head.length; i++) {
    if (head[i] === needle[0] && head[i + 1] === needle[1] && head[i + 2] === needle[2] && head[i + 3] === needle[3]) {
      return true;
    }
  }
  return false;
}

/**
 * Normaliza uma gravação do MediaRecorder para um formato aceito pela Meta:
 * OGG/Opus (remux) ou MP4/AAC (quando o navegador já entregou AAC real).
 */
export async function normalizeRecordingForWhatsapp(blob: Blob): Promise<{ blob: Blob; mime: string }> {
  const type = (blob.type || "").split(";")[0].toLowerCase();

  if (type === "audio/mp4" || type === "audio/aac" || type === "audio/x-m4a") {
    if (await mp4HasAac(blob)) return { blob, mime: "audio/mp4" };
    // MP4 com Opus dentro (Chrome faz isso): não serve, tenta remuxar como Ogg.
    throw new Error("A gravação veio em MP4 sem AAC. Tente novamente ou anexe um arquivo de áudio.");
  }

  if (type === "audio/ogg" || type === "audio/opus") return { blob, mime: "audio/ogg" };

  if (type === "audio/webm" || type === "video/webm" || !type) {
    const ogg = await webmOpusToOgg(blob);
    return { blob: ogg, mime: "audio/ogg" };
  }

  if (type === "audio/mpeg" || type === "audio/mp3") return { blob, mime: "audio/mpeg" };

  // Formato desconhecido: tenta o remux (a maioria dos navegadores grava WebM).
  const ogg = await webmOpusToOgg(blob);
  return { blob: ogg, mime: "audio/ogg" };
}
