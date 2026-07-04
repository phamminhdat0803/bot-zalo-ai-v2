# changeAccountAvatar

URL: https://zca-js.tdung.com/vi/apis/changeAccountAvatar.html

# changeAccountAvatar

## api.changeAccountAvatar(avatarSource)

### Parameters

*   avatarSource `AttachmentSource`

### Return

`Promise<ChangeAccountAvatarResponse>`

### Types

ts
```ts
export type ChangeAccountAvatarResponse = "";
```

### Examples

ts
```ts
api
    .changeAccountAvatar("./newAvatar.jpg")
    .then(console.log).catch(console.error);
```

### Related

*   [AttachmentSource](./../models/Attachment.html)