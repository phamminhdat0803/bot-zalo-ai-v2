# Attachment

URL: https://zca-js.tdung.com/vi/models/Attachment.html

# Attachment

### Model

ts
```ts
export type AttachmentSource =
    | string
    | {
          data: Buffer;
          filename: `${string}.${string}`;
          metadata: {
              totalSize: number;
              width?: number;
              height?: number;
          };
      };
```