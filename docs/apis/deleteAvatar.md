# deleteAvatar

URL: https://zca-js.tdung.com/vi/apis/deleteAvatar.html

# deleteAvatar

## api.deleteAvatar(photoId)

### Parameters

*   photoId `string` | `string[]`

### Return

`Promise<DeleteAvatarResponse>`

### Types

ts
```ts
export type DeleteAvatarResponse = {
    delPhotoIds: string[];
    errMap: {
        [key: string]: {
            err: number;
        };
    };
};
```

### Examples

ts
```ts
api
    .deleteAvatar(["photoId_1", "photoId_2"])
    .then(console.log).catch(console.error);
```