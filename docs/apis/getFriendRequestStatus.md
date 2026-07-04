# getFriendRequestStatus

URL: https://zca-js.tdung.com/vi/apis/getFriendRequestStatus.html

# getFriendRequestStatus

## api.getFriendRequestStatus(friendId)

### Parameters

*   friendId `string`

### Return

`Promise<GetFriendRequestStatusResponse>`

### Types

ts
```ts
export type GetFriendRequestStatusResponse = {
    addFriendPrivacy: number;
    isSeenFriendReq: boolean;
    is_friend: number;
    is_requested: number;
    is_requesting: number;
};
```

### Examples

ts
```ts
api.getFriendRequestStatus("000000000000000")
    .then(console.log)
    .catch(console.error);
```