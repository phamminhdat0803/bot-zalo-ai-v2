# reuseAvatar

URL: https://zca-js.tdung.com/vi/apis/reuseAvatar.html

# reuseAvatar

## api.reuseAvatar(photoId)

### Parameters

*   photoId `string`

### Return

`Promise<ReuseAvatarResponse>`

### Types

ts
```ts
export type ReuseAvatarResponse = null;
```

### Examples

Sử dụng lai avatar thứ 2 trong danh sách

ts
```ts
const avatarList = await api.getAvatarList();
const photoId = avatarList.photos[1].photoId;

api.reuseAvatar(photoId)
    .then(console.log)
    .catch(console.error);
```