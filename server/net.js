import { AppError } from './domain.js';

export async function request(factory, url, options = {}) {
  let response;
  try {
    response = await (factory.fetch || fetch)(url, {
      ...options,
      redirect: options.redirect || 'error',
      signal: options.signal || AbortSignal.timeout(60_000)
    });
  } catch {
    throw new AppError('Bağlantı yanıt vermedi; işlem sonucu kontrol edilmeli.', 502);
  }

  if (!response.ok) {
    let code = '';
    try {
      const payload = await response.json();
      code = payload.error?.code || payload.code || '';
    } catch {}
    throw new AppError(
      `Servis isteği reddetti (${response.status}${code ? ` / ${String(code).slice(0, 40)}` : ''}). Hesap izinlerini ve kotayı kontrol et.`,
      502
    );
  }
  return response;
}
