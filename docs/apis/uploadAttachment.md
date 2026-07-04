# uploadAttachment

URL: https://zca-js.tdung.com/vi/apis/uploadAttachment.html

# uploadAttachment

## api.uploadAttachment(source, threadId\[, type\])

### Parameters

*   source `AttachmentSource` | `AttachmentSource[]`
*   threadId `string`
*   type `ThreadType?`
    *   mặc định `ThreadType.User`

### Return

`Promise<UploadAttachmentType>`

### Types

ts
```ts
export type UploadAttachmentImageResponse = {
    normalUrl: string;
    photoId: string;
    finished: number | boolean;
    hdUrl: string;
    thumbUrl: string;
    clientFileId: number;
    chunkId: number;

    fileType: "image";
    width: number;
    height: number;
    totalSize: number;
    hdSize: number;
};

export type UploadAttachmentVideoResponse = {
    finished: number | boolean;
    clientFileId: number;
    chunkId: number;

    fileType: "video";
    fileUrl: string;
    fileId: string;
    checksum: string;
    totalSize: number;
    fileName: string;
};

export type UploadAttachmentFileResponse = {
    finished: number | boolean;
    clientFileId: number;
    chunkId: number;

    fileType: "others";
    fileUrl: string;
    fileId: string;
    checksum: string;
    totalSize: number;
    fileName: string;
};

export type ImageData = {
    fileName: string;
    totalSize: number | undefined;
    width: number | undefined;
    height: number | undefined;
};

export type FileData = {
    fileName: string;
    totalSize: number;
};

export type UploadAttachmentType = UploadAttachmentImageResponse | UploadAttachmentVideoResponse | UploadAttachmentFileResponse;
export type UploadAttachmentResponse = UploadAttachmentType[];
```

### Examples

ts
```ts
import { ThreadType } from "zca-js";

const groupId = "000000000000";

api
    .uploadAttachment(
        [
            "./pic1.jpg",
            "./pic2.jpg",
        ],
        groupId,
        ThreadType.User
    )
    .then(console.log)
    .catch(console.error);
```

### Related

*   [AttachmentSource](./../models/Attachment.html)
*   [ThreadType](./../models/Enum.html)