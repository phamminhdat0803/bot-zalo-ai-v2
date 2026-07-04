# getUserInfo

URL: https://zca-js.tdung.com/vi/apis/getUserInfo.html

# getUserInfo

## api.getUserInfo(userId)

### Parameters

*   userId `string`

### Return

`Promise<UserInfoResponse>`

### Types

ts
```ts
export type ProfileInfo = User;

export type UserInfoResponse = {
    unchanged_profiles: Record<string, unknown>;
    phonebook_version: number;
    changed_profiles: Record<string, ProfileInfo>;
};
```

### Examples

Lấy thông tin của người dùng

ts
```ts
const userId = "0000000000000000001";
api.getUserInfo(userId)
    .then(console.log)
    .catch(console.error);
```

### Related

*   [User](./../models/User.html)