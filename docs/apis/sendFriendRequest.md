# sendFriendRequest

URL: https://zca-js.tdung.com/vi/apis/sendFriendRequest.html

# sendFriendRequest

## api.sendFriendRequest(msg, userId)

### Parameters

*   msg `string`
*   userId `string`

### Return

`Promise<SendFriendRequestResponse>`

### Types

ts
```ts
export type SendFriendRequestResponse = "";
```

### Examples

Gửi lời mời kết bạn với id người dùng

ts
```ts
const userId = "000000000000000001";
const msg = "Xin chào, hãy kết bạn với tôi!";

api.sendFriendRequest(msg, userId)
    .then(console.log)
    .catch(console.error);
```

Gửi lời mời kết bạn với số điện thoại

ts
```ts
const phoneNumber = "0999999999";
const userInfo = await api.findUser(phoneNumber);

const userId = userInfo.uid;
const msg = "Xin chào, hãy kết bạn với tôi!";

api.sendFriendRequest(msg, userId)
    .then(console.log)
    .catch(console.error);
```

## Related

*   [findUser](./findUser.html)