import { decode } from 'cbor-x';

/**
 * C2PA (Coalition for Content Provenance and Authenticity) Extractor
 * 
 * Forensic-grade module for extracting provenance manifests from JPEG, 
 * PNG, WebP, and HEIC files. Implements precise ISO BMFF traversal 
 * with robust iinf/iloc state tracking.
 */

interface Tag {
  name: string;
  value: string;
  category: string;
}

interface JumbfBox {
  type: string;
  data: Uint8Array;
}

/**
 * Parses JUMBF/ISOBMFF boxes. Handles 64-bit extended sizes with 
 * MAX_SAFE_INTEGER guards.
 */
const parseBoxes = (data: Uint8Array): JumbfBox[] => {
  const boxes: JumbfBox[] = [];
  let i = 0;
  while (i + 8 <= data.length) {
    let length = (data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3];
    const type = String.fromCharCode(data[i + 4], data[i + 5], data[i + 6], data[i + 7]);
    let headerSize = 8;
    
    if (length === 1) {
      if (i + 16 > data.length) break;
      const hi = (data[i + 8] << 24) | (data[i + 9] << 16) | (data[i + 10] << 8) | data[i + 11];
      const lo = (data[i + 12] << 24) | (data[i + 13] << 16) | (data[i + 14] << 8) | data[i + 15];
      try {
        const fullSize = (BigInt(hi) << 32n) | BigInt(lo >>> 0);
        if (fullSize > BigInt(Number.MAX_SAFE_INTEGER)) break;
        if (fullSize > BigInt(data.length)) break;
        length = Number(fullSize);
        headerSize = 16;
      } catch { break; }
    }
    if (length === 0) break;
    const boxEnd = i + length;
    if (boxEnd > data.length) break;
    boxes.push({ type, data: data.slice(i + headerSize, boxEnd) });
    i = boxEnd;
  }
  return boxes;
};

/**
 * Robust big-endian integer reader with BigInt safety for 8-byte fields.
 */
const readInt = (data: Uint8Array, offset: number, size: number): number => {
  if (offset + size > data.length) return 0;
  if (size === 1) return data[offset];
  if (size === 2) return (data[offset] << 8) | data[offset + 1];
  if (size === 4) return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
  if (size === 8) {
    const hi = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    const lo = (data[offset + 4] << 24) | (data[offset + 5] << 16) | (data[offset + 6] << 8) | data[offset + 7];
    const big = (BigInt(hi) << 32n) | BigInt(lo >>> 0);
    return big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : 0;
  }
  return 0;
};

/**
 * Surgical HEIC C2PA extractor via iinf/iloc traversal.
 */
const findC2PAInHeic = (bytes: Uint8Array): Uint8Array | null => {
  const rootBoxes = parseBoxes(bytes);
  const meta = rootBoxes.find(b => b.type === 'meta');
  if (!meta) return null;

  const metaData = meta.data.slice(4); // Version + Flags
  const metaBoxes = parseBoxes(metaData);
  const iinfBox = metaBoxes.find(b => b.type === 'iinf');
  const ilocBox = metaBoxes.find(b => b.type === 'iloc');
  if (!iinfBox || !ilocBox) return null;

  // 1. iinf Parsing
  const iinfVersion = iinfBox.data[0];
  const iinfHeaderSize = iinfVersion === 0 ? 6 : 8; // version/flags + entry_count
  const infeBoxes = parseBoxes(iinfBox.data.slice(iinfHeaderSize));
  
  let targetItemId = -1;
  for (const infe of infeBoxes) {
    if (infe.type !== 'infe') continue;
    const d = infe.data;
    const version = d[0];
    let offset = 4; // Skip flags
    
    let itemId = version >= 3 ? readInt(d, offset, 4) : readInt(d, offset, 2);
    offset += (version >= 3 ? 4 : 2);
    offset += 2; // protection_index

    if (version >= 2) {
      // Version 2+ puts item_type before the name
      const itemType = String.fromCharCode(d[offset], d[offset + 1], d[offset + 2], d[offset + 3]);
      if (itemType === 'c2pa' || itemType === 'jumb') { targetItemId = itemId; break; }
    } else {
      // Version 0/1: name comes BEFORE type
      // Scan past null-terminated item_name
      while (offset < d.length && d[offset] !== 0) offset++;
      offset++; // skip null terminator
      if (offset + 4 > d.length) continue;
      const itemType = String.fromCharCode(d[offset], d[offset + 1], d[offset + 2], d[offset + 3]);
      if (itemType === 'c2pa' || itemType === 'jumb') { targetItemId = itemId; break; }
    }
  }

  if (targetItemId === -1) return null;

  // 2. iloc Parsing
  const d = ilocBox.data;
  const version = d[0];
  const offsetSize = (d[4] >> 4) & 0x0F;
  const lengthSize = d[4] & 0x0F;
  const baseOffsetSize = (d[5] >> 4) & 0x0F;
  const indexSize = d[5] & 0x0F;
  
  let pos = 6;
  const itemCount = version < 2 ? readInt(d, pos, 2) : readInt(d, pos, 4);
  pos += (version < 2 ? 2 : 4);

  for (let i = 0; i < itemCount; i++) {
    const itemId = version < 2 ? readInt(d, pos, 2) : readInt(d, pos, 4);
    pos += (version < 2 ? 2 : 4);
    
    // ISO 14496-12: construction_method and data_reference_index
    if (version >= 1) pos += 2; // separate construction_method field in v1+
    pos += 2; // data_reference_index    
    const baseOffset = readInt(d, pos, baseOffsetSize);
    pos += baseOffsetSize;
    
    const extentCount = readInt(d, pos, 2);
    pos += 2;
    
    for (let j = 0; j < extentCount; j++) {
      if ((version === 1 || version === 2) && indexSize > 0) pos += indexSize;
      const extentOffset = readInt(d, pos, offsetSize);
      pos += offsetSize;
      const extentLength = readInt(d, pos, lengthSize);
      pos += lengthSize;
      
      if (itemId === targetItemId) {
        const absoluteOffset = baseOffset + extentOffset;
        if (absoluteOffset + extentLength <= bytes.length) {
          return bytes.slice(absoluteOffset, absoluteOffset + extentLength);
        }
      }
    }
  }
  return null;
};

/**
 * Recursive box search for assertions.
 */
const recursiveFindBox = (data: Uint8Array, targetType: string): Uint8Array | null => {
  const boxes = parseBoxes(data);
  for (const box of boxes) {
    if (box.type === targetType) return box.data;
    const found = recursiveFindBox(box.data, targetType);
    if (found) return found;
  }
  return null;
};

/**
 * CBOR Assertion Extraction.
 */
const extractAssertions = (cborData: Uint8Array): Tag[] => {
  const tags: Tag[] = [];
  try {
    const manifest = decode(cborData);
    if (manifest.claim_generator) {
      tags.push({ name: 'C2PA Generator', value: String(manifest.claim_generator), category: 'Origin & History' });
    }
    if (manifest.assertions) {
      for (const assertion of manifest.assertions) {
        const label = String(assertion.label || '');
        if (label.startsWith('c2pa.actions')) {
          const actionData = assertion.data;
          if (actionData?.actions) {
            const actions = actionData.actions.map((a: any) => a.action).join(', ');
            tags.push({ name: 'Provenance Actions', value: actions, category: 'Origin & History' });
            const agent = actionData.actions.find((a: any) => a.softwareAgent)?.softwareAgent;
            if (agent) {
              const value = typeof agent === 'object' ? `${agent.name || ''} ${agent.version || ''}`.trim() : String(agent);
              if (value) tags.push({ name: 'Software Agent', value, category: 'Origin & History' });
            }
          }
        }
        if (label.startsWith('c2pa.digital_source_type')) {
          tags.push({ name: 'Digital Source', value: String(assertion.data), category: 'Origin & History' });
        }
      }
    }
  } catch (e) {}
  return tags;
};

export const extractC2PAMetadata = (bytes: Uint8Array, mime: string): Tag[] => {
  let container: Uint8Array | null = null;

  if (mime === 'image/jpeg') {
    let i = 2;
    while (i < bytes.length - 1) {
      if (bytes[i] === 0xFF && bytes[i+1] === 0xEB) {
        const len = (bytes[i+2] << 8) | bytes[i+3];
        const payload = bytes.slice(i + 4, i + 2 + len);
        if (payload.length >= 8) {
          const type = String.fromCharCode(payload[4], payload[5], payload[6], payload[7]);
          if (type === 'jumb') { container = payload; break; }
        }
        i += 2 + len;
      } else if (bytes[i] === 0xFF && bytes[i+1] === 0xDA) break;
      else i++;
    }
  } else if (mime === 'image/png') {
    let i = 8;
    while (i + 8 <= bytes.length) {
      const len = (bytes[i] << 24) | (bytes[i+1] << 16) | (bytes[i+2] << 8) | bytes[i+3];
      const type = String.fromCharCode(...bytes.slice(i+4, i+8));
      if (type === 'jUMb') { container = bytes.slice(i+8, i+8+len); break; }
      i += 12 + len;
    }
  } else if (mime === 'image/webp') {
    let i = 12;
    while (i + 8 <= bytes.length) {
      const type = String.fromCharCode(...bytes.slice(i, i+4));
      const len = (bytes[i+4] | (bytes[i+5] << 8) | (bytes[i+6] << 16) | (bytes[i+7] << 24));
      if (type === 'JUMB') { container = bytes.slice(i+8, i+8+len); break; }
      i += 8 + len + (len % 2);
    }
  } else if (mime === 'image/heic') {
    container = findC2PAInHeic(bytes);
  }

  if (!container) return [];
  const tags: Tag[] = [];
  try {
    const c2as = recursiveFindBox(container, 'c2as');
    if (c2as) tags.push(...extractAssertions(c2as));
    const c2pa = recursiveFindBox(container, 'c2pa');
    if (c2pa) tags.push(...extractAssertions(c2pa));
  } catch (e) {}
  return tags;
};
