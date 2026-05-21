

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MetadataReport {
  format: string;
  size: number;
  tags: { name: string; value: string; category: string }[];
  privacyScore: number;
}

export interface SanitizeOptions {
  /** Whether to preserve ICC color profiles (recommended for professionals). */
  keepIcc?: boolean;
  /** Whether to preserve PDF annotations (links, comments). Scrubbed of PII if kept. */
  keepAnnots?: boolean;
  /** Whether to preserve portfolio-safe camera specifications (Focal Length, Aperture, ISO, Lens Model). */
  keepCameraSpecs?: boolean;

  // ── Identity Injection (Pro) ──────────────────────────────────────────────
  /** Whether to inject creator identity metadata. */
  injectIdentity?: boolean;
  /** Name of the creator. */
  creatorName?: string;
  /** Copyright statement. */
  copyright?: string;
  /** Contact URL for licensing. */
  contactUrl?: string;
  /** Whether to inject AI Opt-Out indicators. */
  aiOptOut?: boolean;
  /** Whether the user is a Pro subscriber (affects naming/branding). */
  isPro?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HIGH_RISK_TAGS = new Set([
  'GPSLatitude', 'GPSLongitude', 'GPSAltitude', 'GPSTimeStamp', 'GPSDateStamp',
  'DateTimeOriginal', 'CreateDate', 'ModifyDate',
  'Software', 'Artist', 'Copyright', 'OwnerName',
  'Make', 'Model', 'SerialNumber', 'CameraSerialNumber',
  'LensModel', 'LensSerialNumber', 'UniqueCameraModel',
]);

const TAG_CATEGORIES: Record<string, string> = {
  GPSLatitude:        'GPS Location',
  GPSLongitude:       'GPS Location',
  GPSAltitude:        'GPS Location',
  GPSTimeStamp:       'GPS Location',
  GPSDateStamp:       'GPS Location',
  Make:               'Device',
  Model:              'Device',
  LensModel:          'Device',
  SerialNumber:       'Device ID',
  CameraSerialNumber: 'Device ID',
  LensSerialNumber:   'Device ID',
  UniqueCameraModel:  'Device ID',
  DateTimeOriginal:   'Timestamp',
  CreateDate:         'Timestamp',
  ModifyDate:         'Timestamp',
  Software:           'Software',
  Artist:             'Identity',
  Copyright:          'Identity',
  OwnerName:          'Identity',
  ImageDescription:   'Content',
  XPComment:          'Content',
  UserComment:        'Content',
  DocumentID:         'XMP/Adobe',
  InstanceID:         'XMP/Adobe',
  HistoryAction:      'XMP/Adobe',
  Byline:             'IPTC',
  Caption:            'IPTC',
  Credit:             'IPTC',
  Source:             'IPTC',
};

const calculatePrivacyScore = (tags: MetadataReport['tags']): number => {
  if (tags.length === 0) return 100;
  let score = 100;
  for (const tag of tags) {
    score -= HIGH_RISK_TAGS.has(tag.name) ? 12 : 3;
  }
  return Math.max(0, score);
};

// ─── Engine Preloading ────────────────────────────────────────────────────────

let engineInitialized = false;

/**
 * Preloads heavy dependencies in the background to prevent UI freezing
 * when a user drops a file for the first time.
 */
export const preloadEngine = () => {
  if (engineInitialized || typeof window === 'undefined') return;
  engineInitialized = true;
  
  // Give the UI a moment to finish rendering before starting heavy network/parse work
  setTimeout(() => {
    import('heic2any').catch(() => {});
    import('exifr').catch(() => {});
    import('pdf-lib').catch(() => {});
  }, 1000);
};

// ─── HEIC Conversion ─────────────────────────────────────────────────────────

/** Accepts both File and Blob so it can be called from sanitizeImage internally. */
export const convertHeicToJpeg = async (file: File | Blob): Promise<Blob> => {
  const heic2any = (await import('heic2any')).default;
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  return Array.isArray(result) ? result[0] : result;
};

// ─── Metadata Extraction ─────────────────────────────────────────────────────

export const extractMetadata = async (file: File): Promise<MetadataReport> => {
  const report: MetadataReport = {
    format: file.type,
    size: file.size,
    tags: [],
    privacyScore: 100,
  };

  // ── Images ──────────────────────────────────────────────────────────────────
  if (file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name)) {
    if (/\.(heic|heif)$/i.test(file.name)) {
      report.format = 'image/heic';
    }

    try {
      const exifr = (await import('exifr')).default;
      // Exifr natively supports reading HEIC! No need to convert to JPEG first.
      const output = await exifr.parse(file, {
        tiff: true,
        exif: true,
        gps: true,
        xmp: true,
        iptc: true,
        // icc: false - ICC profiles are colour-science data, not PII
        jfif: true,
      });

      if (output) {
        for (const [key, value] of Object.entries(output)) {
          if (value === undefined || value === null) continue;
          report.tags.push({
            name: key,
            value: typeof value === 'object' ? JSON.stringify(value) : String(value),
            category: TAG_CATEGORIES[key] ?? 'Other',
          });
        }
      }

      // ── Content History & Origin ──
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { extractC2PAMetadata } = await import('./c2pa-extractor');
      const c2paTags = extractC2PAMetadata(bytes, report.format);
      if (c2paTags.length > 0) {
        report.tags.push(...c2paTags);
      }
    } catch (e) {
      console.warn('Image metadata extraction failed:', e);
    }

  // ── PDFs ────────────────────────────────────────────────────────────────────
  } else if (file.type === 'application/pdf') {
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(await file.arrayBuffer(), {
        ignoreEncryption: true,
      });

      const infoEntries: Array<[string, string | Date | undefined]> = [
        ['Title',        pdfDoc.getTitle()],
        ['Author',       pdfDoc.getAuthor()],
        ['Subject',      pdfDoc.getSubject()],
        ['Keywords',     pdfDoc.getKeywords()],
        ['Creator',      pdfDoc.getCreator()],
        ['Producer',     pdfDoc.getProducer()],
        ['CreationDate', pdfDoc.getCreationDate()],
        ['ModDate',      pdfDoc.getModificationDate()],
      ];

      for (const [name, value] of infoEntries) {
        if (!value) continue;
        report.tags.push({
          name,
          value: value instanceof Date ? value.toISOString() : value,
          category: 'PDF Info',
        });
      }
    } catch (e) {
      console.warn('PDF metadata extraction failed:', e);
    }
  }

  report.privacyScore = calculatePrivacyScore(report.tags);
  return report;
};

// ─── JPEG Byte-Level Stripper ────────────────────────────────────────────────

/**
 * Checks if a JPEG segment contains an ICC Profile.
 * APP2 segments (0xFFE2) starting with "ICC_PROFILE\0" (12 bytes) are profiles.
 */
const isIccSegment = (data: Uint8Array, offset: number): boolean => {
  if (data[offset + 1] !== 0xE2) return false;
  const header = String.fromCharCode(...data.slice(offset + 4, offset + 16));
  return header === 'ICC_PROFILE\0';
};

const sanitizeExifSegmentInPlace = (exifData: Uint8Array): void => {
  if (exifData.length < 8) return;

  let tiffHeaderOffset = 0;
  if (exifData.length >= 14 && String.fromCharCode(...exifData.slice(0, 6)) === 'Exif\0\0') {
    tiffHeaderOffset = 6;
  }

  const isLittle = exifData[tiffHeaderOffset] === 0x49 && exifData[tiffHeaderOffset + 1] === 0x49;
  const isBig = exifData[tiffHeaderOffset] === 0x4D && exifData[tiffHeaderOffset + 1] === 0x4D;
  if (!isLittle && !isBig) return;

  const read16 = (offset: number): number => {
    if (offset < 0 || offset + 2 > exifData.length) return 0;
    if (isLittle) {
      return exifData[offset] | (exifData[offset + 1] << 8);
    } else {
      return (exifData[offset] << 8) | exifData[offset + 1];
    }
  };

  const read32 = (offset: number): number => {
    if (offset < 0 || offset + 4 > exifData.length) return 0;
    if (isLittle) {
      return (
        exifData[offset] |
        (exifData[offset + 1] << 8) |
        (exifData[offset + 2] << 16) |
        (exifData[offset + 3] << 24)
      );
    } else {
      return (
        (exifData[offset] << 24) |
        (exifData[offset + 1] << 16) |
        (exifData[offset + 2] << 8) |
        exifData[offset + 3]
      );
    }
  };

  const write32 = (offset: number, value: number): void => {
    if (offset < 0 || offset + 4 > exifData.length) return;
    if (isLittle) {
      exifData[offset] = value & 0xFF;
      exifData[offset + 1] = (value >> 8) & 0xFF;
      exifData[offset + 2] = (value >> 16) & 0xFF;
      exifData[offset + 3] = (value >> 24) & 0xFF;
    } else {
      exifData[offset] = (value >> 24) & 0xFF;
      exifData[offset + 1] = (value >> 16) & 0xFF;
      exifData[offset + 2] = (value >> 8) & 0xFF;
      exifData[offset + 3] = value & 0xFF;
    }
  };

  const ifd0Offset = tiffHeaderOffset + read32(tiffHeaderOffset + 4);

  const allowedTags = new Set([
    0x8769, // ExifOffset (TIFF pointer)
    0x920A, // FocalLength
    0x829D, // FNumber
    0x8827, // ISOSpeedRatings
    0xA434, // LensModel
  ]);

  const typeSizes = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];
  const processedIFDs = new Set<number>();

  const processIFD = (offset: number): void => {
    if (offset < tiffHeaderOffset || offset >= exifData.length - 2 || processedIFDs.has(offset)) return;
    processedIFDs.add(offset);

    const numEntries = read16(offset);
    let entryOffset = offset + 2;

    for (let e = 0; e < numEntries; e++) {
      if (entryOffset + 12 > exifData.length) break;
      const tag = read16(entryOffset);
      const type = read16(entryOffset + 2);
      const count = read32(entryOffset + 4);
      const valOffset = read32(entryOffset + 8);

      if (tag === 0x8769) {
        // ExifOffset: recurse into the Exif SubIFD
        processIFD(tiffHeaderOffset + valOffset);
      } else if (tag === 0x8825) {
        // GPSInfoOffset: Point this tag to 0 (effectively deleting it) and zero out GPS IFD
        const gpsOffset = tiffHeaderOffset + valOffset;
        if (gpsOffset >= tiffHeaderOffset && gpsOffset < exifData.length) {
          const gpsNumEntries = read16(gpsOffset);
          const gpsBlockSize = 2 + gpsNumEntries * 12 + 4;
          if (gpsOffset + gpsBlockSize <= exifData.length) {
            exifData.fill(0, gpsOffset, gpsOffset + gpsBlockSize);
          }
        }
        write32(entryOffset + 8, 0); // Nullify pointer
      } else if (!allowedTags.has(tag)) {
        // Zero out the out-of-line value if it exists
        const typeSize = typeSizes[type] || 1;
        const totalSize = count * typeSize;
        if (totalSize > 4 && valOffset >= 8 && tiffHeaderOffset + valOffset + totalSize <= exifData.length) {
          exifData.fill(0, tiffHeaderOffset + valOffset, tiffHeaderOffset + valOffset + totalSize);
        }
        // Zero out the directory entry
        exifData.fill(0, entryOffset, entryOffset + 12);
      }

      entryOffset += 12;
    }
  };

  processIFD(ifd0Offset);
};

/**
 * Removes ALL APPn markers (0xFFE0–0xFFEF) and COM markers (0xFE) from a JPEG.
 * These segments carry JFIF, ICC, EXIF, XMP, etc.
 * Keeps SOI, DQT, DHT, SOF, SOS, and all raw image data.
 * 
 * @param keepIcc If true, APP2 segments containing ICC Profile headers are preserved.
 * @param keepCameraSpecs If true, preserves Focal Length, Aperture, ISO, Lens Model.
 */
const stripJpegAppSegments = (data: Uint8Array, keepIcc = false, keepCameraSpecs = false): Uint8Array => {
  const pieces: Uint8Array[] = [data.slice(0, 2)]; // SOI (FF D8)
  let i = 2;

  while (i < data.length - 1) {
    if (data[i] !== 0xFF) { i++; continue; }

    const marker = data[i + 1];

    if (marker === 0xDA) {
      // SOS: Start of Scan. We must find the EOI (FF D9) marker and stop there
      // to ensure we discard any malicious data stashed after the image end.
      const headerLen = (data[i + 2] << 8) | data[i + 3];
      let eoi = i + 2 + headerLen;
      while (eoi < data.length - 1) {
        if (data[eoi] === 0xFF && data[eoi + 1] === 0xD9) {
          pieces.push(data.slice(i, eoi + 2));
          return concatUint8Arrays(pieces);
        }
        eoi++;
      }
      // Fallback: keep everything if EOI is missing (malformed but renderable)
      pieces.push(data.slice(i));
      break;
    }

    if ((marker >= 0xE0 && marker <= 0xEF) || marker === 0xFE) {
      const segLen = (data[i + 2] << 8) | data[i + 3];

      // Special case: Preserve ICC Profiles if requested
      if (keepIcc && marker === 0xE2 && isIccSegment(data, i)) {
        pieces.push(data.slice(i, i + 2 + segLen));
      }

      // Special case: Preserve camera specifications (EXIF) if requested
      if (keepCameraSpecs && marker === 0xE1 && segLen >= 8) {
        const payload = data.slice(i + 4, i + 2 + segLen);
        if (payload.length >= 6 && String.fromCharCode(...payload.slice(0, 6)) === 'Exif\0\0') {
          const sanitizedPayload = payload.slice(); // copy to avoid mutating original source data
          sanitizeExifSegmentInPlace(sanitizedPayload);
          
          // Reconstruct the APP1 segment
          const app1Header = new Uint8Array(4);
          app1Header[0] = 0xFF;
          app1Header[1] = 0xE1;
          app1Header[2] = (segLen >> 8) & 0xFF;
          app1Header[3] = segLen & 0xFF;
          
          pieces.push(concatUint8Arrays([app1Header, sanitizedPayload]));
        }
      }

      i += 2 + segLen;
      continue;
    }

    if (marker >= 0xC0) {
      // DQT, DHT, SOF, DRI, etc. - keep
      const segLen = (data[i + 2] << 8) | data[i + 3];
      pieces.push(data.slice(i, i + 2 + segLen));
      i += 2 + segLen;
    } else {
      i++;
    }
  }

  return concatUint8Arrays(pieces);
};

// ─── PNG Chunk Stripper ──────────────────────────────────────────────────────

/**
 * PNG chunks are divided into Critical (uppercase first letter) and Ancillary (lowercase first letter).
 * Critical chunks (IHDR, PLTE, IDAT, IEND) are mathematically required for the image to render.
 * Safe ancillary chunks: tRNS (transparency), gAMA, cHRM, sRGB (colour space).
 * iCCP (ICC profile) is conditionally preserved.
 * EVERYTHING else (tEXt, eXIf, tIME, pHYs, or custom malicious chunks) is vaporized.
 */
const PNG_SAFE_ANCILLARY = new Set(['tRNS', 'gAMA', 'cHRM', 'sRGB']);
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;

// ─── PNG CRC Integrity ───────────────────────────────────────────────────────

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c;
}

/**
 * Computes the CRC-32 checksum of a data buffer.
 * In PNG, the CRC covers the chunk type and chunk data fields.
 */
const computeCrc32 = (data: Uint8Array): number => {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
};


/** Creates a tEXt chunk for PNG metadata. */
const createPngTextChunk = (keyword: string, text: string): Uint8Array => {
  const encoder = new TextEncoder();
  const keywordBytes = encoder.encode(keyword);
  const textBytes = encoder.encode(text);
  const data = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
  data.set(keywordBytes);
  data[keywordBytes.length] = 0; // null separator
  data.set(textBytes, keywordBytes.length + 1);

  const chunkType = encoder.encode('tEXt');
  const typeAndData = new Uint8Array(4 + data.length);
  typeAndData.set(chunkType);
  typeAndData.set(data, 4);

  const crc = computeCrc32(typeAndData);
  const result = new Uint8Array(4 + 4 + data.length + 4);
  const view = new DataView(result.buffer);
  view.setUint32(0, data.length, false);
  result.set(typeAndData, 4);
  view.setUint32(result.length - 4, crc, false);
  return result;
};

const stripPngMetaChunks = (data: Uint8Array, options: SanitizeOptions): Uint8Array => {
  // Validate PNG signature
  for (let i = 0; i < 8; i++) {
    if (data[i] !== PNG_SIGNATURE[i]) return data; // not a valid PNG - pass through
  }

  const view = new DataView(data.buffer, data.byteOffset);
  const pieces: Uint8Array[] = [data.slice(0, 8)]; // keep signature
  let i = 8;

  while (i + 12 <= data.length) {
    const length   = view.getUint32(i, false);
    const type     = String.fromCharCode(data[i + 4], data[i + 5], data[i + 6], data[i + 7]);
    const chunkEnd = i + 8 + length + 4;

    if (chunkEnd > data.length) break;

    const isCritical = (type.charCodeAt(0) & 32) === 0;
    const isSafeAncillary = PNG_SAFE_ANCILLARY.has(type) || (type === 'iCCP' && options.keepIcc);
    const isExif = type === 'eXIf' && options.keepCameraSpecs;

    if (isCritical || isSafeAncillary || isExif) {
      // Create a copy of the chunk to avoid mutating the original buffer
      const chunk = data.slice(i, chunkEnd);
      
      if (isExif) {
        // The eXIf chunk data is the payload itself (from index 8 to length - 4 bytes)
        const typeAndData = chunk.slice(4, -4);
        const exifPayload = typeAndData.slice(4);
        sanitizeExifSegmentInPlace(exifPayload);
        typeAndData.set(exifPayload, 4);
        chunk.set(typeAndData, 4);
      }
      
      // Recompute CRC: even if we haven't modified the data, this ensures
      // the output is topologically sound and robust against future edits.
      // CRC is computed over [Type + Data] segments.
      const typeAndData = chunk.slice(4, -4);
      const newCrc = computeCrc32(typeAndData);
      
      // Write new CRC (big-endian) into the last 4 bytes of the chunk
      const chunkView = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      chunkView.setUint32(chunk.length - 4, newCrc, false);
      
      if (type === 'IEND') {
        // Before final chunk, inject our identity if needed
        if (options.injectIdentity) {
          const name = options.creatorName || 'Human Creator';
          const copy = options.copyright || `© ${new Date().getFullYear()} ${name}`;
          const url  = options.contactUrl || '';
          
          pieces.push(createPngTextChunk('Author', options.isPro ? `VeriMedia Verified Creator - ${name}` : name));
          pieces.push(createPngTextChunk('Copyright', copy));
          pieces.push(createPngTextChunk('Description', `AI Opt-Out: True. Restricted from AI training.${url ? ' License: ' + url : ''}`));
          pieces.push(createPngTextChunk('Software', 'VeriMedia.xyz'));
        } else if (options.aiOptOut) {
          pieces.push(createPngTextChunk('Description', 'AI Opt-Out: True. Restricted from AI training.'));
          pieces.push(createPngTextChunk('Software', 'VeriMedia.xyz'));
        }
      }

      pieces.push(chunk);
    }

    if (type === 'IEND') break;
    i = chunkEnd;
  }

  return concatUint8Arrays(pieces);
};

// ─── WebP RIFF Chunk Stripper ────────────────────────────────────────────────

/** Creates a simple XMP chunk for WebP metadata. */
const createWebpXmpChunk = (options: SanitizeOptions): Uint8Array => {
  const name = options.creatorName || 'Human Creator';
  const copy = options.copyright || `© ${new Date().getFullYear()} ${name}`;
  const url  = options.contactUrl || '';
  const author = options.isPro ? `VeriMedia Verified Creator - ${name}` : name;
  const description = `AI Opt-Out: True. Restricted from AI training.${url ? ' License: ' + url : ''}`;

  const xmpString = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    dc:creator="${author}"
    dc:rights="${copy}"
    dc:description="${description}"
    xmp:CreatorTool="VeriMedia.xyz"/>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="r"?>`;

  const encoder = new TextEncoder();
  const data = encoder.encode(xmpString);
  const paddedSize = data.length + (data.length % 2);
  const result = new Uint8Array(8 + paddedSize);
  const view = new DataView(result.buffer);
  
  result.set(encoder.encode('XMP '), 0);
  view.setUint32(4, data.length, true); // WebP uses little-endian for sizes
  result.set(data, 8);
  return result;
};

/** Removes EXIF and XMP chunks from a WebP RIFF container. */
const stripWebpMetaChunks = (data: Uint8Array, options: SanitizeOptions): Uint8Array => {
  const riff = String.fromCharCode(data[0], data[1], data[2], data[3]);
  const webp = String.fromCharCode(data[8], data[9], data[10], data[11]);
  if (riff !== 'RIFF' || webp !== 'WEBP') return data; // not a valid WebP - pass through

  // Allowlist of strictly required visual/structural WebP chunks
  const WEBP_SAFE_CHUNKS = new Set(['VP8 ', 'VP8L', 'VP8X', 'ALPH', 'ANIM', 'ANMF']);
  const view = new DataView(data.buffer, data.byteOffset);

  const pieces: Uint8Array[] = [data.slice(0, 12)]; // 'RIFF' + size + 'WEBP'
  let i = 12;

  while (i + 8 <= data.length) {
    const type        = String.fromCharCode(data[i], data[i + 1], data[i + 2], data[i + 3]);
    const chunkSize   = view.getUint32(i + 4, true); // little-endian
    const paddedSize  = chunkSize + (chunkSize % 2); // chunks must be even-byte aligned
    const chunkEnd    = i + 8 + paddedSize;

    const isExif = type === 'EXIF' && options.keepCameraSpecs;

    if (WEBP_SAFE_CHUNKS.has(type) || (type === 'ICCP' && options.keepIcc) || isExif) {
      if (isExif) {
        const chunk = data.slice(i, chunkEnd);
        const exifPayload = chunk.slice(8);
        sanitizeExifSegmentInPlace(exifPayload);
        chunk.set(exifPayload, 8);
        pieces.push(chunk);
      } else {
        pieces.push(data.slice(i, chunkEnd));
      }
    }

    i = chunkEnd;
  }

  // Inject Identity if requested
  if (options.injectIdentity || options.aiOptOut) {
    pieces.push(createWebpXmpChunk(options));
  }

  const result = concatUint8Arrays(pieces);

  // Update RIFF file-size field (bytes 4–7, LE) = total file length − 8
  new DataView(result.buffer, result.byteOffset).setUint32(4, result.length - 8, true);

  return result;
};

// ─── Shared Helper ───────────────────────────────────────────────────────────

const concatUint8Arrays = (pieces: Uint8Array[]): Uint8Array => {
  const total = pieces.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const p of pieces) {
    result.set(p, offset);
    offset += p.length;
  }
  return result;
};

const hasSignature = (data: Uint8Array, signature: number[], offset = 0): boolean => {
  if (data.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (data[offset + i] !== signature[i]) return false;
  }
  return true;
};

const detectImageMime = (data: Uint8Array, fallbackMime = ''): string => {
  if (hasSignature(data, [0xFF, 0xD8, 0xFF])) return 'image/jpeg';
  if (hasSignature(data, [...PNG_SIGNATURE])) return 'image/png';
  if (hasSignature(data, [0x52, 0x49, 0x46, 0x46]) && hasSignature(data, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  if (
    hasSignature(data, [0x66, 0x74, 0x79, 0x70], 4) &&
    ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(
      String.fromCharCode(...data.slice(8, 12)),
    )
  ) {
    return 'image/heic';
  }

  if (fallbackMime === 'image/jpg') return 'image/jpeg';
  return fallbackMime;
};

/**
 * Resolves the output MIME type for a sanitised image.
 * HEIC/HEIF → JPEG. Every other supported format is preserved.
 */
const resolveOutputMime = (mimeType: string, fileName: string): string => {
  if (/\.(heic|heif)$/i.test(fileName)) return 'image/jpeg';
  if (mimeType === 'image/jpg')          return 'image/jpeg'; // non-standard alias
  if (['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) return mimeType;
  return 'image/jpeg'; // safe fallback
};

const sanitizeSupportedImageBytes = (raw: Uint8Array, mimeType: string, options: SanitizeOptions): Uint8Array | null => {
  switch (mimeType) {
    case 'image/jpeg':
      return stripJpegAppSegments(raw, options.keepIcc, options.keepCameraSpecs);
    case 'image/png':
      return stripPngMetaChunks(raw, options);
    case 'image/webp':
      return stripWebpMetaChunks(raw, options);
    default:
      return null;
  }
};

const renderImageViaCanvas = async (source: Blob, outputMime: string): Promise<Blob> => {
  const quality = outputMime === 'image/jpeg' ? 0.92 : undefined;

  return new Promise<Blob>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }

        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => blob
            ? resolve(blob)
            : reject(new Error('canvas.toBlob returned null')),
          outputMime,
          quality,
        );
      };
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(source);
  });
};

// ─── Image Sanitization ──────────────────────────────────────────────────────

/**
 * Sanitises a JPEG, PNG, WebP, or HEIC/HEIF image.
 *
 * Preferred path:
 *   1. Detect type from magic bytes.
 *   2. Strip JPEG/PNG/WebP metadata directly from the original bytes.
 *
 * Fallback path:
 *   - Use canvas re-encoding only for unsupported formats or after HEIC/HEIF
 *     conversion, then apply byte-level stripping where possible.
 */
export const sanitizeImage = async (
  fileOrBlob: File | Blob,
  options: SanitizeOptions = { 
    keepIcc: false, 
    keepAnnots: false, 
    keepCameraSpecs: false,
    injectIdentity: false,
    aiOptOut: false
  },
): Promise<Blob> => {
  const fileName = fileOrBlob instanceof File ? fileOrBlob.name : '';
  const inputBytes = new Uint8Array(await fileOrBlob.arrayBuffer());
  const detectedMime = detectImageMime(inputBytes, fileOrBlob.type ?? '');
  const isHeicLike =
    /\.(heic|heif)$/i.test(fileName) ||
    detectedMime === 'image/heic' ||
    fileOrBlob.type === 'image/heic' ||
    fileOrBlob.type === 'image/heif';

  if (isHeicLike) {
    // heic2any natively outputs a clean JPEG blob. We bypass the secondary 
    // renderImageViaCanvas to prevent double-lossy compression and quality degradation.
    const jpegBlob = await convertHeicToJpeg(fileOrBlob);
    // Pass it through our surgical byte-stripper just to guarantee 100% OPSEC.
    const raw = new Uint8Array(await jpegBlob.arrayBuffer());
    const stripped = sanitizeSupportedImageBytes(raw, 'image/jpeg', options) ?? raw;
    return new Blob([stripped as any], { type: 'image/jpeg' });
  }

  // For native formats, try direct byte-level surgery first
  const stripped = sanitizeSupportedImageBytes(inputBytes, detectedMime, options);
  if (stripped) {
    return new Blob([stripped as any], { type: detectedMime });
  }

  // Fallback: Re-encode via Canvas (for corrupted files or unsupported edge cases)
  const outputMime = resolveOutputMime(detectedMime || (fileOrBlob.type ?? ''), fileName);
  const canvasBlob = await renderImageViaCanvas(fileOrBlob, outputMime);

  const raw = new Uint8Array(await canvasBlob.arrayBuffer());
  const strippedFallback = sanitizeSupportedImageBytes(raw, outputMime, options) ?? raw;

  return new Blob([strippedFallback as any], { type: outputMime });
};

// ─── PDF Sanitization ────────────────────────────────────────────────────────

/**
 * Wipes ALL entries from the PDF Info dictionary.
 * Snapshots keys before iterating to avoid mutating a live iterator.
 */
export const wipePDFMetadata = (pdfDoc: any, PDFName: any): void => {
  const context = pdfDoc.context;
  const trailer = context.trailer;
  
  // 1. Surgical Trailer Purge: Remove the Info reference from the trailer entirely.
  // This is the 'kill switch' that prevents pdf-lib from injecting defaults on save.
  if (trailer && PDFName && trailer.has(PDFName.of('Info'))) {
    trailer.delete(PDFName.of('Info'));
  }
  
  // 2. Thorough Dictionary Cleaning (Secondary Layer)
  const infoRef = context.trailerInfo?.Info;
  if (!infoRef) return;

  const infoDict = context.lookup(infoRef);
  if (!infoDict || typeof infoDict.keys !== 'function') return;

  const keys = [...infoDict.keys()];
  for (const key of keys) {
    infoDict.delete(key);
  }
};

/**
 * Wiped PDF metadata via public sanitize call.
 */
export const sanitizePDF = async (
  file: File,
  _options: SanitizeOptions = { 
    keepIcc: false, 
    keepAnnots: false, 
    keepCameraSpecs: false,
    injectIdentity: false,
    aiOptOut: false
  },
): Promise<Uint8Array> => {
  const { PDFDocument, PDFName, PDFDict, PDFRawStream, PDFNumber } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer(), {
    ignoreEncryption: true,
  });

  // 1. Initial Metadata Clearing
  // We don't call wipePDFMetadata yet because it deletes the Info reference 
  // from the trailer, which we need if we are going to inject new data.
  // Instead, we just clear the fields.
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setCreator('');
  pdfDoc.setProducer('');

  const catalog = (pdfDoc as any).catalog;

  // 1. Wipe Catalog-level vulnerabilities
  // Metadata: XMP streams
  // PieceInfo: Adobe Illustrator/Photoshop private app data & undo history
  // OpenAction: Often used to execute JavaScript on load
  // Threads: Used for article tracking
  // SpiderInfo: Web capture information
  // XFA: XML Forms Architecture (highly vulnerable to injection)
  // OCProperties: Optional Content Groups (hidden layers)
  // StructTreeRoot: Logical structure (often contains hidden PII)
  const catalogThreats = [
    'Metadata', 'PieceInfo', 'OpenAction', 'Threads', 
    'SpiderInfo', 'XFA', 'OCProperties', 'StructTreeRoot', 'AcroForm'
  ];
  for (const t of catalogThreats) {
    const key = PDFName.of(t);
    if (catalog?.has?.(key)) catalog.delete(key);
  }

  // 2. Wipe Embedded Files & Global JavaScript
  const namesKey = PDFName.of('Names');
  if (catalog?.has?.(namesKey)) {
    const namesDict = pdfDoc.context.lookup(catalog.get(namesKey));
    if (namesDict instanceof PDFDict) {
      namesDict.delete(PDFName.of('JavaScript'));
      namesDict.delete(PDFName.of('EmbeddedFiles')); // Prevents steganography via file attachment
      namesDict.delete(PDFName.of('URLS'));
    }
  }

  // 3. Wipe Page-level vulnerabilities
  // Thumb: Thumbnails can contain unredacted/original versions of the page
  // AA: Additional Actions (often used for page-level JavaScript execution)
  // B: Beads (article threads)
  // PresSteps: Presentation steps
  const pageThreats = ['Metadata', 'PieceInfo', 'Thumb', 'AA', 'B', 'PresSteps', 'UserUnit', 'VP'];
  for (const page of pdfDoc.getPages()) {
    const node = (page as any).node;
    if (!node) continue;
    
    for (const pt of pageThreats) {
      const key = PDFName.of(pt);
      if (node?.has?.(key)) node.delete(key);
    }
    
    // 4. Annotation Handling (Conditional)
    const annotsKey = PDFName.of('Annots');
    if (node.has(annotsKey)) {
      if (_options.keepAnnots) {
        // Scrub PII and dangerous triggers but KEEP the annotations (links/comments)
        const { PDFArray } = await import('pdf-lib');
        const annots = pdfDoc.context.lookup(node.get(annotsKey));
        if (annots instanceof PDFArray) {
          const arr = annots.asArray();
          for (const annotRef of arr) {
            const annot = pdfDoc.context.lookup(annotRef);
            if (annot instanceof PDFDict) {
              // A. Wipe all Action/JavaScript triggers
              annot.delete(PDFName.of('AA')); 
              annot.delete(PDFName.of('A'));  
              annot.delete(PDFName.of('JS')); 
              annot.delete(PDFName.of('JavaScript'));
              
              // B. Wipe PII (Author, Dates, IDs)
              annot.delete(PDFName.of('T'));            // Author / Title
              annot.delete(PDFName.of('M'));            // Modification Date
              annot.delete(PDFName.of('NM'));           // Unique ID
              annot.delete(PDFName.of('CreationDate')); // Creation Date
            }
          }
        }
      } else {
        // Total Removal (Default)
        node.delete(annotsKey);
      }
    }
  }

  // 5. Deep Scan: Global Metadata & Asset Sanitization
  // We iterate over EVERY indirect object in the PDF to ensure no nested Metadata,
  // PieceInfo (Illustrator/Photoshop private data), or steganography survives.
  const allObjects = pdfDoc.context.enumerateIndirectObjects();
  
  for (const [ref, obj] of allObjects) {
    try {
      const isDict = obj instanceof PDFDict;
      const isStream = obj instanceof PDFRawStream;
      const dict = isDict ? (obj as any) : (isStream ? (obj as any).dict || (obj as any).dictionary : null);

      if (dict) {
        // A. Wipe Metadata & Private App Data
        dict.delete(PDFName.of('Metadata'));
        dict.delete(PDFName.of('PieceInfo'));

        // B. Advanced Threat Removal: Action Triggers & Multimedia
        // We wipe a comprehensive list of interactive/multimedia vectors globally.
        const threatKeys = [
          'AA', 'A', 'JS', 'JavaScript', 'Launch', 'URI', 'SubmitForm', 'XFA',
          'GoTo', 'GoToR', 'GoToE', 'Hide', 'Movie', 'Sound', 'Rendition', 'Named',
          'FS', 'AS'
        ];
        for (const tk of threatKeys) {
          dict.delete(PDFName.of(tk));
        }
        
        // C. Specific Annotation Hardening
        const subtype = dict.get(PDFName.of('Subtype'));
        if (subtype === PDFName.of('FileAttachment')) {
          // Neutralize file attachments even if they were missed elsewhere
          dict.delete(PDFName.of('FS'));
          dict.delete(PDFName.of('AP'));
        }

        if (subtype === PDFName.of('Image') && isStream) {
          try {
            // 1. Decode the stream (inflate Flate/LZW/etc.) to get actual image bytes
            const decodedData = await (obj as any).decode();
            const mime = detectImageMime(decodedData);
            
            if (mime) {
              // 2. Run our dedicated image sanitizer on the decompressed asset
              const sanitized = sanitizeSupportedImageBytes(decodedData, mime, _options);
              
              if (sanitized) {
                // 3. Update dictionary: Remove compression filters and update Length
                dict.delete(PDFName.of('Filter'));
                dict.delete(PDFName.of('DecodeParms'));
                dict.set(PDFName.of('Length'), PDFNumber.of(sanitized.length));
                
                // 4. Create new stream and assign it back
                const newStream = PDFRawStream.of(dict, sanitized);
                pdfDoc.context.assign(ref, newStream);
              }
            }
          } catch (err) {
            console.warn('Failed to sanitize embedded PDF image:', err);
          }
        }
      }
    } catch (err) {
      console.warn('Skipping indirect object sanitization due to error:', err);
    }
  }

  /**
   * Recursively walks PDF Outlines (bookmarks) and strips all actions (JS, URI, Launch).
   * Includes infinite recursion protection for circular references.
   */
  const visitedOutlines = new Set<any>();
  const scrubOutlinesRecursively = (item: any) => {
    if (!(item instanceof PDFDict) || visitedOutlines.has(item)) return;
    visitedOutlines.add(item);

    // Strip all interactive triggers from this bookmark
    const threats = ['A', 'AA', 'JS', 'JavaScript', 'Launch', 'URI', 'GoTo', 'GoToR', 'GoToE', 'Named'];
    for (const t of threats) {
      item.delete(PDFName.of(t));
    }

    // Follow the tree: First -> Next
    const firstRef = item.get(PDFName.of('First'));
    if (firstRef) {
      let current = pdfDoc.context.lookup(firstRef);
      while (current instanceof PDFDict) {
        scrubOutlinesRecursively(current);
        const nextRef = current.get(PDFName.of('Next'));
        if (!nextRef) break;
        current = pdfDoc.context.lookup(nextRef);
      }
    }
  };

  // 6. Final Polish: Wipe Structural/Navigation Leaks
  const outlinesKey = PDFName.of('Outlines');
  if (catalog?.has?.(outlinesKey)) {
    if (_options.keepAnnots) {
      // Scrub bookmarks recursively but keep the structure
      const outlinesRef = catalog.get(outlinesKey);
      const outlines = pdfDoc.context.lookup(outlinesRef);
      if (outlines instanceof PDFDict) {
        scrubOutlinesRecursively(outlines);
      }
    } else {
      catalog.delete(outlinesKey);
    }
  }
  
  const markInfoKey = PDFName.of('MarkInfo');
  if (catalog?.has?.(markInfoKey)) catalog.delete(markInfoKey);

  // Final Footprint Wipe / Identity Injection: This is the critical moment.
  // We explicitly neutralize all fields or inject verified identity.
  if (_options.injectIdentity) {
    const name = _options.creatorName || 'Human Creator';
    const url = _options.contactUrl || '';
    
    pdfDoc.setTitle('VeriMedia Protected Document');
    pdfDoc.setAuthor(_options.isPro ? `VeriMedia Verified Creator - ${name}` : name);
    pdfDoc.setSubject(`AI Opt-Out: True. Restricted from AI training.${url ? ' License: ' + url : ''}`);
    pdfDoc.setKeywords(['AI Opt-Out', 'Privacy Protected', 'VeriMedia']);
    pdfDoc.setCreator('VeriMedia.xyz');
    pdfDoc.setProducer('VeriMedia Metadata Engine');
  } else {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject(_options.aiOptOut ? 'AI Opt-Out: True. Restricted from AI training.' : '');
    pdfDoc.setKeywords(_options.aiOptOut ? ['AI Opt-Out'] : []);
    pdfDoc.setCreator('');
    pdfDoc.setProducer('');
  }
  
  // Neutralize Timestamps
  const blankDate = new Date(0); 
  try {
    (pdfDoc as any).setCreationDate(blankDate);
    (pdfDoc as any).setModificationDate(blankDate);
  } catch (e) {}

  // The Final Purge: Only pull the 'kill switch' if we are NOT injecting identity or AI opt-out.
  // If we are embedding data, we need the Info dictionary to survive.
  if (!_options.injectIdentity && !_options.aiOptOut) {
    wipePDFMetadata(pdfDoc, PDFName);
  }

  return pdfDoc.save();
};

// ─── Batch Processing ────────────────────────────────────────────────────────

export interface BatchResult {
  fileName: string;
  blob: Blob | Uint8Array;
  sanitizedSize: number;
}

/**
 * Processes files sequentially and reports per-file progress.
 * HEIC/HEIF conversion is handled inside sanitizeImage - no pre-conversion needed here.
 */
export const processBatch = async (
  files: File[],
  options: SanitizeOptions,
  onProgress: (index: number, total: number, fileName: string) => void,
): Promise<BatchResult[]> => {
  const results: BatchResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress(i, files.length, file.name);

    const blob: Blob | Uint8Array =
      file.type === 'application/pdf'
        ? await sanitizePDF(file, options)
        : await sanitizeImage(file, options);

    results.push({
      fileName:      file.name,
      blob,
      sanitizedSize: blob instanceof Blob ? blob.size : blob.length,
    });
  }

  return results;
};
