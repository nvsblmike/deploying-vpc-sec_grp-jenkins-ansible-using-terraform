export function hashPassword(password: string): string {
  const hmac = new Bun.CryptoHasher('sha256', process.env.JWT_SECRET!).update(Buffer.from(password));
  return hmac.digest('hex');
}

export function checkPassword(hashPassword: string, password: string): boolean {
  const hmac = new Bun.CryptoHasher('sha256', process.env.JWT_SECRET!).update(Buffer.from(password));
  return hashPassword === hmac.digest('hex');
}
