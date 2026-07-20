/**
 * Crypto Service
 *
 * Lightweight cryptographic helpers built on the Web Crypto API (available in
 * both browser and Capacitor WebView). Used for PIN hashing (app-lock) and
 * password-based AES-GCM encryption of data backups. No external dependency.
 * @module services/crypto
 */

const PBKDF2_ITERATIONS = 150_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

/**
 * Converts an ArrayBuffer to a hex string.
 * @param buffer - The buffer to convert
 * @returns The hex representation
 */
function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Converts a byte array to a base64 string.
 * @param bytes - The bytes to encode
 * @returns The base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
}

/**
 * Converts a base64 string to a byte array.
 * @param base64 - The base64 string to decode
 * @returns The decoded bytes
 */
function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

/**
 * Hashes a PIN code with SHA-256.
 * @param pin - The PIN to hash
 * @returns Promise resolving to the hex-encoded hash
 */
export async function hashPin(pin: string): Promise<string> {
    const data = new TextEncoder().encode(`zenkash:${pin}`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return bufferToHex(digest);
}

/**
 * Derives an AES-GCM key from a password and salt using PBKDF2.
 * @param password - The user password
 * @param salt - The salt bytes
 * @returns Promise resolving to the derived CryptoKey
 */
async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
    const baseKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

/**
 * The envelope wrapping an encrypted payload.
 */
export interface EncryptedEnvelope {
    /** Application marker */
    app: 'zenkash';
    /** Envelope format version */
    version: number;
    /** Whether the payload is encrypted */
    encrypted: true;
    /** Key derivation function used */
    kdf: 'PBKDF2';
    /** Base64 salt */
    salt: string;
    /** Base64 initialization vector */
    iv: string;
    /** Base64 ciphertext */
    data: string;
}

/**
 * Encrypts a serializable value with a password (AES-GCM + PBKDF2).
 * @param value - The value to encrypt
 * @param password - The password protecting the payload
 * @returns Promise resolving to a JSON envelope string
 */
export async function encryptJson(value: unknown, password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const key = await deriveKey(password, salt);

    const plaintext = new TextEncoder().encode(JSON.stringify(value));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

    const envelope: EncryptedEnvelope = {
        app: 'zenkash',
        version: 1,
        encrypted: true,
        kdf: 'PBKDF2',
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        data: bytesToBase64(new Uint8Array(ciphertext)),
    };
    return JSON.stringify(envelope);
}

/**
 * Decrypts a JSON envelope produced by {@link encryptJson}.
 * @param envelopeJson - The envelope JSON string
 * @param password - The password protecting the payload
 * @returns Promise resolving to the decrypted value
 * @throws Error if the envelope is invalid or the password is wrong
 */
export async function decryptJson(envelopeJson: string, password: string): Promise<unknown> {
    let envelope: EncryptedEnvelope;
    try {
        envelope = JSON.parse(envelopeJson) as EncryptedEnvelope;
    } catch {
        throw new Error('INVALID_FILE');
    }

    if (envelope.app !== 'zenkash' || !envelope.encrypted) {
        throw new Error('INVALID_FILE');
    }

    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    const key = await deriveKey(password, salt);

    try {
        const plaintext = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            base64ToBytes(envelope.data),
        );
        return JSON.parse(new TextDecoder().decode(plaintext));
    } catch {
        throw new Error('WRONG_PASSWORD');
    }
}
