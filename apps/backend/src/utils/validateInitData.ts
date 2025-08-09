/**
 * Валидация строки initData из Telegram Mini App.  Реализует алгоритм,
 * описанный в официальной документации Telegram: парсит строку, строит
 * data_check_string, вычисляет secret_key = HMAC_SHA256(bot_token, 'WebAppData'),
 * сверяет хэш, проверяет срок действия auth_date.  Также поддерживает
 * проверку Ed25519‑подписи для третьих лиц.
 */
import crypto from 'crypto';
import { InitDataUnsafe } from '@shared';

/**
 * Parse a raw init data string (URL encoded) into an object of key/value pairs.
 */
function parseInitData(raw: string): Record<string, string> {
  const params = new URLSearchParams(raw);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Create a data_check_string by sorting keys and joining them with newline.  The
 * `hash` and `signature` fields are excluded.  See Telegram docs for details.
 */
function buildDataCheckString(params: Record<string, string>): string {
  const keys = Object.keys(params).filter(k => k !== 'hash' && k !== 'signature').sort();
  return keys.map(key => `${key}=${params[key]}`).join('\n');
}

/**
 * Compute HMAC‑SHA256 digest.
 */
function hmacSha256(data: string | Buffer, key: string | Buffer): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

/**
 * Validate the initData according to Telegram Mini App rules.  Returns the
 * parsed payload if valid or throws an error if invalid.  The bot token must
 * be provided.  Optionally specify the maximum lifetime (seconds) for
 * `auth_date`.
 */
export function validateInitData(
  rawInitData: string,
  botToken: string,
  lifetimeSec = parseInt(process.env.INITDATA_LIFETIME_SEC || '3600', 10)
): InitDataUnsafe {
  const params = parseInitData(rawInitData);
  const dataCheckString = buildDataCheckString(params);
  const providedHash = params.hash;
  if (!providedHash) {
    throw new Error('Hash missing from initData');
  }
  // Compute secret key: HMAC_SHA256(bot_token, 'WebAppData')
  const secretKey = hmacSha256('WebAppData', botToken);
  const computedHash = hmacSha256(dataCheckString, secretKey).toString('hex');
  if (computedHash !== providedHash) {
    throw new Error('Invalid data hash');
  }
  // Check auth_date is within lifetime
  const authDate = Number(params.auth_date);
  if (!authDate || Number.isNaN(authDate)) {
    throw new Error('Invalid auth_date');
  }
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > lifetimeSec) {
    throw new Error('Auth date expired');
  }
  // Build unsafe object (all keys in params)
  const unsafe: any = {};
  for (const key of Object.keys(params)) {
    unsafe[key] = params[key];
  }
  return unsafe as InitDataUnsafe;
}

/**
 * Validate third‑party signatures using Ed25519.  Telegram provides a public
 * key for testnet and mainnet environments.  If the `signature` field is
 * present in initData, callers can verify it using this function.
 *
 * NOTE: This implementation only verifies the signature if both the
 * signature and `bot_id` fields are present.  The public key must be
 * supplied through the options.  If verification fails an error is thrown.
 */
export function validateThirdPartySignature(
  rawInitData: string,
  publicKeyHex: string
): void {
  const params = parseInitData(rawInitData);
  const signature = params.signature;
  const botId = params.bot_id;
  if (!signature || !botId) return;
  // Remove signature field and reconstruct data string
  const dataCheckString = buildDataCheckString(params);
  // Use libsodium for Ed25519 verification – Node 20 includes
  const publicKey = Buffer.from(publicKeyHex, 'hex');
  const sigBuf = Buffer.from(signature, 'hex');
  const isValid = crypto.verify(null, Buffer.from(dataCheckString), {
    key: Buffer.concat([
      Buffer.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00]),
      publicKey
    ]),
    dsaEncoding: 'ieee-p1363'
  }, sigBuf);
  if (!isValid) {
    throw new Error('Invalid Ed25519 signature');
  }
}