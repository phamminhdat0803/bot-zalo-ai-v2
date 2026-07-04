# Đăng nhập với QRCode

URL: https://zca-js.tdung.com/vi/auth/login-with-qrcode.html

# Đăng nhập với QRCode

### Đăng nhập

index.ts

ts
```ts
import { Zalo } from "zca-js";

const zalo = new Zalo({
    selfListen: false, // mặc định false, lắng nghe sự kiện của bản thân
    checkUpdate: true, // mặc định true, kiểm tra update
    logging: true, // mặc định true, bật/tắt log mặc định của thư viện
});

const api = await zalo.loginQR({
    userAgent: "", // không bắt buộc
    qrPath: "", // đường dẫn lưu QR, mặc định ./qr.png
});

api.listener.start(); // bắt đầu lắng nghe sự kiện
```