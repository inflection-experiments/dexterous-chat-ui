export class Helper {
    static uuidToBase64 = (uuid: string | null | undefined): string | undefined | null => {
        if (!uuid || typeof uuid !== 'string') {
          console.error('Invalid UUID: Input must be a non-empty string.');
          return uuid;
        }
      
        const hex = uuid.replace(/-/g, '').toLowerCase();
      
        if (!/^[0-9a-f]{32}$/.test(hex)) {
          console.error('Invalid UUID: Must contain exactly 32 hexadecimal characters.');
          return uuid;
        }
      
        const bytes = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
          bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
        }
      
        const base64 = Buffer.from(bytes).toString('base64');
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
}

