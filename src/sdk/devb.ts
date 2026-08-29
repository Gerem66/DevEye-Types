import crypto from 'crypto';

/**
 * `DEVB` : le conteneur chiffré que CloudSync (blobs) et Backup (archives)
 * partagent. Une seule définition parce que le format est figé : un octet de
 * divergence et une sauvegarde ne se rouvre plus. Ne s'occupe que du FORMAT ;
 * la clé est l'affaire de chaque module (`scripts/restore-backup.mjs` côté app
 * relit ce format sans DevEye).
 *
 * v1, flux unique (lu, plus jamais écrit) :
 *   magic 'DEVB' (4) | 0x01 (1) | nonce (12) | ciphertext | tag GCM (16)
 * Un seul AES-256-GCM ; irreprenable après redémarrage, l'état du cipher ne se
 * sérialise pas.
 *
 * v2, scellé par blocs (format d'écriture) :
 *   magic 'DEVB' (4) | 0x02 (1) | nonce de base (12) | bloc* | bloc final
 *   bloc = ciphertext ({@link BLOB_CHUNK_BYTES} octets de clair) | tag (16)
 * Nonce = nonce de base XOR compteur, AAD = compteur (8) + marqueur de fin (1) :
 * le marqueur ferme la troncature, le compteur le réordonnancement. La reprise
 * d'un partiel relit les blocs complets en local pour reconstituer le SHA-256
 * courant, sans retransmettre un octet.
 */

const BLOB_MAGIC = Buffer.from('DEVB');
const BLOB_V1 = 0x01;
const BLOB_V2 = 0x02;

/** Longueur de l'en-tête (magic + version + nonce) et d'un tag GCM. */
export const BLOB_HEADER_LEN = BLOB_MAGIC.length + 1 + 12;
export const BLOB_TAG_LEN = 16;

/**
 * Clair par bloc en v2. 1 Mio : assez grand pour que le surcoût des tags soit
 * négligeable (16 octets par Mio, soit 0,0015 %), assez petit pour qu'une
 * reprise ne reperde jamais plus d'un Mio de travail.
 */
export const BLOB_CHUNK_BYTES = 1024 * 1024;
/** Taille d'un bloc v2 complet sur le disque. */
export const BLOB_CHUNK_SEALED = BLOB_CHUNK_BYTES + BLOB_TAG_LEN;

export const BLOB_VERSION_STREAM = BLOB_V1;
export const BLOB_VERSION_CHUNKED = BLOB_V2;

/** L'en-tête d'un nouveau blob v2 (magic + version + nonce de base aléatoire). */
export function createBlobHeader(): Buffer {
    return Buffer.concat([BLOB_MAGIC, Buffer.from([BLOB_V2]), crypto.randomBytes(12)]);
}

/** Valide un en-tête et rend sa version + son nonce de base. */
export function parseBlobHeader(header: Buffer): { version: number; nonce: Buffer } {
    if (header.length !== BLOB_HEADER_LEN || !header.subarray(0, 4).equals(BLOB_MAGIC)) {
        throw new Error('DEVB : blob corrompu (en-tête invalide)');
    }
    const version = header[4];
    if (version !== BLOB_V1 && version !== BLOB_V2) {
        throw new Error(`DEVB : version de blob inconnue (${version})`);
    }
    return { version, nonce: header.subarray(5, 17) };
}

/**
 * Le nonce du bloc `index` : nonce de base XOR le compteur en big-endian sur
 * les 8 derniers octets. Deux blobs n'ont jamais le même nonce de base (12
 * octets aléatoires), donc jamais la même paire (clé, nonce) — la règle d'or
 * de GCM tient.
 */
function chunkNonce(base: Buffer, index: number): Buffer {
    const nonce = Buffer.from(base);
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(index));
    for (let i = 0; i < 8; i += 1) nonce[4 + i] ^= counter[i];
    return nonce;
}

/** L'AAD d'un bloc : son rang, et s'il termine le blob. */
function chunkAad(index: number, final: boolean): Buffer {
    const aad = Buffer.alloc(9);
    aad.writeBigUInt64BE(BigInt(index));
    aad[8] = final ? 1 : 0;
    return aad;
}

/** Scelle un bloc de clair en `ciphertext | tag`. */
export function sealChunk(
    key: Buffer,
    base: Buffer,
    index: number,
    plain: Buffer,
    final: boolean
): Buffer {
    const cipher = crypto.createCipheriv('aes-256-gcm', key, chunkNonce(base, index));
    cipher.setAAD(chunkAad(index, final));
    const body = Buffer.concat([cipher.update(plain), cipher.final()]);
    return Buffer.concat([body, cipher.getAuthTag()]);
}

/**
 * Ouvre un bloc scellé. Lève si le tag ne colle pas — donc si le contenu, son
 * rang ou son statut de dernier bloc ont bougé.
 */
export function openChunk(
    key: Buffer,
    base: Buffer,
    index: number,
    sealed: Buffer,
    final: boolean
): Buffer {
    if (sealed.length < BLOB_TAG_LEN) throw new Error('DEVB : bloc de blob tronqué');
    const body = sealed.subarray(0, sealed.length - BLOB_TAG_LEN);
    const tag = sealed.subarray(sealed.length - BLOB_TAG_LEN);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, chunkNonce(base, index));
    decipher.setAAD(chunkAad(index, final));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]);
}

/** Ouvre le déchiffrement d'un blob v1 (flux unique) depuis son en-tête. */
export function openStreamDecipher(key: Buffer, nonce: Buffer): crypto.DecipherGCM {
    return crypto.createDecipheriv('aes-256-gcm', key, nonce);
}
