# uploadProductPhoto

URL: https://zca-js.tdung.com/vi/apis/uploadProductPhoto.html

# uploadProductPhoto

## api.uploadProductPhoto(payload)

### Parameters

*   payload `UploadProductPhotoPayload`

### Return

`Promise<UploadProductPhotoResponse>`

### Types

ts
```ts
export type UploadProductPhotoPayload = {
    file: AttachmentSource;
};

export type UploadProductPhotoResponse = {
    normalUrl: string;
    photoId: string;
    finished: number;
    hdUrl: string;
    thumbUrl: string;
    clientFileId: number;
    chunkId: number;
};
```

### Examples

ts
```ts
import { ThreadType } from "zca-js";

const groupId = "000000000000";

api
    .uploadProductPhoto("./product1.jpg")
    .then(console.log)
    .catch(console.error);
```

### Related

*   [AttachmentSource](./../models/Attachment.html)
*   [ThreadType](./../models/Enum.html)