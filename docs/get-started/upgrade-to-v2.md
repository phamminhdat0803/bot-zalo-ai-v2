# Nâng cấp lên v2

URL: https://zca-js.tdung.com/vi/get-started/upgrade-to-v2.html

# Nâng cấp lên v2

### Đăng Nhập

#### 1.x.x

index.ts

ts
```ts
import { Zalo } from "zca-js";
import fs from "fs";

const zalo = new Zalo(
    {
        cookie: JSON.parse(fs.readFileSync("./cookies.json", "utf-8")),
        imei: "your_imei_here",
        userAgent: "your_user_agent_here",
    },
    {
        selfListen: false,
        checkUpdate: true,
    },
);

const api = await zalo.login();
```

#### 2.x.x

index.ts

ts
```ts
import { Zalo } from "zca-js";
import fs from "fs";

const zalo = new Zalo(
    {
        selfListen: false,
        checkUpdate: true,
    },
);

const api = await zalo.login(
    {
        cookie: JSON.parse(fs.readFileSync("./cookies.json", "utf-8")),
        imei: "your_imei_here",
        userAgent: "your_user_agent_here",
    }
);
```

### ImageMetadataGetter

Kể từ phiên bản 2.0.0, **zca-js** đã loại bỏ sự phụ thuộc vào **sharp** trong việc trích xuất siêu dữ liệu hình ảnh. Giờ đây, **zca-js** yêu cầu người dùng tự cung cấp hàm **imageMetadataGetter** khi khởi tạo lớp Zalo nếu muốn gửi ảnh/gif theo đường dẫn tệp.

#### Ví dụ với Sharp

Cài đặt thư viện **sharp** và xây dựng hàm trích xuất dữ liệu hình ảnh

bash
```bash
bun add sharp # or npm install sharp
```

index.ts

ts
```ts
import { Zalo } from "zca-js";
import sharp from "sharp";
import fs from "fs";

async function imageMetadataGetter(filePath: string) {
    const data = await fs.promises.readFile(filePath);
    const metadata = await sharp(data).metadata();
    return {
        height: metadata.height,
        width: metadata.width,
        size: metadata.size || data.length,
    };
}

const zalo = new Zalo({
    imageMetadataGetter,
});
```